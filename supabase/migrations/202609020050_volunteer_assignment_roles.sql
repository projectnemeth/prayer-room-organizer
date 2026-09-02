-- Volunteer roles within a prayer-set shift assignment.
--
-- Roles are coordinator-assigned, not volunteer-selected. One volunteer may
-- hold multiple roles within a single assignment (e.g. Worship Leader + Tech
-- Director). The role list appears on the volunteer's private schedule so they
-- know what function they are filling for that set.

do $$ begin
  create type public.shift_role as enum (
    'prayer_leader',
    'worship_leader',
    'worship_team_member',
    'host',
    'tech_director'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.shift_assignment_roles (
  id              uuid        primary key default gen_random_uuid(),
  assignment_id   uuid        not null references public.shift_assignments(id) on delete cascade,
  role            public.shift_role not null,
  created_by      uuid        not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default timezone('utc', now()),
  constraint shift_assignment_roles_unique_role unique (assignment_id, role)
);
create index if not exists shift_assignment_roles_assignment_idx
  on public.shift_assignment_roles (assignment_id);

-- Volunteers can read their own assignment roles; coordinators can read all.
alter table public.shift_assignment_roles enable row level security;

create policy shift_assignment_roles_own_read on public.shift_assignment_roles
  for select to authenticated
  using (
    public.is_coordinator()
    or exists (
      select 1 from public.shift_assignments sa
      where sa.id = assignment_id and sa.profile_id = auth.uid()
    )
  );
create policy shift_assignment_roles_staff_write on public.shift_assignment_roles
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

grant select on public.shift_assignment_roles to authenticated;
grant insert, delete on public.shift_assignment_roles to authenticated;

-- ---------------------------------------------------------------------------
-- coordinator_set_assignment_roles
-- Replaces the full role set for one assignment atomically.
-- ---------------------------------------------------------------------------
create or replace function public.coordinator_set_assignment_roles(
  p_assignment_id uuid,
  p_roles         public.shift_role[]
)
returns public.shift_role[]
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_role public.shift_role;
  v_creator uuid;
begin
  if not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.shift_assignments where id = p_assignment_id) then
    raise exception 'assignment not found' using errcode = '02000';
  end if;

  v_creator := auth.uid();

  -- Remove roles that are no longer in the requested set
  delete from public.shift_assignment_roles
  where assignment_id = p_assignment_id
    and (p_roles is null or role <> all(p_roles));

  -- Upsert each requested role (ignore duplicates)
  if p_roles is not null then
    foreach v_role in array p_roles loop
      insert into public.shift_assignment_roles (assignment_id, role, created_by)
      values (p_assignment_id, v_role, v_creator)
      on conflict (assignment_id, role) do nothing;
    end loop;
  end if;

  return coalesce(p_roles, '{}'::public.shift_role[]);
end;
$$;

-- ---------------------------------------------------------------------------
-- coordinator_list_assignment_roles
-- Returns aggregated role arrays for all assignments in a set of shifts.
-- ---------------------------------------------------------------------------
create or replace function public.coordinator_list_assignment_roles(
  p_shift_ids uuid[]
)
returns table (
  assignment_id uuid,
  roles         public.shift_role[]
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
  return query
  select sar.assignment_id, array_agg(sar.role order by sar.role) as roles
  from public.shift_assignment_roles sar
  join public.shift_assignments sa on sa.id = sar.assignment_id
  where sa.shift_id = any(p_shift_ids)
  group by sar.assignment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- list_my_shift_assignments — extended with roles
-- Supersedes the previous version so volunteers see their per-set roles.
-- ---------------------------------------------------------------------------
create or replace function public.list_my_shift_assignments(p_limit integer default 50)
returns table (
  assignment_id      uuid,
  shift_id           uuid,
  starts_at          timestamptz,
  ends_at            timestamptz,
  title              text,
  location_label     text,
  volunteer_instructions text,
  assignment_status  public.assignment_status,
  roles              public.shift_role[]
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
         s.volunteer_instructions, a.assignment_status,
         coalesce(
           (select array_agg(sar.role order by sar.role)
            from public.shift_assignment_roles sar
            where sar.assignment_id = a.id),
           '{}'::public.shift_role[]
         ) as roles
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id
  left join public.room_events re on re.id = s.room_event_id
  left join public.public_events pe on pe.room_event_id = s.room_event_id and pe.published_at is not null
  where a.profile_id = auth.uid() and s.ends_at >= timezone('utc', now())
    and a.assignment_status in ('assigned', 'confirmed', 'absence_requested')
  order by s.starts_at limit p_limit;
end;
$$;

-- Grant/revoke for new functions
revoke all on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) from public, anon, authenticated;
revoke all on function public.coordinator_list_assignment_roles(uuid[]) from public, anon, authenticated;
revoke all on function public.list_my_shift_assignments(integer) from public, anon, authenticated;

grant execute on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) to authenticated;
grant execute on function public.coordinator_list_assignment_roles(uuid[]) to authenticated;
grant execute on function public.list_my_shift_assignments(integer) to authenticated;

comment on table public.shift_assignment_roles is
  'Per-shift-assignment roles designated by a coordinator. One person may hold multiple roles in the same assignment.';
comment on function public.coordinator_set_assignment_roles(uuid, public.shift_role[]) is
  'Coordinator-only: atomically replaces the role set for one shift assignment.';
comment on function public.coordinator_list_assignment_roles(uuid[]) is
  'Coordinator-only: returns aggregated role arrays for all assignments across a given set of shift IDs.';
