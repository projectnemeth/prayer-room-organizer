-- Verification for the anonymous public-form RPC boundary.
-- Run after migrations with `supabase db execute --file supabase/tests/0002_public_form_rpcs_verification.sql`.
-- The transaction is rolled back so the smoke rows are never retained.

begin;

do $$
declare
  v_interest_id uuid;
  v_preference_id uuid;
  v_token uuid;
begin
  if has_table_privilege('anon', 'public.interest_submissions', 'INSERT') then
    raise exception 'anon must not insert directly into interest_submissions';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'interest_submissions'
      and policyname = 'interest_submissions_public_submit'
  ) then
    raise exception 'the former anonymous insert policy must be removed';
  end if;

  if not has_function_privilege('anon', 'public.submit_serve_interest(text, text, text, jsonb, jsonb, text)', 'EXECUTE') then
    raise exception 'anon is missing the required public interest-form RPC grant';
  end if;

  -- Updates moved to rate-limited Edge Functions with double opt-in. The old
  -- direct RPCs must stay unavailable in a fully migrated database.
  if has_function_privilege('anon', 'public.subscribe_to_updates(text, text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.unsubscribe_from_updates(uuid)', 'EXECUTE') then
    raise exception 'anon must not directly alter update subscriptions';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_serve_interest'
      and (not p.prosecdef or coalesce(array_to_string(p.proconfig, ','), '') !~ 'search_path=pg_catalog, public, pg_temp')
  ) then
    raise exception 'public-form RPCs must be security definer functions with a fixed search_path';
  end if;

  perform public.submit_serve_interest(
    'Public Form Verification',
    'public-form-verification@example.invalid',
    null,
    '["Mornings", "Weekdays"]'::jsonb,
    '["Prayer"]'::jsonb,
    'Verification-only record'
  );

  select id into v_interest_id
  from public.interest_submissions
  where email = 'public-form-verification@example.invalid';
  if v_interest_id is null then
    raise exception 'interest RPC did not create a row';
  end if;

  begin
    perform public.submit_serve_interest(
      'Public Form Verification',
      'invalid-interest@example.invalid',
      null,
      '["Unapproved time"]'::jsonb,
      '[]'::jsonb,
      null
    );
    raise exception 'invalid availability unexpectedly succeeded';
  exception when sqlstate '22023' then
    null;
  end;

end;
$$;

rollback;
