-- Coordinator-only decision boundary for prospective volunteer interest forms.
-- This does not invite or create an authenticated user; invitation is a separate
-- coordinator action after a person has been approved.

create or replace function public.review_interest_submission(
  p_interest_id uuid,
  p_status public.interest_status,
  p_decision_note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_decision_note text := nullif(btrim(p_decision_note), '');
begin
  -- A grant to `authenticated` only makes this RPC reachable. The application
  -- role and active-status check is the actual authorization boundary.
  if auth.uid() is null or not public.is_coordinator() then
    raise exception 'coordinator access is required' using errcode = '42501';
  end if;

  if p_interest_id is null then
    raise exception 'an interest submission id is required' using errcode = '22023';
  end if;

  if p_status is null
    or p_status not in (
      'reviewing'::public.interest_status,
      'approved'::public.interest_status,
      'declined'::public.interest_status
    ) then
    raise exception 'review status must be reviewing, approved, or declined' using errcode = '22023';
  end if;

  if v_decision_note is not null and char_length(v_decision_note) > 4000 then
    raise exception 'decision note must not exceed 4000 characters' using errcode = '22023';
  end if;

  update public.interest_submissions
  set status = p_status,
      decision_note = v_decision_note,
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now())
  where id = p_interest_id;

  if not found then
    raise exception 'interest submission not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_interest_submission(uuid, public.interest_status, text)
  from public, anon, authenticated;
grant execute on function public.review_interest_submission(uuid, public.interest_status, text)
  to authenticated;

comment on function public.review_interest_submission(uuid, public.interest_status, text) is
  'Authenticated coordinator-only RPC. Records a prospect review decision without creating an Auth user or exposing direct interest-submission writes.';
