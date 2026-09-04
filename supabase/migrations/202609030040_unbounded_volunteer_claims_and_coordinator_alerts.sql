-- Volunteer self-service is intentionally unbounded. Role requirements are
-- coverage goals, not a cap on the number of approved volunteers who may serve.

create or replace function public.can_view_shift(p_shift_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_shift public.shifts%rowtype;
begin
  if public.is_coordinator() then
    return true;
  end if;
  if not public.is_active_volunteer() then
    return false;
  end if;

  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then
    return false;
  end if;

  return v_shift.status = 'scheduled'
    and public.is_eligible_for_rule(v_shift.eligibility_rule);
end;
$$;

-- Preserve authorization, eligibility, and overlap protection while removing
-- the legacy aggregate-capacity check from every assignment write.
create or replace function public.guard_shift_assignment()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  v_shift public.shifts%rowtype;
  v_old_assignment_id uuid;
begin
  if tg_op = 'UPDATE' and auth.uid() = old.profile_id and not public.is_coordinator() then
    if new.shift_id is distinct from old.shift_id
      or new.profile_id is distinct from old.profile_id
      or new.assignment_generation is distinct from old.assignment_generation
      or new.created_at is distinct from old.created_at
      or new.assignment_status not in ('confirmed', 'declined', 'absence_requested')
      or new.assignment_status = old.assignment_status then
      raise exception 'this assignment change is not permitted';
    end if;
  end if;

  if new.assignment_status = 'confirmed' then
    new.confirmed_at := timezone('utc', now());
  elsif new.assignment_status <> 'confirmed' then
    new.confirmed_at := null;
  end if;
  if new.assignment_status = 'absence_requested' then
    new.absence_requested_at := timezone('utc', now());
  end if;

  v_old_assignment_id := case when tg_op = 'UPDATE' then old.id else null end;
  if new.assignment_status in ('assigned', 'confirmed') then
    perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text, 0));
    select * into v_shift from public.shifts where id = new.shift_id for update;
    if not found or v_shift.status <> 'scheduled' then
      raise exception 'this shift is not available';
    end if;
    if not public.is_eligible_for_rule(v_shift.eligibility_rule) and not public.is_coordinator() then
      raise exception 'you are not eligible for this shift';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = new.profile_id
        and p.status = 'active'
        and p.role in ('volunteer', 'coordinator', 'admin')
    ) then
      raise exception 'assignment requires an active approved volunteer';
    end if;
    if exists (
      select 1
      from public.shift_assignments a
      join public.shifts s on s.id = a.shift_id
      where a.profile_id = new.profile_id
        and a.assignment_status in ('assigned', 'confirmed')
        and (v_old_assignment_id is null or a.id <> v_old_assignment_id)
        and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(v_shift.starts_at, v_shift.ends_at, '[)')
    ) then
      raise exception 'this volunteer already has an overlapping shift';
    end if;
  end if;

  if tg_op = 'INSERT' and new.assignment_status = 'assigned' then
    new.assignment_generation := 1;
  elsif tg_op = 'UPDATE' and old.assignment_status not in ('assigned', 'confirmed') and new.assignment_status = 'assigned' then
    new.assignment_generation := old.assignment_generation + 1;
  end if;
  return new;
end;
$$;

-- A coordinator may assign any existing claim to a role, including when the
-- role's coverage goal has been reached. Goals remain visible in projections.
create or replace function public.coordinator_set_assignment_roles(
  p_assignment_id uuid,
  p_roles public.shift_role[]
)
returns public.shift_role[]
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_assignment public.shift_assignments;
  v_role public.shift_role;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 then
    raise exception 'at least one volunteer role is required' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;
  if not found then
    raise exception 'assignment not found' using errcode = '02000';
  end if;

  foreach v_role in array p_roles loop
    if not exists (
      select 1 from public.shift_role_requirements
      where shift_id = v_assignment.shift_id and role = v_role
    ) then
      raise exception 'this shift does not require role %', v_role using errcode = '22023';
    end if;
  end loop;

  delete from public.shift_assignment_roles where assignment_id = p_assignment_id;
  foreach v_role in array p_roles loop
    insert into public.shift_assignment_roles (assignment_id, role, created_by)
    values (v_assignment.id, v_role, auth.uid())
    on conflict (assignment_id, role) do nothing;
  end loop;
  return p_roles;
end;
$$;

-- A role requirement is a target for planning, not an allocation ceiling.
-- This replaces the former protection that prevented an edited target from
-- being lower than current role coverage.
create or replace function public.replace_shift_role_requirements(
  p_shift_id uuid,
  p_requirements jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  perform public.validate_shift_role_requirements(p_requirements);
  perform 1 from public.shift_role_requirements where shift_id = p_shift_id for update;

  delete from public.shift_role_requirements where shift_id = p_shift_id;
  insert into public.shift_role_requirements (shift_id, role, required_count, volunteer_instructions)
  select p_shift_id, r.role::public.shift_role, r.required_count, nullif(btrim(r.volunteer_instructions), '')
  from jsonb_to_recordset(p_requirements) as r(role text, required_count smallint, volunteer_instructions text);

  update public.shifts
  set required_volunteers = (
    select sum(required_count)::smallint
    from public.shift_role_requirements
    where shift_id = p_shift_id
  ), volunteer_instructions = null
  where id = p_shift_id;
end;
$$;

create or replace function public.coordinator_request_volunteer_with_roles(
  p_shift_id uuid,
  p_profile_id uuid,
  p_roles public.shift_role[]
)
returns public.shift_assignments
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_assignment public.shift_assignments;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 then
    raise exception 'at least one volunteer role is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.shifts where id = p_shift_id and status = 'scheduled') then
    raise exception 'this shift is not available' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and status = 'active' and role in ('volunteer', 'coordinator', 'admin')
  ) then
    raise exception 'assignment requires an active approved volunteer' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id and profile_id = p_profile_id
  for update;

  if found and v_assignment.assignment_status in ('assigned', 'confirmed') then
    perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
    return v_assignment;
  end if;
  if found then
    update public.shift_assignments
    set assignment_status = 'pending', confirmed_at = null, absence_requested_at = null,
        assignment_generation = v_assignment.assignment_generation + 1
    where id = v_assignment.id
    returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status, assignment_generation)
    values (p_shift_id, p_profile_id, 'pending', 1)
    returning * into v_assignment;
  end if;
  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end;
$$;

create or replace function public.coordinator_assign_volunteer_with_roles(
  p_shift_id uuid,
  p_profile_id uuid,
  p_roles public.shift_role[]
)
returns public.shift_assignments
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_assignment public.shift_assignments;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 then
    raise exception 'at least one volunteer role is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and status = 'active' and role in ('volunteer', 'coordinator', 'admin')
  ) then
    raise exception 'assignment requires an active approved volunteer' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id and profile_id = p_profile_id
  for update;
  if found then
    if v_assignment.assignment_status not in ('assigned', 'confirmed') then
      update public.shift_assignments
      set assignment_status = 'assigned', absence_requested_at = null
      where id = v_assignment.id
      returning * into v_assignment;
    end if;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status)
    values (p_shift_id, p_profile_id, 'assigned')
    returning * into v_assignment;
  end if;
  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end;
$$;

create or replace function public.claim_open_shift(p_shift_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_assignment public.shift_assignments;
begin
  if not public.is_active_volunteer() then
    raise exception 'approved volunteer access is required' using errcode = '42501';
  end if;
  if not public.can_view_shift(p_shift_id) then
    raise exception 'this shift is not available to serve' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id and profile_id = auth.uid()
  for update;
  if found then
    if v_assignment.assignment_status in ('assigned', 'confirmed') then
      raise exception 'you already serve at this shift' using errcode = '23505';
    end if;
    update public.shift_assignments
    set assignment_status = 'assigned', absence_requested_at = null
    where id = v_assignment.id
    returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status)
    values (p_shift_id, auth.uid(), 'assigned')
    returning * into v_assignment;
  end if;
  return v_assignment;
end;
$$;

-- Queue one transactional task/email per currently active coordinator or
-- administrator. The write shares the claim transaction: a claim cannot be
-- persisted without its notification work being durable.
create or replace function public.enqueue_coordinator_claim_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_claimant_name text;
  v_shift_title text;
  v_starts_at timestamptz;
begin
  if not (
    (tg_op = 'INSERT' and new.assignment_status = 'assigned')
    or (tg_op = 'UPDATE' and old.assignment_status not in ('assigned', 'confirmed') and new.assignment_status = 'assigned')
  ) then
    return new;
  end if;
  if auth.uid() is distinct from new.profile_id then
    return new;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email),
         coalesce(re.title, 'Prayer-room shift'), s.starts_at
  into v_claimant_name, v_shift_title, v_starts_at
  from public.profiles p
  join public.shifts s on s.id = new.shift_id
  left join public.room_events re on re.id = s.room_event_id
  where p.id = new.profile_id;

  insert into public.message_jobs (
    assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context
  )
  select
    new.id,
    coordinator.id,
    'volunteer_claimed',
    'volunteer-claim:' || new.id::text || ':g' || new.assignment_generation::text || ':recipient:' || coordinator.id::text,
    timezone('utc', now()),
    jsonb_build_object(
      'generation', new.assignment_generation,
      'valid_statuses', jsonb_build_array('assigned', 'confirmed'),
      'claimant_name', v_claimant_name,
      'shift_title', v_shift_title,
      'starts_at', v_starts_at
    )
  from public.profiles coordinator
  where coordinator.status = 'active'
    and coordinator.role in ('coordinator', 'admin')
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists shift_assignments_enqueue_coordinator_claim_notifications on public.shift_assignments;
create trigger shift_assignments_enqueue_coordinator_claim_notifications
after insert or update on public.shift_assignments
for each row execute function public.enqueue_coordinator_claim_notifications();

drop function if exists public.list_available_volunteer_shifts(integer);
create function public.list_available_volunteer_shifts(p_limit integer default 50)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  volunteer_count bigint,
  role_coverage jsonb,
  title text,
  volunteer_instructions text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_active_volunteer() then
    raise exception 'approved volunteer access is required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.starts_at,
    s.ends_at,
    (select count(distinct a.profile_id)
     from public.shift_assignments a
     where a.shift_id = s.id and a.assignment_status in ('assigned', 'confirmed')),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', requirements.role,
        'required_count', requirements.required_count,
        'serving_count', coalesce(coverage.serving_count, 0)
      ) order by requirements.role)
      from public.shift_role_requirements requirements
      left join lateral (
        select count(*)::integer as serving_count
        from public.shift_assignment_roles roles
        join public.shift_assignments a on a.id = roles.assignment_id
        where a.shift_id = s.id
          and roles.role = requirements.role
          and a.assignment_status in ('assigned', 'confirmed')
      ) coverage on true
      where requirements.shift_id = s.id
    ), '[]'::jsonb),
    coalesce(re.title, 'Prayer-room shift'),
    s.volunteer_instructions
  from public.shifts s
  left join public.room_events re on re.id = s.room_event_id
  where s.status = 'scheduled'
    and s.starts_at >= timezone('utc', now())
    and public.is_eligible_for_rule(s.eligibility_rule)
  order by s.starts_at
  limit p_limit;
end;
$$;

drop function if exists public.list_coordinator_schedule(timestamptz, timestamptz);
create function public.list_coordinator_schedule(p_starts_at timestamptz, p_ends_at timestamptz)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  volunteer_count bigint,
  unassigned_claim_count bigint,
  pending_count bigint,
  status public.shift_status,
  title text,
  role_requirements jsonb,
  role_coverage jsonb,
  assignments jsonb,
  is_public boolean,
  public_description text,
  location_label text,
  participation_format public.event_format,
  public_url text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'a valid schedule window is required' using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.starts_at,
    s.ends_at,
    coalesce((select sum(r.required_count)::smallint from public.shift_role_requirements r where r.shift_id = s.id), 5::smallint),
    (select count(distinct a.profile_id) from public.shift_assignments a where a.shift_id = s.id and a.assignment_status in ('assigned', 'confirmed')),
    (select count(*) from public.shift_assignments a where a.shift_id = s.id and a.assignment_status in ('assigned', 'confirmed') and not exists (select 1 from public.shift_assignment_roles roles where roles.assignment_id = a.id)),
    (select count(*) from public.shift_assignments a where a.shift_id = s.id and a.assignment_status = 'pending'),
    s.status,
    coalesce(re.title, 'Prayer-room shift'),
    coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'required_count', r.required_count, 'volunteer_instructions', r.volunteer_instructions) order by r.role) from public.shift_role_requirements r where r.shift_id = s.id), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('role', requirements.role, 'required_count', requirements.required_count, 'serving_count', coalesce(coverage.serving_count, 0)) order by requirements.role)
      from public.shift_role_requirements requirements
      left join lateral (
        select count(*)::integer as serving_count
        from public.shift_assignment_roles roles
        join public.shift_assignments a on a.id = roles.assignment_id
        where a.shift_id = s.id and roles.role = requirements.role and a.assignment_status in ('assigned', 'confirmed')
      ) coverage on true
      where requirements.shift_id = s.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id', a.id,
        'profile_id', p.id,
        'display_name', coalesce(nullif(btrim(p.display_name), ''), p.email),
        'email', p.email,
        'assignment_status', a.assignment_status,
        'roles', coalesce((select array_agg(roles.role order by roles.role) from public.shift_assignment_roles roles where roles.assignment_id = a.id), '{}'::public.shift_role[])
      ) order by p.display_name, p.email)
      from public.shift_assignments a
      join public.profiles p on p.id = a.profile_id
      where a.shift_id = s.id and a.assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested')
    ), '[]'::jsonb),
    exists (select 1 from public.public_events pe where pe.room_event_id = s.room_event_id and pe.published_at is not null),
    max(pe.description), max(pe.location_label), max(pe.participation_format::text)::public.event_format, max(pe.public_url)
  from public.shifts s
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where s.starts_at < p_ends_at and s.ends_at > p_starts_at
  group by s.id, re.title
  order by s.starts_at;
end;
$$;

revoke all on function public.enqueue_coordinator_claim_notifications() from public, anon, authenticated;
revoke all on function public.list_available_volunteer_shifts(integer) from public, anon, authenticated;
revoke all on function public.list_coordinator_schedule(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_open_shift(uuid) to authenticated;
grant execute on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) to authenticated;
grant execute on function public.coordinator_request_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
grant execute on function public.coordinator_assign_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
grant execute on function public.list_available_volunteer_shifts(integer) to authenticated;
grant execute on function public.list_coordinator_schedule(timestamptz, timestamptz) to authenticated;
