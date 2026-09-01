-- Harden the already-deployed schema. These SECURITY DEFINER trigger helpers
-- run only inside Postgres; they must never be callable through the public API.

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;
revoke all on function public.create_profile_email_preferences() from public, anon, authenticated;
revoke all on function public.sync_profile_email_preferences() from public, anon, authenticated;
revoke all on function public.enqueue_assignment_reminders() from public, anon, authenticated;
revoke all on function public.write_audit_row() from public, anon, authenticated;

comment on function public.handle_new_auth_user() is
  'Auth trigger helper. Execution is intentionally revoked from API roles.';
comment on function public.enqueue_assignment_reminders() is
  'Assignment trigger helper. Execution is intentionally revoked from API roles.';
comment on function public.write_audit_row() is
  'Audit trigger helper. Execution is intentionally revoked from API roles.';
