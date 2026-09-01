-- Read-only post-migration verification for the initial Altar Initiative schema.
-- Run with `supabase db execute --file supabase/tests/0001_schema_verification.sql`
-- or in the Supabase SQL editor after applying migrations.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'interest_submissions', 'email_preferences', 'room_events',
    'public_events', 'shift_templates', 'shifts', 'shift_assignments',
    'prayer_focuses', 'public_prayer_focuses', 'message_jobs', 'audit_log'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for public.%', v_table;
    end if;
  end loop;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name ilike '%prayer%request%'
  ) then
    raise exception 'Prayer-request storage must not be added to this MVP schema';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'public_events' and column_name = 'internal_notes'
  ) or exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'public_prayer_focuses' and column_name = 'volunteer_notes'
  ) then
    raise exception 'A public projection contains an internal-only field';
  end if;
end;
$$;

-- Manual smoke queries (expected to succeed for the appropriate database role):
--   select * from public.public_events order by starts_at;
--   select * from public.public_prayer_focuses order by published_at desc;
--   select public.claim_open_shift('<shift uuid>'); -- active volunteer only
--   select * from public.claim_due_message_jobs(25, gen_random_uuid()); -- service role only
