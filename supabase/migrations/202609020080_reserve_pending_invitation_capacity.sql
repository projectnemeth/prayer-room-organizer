-- Pending invitations reserve a place until the volunteer accepts or declines.
-- Keep every capacity check and projection aligned with that invariant.

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
  if not found then return false; end if;

  if exists (
    select 1 from public.shift_assignments a
    where a.shift_id = p_shift_id and a.profile_id = auth.uid()
  ) then
    return true;
  end if;

  return v_shift.status = 'scheduled'
    and public.is_eligible_for_rule(v_shift.eligibility_rule)
    and (
      select count(*) from public.shift_assignments a
      where a.shift_id = p_shift_id and a.assignment_status in ('pending', 'assigned', 'confirmed')
    ) < v_shift.required_volunteers;
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
  v_reserved_assignments integer;
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
  select count(*) into v_reserved_assignments
  from public.shift_assignments
  where shift_id = p_shift_id and assignment_status in ('pending', 'assigned', 'confirmed');
  if p_status = 'scheduled' and p_required_volunteers < v_reserved_assignments then
    raise exception 'capacity cannot be lower than the current reserved assignments' using errcode = '22023';
  end if;

  if v_shift.room_event_id is not null then
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
      where shift_id = p_shift_id and assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested');
  end if;
  return v_shift;
end;
$$;

drop function if exists public.list_coordinator_schedule(timestamptz, timestamptz);
create function public.list_coordinator_schedule(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  assigned_count bigint,
  pending_count bigint,
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
         count(a.id) filter (where a.assignment_status = 'pending') as pending_count,
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

drop function if exists public.list_available_volunteer_shifts(integer);
create function public.list_available_volunteer_shifts(p_limit integer default 50)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  assigned_count bigint,
  reserved_count bigint,
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
  select s.id, s.starts_at, s.ends_at, s.required_volunteers,
         count(a.id) filter (where a.assignment_status in ('assigned', 'confirmed')) as assigned_count,
         count(a.id) filter (where a.assignment_status in ('pending', 'assigned', 'confirmed')) as reserved_count,
         (s.required_volunteers - (count(a.id) filter (where a.assignment_status in ('pending', 'assigned', 'confirmed')))::integer),
         coalesce(re.title, 'Prayer-room volunteer shift'), pe.location_label, s.volunteer_instructions
  from public.shifts s
  left join public.shift_assignments a on a.shift_id = s.id
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where s.status = 'scheduled'::public.shift_status and s.starts_at >= timezone('utc', now()) and public.is_eligible_for_rule(s.eligibility_rule)
  group by s.id, re.title, pe.location_label
  having count(a.id) filter (where a.assignment_status in ('pending', 'assigned', 'confirmed')) < s.required_volunteers
  order by s.starts_at limit p_limit;
end;
$$;

revoke all on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, smallint, text, public.shift_status, boolean, text, text, public.event_format, text) from public, anon, authenticated;
revoke all on function public.list_coordinator_schedule(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.list_available_volunteer_shifts(integer) from public, anon, authenticated;
grant execute on function public.coordinator_update_shift(uuid, text, timestamptz, timestamptz, smallint, text, public.shift_status, boolean, text, text, public.event_format, text) to authenticated;
grant execute on function public.list_coordinator_schedule(timestamptz, timestamptz) to authenticated;
grant execute on function public.list_available_volunteer_shifts(integer) to authenticated;
