-- Every prayer-room shift needs coverage for the same five roles.  Capacity
-- and instructions belong to the role requirement, not to the shift as a
-- whole: one person may therefore cover more than one requirement.

create table public.shift_role_requirements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  role public.shift_role not null,
  required_count smallint not null default 1,
  volunteer_instructions text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shift_role_requirements_one_per_role unique (shift_id, role),
  constraint shift_role_requirements_count check (required_count between 1 and 20)
);
create index shift_role_requirements_shift_idx on public.shift_role_requirements (shift_id, role);
alter table public.shift_role_requirements enable row level security;
create policy shift_role_requirements_coordinator_read on public.shift_role_requirements
  for select to authenticated using (public.is_coordinator());

-- This legacy aggregate now sums all five role requirements, so its former
-- 20-person ceiling would reject a valid 20-person requirement per role.
alter table public.shifts drop constraint shifts_required_volunteers;
alter table public.shifts add constraint shifts_required_volunteers check (required_volunteers between 5 and 100);

-- Existing shifts become role-based safely.  Keep any former general
-- instruction as a note on each role until a coordinator replaces it.
insert into public.shift_role_requirements (shift_id, role, required_count, volunteer_instructions)
select s.id, roles.role, 1, s.volunteer_instructions
from public.shifts s
cross join (values
  ('prayer_leader'::public.shift_role),
  ('worship_leader'::public.shift_role),
  ('worship_team_member'::public.shift_role),
  ('tech_director'::public.shift_role),
  ('host'::public.shift_role)
) as roles(role)
on conflict (shift_id, role) do nothing;

-- required_volunteers is retained as a backwards-compatible aggregate for
-- legacy reports and the assignment guard.  It is no longer the source of
-- truth for capacity.
update public.shifts s
set required_volunteers = totals.required_count
from (
  select shift_id, sum(required_count)::smallint as required_count
  from public.shift_role_requirements
  group by shift_id
) totals
where totals.shift_id = s.id;

create or replace function public.validate_shift_role_requirements(p_requirements jsonb)
returns void
language plpgsql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_role text;
  v_count integer;
  v_instruction text;
  v_seen integer := 0;
begin
  if jsonb_typeof(p_requirements) <> 'array' or jsonb_array_length(p_requirements) <> 5 then
    raise exception 'all five role requirements are required' using errcode = '22023';
  end if;

  for v_role, v_count, v_instruction in
    select role, required_count, volunteer_instructions
    from jsonb_to_recordset(p_requirements) as r(role text, required_count integer, volunteer_instructions text)
  loop
    if v_role not in ('prayer_leader', 'worship_leader', 'worship_team_member', 'tech_director', 'host') then
      raise exception 'unknown shift role: %', v_role using errcode = '22023';
    end if;
    if v_count is null or v_count not between 1 and 20 then
      raise exception 'each role needs between 1 and 20 volunteers' using errcode = '22023';
    end if;
    if v_instruction is not null and length(v_instruction) > 5000 then
      raise exception 'role instructions must be 5,000 characters or fewer' using errcode = '22023';
    end if;
    v_seen := v_seen + 1;
  end loop;

  if v_seen <> 5 or (select count(distinct r.role) from jsonb_to_recordset(p_requirements) as r(role text, required_count integer, volunteer_instructions text)) <> 5 then
    raise exception 'each of the five roles must appear exactly once' using errcode = '22023';
  end if;
end;
$$;

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
  -- Lock the rows so simultaneous coverage changes serialize with role
  -- assignment capacity checks.
  perform 1 from public.shift_role_requirements where shift_id = p_shift_id for update;

  -- A scheduled shift may never be edited below currently reserved role
  -- coverage (pending invitations reserve the role too).
  if exists (
    select 1
    from jsonb_to_recordset(p_requirements) as incoming(role text, required_count integer, volunteer_instructions text)
    left join lateral (
      select count(*)::integer as reserved_count
      from public.shift_assignment_roles sar
      join public.shift_assignments a on a.id = sar.assignment_id
      where a.shift_id = p_shift_id
        and sar.role::text = incoming.role
        and a.assignment_status in ('pending', 'assigned', 'confirmed')
    ) coverage on true
    where incoming.required_count < coverage.reserved_count
  ) then
    raise exception 'a role requirement cannot be lower than its reserved coverage' using errcode = '22023';
  end if;

  delete from public.shift_role_requirements where shift_id = p_shift_id;
  insert into public.shift_role_requirements (shift_id, role, required_count, volunteer_instructions)
  select p_shift_id, r.role::public.shift_role, r.required_count, nullif(btrim(r.volunteer_instructions), '')
  from jsonb_to_recordset(p_requirements) as r(role text, required_count smallint, volunteer_instructions text);

  update public.shifts
  set required_volunteers = (select sum(required_count)::smallint from public.shift_role_requirements where shift_id = p_shift_id),
      volunteer_instructions = null
  where id = p_shift_id;
end;
$$;

-- Replaces the role list atomically and makes the per-role requirements the
-- authorization boundary for coverage.  Excluding the assignment being
-- changed lets a coordinator adjust its role combination without false
-- capacity failures.
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
  v_required integer;
  v_reserved integer;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 then
    raise exception 'at least one volunteer role is required' using errcode = '22023';
  end if;
  select * into v_assignment from public.shift_assignments where id = p_assignment_id for update;
  if not found then
    raise exception 'assignment not found' using errcode = '02000';
  end if;

  foreach v_role in array p_roles loop
    select required_count into v_required
    from public.shift_role_requirements
    where shift_id = v_assignment.shift_id and role = v_role
    for update;
    if not found then
      raise exception 'this shift does not require role %', v_role using errcode = '22023';
    end if;
    select count(*) into v_reserved
    from public.shift_assignment_roles sar
    join public.shift_assignments a on a.id = sar.assignment_id
    where a.shift_id = v_assignment.shift_id and sar.role = v_role
      and a.id <> p_assignment_id
      and a.assignment_status in ('pending', 'assigned', 'confirmed');
    if v_reserved >= v_required then
      raise exception 'the % role is already fully covered', replace(v_role::text, '_', ' ') using errcode = '22023';
    end if;
  end loop;

  delete from public.shift_assignment_roles where assignment_id = p_assignment_id;
  foreach v_role in array p_roles loop
    insert into public.shift_assignment_roles (assignment_id, role, created_by)
    values (p_assignment_id, v_role, auth.uid()) on conflict (assignment_id, role) do nothing;
  end loop;
  return p_roles;
end;
$$;

-- Direct coordinator assignment without roles is disabled.  A volunteer may
-- still self-claim a shift; that reserves their time but deliberately does not
-- count toward any role until a coordinator assigns coverage.
create or replace function public.coordinator_assign_volunteer(p_shift_id uuid, p_profile_id uuid)
returns public.shift_assignments
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$ begin raise exception 'assign coverage with one or more roles' using errcode = '22023'; end; $$;

create or replace function public.claim_open_shift(p_shift_id uuid)
returns public.shift_assignments
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_assignment public.shift_assignments;
begin
  if not public.is_active_volunteer() then raise exception 'approved volunteer access is required' using errcode = '42501'; end if;
  if not public.can_view_shift(p_shift_id) then raise exception 'this shift is not available to claim' using errcode = '22023'; end if;
  select * into v_assignment from public.shift_assignments where shift_id = p_shift_id and profile_id = auth.uid() for update;
  if found then
    if v_assignment.assignment_status in ('assigned', 'confirmed') then raise exception 'you already hold this shift' using errcode = '23505'; end if;
    update public.shift_assignments set assignment_status = 'assigned', absence_requested_at = null where id = v_assignment.id returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status) values (p_shift_id, auth.uid(), 'assigned') returning * into v_assignment;
  end if;
  return v_assignment;
end; $$;

-- A self-claimed assignment starts with no roles.  The same coordinator flow
-- used for invitations can attach role coverage to it later.
create or replace function public.coordinator_request_volunteer_with_roles(
  p_shift_id uuid, p_profile_id uuid, p_roles public.shift_role[]
)
returns public.shift_assignments
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_assignment public.shift_assignments;
begin
  if not public.is_coordinator() then raise exception 'coordinator access is required' using errcode = '42501'; end if;
  if p_roles is null or cardinality(p_roles) = 0 then raise exception 'at least one volunteer role is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active' and role in ('volunteer', 'coordinator', 'admin')) then raise exception 'assignment requires an active approved volunteer' using errcode = '22023'; end if;
  select * into v_assignment from public.shift_assignments where shift_id = p_shift_id and profile_id = p_profile_id for update;
  if found and v_assignment.assignment_status in ('assigned', 'confirmed') then
    if exists (select 1 from public.shift_assignment_roles where assignment_id = v_assignment.id) then
      raise exception 'this volunteer already has an active assignment or request' using errcode = '23505';
    end if;
    perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
    return v_assignment;
  end if;
  if (select count(*) from public.shift_assignments where shift_id = p_shift_id and assignment_status in ('pending', 'assigned', 'confirmed')) >= (select required_volunteers from public.shifts where id = p_shift_id) then
    raise exception 'this shift has no remaining volunteer availability' using errcode = '22023';
  end if;
  if found then
    update public.shift_assignments set assignment_status = 'pending', confirmed_at = null, absence_requested_at = null, assignment_generation = v_assignment.assignment_generation + 1 where id = v_assignment.id returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status, assignment_generation) values (p_shift_id, p_profile_id, 'pending', 1) returning * into v_assignment;
  end if;
  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end; $$;

create or replace function public.coordinator_assign_volunteer_with_roles(
  p_shift_id uuid, p_profile_id uuid, p_roles public.shift_role[]
)
returns public.shift_assignments
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_assignment public.shift_assignments;
begin
  if not public.is_coordinator() then raise exception 'coordinator access is required' using errcode = '42501'; end if;
  if p_roles is null or cardinality(p_roles) = 0 then raise exception 'at least one volunteer role is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and status = 'active' and role in ('volunteer', 'coordinator', 'admin')) then raise exception 'assignment requires an active approved volunteer' using errcode = '22023'; end if;
  select * into v_assignment from public.shift_assignments where shift_id = p_shift_id and profile_id = p_profile_id for update;
  if found then
    if v_assignment.assignment_status in ('assigned', 'confirmed') then return v_assignment; end if;
    update public.shift_assignments set assignment_status = 'assigned', absence_requested_at = null where id = v_assignment.id returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status) values (p_shift_id, p_profile_id, 'assigned') returning * into v_assignment;
  end if;
  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end; $$;

drop function if exists public.coordinator_create_shift(text, timestamptz, timestamptz, smallint, text, boolean, text, text, public.event_format, text);
create function public.coordinator_create_shift(
  p_title text, p_starts_at timestamptz, p_ends_at timestamptz, p_role_requirements jsonb,
  p_publish_public boolean default false, p_public_description text default null,
  p_location_label text default null, p_participation_format public.event_format default 'in_person', p_public_url text default null
) returns public.shifts
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_room_event public.room_events; v_shift public.shifts;
begin
  if not public.is_coordinator() then raise exception 'coordinator access is required' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null or p_ends_at <= p_starts_at then raise exception 'a title and valid shift window are required' using errcode = '22023'; end if;
  perform public.validate_shift_role_requirements(p_role_requirements);
  insert into public.room_events (title, event_type, description, starts_at, ends_at, visibility, created_by)
  values (btrim(p_title), 'prayer_gathering', nullif(btrim(p_public_description), ''), p_starts_at, p_ends_at,
    case when p_publish_public then 'public'::public.room_event_visibility else 'private'::public.room_event_visibility end, auth.uid()) returning * into v_room_event;
  insert into public.shifts (room_event_id, starts_at, ends_at, required_volunteers, created_by)
  values (v_room_event.id, p_starts_at, p_ends_at, 5, auth.uid()) returning * into v_shift;
  perform public.replace_shift_role_requirements(v_shift.id, p_role_requirements);
  if p_publish_public then
    insert into public.public_events (room_event_id, title, description, location_label, participation_format, public_url, starts_at, ends_at, published_at, created_by)
    values (v_room_event.id, btrim(p_title), nullif(btrim(p_public_description), ''), nullif(btrim(p_location_label), ''), coalesce(p_participation_format, 'in_person'), nullif(btrim(p_public_url), ''), p_starts_at, p_ends_at, timezone('utc', now()), auth.uid());
  end if;
  return (select * from public.shifts where id = v_shift.id);
end; $$;

drop function if exists public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, smallint, text, public.shift_status, boolean, text, text, public.event_format, text);
create function public.coordinator_update_shift(
  p_shift_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz, p_role_requirements jsonb,
  p_status public.shift_status default 'scheduled', p_publish_public boolean default false, p_public_description text default null,
  p_location_label text default null, p_participation_format public.event_format default 'in_person', p_public_url text default null
) returns public.shifts
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare v_shift public.shifts;
begin
  if not public.is_coordinator() then raise exception 'coordinator access is required' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null or p_ends_at <= p_starts_at then raise exception 'a title and valid shift window are required' using errcode = '22023'; end if;
  perform public.validate_shift_role_requirements(p_role_requirements);
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'shift not found' using errcode = 'P0002'; end if;
  if not p_publish_public or p_status = 'cancelled' then delete from public.public_events where room_event_id = v_shift.room_event_id; end if;
  update public.room_events set title = btrim(p_title), description = nullif(btrim(p_public_description), ''), starts_at = p_starts_at, ends_at = p_ends_at,
    visibility = case when p_publish_public and p_status <> 'cancelled' then 'public'::public.room_event_visibility else 'private'::public.room_event_visibility end
  where id = v_shift.room_event_id;
  if p_publish_public and p_status <> 'cancelled' then
    insert into public.public_events (room_event_id, title, description, location_label, participation_format, public_url, starts_at, ends_at, published_at, created_by)
    values (v_shift.room_event_id, btrim(p_title), nullif(btrim(p_public_description), ''), nullif(btrim(p_location_label), ''), coalesce(p_participation_format, 'in_person'), nullif(btrim(p_public_url), ''), p_starts_at, p_ends_at, timezone('utc', now()), auth.uid())
    on conflict (room_event_id) do update set title = excluded.title, description = excluded.description, location_label = excluded.location_label, participation_format = excluded.participation_format, public_url = excluded.public_url, starts_at = excluded.starts_at, ends_at = excluded.ends_at, published_at = excluded.published_at;
  end if;
  update public.shifts set starts_at = p_starts_at, ends_at = p_ends_at, status = p_status where id = p_shift_id;
  perform public.replace_shift_role_requirements(p_shift_id, p_role_requirements);
  if p_status = 'cancelled' then update public.shift_assignments set assignment_status = 'cancelled' where shift_id = p_shift_id and assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested'); end if;
  return (select * from public.shifts where id = p_shift_id);
end; $$;

drop function if exists public.list_coordinator_schedule(timestamptz, timestamptz);
create function public.list_coordinator_schedule(p_starts_at timestamptz, p_ends_at timestamptz)
returns table (id uuid, starts_at timestamptz, ends_at timestamptz, required_volunteers smallint, assigned_count bigint, pending_count bigint, status public.shift_status, title text, role_requirements jsonb, is_public boolean, public_description text, location_label text, participation_format public.event_format, public_url text)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not public.is_coordinator() then raise exception 'coordinator access is required' using errcode = '42501'; end if;
  if p_ends_at <= p_starts_at then raise exception 'a valid schedule window is required' using errcode = '22023'; end if;
  return query select s.id, s.starts_at, s.ends_at,
    coalesce((select sum(r.required_count)::smallint from public.shift_role_requirements r where r.shift_id = s.id), 5::smallint),
    (select count(*) from public.shift_assignment_roles sar join public.shift_assignments a on a.id = sar.assignment_id where a.shift_id = s.id and a.assignment_status in ('assigned', 'confirmed')),
    (select count(*) from public.shift_assignment_roles sar join public.shift_assignments a on a.id = sar.assignment_id where a.shift_id = s.id and a.assignment_status = 'pending'),
    s.status, coalesce(re.title, 'Prayer-room shift'),
    coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'required_count', r.required_count, 'volunteer_instructions', r.volunteer_instructions) order by r.role) from public.shift_role_requirements r where r.shift_id = s.id), '[]'::jsonb),
    exists (select 1 from public.public_events pe where pe.room_event_id = s.room_event_id and pe.published_at is not null), max(pe.description), max(pe.location_label), max(pe.participation_format::text)::public.event_format, max(pe.public_url)
  from public.shifts s left join public.room_events re on re.id = s.room_event_id left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where s.starts_at < p_ends_at and s.ends_at > p_starts_at group by s.id, re.title order by s.starts_at;
end; $$;

drop function if exists public.list_my_shift_assignments(integer);
create function public.list_my_shift_assignments(p_limit integer default 50)
returns table (assignment_id uuid, shift_id uuid, starts_at timestamptz, ends_at timestamptz, title text, location_label text, assignment_status public.assignment_status, roles public.shift_role[], role_instructions jsonb)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_active_volunteer() then raise exception 'approved volunteer access is required' using errcode = '42501'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'limit must be between 1 and 100' using errcode = '22023'; end if;
  return query select a.id, s.id, s.starts_at, s.ends_at, coalesce(re.title, 'Prayer-room shift'), pe.location_label, a.assignment_status,
    coalesce((select array_agg(sar.role order by sar.role) from public.shift_assignment_roles sar where sar.assignment_id = a.id), '{}'::public.shift_role[]),
    coalesce((select jsonb_object_agg(r.role::text, r.volunteer_instructions) from public.shift_assignment_roles sar join public.shift_role_requirements r on r.shift_id = s.id and r.role = sar.role where sar.assignment_id = a.id), '{}'::jsonb)
  from public.shift_assignments a join public.shifts s on s.id = a.shift_id left join public.room_events re on re.id = s.room_event_id left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where a.profile_id = auth.uid() and s.ends_at >= timezone('utc', now()) and a.assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested') order by s.starts_at limit p_limit;
end; $$;

revoke all on table public.shift_role_requirements from anon, authenticated;
revoke insert, update, delete on public.shift_assignments, public.shift_assignment_roles from authenticated;
revoke all on function public.validate_shift_role_requirements(jsonb) from public, anon, authenticated;
revoke all on function public.replace_shift_role_requirements(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.coordinator_assign_volunteer(uuid, uuid) from public, anon, authenticated;
revoke all on function public.coordinator_create_shift(text, timestamptz, timestamptz, jsonb, boolean, text, text, public.event_format, text) from public, anon, authenticated;
revoke all on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, jsonb, public.shift_status, boolean, text, text, public.event_format, text) from public, anon, authenticated;
revoke all on function public.list_coordinator_schedule(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.list_my_shift_assignments(integer) from public, anon, authenticated;
grant execute on function public.coordinator_create_shift(text, timestamptz, timestamptz, jsonb, boolean, text, text, public.event_format, text) to authenticated;
grant execute on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, jsonb, public.shift_status, boolean, text, text, public.event_format, text) to authenticated;
grant execute on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) to authenticated;
grant execute on function public.coordinator_request_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
grant execute on function public.coordinator_assign_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
grant execute on function public.claim_open_shift(uuid) to authenticated;
grant execute on function public.list_coordinator_schedule(timestamptz, timestamptz) to authenticated;
grant execute on function public.list_my_shift_assignments(integer) to authenticated;

comment on table public.shift_role_requirements is 'The five required roles for a shift, with role-specific capacity and instructions.';
