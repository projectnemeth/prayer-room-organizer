-- Coordinator-controlled scheduling APIs and safe projections for the public
-- calendar and each volunteer's private schedule.

create or replace function public.coordinator_create_shift(
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_required_volunteers smallint default 1,
  p_volunteer_instructions text default null,
  p_publish_public boolean default false,
  p_public_description text default null,
  p_location_label text default null,
  p_participation_format public.event_format default 'in_person',
  p_public_url text default null
)
returns public.shifts
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_room_event public.room_events;
  v_shift public.shifts;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'a shift title is required' using errcode = '22023';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'a shift must end after it begins' using errcode = '22023';
  end if;
  if p_required_volunteers is null or p_required_volunteers not between 1 and 20 then
    raise exception 'required volunteers must be between 1 and 20' using errcode = '22023';
  end if;

  insert into public.room_events (
    title, event_type, description, starts_at, ends_at, visibility, created_by
  ) values (
    btrim(p_title), 'prayer_gathering', nullif(btrim(p_public_description), ''), p_starts_at, p_ends_at,
    case when p_publish_public then 'public'::public.room_event_visibility else 'private'::public.room_event_visibility end,
    auth.uid()
  ) returning * into v_room_event;

  insert into public.shifts (
    room_event_id, starts_at, ends_at, required_volunteers, volunteer_instructions, created_by
  ) values (
    v_room_event.id, p_starts_at, p_ends_at, p_required_volunteers, nullif(btrim(p_volunteer_instructions), ''), auth.uid()
  ) returning * into v_shift;

  if p_publish_public then
    insert into public.public_events (
      room_event_id, title, description, location_label, participation_format, public_url,
      starts_at, ends_at, published_at, created_by
    ) values (
      v_room_event.id, btrim(p_title), nullif(btrim(p_public_description), ''), nullif(btrim(p_location_label), ''),
      coalesce(p_participation_format, 'in_person'::public.event_format), nullif(btrim(p_public_url), ''),
      p_starts_at, p_ends_at, timezone('utc', now()), auth.uid()
    );
  end if;

  return v_shift;
end;
$$;

create or replace function public.coordinator_update_shift(
  p_shift_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_required_volunteers smallint,
  p_volunteer_instructions text default null,
  p_status public.shift_status default 'scheduled',
  p_publish_public boolean default false,
  p_public_description text default null,
  p_location_label text default null,
  p_participation_format public.event_format default 'in_person',
  p_public_url text default null
)
returns public.shifts
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_shift public.shifts;
  v_active_assignments integer;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or p_ends_at <= p_starts_at then
    raise exception 'a title and valid shift window are required' using errcode = '22023';
  end if;
  if p_required_volunteers is null or p_required_volunteers not between 1 and 20 then
    raise exception 'required volunteers must be between 1 and 20' using errcode = '22023';
  end if;

  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then
    raise exception 'shift not found' using errcode = 'P0002';
  end if;
  select count(*) into v_active_assignments
  from public.shift_assignments
  where shift_id = p_shift_id and assignment_status in ('assigned', 'confirmed');
  if p_status = 'scheduled' and p_required_volunteers < v_active_assignments then
    raise exception 'capacity cannot be lower than the current active assignments' using errcode = '22023';
  end if;

  if v_shift.room_event_id is not null then
    -- The room-event trigger refuses to make an event private while its public
    -- projection exists, so remove that projection before changing visibility.
    if not p_publish_public or p_status = 'cancelled' then
      delete from public.public_events where room_event_id = v_shift.room_event_id;
    end if;
    update public.room_events
      set title = btrim(p_title), description = nullif(btrim(p_public_description), ''), starts_at = p_starts_at,
          ends_at = p_ends_at,
          visibility = case when p_publish_public and p_status <> 'cancelled' then 'public'::public.room_event_visibility else 'private'::public.room_event_visibility end
      where id = v_shift.room_event_id;

    if p_publish_public and p_status <> 'cancelled' then
      insert into public.public_events (
        room_event_id, title, description, location_label, participation_format, public_url,
        starts_at, ends_at, published_at, created_by
      ) values (
        v_shift.room_event_id, btrim(p_title), nullif(btrim(p_public_description), ''), nullif(btrim(p_location_label), ''),
        coalesce(p_participation_format, 'in_person'::public.event_format), nullif(btrim(p_public_url), ''),
        p_starts_at, p_ends_at, timezone('utc', now()), auth.uid()
      ) on conflict (room_event_id) do update set
        title = excluded.title, description = excluded.description, location_label = excluded.location_label,
        participation_format = excluded.participation_format, public_url = excluded.public_url,
        starts_at = excluded.starts_at, ends_at = excluded.ends_at,
        published_at = excluded.published_at;
    end if;
  elsif p_publish_public then
    raise exception 'legacy shifts without a room event cannot be published; create a new shift instead' using errcode = '22023';
  end if;

  update public.shifts
    set starts_at = p_starts_at, ends_at = p_ends_at, required_volunteers = p_required_volunteers,
        volunteer_instructions = nullif(btrim(p_volunteer_instructions), ''), status = p_status
    where id = p_shift_id
    returning * into v_shift;

  if p_status = 'cancelled' then
    update public.shift_assignments
      set assignment_status = 'cancelled'
      where shift_id = p_shift_id and assignment_status in ('assigned', 'confirmed', 'absence_requested');
  end if;
  return v_shift;
end;
$$;

create or replace function public.coordinator_assign_volunteer(
  p_shift_id uuid,
  p_profile_id uuid
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
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and status = 'active' and role in ('volunteer', 'coordinator', 'admin')
  ) then
    raise exception 'assignment requires an active approved volunteer' using errcode = '22023';
  end if;

  select * into v_assignment from public.shift_assignments
  where shift_id = p_shift_id and profile_id = p_profile_id for update;
  if found then
    if v_assignment.assignment_status in ('assigned', 'confirmed') then
      return v_assignment;
    end if;
    update public.shift_assignments set assignment_status = 'assigned', absence_requested_at = null
      where id = v_assignment.id returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status)
      values (p_shift_id, p_profile_id, 'assigned') returning * into v_assignment;
  end if;
  return v_assignment;
end;
$$;

create or replace function public.list_coordinator_schedule(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  assigned_count bigint,
  status public.shift_status,
  title text,
  volunteer_instructions text,
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
  select s.id, s.starts_at, s.ends_at, s.required_volunteers,
         count(a.id) filter (where a.assignment_status in ('assigned', 'confirmed')) as assigned_count,
         s.status, coalesce(re.title, 'Prayer-room shift'), s.volunteer_instructions,
         exists (select 1 from public.public_events pe where pe.room_event_id = s.room_event_id and pe.published_at is not null) as is_public,
         max(pe.description), max(pe.location_label), max(pe.participation_format::text)::public.event_format, max(pe.public_url)
  from public.shifts s
  left join public.room_events re on re.id = s.room_event_id
  left join public.shift_assignments a on a.shift_id = s.id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where s.starts_at < p_ends_at and s.ends_at > p_starts_at
  group by s.id, re.title
  order by s.starts_at;
end;
$$;

create or replace function public.list_active_volunteers_for_assignment()
returns table (id uuid, display_name text, email text)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  return query select p.id, p.display_name, p.email from public.profiles p
    where p.status = 'active' and p.role in ('volunteer', 'coordinator', 'admin') order by p.display_name, p.email;
end;
$$;

-- Supersede the earlier capacity-only projection with the gathering details an
-- eligible volunteer needs to make an informed choice. It still exposes no
-- assignment rows, names, or contact details.
drop function if exists public.list_available_volunteer_shifts(integer);
create function public.list_available_volunteer_shifts(p_limit integer default 50)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  assigned_count bigint,
  open_places integer,
  title text,
  location_label text,
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
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode = '22023';
  end if;
  return query
  select s.id, s.starts_at, s.ends_at, s.required_volunteers, count(a.id),
         (s.required_volunteers - count(a.id)::integer), coalesce(re.title, 'Prayer-room volunteer shift'),
         pe.location_label, s.volunteer_instructions
  from public.shifts s
  left join public.shift_assignments a on a.shift_id = s.id and a.assignment_status in ('assigned'::public.assignment_status, 'confirmed'::public.assignment_status)
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where s.status = 'scheduled'::public.shift_status and s.starts_at >= timezone('utc', now()) and public.is_eligible_for_rule(s.eligibility_rule)
  group by s.id, re.title, pe.location_label
  having count(a.id) < s.required_volunteers
  order by s.starts_at limit p_limit;
end;
$$;

create or replace function public.list_my_shift_assignments(p_limit integer default 50)
returns table (
  assignment_id uuid,
  shift_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  location_label text,
  volunteer_instructions text,
  assignment_status public.assignment_status
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
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode = '22023';
  end if;
  return query
  select a.id, s.id, s.starts_at, s.ends_at, coalesce(re.title, 'Prayer-room shift'), pe.location_label,
         s.volunteer_instructions, a.assignment_status
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where a.profile_id = auth.uid() and s.ends_at >= timezone('utc', now())
    and a.assignment_status in ('assigned', 'confirmed', 'absence_requested')
  order by s.starts_at limit p_limit;
end;
$$;

revoke all on function public.coordinator_create_shift(text, timestamptz, timestamptz, smallint, text, boolean, text, text, public.event_format, text) from public, anon, authenticated;
revoke all on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, smallint, text, public.shift_status, boolean, text, text, public.event_format, text) from public, anon, authenticated;
revoke all on function public.coordinator_assign_volunteer(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_coordinator_schedule(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.list_active_volunteers_for_assignment() from public, anon, authenticated;
revoke all on function public.list_my_shift_assignments(integer) from public, anon, authenticated;
revoke all on function public.list_available_volunteer_shifts(integer) from public, anon, authenticated;
grant execute on function public.coordinator_create_shift(text, timestamptz, timestamptz, smallint, text, boolean, text, text, public.event_format, text) to authenticated;
grant execute on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, smallint, text, public.shift_status, boolean, text, text, public.event_format, text) to authenticated;
grant execute on function public.coordinator_assign_volunteer(uuid, uuid) to authenticated;
grant execute on function public.list_coordinator_schedule(timestamptz, timestamptz) to authenticated;
grant execute on function public.list_active_volunteers_for_assignment() to authenticated;
grant execute on function public.list_my_shift_assignments(integer) to authenticated;
grant execute on function public.list_available_volunteer_shifts(integer) to authenticated;

comment on function public.coordinator_create_shift(text, timestamptz, timestamptz, smallint, text, boolean, text, text, public.event_format, text) is
  'Coordinator-only creation of a room event, its volunteer shift, and optional public calendar projection.';
