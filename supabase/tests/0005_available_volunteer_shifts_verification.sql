-- Verification for the capacity-only volunteer availability RPC.
-- Run after migrations with
-- `supabase db execute --file supabase/tests/0005_available_volunteer_shifts_verification.sql`.

begin;

do $$
declare
  v_security_definer boolean;
  v_config text;
  v_definition text;
begin
  if has_function_privilege(
    'anon',
    'public.list_available_volunteer_shifts(integer)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute the volunteer availability RPC';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.list_available_volunteer_shifts(integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated callers need the availability RPC grant';
  end if;

  select p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), ''),
         pg_get_functiondef(p.oid)
  into v_security_definer, v_config, v_definition
  from pg_proc p
  where p.oid = to_regprocedure('public.list_available_volunteer_shifts(integer)');

  if not coalesce(v_security_definer, false)
    or v_config !~ 'search_path=pg_catalog, public, auth, pg_temp'
    or v_definition not like '%public.is_active_volunteer()%'
    or v_definition not like '%count(a.id)%'
    or v_definition like '%profile_id%' then
    raise exception 'availability RPC must remain capacity-only and restricted to approved volunteers';
  end if;
end;
$$;

-- An authenticated caller without an approved profile must not be able to
-- enumerate upcoming shifts or capacity.
set local role authenticated;

do $$
begin
  begin
    perform public.list_available_volunteer_shifts(1);
    raise exception 'unapproved authenticated access unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

rollback;
