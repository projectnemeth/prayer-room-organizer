-- Role assignments are transactional schedule updates. Keep their delivery in
-- the existing durable queue, and retain a per-volunteer in-portal notice
-- until the volunteer has seen it.
alter table public.shift_assignments
  add column if not exists role_assigned_at timestamptz,
  add column if not exists role_notice_seen_at timestamptz;

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
  v_existing_roles public.shift_role[];
  v_normalized_roles public.shift_role[];
  v_now timestamptz := timezone('utc', now());
  v_change_kind text;
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

  select coalesce(array_agg(distinct requested_role order by requested_role), '{}'::public.shift_role[])
  into v_normalized_roles
  from unnest(p_roles) as requested_role;

  foreach v_role in array v_normalized_roles loop
    if not exists (
      select 1 from public.shift_role_requirements
      where shift_id = v_assignment.shift_id and role = v_role
    ) then
      raise exception 'this shift does not require role %', v_role using errcode = '22023';
    end if;
  end loop;

  select coalesce(array_agg(sar.role order by sar.role), '{}'::public.shift_role[])
  into v_existing_roles
  from public.shift_assignment_roles sar
  where sar.assignment_id = v_assignment.id;

  -- A no-op save should not send a duplicate email or revive a dismissed notice.
  if v_existing_roles = v_normalized_roles then
    return v_normalized_roles;
  end if;

  v_change_kind := case when cardinality(v_existing_roles) = 0 then 'assigned' else 'updated' end;

  delete from public.shift_assignment_roles where assignment_id = v_assignment.id;
  foreach v_role in array v_normalized_roles loop
    insert into public.shift_assignment_roles (assignment_id, role, created_by)
    values (v_assignment.id, v_role, auth.uid());
  end loop;

  update public.shift_assignments
    set role_assigned_at = v_now,
        role_notice_seen_at = null
    where id = v_assignment.id;

  insert into public.message_jobs (
    assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context
  ) values (
    v_assignment.id,
    v_assignment.profile_id,
    'role_assignment',
    'role-assignment:' || v_assignment.id::text || ':at:' || to_char(v_now at time zone 'UTC', 'YYYYMMDDHH24MISSUS'),
    v_now,
    jsonb_build_object(
      'generation', v_assignment.assignment_generation,
      'valid_statuses', jsonb_build_array('pending', 'assigned', 'confirmed', 'absence_requested'),
      'role_change', v_change_kind,
      'roles', to_jsonb(v_normalized_roles)
    )
  ) on conflict (dedupe_key) do nothing;

  return v_normalized_roles;
end;
$$;

drop function if exists public.list_my_shift_assignments(integer);
create function public.list_my_shift_assignments(p_limit integer default 50)
returns table (
  assignment_id uuid,
  shift_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  location_label text,
  assignment_status public.assignment_status,
  roles public.shift_role[],
  role_instructions jsonb,
  role_notice_pending boolean
)
language plpgsql stable security definer
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
  select a.id, s.id, s.starts_at, s.ends_at, coalesce(re.title, 'Prayer-room shift'), pe.location_label,
    a.assignment_status,
    coalesce((select array_agg(sar.role order by sar.role)
      from public.shift_assignment_roles sar where sar.assignment_id = a.id), '{}'::public.shift_role[]),
    coalesce((select jsonb_object_agg(r.role::text, r.volunteer_instructions)
      from public.shift_assignment_roles sar
      join public.shift_role_requirements r on r.shift_id = s.id and r.role = sar.role
      where sar.assignment_id = a.id), '{}'::jsonb),
    a.role_assigned_at is not null and a.role_notice_seen_at is null
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where a.profile_id = auth.uid()
    and s.ends_at >= timezone('utc', now())
    and a.assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested')
  order by s.starts_at
  limit p_limit;
end;
$$;

create or replace function public.acknowledge_my_role_assignment_notice(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not public.is_active_volunteer() then
    raise exception 'approved volunteer access is required' using errcode = '42501';
  end if;

  update public.shift_assignments
    set role_notice_seen_at = timezone('utc', now())
    where id = p_assignment_id
      and profile_id = auth.uid()
      and role_assigned_at is not null
      and role_notice_seen_at is null;

  return found;
end;
$$;

revoke all on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) from public, anon, authenticated;
revoke all on function public.list_my_shift_assignments(integer) from public, anon, authenticated;
revoke all on function public.acknowledge_my_role_assignment_notice(uuid) from public, anon, authenticated;
grant execute on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) to authenticated;
grant execute on function public.list_my_shift_assignments(integer) to authenticated;
grant execute on function public.acknowledge_my_role_assignment_notice(uuid) to authenticated;

comment on function public.acknowledge_my_role_assignment_notice(uuid) is
  'Marks the current approved volunteer''s role-assignment portal notice as seen.';
