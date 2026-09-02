-- Pending invitations reserve capacity, cannot outlive a cancelled shift, and
-- must not be returned to another volunteer as an open place.
begin;

do $$
declare
  v_available_definition text;
  v_schedule_definition text;
  v_update_definition text;
  v_visibility_definition text;
begin
  select pg_get_functiondef('public.list_available_volunteer_shifts(integer)'::regprocedure) into v_available_definition;
  select pg_get_functiondef('public.list_coordinator_schedule(timestamp with time zone,timestamp with time zone)'::regprocedure) into v_schedule_definition;
  select pg_get_functiondef('public.coordinator_update_shift(uuid,text,timestamp with time zone,timestamp with time zone,smallint,text,public.shift_status,boolean,text,text,public.event_format,text)'::regprocedure) into v_update_definition;
  select pg_get_functiondef('public.can_view_shift(uuid)'::regprocedure) into v_visibility_definition;

  if v_available_definition not like '%''pending'', ''assigned'', ''confirmed''%'
    or v_available_definition not like '%reserved_count%'
    or v_schedule_definition not like '%pending_count%'
    or v_update_definition not like '%''pending'', ''assigned'', ''confirmed'', ''absence_requested''%'
    or v_visibility_definition not like '%''pending'', ''assigned'', ''confirmed''%'
  then
    raise exception 'pending invitations must reserve capacity across every schedule projection and mutation';
  end if;
end;
$$;

rollback;
