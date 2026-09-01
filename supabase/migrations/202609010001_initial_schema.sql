-- The Altar Initiative MVP: private coordination with explicit public projections.
-- Run with the Supabase migration runner; all application data lives in `public`.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('prospect', 'volunteer', 'coordinator', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.profile_status as enum ('invited', 'active', 'suspended', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.interest_status as enum ('submitted', 'reviewing', 'approved', 'declined');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.room_event_visibility as enum ('private', 'public');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.event_format as enum ('in_person', 'online', 'hybrid', 'personal');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.shift_status as enum ('scheduled', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.assignment_status as enum ('assigned', 'confirmed', 'absence_requested', 'declined', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.message_channel as enum ('email');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.message_status as enum ('queued', 'processing', 'sent', 'failed', 'cancelled', 'skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.audit_actor_kind as enum ('user', 'system');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null,
  phone_e164 text,
  role public.app_role not null default 'prospect',
  status public.profile_status not null default 'invited',
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_format check (position('@' in email) > 1),
  constraint profiles_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  constraint profiles_approval_consistency check (
    (status = 'active' and role <> 'prospect' and approved_at is not null)
    or status <> 'active'
  )
);
create unique index if not exists profiles_email_normalized_key on public.profiles ((lower(email)));
create index if not exists profiles_role_status_idx on public.profiles (role, status);

create table if not exists public.interest_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone_e164 text,
  availability jsonb not null default '[]'::jsonb,
  anticipated_participation text,
  desired_ways_to_serve jsonb not null default '[]'::jsonb,
  notes text,
  status public.interest_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  decision_note text,
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint interest_submissions_name_not_blank check (btrim(name) <> ''),
  constraint interest_submissions_email_format check (position('@' in email) > 1),
  constraint interest_submissions_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  constraint interest_submissions_availability_array check (jsonb_typeof(availability) = 'array'),
  constraint interest_submissions_desired_ways_array check (jsonb_typeof(desired_ways_to_serve) = 'array'),
  constraint interest_submissions_notes_length check (notes is null or char_length(notes) <= 4000)
);
create index if not exists interest_submissions_review_queue_idx
  on public.interest_submissions (status, submitted_at) where status in ('submitted', 'reviewing');
create index if not exists interest_submissions_email_normalized_idx on public.interest_submissions ((lower(email)));

-- This table covers both public update subscriptions (profile_id is null) and
-- authenticated volunteers' email settings. It intentionally stores no SMS state.
create table if not exists public.email_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  updates_opt_in boolean not null default false,
  updates_consented_at timestamptz,
  updates_consent_source text,
  updates_unsubscribed_at timestamptz,
  email_reminders_opt_in boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint email_preferences_email_format check (position('@' in email) > 1),
  constraint email_preferences_consent check (
    not updates_opt_in or updates_consented_at is not null
  )
);
create unique index if not exists email_preferences_email_normalized_key on public.email_preferences (email_normalized);
create index if not exists email_preferences_updates_delivery_idx
  on public.email_preferences (updates_opt_in, updates_unsubscribed_at)
  where updates_opt_in and updates_unsubscribed_at is null;

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_key text not null default 'prayer-room',
  title text not null,
  event_type text not null,
  description text,
  internal_notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visibility public.room_event_visibility not null default 'private',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint room_events_time_order check (ends_at > starts_at),
  constraint room_events_room_key_not_blank check (btrim(room_key) <> '')
);
-- The Prayer Room is a single reservable space. Add a room row/key strategy before
-- supporting multiple rooms; this constraint keeps all current bookings conflict-free.
alter table public.room_events drop constraint if exists room_events_no_overlap;
alter table public.room_events add constraint room_events_no_overlap
  exclude using gist (room_key with =, tstzrange(starts_at, ends_at, '[)') with &&);
create index if not exists room_events_schedule_idx on public.room_events (starts_at, ends_at);
create index if not exists room_events_visibility_idx on public.room_events (visibility, starts_at);

-- Public calendar records are intentionally a separate, safe projection. Do not
-- expose room_events directly: its internal_notes are coordinator-only.
create table if not exists public.public_events (
  id uuid primary key default gen_random_uuid(),
  room_event_id uuid not null unique references public.room_events(id) on delete cascade,
  title text not null,
  description text,
  location_label text,
  participation_format public.event_format not null default 'in_person',
  public_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint public_events_time_order check (ends_at > starts_at)
);
create index if not exists public_events_published_schedule_idx
  on public.public_events (starts_at, ends_at) where published_at is not null;

create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekday smallint not null,
  local_starts_at time not null,
  local_ends_at time not null,
  timezone_name text not null default 'America/Denver',
  required_volunteers smallint not null default 1,
  eligibility_rule jsonb not null default '{"roles":["volunteer","coordinator","admin"]}'::jsonb,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shift_templates_weekday check (weekday between 0 and 6),
  constraint shift_templates_time_order check (local_ends_at <> local_starts_at),
  constraint shift_templates_required_volunteers check (required_volunteers between 1 and 20),
  constraint shift_templates_eligibility_rule_object check (jsonb_typeof(eligibility_rule) = 'object')
);
create index if not exists shift_templates_active_weekday_idx on public.shift_templates (active, weekday);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.shift_templates(id) on delete set null,
  room_event_id uuid references public.room_events(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  required_volunteers smallint not null default 1,
  eligibility_rule jsonb not null default '{"roles":["volunteer","coordinator","admin"]}'::jsonb,
  status public.shift_status not null default 'scheduled',
  volunteer_instructions text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shifts_time_order check (ends_at > starts_at),
  constraint shifts_required_volunteers check (required_volunteers between 1 and 20),
  constraint shifts_eligibility_rule_object check (jsonb_typeof(eligibility_rule) = 'object')
);
create index if not exists shifts_schedule_idx on public.shifts (starts_at, ends_at) where status = 'scheduled';
create index if not exists shifts_room_event_idx on public.shifts (room_event_id) where room_event_id is not null;

create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  assignment_status public.assignment_status not null default 'assigned',
  confirmed_at timestamptz,
  absence_requested_at timestamptz,
  assignment_generation integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shift_assignments_unique_shift_volunteer unique (shift_id, profile_id),
  constraint shift_assignments_generation_nonnegative check (assignment_generation >= 0),
  constraint shift_assignments_confirmation_consistency check (
    assignment_status <> 'confirmed' or confirmed_at is not null
  )
);
create index if not exists shift_assignments_profile_active_idx
  on public.shift_assignments (profile_id, shift_id)
  where assignment_status in ('assigned', 'confirmed');
create index if not exists shift_assignments_shift_active_idx
  on public.shift_assignments (shift_id, assignment_status)
  where assignment_status in ('assigned', 'confirmed');

create table if not exists public.prayer_focuses (
  id uuid primary key default gen_random_uuid(),
  focus_date date not null unique,
  title text not null,
  scripture_reference text,
  volunteer_notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Like public_events, this prevents public readers from receiving volunteer notes.
create table if not exists public.public_prayer_focuses (
  id uuid primary key default gen_random_uuid(),
  prayer_focus_id uuid not null unique references public.prayer_focuses(id) on delete cascade,
  title text not null,
  public_summary text,
  scripture_reference text,
  resource_url text,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists public_prayer_focuses_published_idx
  on public.public_prayer_focuses (published_at desc) where published_at is not null;

create table if not exists public.message_jobs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.shift_assignments(id) on delete restrict,
  recipient_profile_id uuid not null references public.profiles(id) on delete restrict,
  channel public.message_channel not null default 'email',
  template_key text not null,
  dedupe_key text not null unique,
  scheduled_for timestamptz not null,
  status public.message_status not null default 'queued',
  attempt_count integer not null default 0,
  locked_at timestamptz,
  locked_by uuid,
  provider_message_id text,
  last_error text,
  context jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint message_jobs_email_only check (channel = 'email'),
  constraint message_jobs_attempt_count_nonnegative check (attempt_count >= 0),
  constraint message_jobs_context_object check (jsonb_typeof(context) = 'object'),
  constraint message_jobs_sent_consistency check (status <> 'sent' or sent_at is not null)
);
create index if not exists message_jobs_due_idx
  on public.message_jobs (scheduled_for, id) where status in ('queued', 'failed');
create index if not exists message_jobs_recipient_idx on public.message_jobs (recipient_profile_id, created_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_kind public.audit_actor_kind not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_log_actor_consistency check (
    (actor_kind = 'user' and actor_profile_id is not null)
    or (actor_kind = 'system' and actor_profile_id is null)
  )
);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_profile_id, created_at desc) where actor_profile_id is not null;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger interest_submissions_set_updated_at before update on public.interest_submissions
for each row execute function public.set_updated_at();
create trigger email_preferences_set_updated_at before update on public.email_preferences
for each row execute function public.set_updated_at();
create trigger room_events_set_updated_at before update on public.room_events
for each row execute function public.set_updated_at();
create trigger public_events_set_updated_at before update on public.public_events
for each row execute function public.set_updated_at();
create trigger shift_templates_set_updated_at before update on public.shift_templates
for each row execute function public.set_updated_at();
create trigger shifts_set_updated_at before update on public.shifts
for each row execute function public.set_updated_at();
create trigger shift_assignments_set_updated_at before update on public.shift_assignments
for each row execute function public.set_updated_at();
create trigger prayer_focuses_set_updated_at before update on public.prayer_focuses
for each row execute function public.set_updated_at();
create trigger public_prayer_focuses_set_updated_at before update on public.public_prayer_focuses
for each row execute function public.set_updated_at();
create trigger message_jobs_set_updated_at before update on public.message_jobs
for each row execute function public.set_updated_at();

-- Profile helpers are SECURITY DEFINER so policies can check a caller's role without
-- recursively querying an RLS-protected profiles row.
create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.current_profile_status()
returns public.profile_status
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.status from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_active_volunteer()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_profile_status() = 'active'::public.profile_status
     and public.current_profile_role() in ('volunteer'::public.app_role, 'coordinator'::public.app_role, 'admin'::public.app_role)
$$;

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_profile_status() = 'active'::public.profile_status
     and public.current_profile_role() in ('coordinator'::public.app_role, 'admin'::public.app_role)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_profile_status() = 'active'::public.profile_status
     and public.current_profile_role() = 'admin'::public.app_role
$$;

create or replace function public.is_eligible_for_rule(p_rule jsonb)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.is_active_volunteer()
     and coalesce(p_rule -> 'roles', '[]'::jsonb) ? (public.current_profile_role()::text)
$$;

create or replace function public.can_view_shift(p_shift_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_shift public.shifts%rowtype;
begin
  if public.is_coordinator() then
    return true;
  end if;
  if not public.is_active_volunteer() then
    return false;
  end if;

  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then return false; end if;

  if exists (
    select 1 from public.shift_assignments a
    where a.shift_id = p_shift_id and a.profile_id = auth.uid()
  ) then
    return true;
  end if;

  return v_shift.status = 'scheduled'
    and public.is_eligible_for_rule(v_shift.eligibility_rule)
    and (
      select count(*) from public.shift_assignments a
      where a.shift_id = p_shift_id and a.assignment_status in ('assigned', 'confirmed')
    ) < v_shift.required_volunteers;
end;
$$;

create or replace function public.can_view_room_event(p_room_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.is_coordinator() or (
    public.is_active_volunteer() and exists (
      select 1
      from public.shifts s
      join public.shift_assignments a on a.shift_id = s.id
      where s.room_event_id = p_room_event_id
        and a.profile_id = auth.uid()
        and a.assignment_status not in ('cancelled', 'declined')
    )
  )
$$;

create or replace function public.guard_profile_write()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  new.email := lower(btrim(new.email));

  if tg_op = 'UPDATE' then
    if new.email is distinct from old.email and auth.uid() is not null then
      raise exception 'profile email is managed by Supabase Auth';
    end if;
    if auth.uid() = old.id and not public.is_coordinator() then
      if new.id is distinct from old.id
        or new.email is distinct from old.email
        or new.role is distinct from old.role
        or new.status is distinct from old.status
        or new.approved_at is distinct from old.approved_at
        or new.approved_by is distinct from old.approved_by
        or new.created_at is distinct from old.created_at then
        raise exception 'volunteers may only update their display name and phone number';
      end if;
    end if;

    if public.is_coordinator() and not public.is_admin() then
      if old.role = 'admin' or new.role = 'admin' then
        raise exception 'only an administrator may manage administrator accounts';
      end if;
      if new.role is distinct from old.role
        and not (old.role = 'prospect' and new.role = 'volunteer') then
        raise exception 'only an administrator may change this role';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' and new.status = 'active' then
    new.approved_at := coalesce(new.approved_at, timezone('utc', now()));
    new.approved_by := coalesce(new.approved_by, auth.uid());
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status is distinct from 'active'::public.profile_status then
    new.approved_at := coalesce(new.approved_at, timezone('utc', now()));
    new.approved_by := coalesce(new.approved_by, auth.uid());
  end if;
  return new;
end;
$$;
create trigger profiles_guard_write before insert or update on public.profiles
for each row execute function public.guard_profile_write();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), ''),
    lower(new.email)
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email_from_auth();

create or replace function public.guard_interest_submission()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  new.email := lower(btrim(new.email));
  if tg_op = 'INSERT' then
    new.status := 'submitted';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.decision_note := null;
    new.submitted_at := timezone('utc', now());
  elsif new.status is distinct from old.status and new.status <> 'submitted' then
    new.reviewed_at := coalesce(new.reviewed_at, timezone('utc', now()));
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end;
$$;
create trigger interest_submissions_guard before insert or update on public.interest_submissions
for each row execute function public.guard_interest_submission();

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
      new.updates_consented_at := coalesce(new.updates_consented_at, timezone('utc', now()));
      new.updates_unsubscribed_at := null;
    elsif not new.updates_opt_in and old.updates_opt_in then
      new.updates_unsubscribed_at := coalesce(new.updates_unsubscribed_at, timezone('utc', now()));
    end if;
  end if;
  return new;
end;
$$;
create trigger email_preferences_guard before insert or update on public.email_preferences
for each row execute function public.guard_email_preferences();

create or replace function public.create_profile_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.email_preferences (profile_id, email, email_reminders_opt_in)
  values (new.id, new.email, true)
  on conflict (email_normalized) do update set
    profile_id = excluded.profile_id,
    email = excluded.email;
  return new;
end;
$$;
create trigger profiles_create_email_preferences
after insert on public.profiles
for each row execute function public.create_profile_email_preferences();

create or replace function public.sync_profile_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.email_preferences set email = new.email where profile_id = new.id;
  end if;
  return new;
end;
$$;
create trigger profiles_sync_email_preferences
after update of email on public.profiles
for each row execute function public.sync_profile_email_preferences();

create or replace function public.subscribe_to_updates(p_email text, p_consent_source text default 'public_updates_form')
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if position('@' in v_email) <= 1 then
    raise exception 'a valid email address is required';
  end if;

  insert into public.email_preferences (
    email, updates_opt_in, updates_consented_at, updates_consent_source, updates_unsubscribed_at
  ) values (
    v_email, true, timezone('utc', now()), coalesce(nullif(btrim(p_consent_source), ''), 'public_updates_form'), null
  )
  on conflict (email_normalized) do update set
    updates_opt_in = true,
    updates_consented_at = timezone('utc', now()),
    updates_consent_source = excluded.updates_consent_source,
    updates_unsubscribed_at = null;
end;
$$;

create or replace function public.enforce_public_event_projection()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  v_event public.room_events%rowtype;
begin
  select * into v_event from public.room_events where id = new.room_event_id;
  if not found or v_event.visibility <> 'public' then
    raise exception 'a public event requires a room event marked public';
  end if;
  new.starts_at := v_event.starts_at;
  new.ends_at := v_event.ends_at;
  return new;
end;
$$;
create trigger public_events_projection_guard before insert or update on public.public_events
for each row execute function public.enforce_public_event_projection();

create or replace function public.sync_public_event_schedule()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.visibility <> 'public' and exists (select 1 from public.public_events where room_event_id = new.id) then
    raise exception 'unpublish or remove the public event projection before making its room event private';
  end if;
  if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
    update public.public_events
      set starts_at = new.starts_at, ends_at = new.ends_at
      where room_event_id = new.id;
  end if;
  return new;
end;
$$;
create trigger room_events_sync_public_schedule before update on public.room_events
for each row execute function public.sync_public_event_schedule();

create or replace function public.enforce_shift_room_event_window()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  v_event public.room_events%rowtype;
begin
  if new.room_event_id is null then return new; end if;
  select * into v_event from public.room_events where id = new.room_event_id;
  if not found then raise exception 'room event not found'; end if;
  if new.starts_at < v_event.starts_at or new.ends_at > v_event.ends_at then
    raise exception 'a shift must fit within its linked room event';
  end if;
  return new;
end;
$$;
create trigger shifts_room_event_window before insert or update on public.shifts
for each row execute function public.enforce_shift_room_event_window();

create or replace function public.guard_shift_assignment()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  v_shift public.shifts%rowtype;
  v_assigned_count integer;
  v_old_assignment_id uuid;
begin
  if tg_op = 'UPDATE' and auth.uid() = old.profile_id and not public.is_coordinator() then
    if new.shift_id is distinct from old.shift_id
      or new.profile_id is distinct from old.profile_id
      or new.assignment_generation is distinct from old.assignment_generation
      or new.created_at is distinct from old.created_at
      or new.assignment_status not in ('confirmed', 'declined', 'absence_requested')
      or new.assignment_status = old.assignment_status then
      raise exception 'this assignment change is not permitted';
    end if;
  end if;

  if new.assignment_status = 'confirmed' then
    new.confirmed_at := timezone('utc', now());
  elsif new.assignment_status <> 'confirmed' then
    new.confirmed_at := null;
  end if;
  if new.assignment_status = 'absence_requested' then
    new.absence_requested_at := timezone('utc', now());
  end if;

  v_old_assignment_id := case when tg_op = 'UPDATE' then old.id else null end;

  if new.assignment_status in ('assigned', 'confirmed') then
    -- Serialize all claims for one person and one shift so overlap/capacity checks
    -- remain correct even when two browser requests arrive together.
    perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text, 0));
    select * into v_shift from public.shifts where id = new.shift_id for update;
    if not found or v_shift.status <> 'scheduled' then
      raise exception 'this shift is not available';
    end if;
    if not public.is_eligible_for_rule(v_shift.eligibility_rule) and not public.is_coordinator() then
      raise exception 'you are not eligible for this shift';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = new.profile_id
        and p.status = 'active'
        and p.role in ('volunteer', 'coordinator', 'admin')
    ) then
      raise exception 'assignment requires an active approved volunteer';
    end if;

    select count(*) into v_assigned_count
    from public.shift_assignments a
    where a.shift_id = new.shift_id
      and a.assignment_status in ('assigned', 'confirmed')
      and (v_old_assignment_id is null or a.id <> v_old_assignment_id);
    if v_assigned_count >= v_shift.required_volunteers then
      raise exception 'this shift is already fully covered';
    end if;
    if exists (
      select 1
      from public.shift_assignments a
      join public.shifts s on s.id = a.shift_id
      where a.profile_id = new.profile_id
        and a.assignment_status in ('assigned', 'confirmed')
        and (v_old_assignment_id is null or a.id <> v_old_assignment_id)
        and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(v_shift.starts_at, v_shift.ends_at, '[)')
    ) then
      raise exception 'this volunteer already has an overlapping shift';
    end if;
  end if;

  if tg_op = 'INSERT' and new.assignment_status = 'assigned' then
    new.assignment_generation := 1;
  elsif tg_op = 'UPDATE' and old.assignment_status not in ('assigned', 'confirmed') and new.assignment_status = 'assigned' then
    new.assignment_generation := old.assignment_generation + 1;
  end if;
  return new;
end;
$$;
create trigger shift_assignments_guard before insert or update on public.shift_assignments
for each row execute function public.guard_shift_assignment();

create or replace function public.claim_open_shift(p_shift_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_assignment public.shift_assignments;
begin
  if not public.is_active_volunteer() then
    raise exception 'approved volunteer access is required';
  end if;
  if not public.can_view_shift(p_shift_id) then
    raise exception 'this shift is not available to claim';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id and profile_id = auth.uid()
  for update;

  if found then
    if v_assignment.assignment_status in ('assigned', 'confirmed') then
      raise exception 'you already hold this shift';
    end if;
    update public.shift_assignments
      set assignment_status = 'assigned', absence_requested_at = null
      where id = v_assignment.id
      returning * into v_assignment;
  else
    insert into public.shift_assignments (shift_id, profile_id, assignment_status)
      values (p_shift_id, auth.uid(), 'assigned')
      returning * into v_assignment;
  end if;
  return v_assignment;
end;
$$;

create or replace function public.enqueue_assignment_reminders()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_starts_at timestamptz;
  v_email_enabled boolean;
  v_key_prefix text;
begin
  if not ((tg_op = 'INSERT' and new.assignment_status = 'assigned')
    or (tg_op = 'UPDATE' and old.assignment_status not in ('assigned', 'confirmed') and new.assignment_status = 'assigned')) then
    return new;
  end if;

  select s.starts_at into v_starts_at from public.shifts s where s.id = new.shift_id;
  select ep.email_reminders_opt_in into v_email_enabled
    from public.email_preferences ep where ep.profile_id = new.profile_id;
  if coalesce(v_email_enabled, false) is not true then return new; end if;

  v_key_prefix := 'assignment:' || new.id::text || ':g' || new.assignment_generation::text || ':';
  insert into public.message_jobs (assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context)
  values (
    new.id, new.profile_id, 'assignment_confirmation', v_key_prefix || 'assignment_confirmation', timezone('utc', now()),
    jsonb_build_object('assignment_id', new.id, 'generation', new.assignment_generation, 'valid_statuses', jsonb_build_array('assigned', 'confirmed'))
  ) on conflict (dedupe_key) do nothing;

  if v_starts_at - interval '7 days' > timezone('utc', now()) then
    insert into public.message_jobs (assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context)
    values (
      new.id, new.profile_id, 'assignment_seven_day_reminder', v_key_prefix || 'assignment_seven_day_reminder', v_starts_at - interval '7 days',
      jsonb_build_object('assignment_id', new.id, 'generation', new.assignment_generation, 'valid_statuses', jsonb_build_array('assigned', 'confirmed'))
    ) on conflict (dedupe_key) do nothing;
  end if;
  if v_starts_at - interval '24 hours' > timezone('utc', now()) then
    insert into public.message_jobs (assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context)
    values (
      new.id, new.profile_id, 'assignment_24_hour_reminder', v_key_prefix || 'assignment_24_hour_reminder', v_starts_at - interval '24 hours',
      jsonb_build_object('assignment_id', new.id, 'generation', new.assignment_generation, 'valid_statuses', jsonb_build_array('assigned', 'confirmed'))
    ) on conflict (dedupe_key) do nothing;
  end if;
  if v_starts_at - interval '2 hours' > timezone('utc', now()) then
    insert into public.message_jobs (assignment_id, recipient_profile_id, template_key, dedupe_key, scheduled_for, context)
    values (
      new.id, new.profile_id, 'unconfirmed_shift_escalation', v_key_prefix || 'unconfirmed_shift_escalation', v_starts_at - interval '2 hours',
      jsonb_build_object('assignment_id', new.id, 'generation', new.assignment_generation, 'valid_statuses', jsonb_build_array('assigned'))
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger shift_assignments_enqueue_reminders after insert or update on public.shift_assignments
for each row execute function public.enqueue_assignment_reminders();

create or replace function public.claim_due_message_jobs(p_limit integer default 25, p_worker_id uuid default gen_random_uuid())
returns setof public.message_jobs
language sql
security definer
set search_path = public, pg_temp
as $$
  with due as (
    select id
    from public.message_jobs
    where status in ('queued', 'failed')
      and scheduled_for <= timezone('utc', now())
      and attempt_count < 8
      and (locked_at is null or locked_at < timezone('utc', now()) - interval '15 minutes')
    order by scheduled_for, id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  )
  update public.message_jobs j
  set status = 'processing', locked_at = timezone('utc', now()), locked_by = p_worker_id, attempt_count = j.attempt_count + 1
  from due
  where j.id = due.id
  returning j.*
$$;

create or replace function public.complete_message_job(
  p_job_id uuid,
  p_worker_id uuid,
  p_status public.message_status,
  p_provider_message_id text default null,
  p_last_error text default null
)
returns public.message_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.message_jobs;
begin
  if p_status not in ('sent', 'failed', 'cancelled', 'skipped') then
    raise exception 'invalid terminal message job status';
  end if;
  update public.message_jobs
    set status = p_status,
        provider_message_id = p_provider_message_id,
        last_error = p_last_error,
        sent_at = case when p_status = 'sent' then timezone('utc', now()) else null end,
        scheduled_for = case
          when p_status = 'failed' then timezone('utc', now()) + interval '5 minutes' * least(attempt_count, 12)
          else scheduled_for
        end,
        locked_at = null,
        locked_by = null
    where id = p_job_id and status = 'processing' and locked_by = p_worker_id
    returning * into v_job;
  if not found then
    raise exception 'message job is not claimed by this worker';
  end if;
  return v_job;
end;
$$;

create or replace function public.write_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row jsonb;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  insert into public.audit_log (actor_kind, actor_profile_id, action, entity_type, entity_id)
  values (
    case when v_actor is null then 'system'::public.audit_actor_kind else 'user'::public.audit_actor_kind end,
    v_actor,
    lower(tg_op),
    tg_argv[0],
    nullif(v_row ->> 'id', '')::uuid
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger profiles_audit after update on public.profiles
for each row execute function public.write_audit_row('profile');
create trigger interest_submissions_audit after update on public.interest_submissions
for each row execute function public.write_audit_row('interest_submission');
create trigger room_events_audit after insert or update or delete on public.room_events
for each row execute function public.write_audit_row('room_event');
create trigger public_events_audit after insert or update or delete on public.public_events
for each row execute function public.write_audit_row('public_event');
create trigger shift_templates_audit after insert or update or delete on public.shift_templates
for each row execute function public.write_audit_row('shift_template');
create trigger shifts_audit after insert or update or delete on public.shifts
for each row execute function public.write_audit_row('shift');
create trigger shift_assignments_audit after insert or update on public.shift_assignments
for each row execute function public.write_audit_row('shift_assignment');
create trigger prayer_focuses_audit after insert or update or delete on public.prayer_focuses
for each row execute function public.write_audit_row('prayer_focus');
create trigger public_prayer_focuses_audit after insert or update or delete on public.public_prayer_focuses
for each row execute function public.write_audit_row('public_prayer_focus');
create trigger message_jobs_audit after update on public.message_jobs
for each row execute function public.write_audit_row('message_job');

alter table public.profiles enable row level security;
alter table public.interest_submissions enable row level security;
alter table public.email_preferences enable row level security;
alter table public.room_events enable row level security;
alter table public.public_events enable row level security;
alter table public.shift_templates enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.prayer_focuses enable row level security;
alter table public.public_prayer_focuses enable row level security;
alter table public.message_jobs enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_select_own_or_staff on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_coordinator());
create policy profiles_update_own_or_staff on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_coordinator())
  with check (id = auth.uid() or public.is_coordinator());

create policy interest_submissions_public_submit on public.interest_submissions for insert to anon, authenticated
  with check (true);
create policy interest_submissions_staff_read on public.interest_submissions for select to authenticated
  using (public.is_coordinator());
create policy interest_submissions_staff_update on public.interest_submissions for update to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy email_preferences_select_own_or_staff on public.email_preferences for select to authenticated
  using (profile_id = auth.uid() or public.is_coordinator());
create policy email_preferences_update_own_or_staff on public.email_preferences for update to authenticated
  using (profile_id = auth.uid() or public.is_coordinator())
  with check (profile_id = auth.uid() or public.is_coordinator());

create policy room_events_staff_or_assigned_read on public.room_events for select to authenticated
  using (public.can_view_room_event(id));
create policy room_events_staff_write on public.room_events for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy public_events_published_read on public.public_events for select to anon, authenticated
  using (published_at is not null and published_at <= timezone('utc', now()));
create policy public_events_staff_write on public.public_events for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy shift_templates_staff_only on public.shift_templates for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());
create policy shifts_visible_to_eligible_volunteers on public.shifts for select to authenticated
  using (public.can_view_shift(id));
create policy shifts_staff_write on public.shifts for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());
create policy shift_assignments_own_or_staff_read on public.shift_assignments for select to authenticated
  using (profile_id = auth.uid() or public.is_coordinator());
create policy shift_assignments_staff_insert on public.shift_assignments for insert to authenticated
  with check (public.is_coordinator());
create policy shift_assignments_own_or_staff_update on public.shift_assignments for update to authenticated
  using (profile_id = auth.uid() or public.is_coordinator())
  with check (profile_id = auth.uid() or public.is_coordinator());

create policy prayer_focuses_staff_only on public.prayer_focuses for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());
create policy public_prayer_focuses_published_read on public.public_prayer_focuses for select to anon, authenticated
  using (published_at is not null and published_at <= timezone('utc', now()));
create policy public_prayer_focuses_staff_write on public.public_prayer_focuses for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy message_jobs_staff_read on public.message_jobs for select to authenticated
  using (public.is_coordinator());
create policy message_jobs_staff_queue on public.message_jobs for insert to authenticated
  with check (public.is_coordinator());
create policy audit_log_staff_read on public.audit_log for select to authenticated
  using (public.is_coordinator());

grant usage on schema public to anon, authenticated;
grant select on public.public_events, public.public_prayer_focuses to anon, authenticated;
grant insert on public.interest_submissions to anon, authenticated;
grant select, update on public.profiles, public.email_preferences, public.room_events,
  public.shift_templates, public.shifts, public.shift_assignments, public.prayer_focuses,
  public.public_prayer_focuses, public.message_jobs, public.audit_log to authenticated;
grant insert on public.room_events, public.public_events, public.shift_templates, public.shifts,
  public.shift_assignments, public.prayer_focuses, public.public_prayer_focuses, public.message_jobs to authenticated;
grant update, delete on public.room_events, public.public_events, public.shift_templates, public.shifts,
  public.prayer_focuses, public.public_prayer_focuses to authenticated;

revoke all on function public.current_profile_role() from public, anon, authenticated;
revoke all on function public.current_profile_status() from public, anon, authenticated;
revoke all on function public.is_active_volunteer() from public, anon, authenticated;
revoke all on function public.is_coordinator() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_eligible_for_rule(jsonb) from public, anon, authenticated;
revoke all on function public.can_view_shift(uuid) from public, anon, authenticated;
revoke all on function public.can_view_room_event(uuid) from public, anon, authenticated;
revoke all on function public.claim_open_shift(uuid) from public, anon;
revoke all on function public.subscribe_to_updates(text, text) from public;
revoke all on function public.claim_due_message_jobs(integer, uuid) from public, anon, authenticated;
revoke all on function public.complete_message_job(uuid, uuid, public.message_status, text, text) from public, anon, authenticated;
-- Trigger helpers are invoked by Postgres, not through the Data API. PostgreSQL
-- grants EXECUTE to PUBLIC by default, so remove that inherited capability.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;
revoke all on function public.create_profile_email_preferences() from public, anon, authenticated;
revoke all on function public.sync_profile_email_preferences() from public, anon, authenticated;
revoke all on function public.enqueue_assignment_reminders() from public, anon, authenticated;
revoke all on function public.write_audit_row() from public, anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_status() to authenticated;
grant execute on function public.is_active_volunteer() to authenticated;
grant execute on function public.is_coordinator() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_eligible_for_rule(jsonb) to authenticated;
grant execute on function public.can_view_shift(uuid) to authenticated;
grant execute on function public.can_view_room_event(uuid) to authenticated;
grant execute on function public.subscribe_to_updates(text, text) to anon, authenticated;
grant execute on function public.claim_open_shift(uuid) to authenticated;
grant execute on function public.claim_due_message_jobs(integer, uuid) to service_role;
grant execute on function public.complete_message_job(uuid, uuid, public.message_status, text, text) to service_role;

comment on table public.public_events is 'Public-safe projection of a public room event. Anonymous users never read room_events.';
comment on table public.public_prayer_focuses is 'Public-safe projection of a prayer focus. Anonymous users never read volunteer_notes.';
comment on table public.message_jobs is 'Durable, idempotent email-only job queue. Worker access is service-role-only.';
