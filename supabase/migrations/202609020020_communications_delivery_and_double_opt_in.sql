-- Durable reminder delivery and consent-safe public updates.
--
-- Edge Functions are the only callers of the subscription procedures below.
-- They hold the service-role credential, rate-limit requests, and keep raw
-- confirmation/unsubscribe tokens out of Postgres. The browser never receives
-- a table grant for email preferences.

alter table public.email_preferences
  add column if not exists updates_confirmed_at timestamptz,
  add column if not exists updates_confirmation_token_hash text,
  add column if not exists updates_confirmation_expires_at timestamptz,
  add column if not exists updates_confirmation_sent_at timestamptz;

-- A small, privacy-preserving record of public form attempts. `source_hash` is
-- a keyed hash produced only in the Edge Function; no raw IP address is stored.
create table if not exists public.update_subscription_attempts (
  id bigint generated always as identity primary key,
  email_normalized text not null,
  source_hash text not null,
  requested_at timestamptz not null default timezone('utc', now()),
  constraint update_subscription_attempts_email_not_blank check (btrim(email_normalized) <> ''),
  constraint update_subscription_attempts_source_hash_format check (source_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists update_subscription_attempts_email_requested_idx
  on public.update_subscription_attempts (email_normalized, requested_at desc);
create index if not exists update_subscription_attempts_source_requested_idx
  on public.update_subscription_attempts (source_hash, requested_at desc);

-- No update message may be sent based on the former single-step public form.
-- There is no update campaign sender yet, so requiring a fresh confirmation is
-- safe and avoids treating a typed address as consent.
update public.email_preferences
set updates_opt_in = false,
    updates_consented_at = null,
    updates_confirmed_at = null,
    updates_confirmation_token_hash = null,
    updates_confirmation_expires_at = null,
    updates_confirmation_sent_at = null
where updates_opt_in
  and updates_confirmed_at is null;

alter table public.email_preferences
  drop constraint if exists email_preferences_consent;
alter table public.email_preferences
  add constraint email_preferences_confirmed_consent check (
    not updates_opt_in
    or (updates_consented_at is not null and updates_confirmed_at is not null)
  );
alter table public.email_preferences
  drop constraint if exists email_preferences_confirmation_token_hash_format;
alter table public.email_preferences
  add constraint email_preferences_confirmation_token_hash_format check (
    updates_confirmation_token_hash is null
    or updates_confirmation_token_hash ~ '^[a-f0-9]{64}$'
  );

create unique index if not exists email_preferences_confirmation_token_hash_key
  on public.email_preferences (updates_confirmation_token_hash)
  where updates_confirmation_token_hash is not null;

-- The old trigger correctly handled ordinary opt-outs, but it also let a
-- direct update turn an opted-out address back on. Only the confirmation
-- procedure sets this transaction-local flag before it restores consent.
create or replace function public.guard_email_preferences()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  new.email := lower(btrim(new.email));
  if tg_op = 'UPDATE' then
    if auth.uid() = old.profile_id and not public.is_coordinator() then
      if new.profile_id is distinct from old.profile_id or new.email is distinct from old.email then
        raise exception 'email and profile ownership cannot be changed here';
      end if;
    end if;

    if new.updates_opt_in and not old.updates_opt_in then
      if current_setting('altar.confirming_update_subscription', true) is distinct from 'true' then
        raise exception 'email updates require confirmation from the recipient mailbox';
      end if;
      new.updates_consented_at := coalesce(new.updates_consented_at, timezone('utc', now()));
      new.updates_confirmed_at := coalesce(new.updates_confirmed_at, timezone('utc', now()));
      new.updates_unsubscribed_at := null;
    elsif not new.updates_opt_in and old.updates_opt_in then
      new.updates_unsubscribed_at := coalesce(new.updates_unsubscribed_at, timezone('utc', now()));
    end if;
  end if;
  return new;
end;
$$;

-- Deprecated public RPCs are deliberately unavailable. They are retained as
-- explicit errors for a clearer operational failure if an old static build is
-- accidentally deployed, rather than silently recording unconfirmed consent.
create or replace function public.subscribe_to_updates(
  p_email text,
  p_consent_source text default 'public_updates_form'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'public update subscriptions require email confirmation' using errcode = '42501';
end;
$$;

create or replace function public.unsubscribe_from_updates(p_unsubscribe_token uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'legacy unsubscribe links are no longer accepted' using errcode = '42501';
end;
$$;

-- A separate hash avoids retaining a raw unsubscribe token and avoids reusing
-- a confirmation token after it has been consumed.
alter table public.email_preferences
  add column if not exists updates_unsubscribe_token_hash text;
alter table public.email_preferences
  drop constraint if exists email_preferences_unsubscribe_token_hash_format;
alter table public.email_preferences
  add constraint email_preferences_unsubscribe_token_hash_format check (
    updates_unsubscribe_token_hash is null
    or updates_unsubscribe_token_hash ~ '^[a-f0-9]{64}$'
  );
create unique index if not exists email_preferences_unsubscribe_token_hash_key
  on public.email_preferences (updates_unsubscribe_token_hash)
  where updates_unsubscribe_token_hash is not null;

-- Creates a one-time confirmation record. The same generic response is used
-- whether the address is new, active, opted out, or rate limited. This avoids
-- address enumeration while still allowing an owner to re-subscribe by proving
-- access to the mailbox.
create or replace function public.request_update_subscription_confirmation(
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
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_now timestamptz := timezone('utc', now());
  v_preference_id uuid;
  v_can_send boolean := true;
begin
  if char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;
  if p_confirmation_token_hash !~ '^[a-f0-9]{64}$'
    or p_unsubscribe_token_hash !~ '^[a-f0-9]{64}$'
    or p_source_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid confirmation request' using errcode = '22023';
  end if;

  -- Serialize concurrent requests for one address so parallel browser/bot
  -- submissions cannot race past the per-address request limit.
  perform pg_advisory_xact_lock(hashtext(v_email));

  -- At most three requests for an address and six from a hashed source per
  -- rolling hour. Store attempts even when blocked so bursts cannot bypass the
  -- guard by switching between the two limits.
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
    updates_opt_in,
    updates_consented_at,
    updates_confirmed_at,
    updates_confirmation_token_hash,
    updates_confirmation_expires_at,
    updates_confirmation_sent_at,
    updates_unsubscribe_token_hash
  ) values (
    v_email, false, null, null, p_confirmation_token_hash, v_now + interval '24 hours', v_now, p_unsubscribe_token_hash
  )
  on conflict (email_normalized) do update set
    -- Do not turn an existing preference on here. A new confirmation is the
    -- only path that may restore an address that was previously opted out.
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

create or replace function public.unsubscribe_update_subscription(p_unsubscribe_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_preference_id uuid;
begin
  if p_unsubscribe_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  update public.email_preferences
  set updates_opt_in = false,
      updates_unsubscribed_at = coalesce(updates_unsubscribed_at, timezone('utc', now()))
  where updates_unsubscribe_token_hash = p_unsubscribe_token_hash
    and updates_opt_in
  returning id into v_preference_id;

  if found then
    insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
    values ('system', null, 'updates_subscription_unsubscribed', 'email_preference', v_preference_id);
  end if;
  return true;
end;
$$;

-- The raw unsubscribe token exists only in the confirmation email workflow and
-- is never returned through the Data API.
create or replace function public.confirm_update_subscription(p_confirmation_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_preference_id uuid;
begin
  if p_confirmation_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  perform set_config('altar.confirming_update_subscription', 'true', true);
  update public.email_preferences
  set updates_opt_in = true,
      updates_consented_at = timezone('utc', now()),
      updates_confirmed_at = timezone('utc', now()),
      updates_consent_source = 'public_updates_double_opt_in',
      updates_unsubscribed_at = null,
      updates_confirmation_token_hash = null,
      updates_confirmation_expires_at = null
  where updates_confirmation_token_hash = p_confirmation_token_hash
    and updates_confirmation_expires_at > timezone('utc', now())
  returning id into v_preference_id;

  if not found then
    return false;
  end if;

  insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
  values ('system', null, 'updates_subscription_confirmed', 'email_preference', v_preference_id);
  return true;
end;
$$;

-- Limit worker RPCs to the Edge Function's service role. No public or browser
-- role may claim, inspect, or complete a delivery job.
revoke all on function public.request_update_subscription_confirmation(text, text, text, text) from public, anon, authenticated;
revoke all on function public.confirm_update_subscription(text) from public, anon, authenticated;
revoke all on function public.unsubscribe_update_subscription(text) from public, anon, authenticated;
revoke all on function public.subscribe_to_updates(text, text) from public, anon, authenticated;
revoke all on function public.unsubscribe_from_updates(uuid) from public, anon, authenticated;
grant execute on function public.request_update_subscription_confirmation(text, text, text, text) to service_role;
grant execute on function public.confirm_update_subscription(text) to service_role;
grant execute on function public.unsubscribe_update_subscription(text) to service_role;
grant execute on function public.claim_due_message_jobs(integer, uuid) to service_role;
grant execute on function public.complete_message_job(uuid, uuid, public.message_status, text, text) to service_role;

revoke all on table public.update_subscription_attempts from public, anon, authenticated;

comment on table public.update_subscription_attempts is
  'Hashed, short-lived-equivalent rate-limit audit data for public update confirmation requests. Retain only as long as operations needs it.';
comment on function public.request_update_subscription_confirmation(text, text, text, text) is
  'Service-role-only double-opt-in request procedure. It records rate-limit attempts and never restores update consent.';
comment on function public.confirm_update_subscription(text) is
  'Service-role-only confirmation procedure. The only procedure allowed to restore update consent after an opt-out.';
comment on function public.unsubscribe_update_subscription(text) is
  'Service-role-only token opt-out procedure. It deliberately has no email-address lookup behavior.';
