-- Coordinator invitations remain pending until the volunteer accepts them.
alter type public.assignment_status add value if not exists 'pending';

-- Pending invitations reserve a place and block overlapping invitations for the
-- same volunteer, while remaining excluded from the confirmed schedule.
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
    raise exception 'request requires an active approved volunteer' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id and profile_id = p_profile_id
  for update;
  if found and v_assignment.assignment_status in ('assigned', 'confirmed', 'pending') then
    raise exception 'this volunteer already has an active assignment or request' using errcode = '23505';
  end if;

  if (select count(*) from public.shift_assignments
      where shift_id = p_shift_id and assignment_status in ('pending', 'assigned', 'confirmed'))
     >= (select required_volunteers from public.shifts where id = p_shift_id) then
    raise exception 'this shift is already fully covered or has pending requests';
  end if;

  if found then
    update public.shift_assignments
      set assignment_status = 'pending', confirmed_at = null, absence_requested_at = null,
          assignment_generation = v_assignment.assignment_generation + 1
      where id = v_assignment.id returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status, assignment_generation)
      values (p_shift_id, p_profile_id, 'pending', 1) returning * into v_assignment;
  end if;

  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end;
$$;

create or replace function public.respond_to_shift_invitation(
  p_assignment_id uuid,
  p_response text
)
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
  if p_response not in ('accepted', 'declined') then
    raise exception 'response must be accepted or declined' using errcode = '22023';
  end if;
  select * into v_assignment from public.shift_assignments
    where id = p_assignment_id and profile_id = auth.uid() for update;
  if not found or v_assignment.assignment_status <> 'pending' then
    raise exception 'pending invitation not found' using errcode = '02000';
  end if;

  update public.shift_assignments
    set assignment_status = case when p_response = 'accepted' then 'assigned' else 'declined' end,
        confirmed_at = null, absence_requested_at = null
    where id = p_assignment_id returning * into v_assignment;
  return v_assignment;
end;
$$;

create or replace function public.list_my_shift_assignments(p_limit integer default 50)
returns table (
  assignment_id uuid, shift_id uuid, starts_at timestamptz, ends_at timestamptz,
  title text, location_label text, volunteer_instructions text,
  assignment_status public.assignment_status, roles public.shift_role[]
)
language plpgsql stable security definer
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
  select a.id, s.id, s.starts_at, s.ends_at, coalesce(re.title, 'Prayer-room shift'),
         pe.location_label, s.volunteer_instructions, a.assignment_status,
         coalesce((select array_agg(sar.role order by sar.role)
                   from public.shift_assignment_roles sar where sar.assignment_id = a.id),
                  '{}'::public.shift_role[])
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where a.profile_id = auth.uid() and s.ends_at >= timezone('utc', now())
    and a.assignment_status in ('pending', 'assigned', 'confirmed', 'absence_requested')
  order by s.starts_at limit p_limit;
end;
$$;

revoke all on function public.coordinator_request_volunteer_with_roles(uuid, uuid, public.shift_role[]) from public, anon, authenticated;
revoke all on function public.respond_to_shift_invitation(uuid, text) from public, anon, authenticated;
grant execute on function public.coordinator_request_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
grant execute on function public.respond_to_shift_invitation(uuid, text) to authenticated;
grant execute on function public.list_my_shift_assignments(integer) to authenticated;

-- Queue the invitation email separately from the existing assigned-shift
-- reminder trigger. Delivery remains idempotent and opt-in via preferences.
create or replace function public.enqueue_assignment_request_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
begin
  if not (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.assignment_status is distinct from new.assignment_status))
     or new.assignment_status <> 'pending' then
    return new;
  end if;
  insert into public.message_jobs (assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context)
  values (new.id, new.profile_id, 'assignment_request', 'assignment:' || new.id::text || ':g' || new.assignment_generation::text || ':assignment_request', timezone('utc', now()),
          jsonb_build_object('assignment_id', new.id, 'generation', new.assignment_generation, 'valid_statuses', jsonb_build_array('pending')))
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger shift_assignments_enqueue_request_email
after insert or update on public.shift_assignments
for each row execute function public.enqueue_assignment_request_email();
