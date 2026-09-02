-- Verification for coordinator schedule mutations and safe live projections.
begin;

do $$
declare
  v_function regprocedure;
  v_config text;
begin
  foreach v_function in array array[
    'public.coordinator_create_shift(text,timestamp with time zone,timestamp with time zone,smallint,text,boolean,text,text,public.event_format,text)'::regprocedure,
    'public.coordinator_update_shift(uuid,text,timestamp with time zone,timestamp with time zone,smallint,text,public.shift_status,boolean,text,text,public.event_format,text)'::regprocedure,
    'public.coordinator_assign_volunteer(uuid,uuid)'::regprocedure,
    'public.list_coordinator_schedule(timestamp with time zone,timestamp with time zone)'::regprocedure,
    'public.list_active_volunteers_for_assignment()'::regprocedure,
    'public.list_my_shift_assignments(integer)'::regprocedure,
    'public.list_available_volunteer_shifts(integer)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'EXECUTE')
      or not has_function_privilege('authenticated', v_function, 'EXECUTE') then
      raise exception 'function % has an invalid API grant', v_function;
    end if;
    select coalesce(array_to_string(proconfig, ','), '') into v_config from pg_proc where oid = v_function;
    if v_config !~ 'search_path=pg_catalog, public, auth, pg_temp' then
      raise exception 'function % must pin a safe search_path', v_function;
    end if;
  end loop;
end;
$$;

set local role authenticated;
do $$
begin
  begin
    perform public.list_coordinator_schedule(timezone('utc', now()), timezone('utc', now()) + interval '7 days');
    raise exception 'non-coordinator schedule read unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.list_my_shift_assignments(1);
    raise exception 'unapproved assignment read unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

rollback;
