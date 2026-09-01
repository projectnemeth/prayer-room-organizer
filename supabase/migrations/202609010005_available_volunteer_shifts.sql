-- A deliberately narrow, private projection for approved volunteers. The
-- underlying assignment table stays private; this returns capacity only, never
-- another volunteer's name, contact information, or assignment record.

create or replace function public.list_available_volunteer_shifts(p_limit integer default 50)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  required_volunteers smallint,
  assigned_count bigint,
  open_places integer
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
  select
    s.id,
    s.starts_at,
    s.ends_at,
    s.required_volunteers,
    count(a.id) as assigned_count,
    (s.required_volunteers - count(a.id)::integer) as open_places
  from public.shifts s
  left join public.shift_assignments a
    on a.shift_id = s.id
   and a.assignment_status in ('assigned'::public.assignment_status, 'confirmed'::public.assignment_status)
  where s.status = 'scheduled'::public.shift_status
    and s.starts_at >= timezone('utc', now())
    and public.is_eligible_for_rule(s.eligibility_rule)
  group by s.id
  having count(a.id) < s.required_volunteers
  order by s.starts_at asc
  limit p_limit;
end;
$$;

revoke all on function public.list_available_volunteer_shifts(integer)
  from public, anon, authenticated;
grant execute on function public.list_available_volunteer_shifts(integer)
  to authenticated;

comment on function public.list_available_volunteer_shifts(integer) is
  'Approved-volunteer, capacity-only projection of eligible upcoming shifts. It never exposes other volunteers or private room-event details.';
