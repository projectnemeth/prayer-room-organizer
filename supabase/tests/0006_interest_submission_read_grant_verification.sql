-- Coordinator-only RLS is meaningful only when the authenticated API role can
-- reach the table. Anonymous visitors must remain unable to read submissions.

do $$
begin
  if not has_table_privilege('authenticated', 'public.interest_submissions', 'SELECT') then
    raise exception 'authenticated must have SELECT for coordinator RLS to evaluate';
  end if;

  if has_table_privilege('anon', 'public.interest_submissions', 'SELECT') then
    raise exception 'anon must never read serving-interest submissions';
  end if;
end;
$$;
