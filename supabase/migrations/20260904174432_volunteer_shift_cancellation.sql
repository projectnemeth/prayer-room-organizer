-- An approved volunteer may release only their own upcoming assignment.  The
-- declined status retains an auditable record while removing the volunteer
-- from active coverage and allowing them to claim the shift again later.
create function public.cancel_my_shift_assignment(p_assignment_id uuid)
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

  update public.shift_assignments as a
  set assignment_status = 'declined',
      absence_requested_at = null
  from public.shifts as s
  where a.id = p_assignment_id
    and a.profile_id = auth.uid()
    and s.id = a.shift_id
    and s.starts_at > timezone('utc', now())
    and a.assignment_status in ('assigned', 'confirmed')
  returning a.* into v_assignment;

  if not found then
    raise exception 'this scheduled shift can no longer be cancelled' using errcode = '22023';
  end if;

  -- A cancelled volunteer must not retain a coordinator-assigned function
  -- if they later claim the shift again.
  delete from public.shift_assignment_roles
  where assignment_id = v_assignment.id;

  return v_assignment;
end;
$$;

revoke all on function public.cancel_my_shift_assignment(uuid) from public, anon;
grant execute on function public.cancel_my_shift_assignment(uuid) to authenticated;
