-- Assign a volunteer and their coordinator-selected role set atomically.
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
  v_assignment := public.coordinator_assign_volunteer(p_shift_id, p_profile_id);
  perform public.coordinator_set_assignment_roles(v_assignment.id, p_roles);
  return v_assignment;
end;
$$;

revoke all on function public.coordinator_assign_volunteer_with_roles(uuid, uuid, public.shift_role[]) from public, anon, authenticated;
grant execute on function public.coordinator_assign_volunteer_with_roles(uuid, uuid, public.shift_role[]) to authenticated;
