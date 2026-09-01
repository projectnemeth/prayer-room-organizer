-- Confirms private trigger helpers are not callable through the Data API.

do $$
declare
  v_function text;
begin
  foreach v_function in array array[
    'public.handle_new_auth_user()',
    'public.sync_profile_email_from_auth()',
    'public.create_profile_email_preferences()',
    'public.sync_profile_email_preferences()',
    'public.enqueue_assignment_reminders()',
    'public.write_audit_row()'
  ] loop
    if has_function_privilege('anon', v_function, 'EXECUTE')
      or has_function_privilege('authenticated', v_function, 'EXECUTE') then
      raise exception 'API roles must not execute %', v_function;
    end if;
  end loop;

  if not has_function_privilege(
    'anon',
    'public.submit_serve_interest(text, text, text, jsonb, jsonb, text)',
    'EXECUTE'
  ) then
    raise exception 'anonymous public interest RPC must remain available';
  end if;
end;
$$;
