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

  if not has_function_privilege('anon', 'public.submit_serve_interest(text, text, text, jsonb, jsonb, text)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.subscribe_to_updates(text, text)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.unsubscribe_from_updates(uuid)', 'EXECUTE') then
    raise exception 'anon is missing a required public-form RPC grant';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('submit_serve_interest', 'subscribe_to_updates', 'unsubscribe_from_updates')
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

  perform public.subscribe_to_updates('updates-verification@example.invalid');
  select id, updates_unsubscribe_token into v_preference_id, v_token
  from public.email_preferences
  where email_normalized = 'updates-verification@example.invalid';
  if v_preference_id is null or v_token is null then
    raise exception 'subscription RPC did not create a tokenized preference';
  end if;

  perform public.unsubscribe_from_updates(v_token);
  if exists (
    select 1 from public.email_preferences
    where id = v_preference_id and updates_opt_in
  ) then
    raise exception 'unsubscribe RPC did not opt the preference out';
  end if;
end;
$$;

rollback;
