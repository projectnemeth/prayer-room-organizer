# Communications operations

This MVP sends only two kinds of email:

- transactional volunteer schedule reminders; and
- public Altar Initiative updates after a recipient confirms their email address.

It does not send SMS or collect prayer requests.

## How consent works

The public `/updates` form is double opt-in. Submitting it never sets `updates_opt_in` to true. Instead, the server records a hashed, 24-hour confirmation token and sends a confirmation email. Only a recipient who opens that link can activate updates. An unsubscribe is also token-based and no raw token is stored in the database.

The request endpoint returns the same “check your email” response for a new, existing, opted-out, malformed, rate-limited, or honeypot submission. This prevents an address-enumeration endpoint. The database also limits requests to three per address and six per hashed request source in a rolling hour. Existing legacy single-step signups are disabled by migration `202609020020` until they opt in again.

## Required Edge Function secrets

Set these in Supabase **Project Settings → Edge Functions → Secrets**. They are server-only; never add them to a Vite or Cloudflare environment variable.

| Secret | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key for transactional delivery. |
| `EMAIL_FROM` | Verified sender, e.g. `The Altar Initiative <altar@therock.org>`. |
| `SITE_URL` | `https://altar.lighthouseprayerroom.org` (no trailing slash). |
| `ALLOWED_ORIGINS` | Comma-separated browser origins, e.g. production plus `http://localhost:5173` while developing. |
| `PUBLIC_FORM_RATE_LIMIT_PEPPER` | A long random secret used to hash request-source data before it reaches Postgres. |
| `REMINDER_CRON_SECRET` | A separate long random bearer secret accepted only by the reminder worker. |

Supabase automatically supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Do not overwrite them or expose the service-role key to the browser.

Example secret creation (replace values locally; do not paste real secrets into a migration or commit):

```bash
supabase secrets set --project-ref fuwuwcyzerrdemxhrsjn \
  RESEND_API_KEY='re_...' \
  EMAIL_FROM='The Altar Initiative <altar@therock.org>' \
  SITE_URL='https://altar.lighthouseprayerroom.org' \
  ALLOWED_ORIGINS='https://altar.lighthouseprayerroom.org,http://localhost:5173' \
  PUBLIC_FORM_RATE_LIMIT_PEPPER='generate-a-long-random-value' \
  REMINDER_CRON_SECRET='generate-a-different-long-random-value'
```

## Deploy sequence

1. Apply `supabase/migrations/202609020020_communications_delivery_and_double_opt_in.sql`.
2. Set the secrets above.
3. Deploy each public endpoint with JWT verification disabled—the functions authenticate confirmation/unsubscribe tokens themselves and enforce allowed browser origins:

   ```bash
   supabase functions deploy request-update-subscription --project-ref fuwuwcyzerrdemxhrsjn --no-verify-jwt
   supabase functions deploy confirm-update-subscription --project-ref fuwuwcyzerrdemxhrsjn --no-verify-jwt
   supabase functions deploy unsubscribe-updates --project-ref fuwuwcyzerrdemxhrsjn --no-verify-jwt
   ```

4. Deploy the reminder worker. It keeps JWT verification disabled only because Cron sends its own independent bearer secret:

   ```bash
   supabase functions deploy process-reminder-jobs --project-ref fuwuwcyzerrdemxhrsjn --no-verify-jwt
   ```

5. Store the reminder bearer secret in Supabase Vault, then schedule the worker every five minutes in the SQL Editor. Replace the secret placeholder once only in the Vault command.

   ```sql
   select vault.create_secret('REPLACE_WITH_THE_REMINDER_CRON_SECRET', 'altar_reminder_cron_secret');

   select cron.schedule(
     'altar-process-reminder-jobs',
     '*/5 * * * *',
     $$
     select net.http_post(
       url := 'https://fuwuwcyzerrdemxhrsjn.supabase.co/functions/v1/process-reminder-jobs',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (
           select decrypted_secret from vault.decrypted_secrets
           where name = 'altar_reminder_cron_secret'
         )
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

Run that schedule statement once. Before creating it again, inspect `cron.job` for an existing `altar-process-reminder-jobs` entry so the worker is never double-scheduled.

## Delivery behavior and monitoring

`process-reminder-jobs` claims no more than 25 due jobs atomically. Before sending, it rechecks the assignment generation and status plus the volunteer’s reminder preference. Ineligible or stale work becomes `skipped`; delivery failures are retried by the durable queue with increasing delay. Resend receives an idempotency key derived from the message-job id, so a network timeout cannot create a second reminder.

Review `message_jobs` for `failed`, `processing`, and `sent` status, and use Resend’s delivery activity for provider-side delivery/bounce signals. Do not add a public update broadcast sender until it uses the confirmed preference query (`updates_opt_in = true`, `updates_confirmed_at is not null`, and `updates_unsubscribed_at is null`) and sends a current unsubscribe link with every message.
