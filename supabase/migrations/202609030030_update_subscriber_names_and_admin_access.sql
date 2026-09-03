-- Public update subscribers are distinct from volunteer records. Keep their
-- contact details available only to active administrators, even when a person
-- has not joined the private volunteer portal.

alter table public.email_preferences
  add column if not exists updates_subscriber_name text;

alter table public.email_preferences
  drop constraint if exists email_preferences_updates_subscriber_name_length;
alter table public.email_preferences
  add constraint email_preferences_updates_subscriber_name_length check (
    updates_subscriber_name is null
    or char_length(btrim(updates_subscriber_name)) between 1 and 160
  );

-- Recreate the confirmation request procedure with the name supplied by the
-- public form. The Edge Function is its sole caller; browser roles retain no
-- ability to invoke it directly.
drop function if exists public.request_update_subscription_confirmation(text, text, text, text);
create function public.request_update_subscription_confirmation(
  p_name text,
  p_email text,
  p_confirmation_token_hash text,
  p_unsubscribe_token_hash text,
  p_source_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_now timestamptz := timezone('utc', now());
  v_preference_id uuid;
  v_can_send boolean := true;
begin
  if v_name is null or char_length(v_name) not between 1 and 160 then
    raise exception 'name must be between 1 and 160 characters' using errcode = '22023';
  end if;
  if char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;
  if p_confirmation_token_hash !~ '^[a-f0-9]{64}$'
    or p_unsubscribe_token_hash !~ '^[a-f0-9]{64}$'
    or p_source_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid confirmation request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_email));
  if (select count(*) from public.update_subscription_attempts
      where email_normalized = v_email and requested_at > v_now - interval '1 hour') >= 3
    or (select count(*) from public.update_subscription_attempts
        where source_hash = p_source_hash and requested_at > v_now - interval '1 hour') >= 6 then
    v_can_send := false;
  end if;

  insert into public.update_subscription_attempts (email_normalized, source_hash, requested_at)
  values (v_email, p_source_hash, v_now);

  if not v_can_send then
    return false;
  end if;

  insert into public.email_preferences (
    email,
    updates_subscriber_name,
    updates_opt_in,
    updates_consented_at,
    updates_confirmed_at,
    updates_confirmation_token_hash,
    updates_confirmation_expires_at,
    updates_confirmation_sent_at,
    updates_unsubscribe_token_hash
  ) values (
    v_email, v_name, false, null, null, p_confirmation_token_hash, v_now + interval '24 hours', v_now, p_unsubscribe_token_hash
  )
  on conflict (email_normalized) do update set
    updates_subscriber_name = excluded.updates_subscriber_name,
    updates_confirmation_token_hash = excluded.updates_confirmation_token_hash,
    updates_confirmation_expires_at = excluded.updates_confirmation_expires_at,
    updates_confirmation_sent_at = excluded.updates_confirmation_sent_at,
    updates_unsubscribe_token_hash = excluded.updates_unsubscribe_token_hash
  returning id into v_preference_id;

  insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
  values ('system', null, 'updates_confirmation_requested', 'email_preference', v_preference_id);

  return true;
end;
$$;

-- Coordinators may manage the room and volunteers, but public update contact
-- details are available only to active administrators (or to a profile owner
-- for their own preference row).
drop policy if exists email_preferences_select_own_or_staff on public.email_preferences;
create policy email_preferences_select_own_or_admin on public.email_preferences for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists email_preferences_update_own_or_staff on public.email_preferences;
create policy email_preferences_update_own_or_admin on public.email_preferences for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- The browser uses this narrow, confirmed-only view in the administrator
-- workspace. It intentionally excludes pending confirmations, opt-outs, and
-- operational token data.
create or replace function public.list_confirmed_update_subscribers()
returns table (
  subscriber_name text,
  email text,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator access is required' using errcode = '42501';
  end if;

  return query
  select ep.updates_subscriber_name, ep.email, ep.updates_confirmed_at
  from public.email_preferences ep
  where ep.updates_opt_in
    and ep.updates_confirmed_at is not null
    and ep.updates_unsubscribed_at is null
  order by ep.updates_confirmed_at desc;
end;
$$;

revoke all on function public.request_update_subscription_confirmation(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.request_update_subscription_confirmation(text, text, text, text, text) to service_role;
revoke all on function public.list_confirmed_update_subscribers() from public, anon;
grant execute on function public.list_confirmed_update_subscribers() to authenticated;

comment on column public.email_preferences.updates_subscriber_name is
  'Name supplied with the public updates form. It is visible only to active administrators.';
comment on function public.list_confirmed_update_subscribers() is
  'Administrator-only, confirmed public update subscribers without preference token data.';
