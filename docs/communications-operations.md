# Communications operations

There are two email systems:

- Kit owns new ALTAR Rhythm marketing signups and its form confirmation and unsubscribe flow.
- Supabase and Resend handle transactional volunteer reminders and previously issued Altar Initiative update links.

It does not send SMS or collect prayer requests.

## How consent works

The public `/updates` page and the signup sections on Home, Initiatives, and Resources embed Kit form `f5260306b6` from `https://lighthouse-prayer-room.kit.com/f5260306b6/index.js`. Its public form asks for first name and email. No Kit API key belongs in the browser or repository. Verify the form's confirmation setting, delivery, and unsubscribe behavior with a test subscription in Kit before publishing this change.

The 2026-09-28 test submission reached Kit and displayed its confirmation message. The recipient received the email, but its confirmation journey led to the misspelled `alarrhythm.com` domain. The Kit form's Confirmation Email link setting needs correction to `https://altarrhythm.com` as requested by the owner, followed by another test. At the time of this check, the correctly spelled domain resolved in DNS but HTTPS timed out, so the page itself also needs to become reachable before the destination can work for subscribers.

The previous Supabase signup is no longer used by the public site. Its confirmation and unsubscribe routes remain active for links already sent. In that flow, submitting the old form never set `updates_opt_in` to true. The server recorded a hashed, 24-hour confirmation token and sent a confirmation email; only a recipient who opened that link could activate updates. Its unsubscribe was token-based, and no raw token was stored in the database. Do not automatically import these subscribers into Kit without a consent plan.

The original request endpoint returned the same “check your email” response for a new, existing, opted-out, malformed, rate-limited, or honeypot submission. This prevented address enumeration. The database limited requests to three per address and six per hashed request source in a rolling hour. Existing legacy single-step signups were disabled by migration `202609020020` until they opted in again. After the Kit release, the retired request endpoint responds with HTTP 410 and does not write or send.

## Administrator access to confirmed subscribers

An active **administrator** can sign in at `/coordinator`, select **Legacy email updates**, and download confirmed Supabase subscribers as a CSV. This does not include Kit subscribers. The CSV includes the name supplied on the old form, email address, and confirmation date. It excludes unconfirmed requests and people who unsubscribed.

The database enforces this rule: public visitors, volunteers, and coordinators cannot read public subscriber records; only active accounts with the `admin` role can. Supabase project owners and anyone holding a service-role/database credential bypass application row-level security, so limit those credentials and Dashboard project access to the same trusted administrators.

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

For the Kit transition, publish the static site and verify the embedded form first. Then deploy the repository version of `request-update-subscription` through the connected Supabase plugin; it returns HTTP 410 so cached clients cannot add new subscribers to the legacy list. Keep `confirm-update-subscription` and `unsubscribe-updates` deployed for previously sent links. Verify the retired endpoint returns 410 and that a deliberately invalid old confirmation token reaches the expired-link page. A real Kit signup still needs a recipient-controlled test address to verify delivery, confirmation, and unsubscribe.

The steps below document the original Supabase/Resend communications setup for an environment that still needs it. They are not instructions to reactivate the old public signup.

1. Apply the pending migrations, including `supabase/migrations/202609020020_communications_delivery_and_double_opt_in.sql` and `supabase/migrations/202609030030_update_subscriber_names_and_admin_access.sql`.
2. Set the secrets above.
3. Keep the legacy confirmation and unsubscribe endpoints deployed. Their functions authenticate confirmation/unsubscribe tokens themselves and enforce allowed browser origins:

   ```bash
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

Review `message_jobs` for `failed`, `processing`, and `sent` status, and use Resend’s delivery activity for provider-side delivery/bounce signals. Kit manages new marketing broadcasts and its own subscriber list. A sender for the separate legacy Supabase list is not implemented. If those subscribers are contacted through another tool, use only the administrator CSV of confirmed, subscribed addresses and preserve a working unsubscribe path. Do not add them to Kit without a consent plan.
