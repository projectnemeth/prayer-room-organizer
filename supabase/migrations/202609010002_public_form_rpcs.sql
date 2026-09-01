-- Public form boundary: anonymous visitors may call narrowly scoped RPCs, but
-- never receive direct table access to prospective volunteer or email data.

drop policy if exists interest_submissions_public_submit on public.interest_submissions;
revoke insert on public.interest_submissions from anon, authenticated;

alter table public.email_preferences
  add column if not exists updates_unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists email_preferences_updates_unsubscribe_token_key
  on public.email_preferences (updates_unsubscribe_token);

-- Log first-time public interest submissions as system actions. The requester
-- is anonymous, so no authenticated profile should be attributed to the row.
drop trigger if exists interest_submissions_audit on public.interest_submissions;
create trigger interest_submissions_audit after insert or update on public.interest_submissions
for each row execute function public.write_audit_row('interest_submission');

create or replace function public.submit_serve_interest(
  p_name text,
  p_email text,
  p_phone_e164 text default null,
  p_availability jsonb default '[]'::jsonb,
  p_desired_ways_to_serve jsonb default '[]'::jsonb,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone_e164 text := nullif(btrim(p_phone_e164), '');
  v_availability jsonb := coalesce(p_availability, '[]'::jsonb);
  v_desired_ways_to_serve jsonb := coalesce(p_desired_ways_to_serve, '[]'::jsonb);
  v_notes text := nullif(btrim(p_notes), '');
begin
  if char_length(v_name) not between 1 and 160 then
    raise exception 'name must be between 1 and 160 characters' using errcode = '22023';
  end if;

  if char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;

  if v_phone_e164 is not null and v_phone_e164 !~ '^\\+[1-9][0-9]{7,14}$' then
    raise exception 'phone must use E.164 format' using errcode = '22023';
  end if;

  if jsonb_typeof(v_availability) <> 'array'
    or jsonb_array_length(v_availability) > 5
    or exists (
      select 1
      from jsonb_array_elements(v_availability) as option(value)
      where jsonb_typeof(option.value) <> 'string'
        or option.value #>> '{}' not in ('Mornings', 'Midday', 'Evenings', 'Weekdays', 'Weekends')
    )
    or (select count(*) from jsonb_array_elements(v_availability)) <> (
      select count(distinct option.value #>> '{}')
      from jsonb_array_elements(v_availability) as option(value)
    ) then
    raise exception 'availability contains an invalid selection' using errcode = '22023';
  end if;

  if jsonb_typeof(v_desired_ways_to_serve) <> 'array'
    or jsonb_array_length(v_desired_ways_to_serve) > 5
    or exists (
      select 1
      from jsonb_array_elements(v_desired_ways_to_serve) as option(value)
      where jsonb_typeof(option.value) <> 'string'
        or option.value #>> '{}' not in (
          'Prayer', 'Worship', 'Hospitality', 'Room preparation', 'I would like to learn more'
        )
    )
    or (select count(*) from jsonb_array_elements(v_desired_ways_to_serve)) <> (
      select count(distinct option.value #>> '{}')
      from jsonb_array_elements(v_desired_ways_to_serve) as option(value)
    ) then
    raise exception 'service interests contain an invalid selection' using errcode = '22023';
  end if;

  if v_notes is not null and char_length(v_notes) > 4000 then
    raise exception 'notes must not exceed 4000 characters' using errcode = '22023';
  end if;

  insert into public.interest_submissions (
    name, email, phone_e164, availability, desired_ways_to_serve, notes
  ) values (
    v_name, v_email, v_phone_e164, v_availability, v_desired_ways_to_serve, v_notes
  );
end;
$$;

-- Keep the existing signature so deployed clients may pass its former optional
-- source parameter, but record only the canonical public-form consent source.
create or replace function public.subscribe_to_updates(
  p_email text,
  p_consent_source text default 'public_updates_form'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_preference_id uuid;
begin
  if char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;

  insert into public.email_preferences (
    email, updates_opt_in, updates_consented_at, updates_consent_source, updates_unsubscribed_at
  ) values (
    v_email, true, timezone('utc', now()), 'public_updates_form', null
  )
  on conflict (email_normalized) do update set
    updates_opt_in = true,
    updates_consented_at = timezone('utc', now()),
    updates_consent_source = 'public_updates_form',
    updates_unsubscribed_at = null
  returning id into v_preference_id;

  insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
  values ('system', null, 'subscribe', 'email_preference', v_preference_id);
end;
$$;

create or replace function public.unsubscribe_from_updates(p_unsubscribe_token uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_preference_id uuid;
begin
  -- A missing or already-used token is intentionally indistinguishable from a
  -- valid one so this public endpoint cannot become an email-address oracle.
  update public.email_preferences
  set updates_opt_in = false,
      updates_unsubscribed_at = coalesce(updates_unsubscribed_at, timezone('utc', now()))
  where updates_unsubscribe_token = p_unsubscribe_token
    and updates_opt_in
  returning id into v_preference_id;

  if found then
    insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
    values ('system', null, 'unsubscribe', 'email_preference', v_preference_id);
  end if;
end;
$$;

revoke all on function public.submit_serve_interest(text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.subscribe_to_updates(text, text) from public, anon, authenticated;
revoke all on function public.unsubscribe_from_updates(uuid) from public, anon, authenticated;
grant execute on function public.submit_serve_interest(text, text, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.subscribe_to_updates(text, text) to anon, authenticated;
grant execute on function public.unsubscribe_from_updates(uuid) to anon, authenticated;

comment on function public.submit_serve_interest(text, text, text, jsonb, jsonb, text) is
  'Anonymous public-form RPC. Validates a fixed form contract and creates a submitted interest record without exposing table access.';
comment on function public.subscribe_to_updates(text, text) is
  'Anonymous public-form RPC. Records canonical email-update consent without exposing subscription state.';
comment on function public.unsubscribe_from_updates(uuid) is
  'Anonymous token-based opt-out RPC. Its response does not disclose whether a token was valid.';
