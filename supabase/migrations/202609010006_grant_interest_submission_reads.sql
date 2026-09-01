-- Coordinator workspace requires table-level SELECT in addition to its RLS
-- policy. The existing interest_submissions_staff_read policy still restricts
-- every returned row to active coordinators and administrators.

grant select on public.interest_submissions to authenticated;
