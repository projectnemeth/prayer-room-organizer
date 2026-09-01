-- Verification for the coordinator-only interest review RPC.
-- Run after migrations with
-- `supabase db execute --file supabase/tests/0004_coordinator_interest_review_verification.sql`.
-- The transaction is rolled back so its authorization smoke test leaves no data.

begin;

do $$
declare
  v_security_definer boolean;
  v_config text;
  v_definition text;
begin
  if has_table_privilege('anon', 'public.interest_submissions', 'UPDATE')
    or has_table_privilege('authenticated', 'public.interest_submissions', 'UPDATE') then
    raise exception 'API roles must not directly update interest submissions';
  end if;

  if has_function_privilege(
    'anon',
    'public.review_interest_submission(uuid, public.interest_status, text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute the coordinator review RPC';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.review_interest_submission(uuid, public.interest_status, text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated callers need the coordinator review RPC grant';
  end if;

  select p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), ''),
         pg_get_functiondef(p.oid)
  into v_security_definer, v_config, v_definition
  from pg_proc p
  where p.oid = to_regprocedure(
    'public.review_interest_submission(uuid, public.interest_status, text)'
  );

  if not coalesce(v_security_definer, false)
    or v_config !~ 'search_path=pg_catalog, public, auth, pg_temp'
    or v_definition not like '%public.is_coordinator()%'
    or v_definition not like '%auth.uid()%'
    or v_definition not like '%''approved''%'
    or v_definition not like '%''declined''%' then
    raise exception 'review RPC must retain its coordinator guard and hardened execution context';
  end if;
end;
$$;

-- An authenticated user with no active coordinator profile must still be
-- rejected. `SET LOCAL ROLE` exercises the API role's actual function grant;
-- no Auth user or prospect record is created in this verification.
set local role authenticated;

do $$
begin
  begin
    perform public.review_interest_submission(
      '00000000-0000-0000-0000-000000000004'::uuid,
      'approved'::public.interest_status,
      'must not be accepted without a coordinator profile'
    );
    raise exception 'non-coordinator access unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

rollback;
