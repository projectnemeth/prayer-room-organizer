-- Verification for migration 202609020020. Run after all migrations.
-- The transaction is rolled back so confirmation smoke data is not retained.

begin;

do $$
declare
  v_preference_id uuid;
  v_confirm_hash text := repeat('a', 64);
  v_unsubscribe_hash text := repeat('b', 64);
  v_source_hash text := repeat('c', 64);
begin
  if has_function_privilege('anon', 'public.subscribe_to_updates(text, text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.request_update_subscription_confirmation(text, text, text, text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.confirm_update_subscription(text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.unsubscribe_update_subscription(text)', 'EXECUTE') then
    raise exception 'anonymous users must not receive direct update-consent procedure access';
  end if;

  if has_table_privilege('anon', 'public.email_preferences', 'INSERT, UPDATE, SELECT')
    or has_table_privilege('anon', 'public.update_subscription_attempts', 'SELECT') then
    raise exception 'anonymous users must not receive subscription or rate-limit table access';
  end if;

  if not public.request_update_subscription_confirmation(
    'double-opt-in-verification@example.invalid', v_confirm_hash, v_unsubscribe_hash, v_source_hash
  ) then
    raise exception 'confirmation request unexpectedly rate limited';
  end if;

  select id into v_preference_id
  from public.email_preferences
  where email_normalized = 'double-opt-in-verification@example.invalid'
    and not updates_opt_in
    and updates_confirmation_token_hash = v_confirm_hash
    and updates_confirmation_expires_at > timezone('utc', now());
  if v_preference_id is null then
    raise exception 'confirmation request did not create a pending preference';
  end if;

  begin
    update public.email_preferences set updates_opt_in = true where id = v_preference_id;
    raise exception 'direct opt-in unexpectedly bypassed recipient confirmation';
  exception when others then
    if sqlerrm not like '%require confirmation%' then raise; end if;
  end;

  if not public.confirm_update_subscription(v_confirm_hash) then
    raise exception 'confirmation token did not activate the subscription';
  end if;
  if not exists (
    select 1 from public.email_preferences
    where id = v_preference_id
      and updates_opt_in
      and updates_confirmed_at is not null
      and updates_unsubscribe_token_hash = v_unsubscribe_hash
  ) then
    raise exception 'confirmed subscription state is incomplete';
  end if;

  perform public.unsubscribe_update_subscription(v_unsubscribe_hash);
  if exists (select 1 from public.email_preferences where id = v_preference_id and updates_opt_in) then
    raise exception 'unsubscribe token did not opt the preference out';
  end if;
end;
$$;

rollback;
