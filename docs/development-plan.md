# The Altar Initiative — development plan

## Delivery objective

Launch a reliable MVP for the October Altar Initiative with a public daily-rhythm experience and a private, invitation-only volunteer coordination portal. The launch is successful when coordinators can create and cover worship-led gatherings, approved volunteers receive timely email reminders, and public visitors can discover gatherings or explore serving without gaining access to internal scheduling.

## Locked decisions

- **Framework and hosting:** React + TypeScript built with Vite, deployed as static assets on the existing shared host. A standard subdomain or host path serves the application; no Vercel subscription is required. Browser requests use Supabase’s public client only.
- **Data and access:** Supabase Postgres + invitation-only Supabase Auth. Row-level security is enabled on every application table; public read access exists only for explicitly published events and public prayer focuses. [Supabase guide](https://supabase.com/docs/guides/getting-started)
- **Reminders:** Supabase Cron invokes a Supabase Edge Function that claims due jobs from `message_jobs`. This supports frequent scheduling and a durable delivery log; Vercel Cron remains unsuitable as the reminder engine because its cadence depends on hosting plan. [Supabase Cron](https://supabase.com/docs/guides/cron)
- **Delivery provider:** Resend for email, behind a small `EmailProvider` interface. SMS is not part of the MVP; it requires its own opt-in, compliance, webhook, and operating design, so it is a deliberate post-pilot decision. [Resend idempotency](https://resend.com/docs/api-reference/emails/send-email)
- **No prayer-request feature:** no prayer request entities, free-form pastoral notes, or prayer-request search will be introduced.

## Milestones

### 0. Foundation and design system

**Deliver:** Vite React repository, Tailwind setup, application shell, environment validation, database migration workflow, Supabase clients, shared-host deployment configuration, and an accessible Altar Initiative visual system.

**Done when:**

- `pnpm lint`, `pnpm typecheck`, and `pnpm test` run in CI.
- Production secrets are absent from the repository and validated at startup.
- Public and private shells meet keyboard, contrast, and responsive-baseline checks.
- The visual system follows [brand direction](brand-direction.md) while private screens favor operational clarity.

### 1. Public daily rhythm

**Deliver:** `/`, `/rhythm`, `/calendar`, `/updates`, and `/serve`.

**Done when:**

- A visitor can see only published events and public prayer focuses.
- Morning Altar, noon prayer moment, Evening Altar, and special gatherings communicate clearly whether participation is in person, online, or personal.
- Updates signup records email consent, consent source, timestamp, and unsubscribe state.
- The serve-interest form asks about availability, anticipated participation, and desired ways to serve; it does not show a shift roster.
- Server-side validation, rate limiting, and basic spam protection protect public forms.

### 2. Approval and volunteer portal

**Deliver:** coordinator review queue, invitation flow, volunteer home, notification preferences, and role enforcement.

**Done when:**

- An active coordinator or administrator can approve an interest submission and issue an invitation.
- A new volunteer cannot read any shift data before invitation acceptance.
- A volunteer can view only their own assignments and eligible open shifts.
- An authorization test proves that a public, prospect, volunteer, coordinator, and administrator cannot access each other's protected records.

### 3. Scheduling and room coordination

**Deliver:** recurring shift templates, generated shifts, assignments, availability display, room events, and conflict rules.

**Done when:**

- Coordinators can generate an upcoming schedule from recurring Morning Altar and Evening Altar templates.
- A volunteer can claim an eligible slot, request an absence, and request a swap without seeing unrelated private data.
- The system prevents overlapping room events and over-capacity assignments in one transaction.
- Public calendar entries are an explicit published projection—not a filtered private schedule.

### 4. Messaging and reminder operations

**Deliver:** email templates, queue, email adapter, scheduled job runner, unsubscribe handling, and delivery history.

**Done when:**

- Assignment confirmation, seven-day reminder, 24-hour reminder, and unconfirmed-shift escalation are queued exactly once per assignment event.
- A retry cannot send a duplicate message; job claiming and provider idempotency are tested.
- Coordinators can see delivery outcome and resend only through a deliberate, audited action.
- No credentials, full message bodies, or phone numbers appear in application logs.

### 5. Coordinator insight and launch hardening

**Deliver:** coverage dashboard, workload and gap trends, audit log, error monitoring, backups/recovery runbook, and launch checklist.

**Done when:**

- Coordinators can identify the next seven days of uncovered or unconfirmed shifts from one screen.
- Trend reporting aggregates only operational scheduling data.
- Every approval, schedule change, message send, and role change has an actor and timestamp in the audit log.
- A deployment rehearsal validates database migrations, scheduled jobs, email domain configuration, SMS compliance configuration, and rollback.

## Implementation sequence

Build one vertically complete public flow first, then one private volunteer flow, then coordinator operations. Do not build broad dashboards before scheduling and messaging are proven.

```text
Public events + focus → serve interest → coordinator approval → invitation
→ volunteer schedule → assignment/reminder → coverage insight
```

## Data and security work

1. Write migrations first: enums, tables, indexes, timestamps, audit trigger/function, and row-level-security policies.
2. Create a service-role-only worker boundary for message claiming; browser clients never receive service-role credentials.
3. Model timezone explicitly: store instants in UTC, retain `America/Denver` as the church timezone, and render the local timezone in every schedule view.
4. Enforce idempotency with a unique key such as `(assignment_id, template_key, scheduled_for)` on reminder jobs.
5. Make publication a distinct state. A public event and public prayer focus require `published_at`; all other rows default private.
6. Retain only operational data. Define retention windows for declined interest forms, delivery attempts, and audit events before launch.

## Test strategy

| Layer | Required coverage |
| --- | --- |
| Unit | Date/time conversion, capacity and conflict rules, reminder eligibility, consent state, role predicates. |
| Database integration | RLS policies, atomic shift claim, scheduler job claim, unique reminder key, published-data queries. |
| End-to-end | Public calendar, serve interest, approval/invitation, volunteer claim, absence flow, coordinator publish, reminder dispatch. |
| Security | Anonymous and cross-role access attempts, webhook signature validation, rate limits, secret redaction. |
| Accessibility | Keyboard operation, form error announcement, focus order, color contrast, responsive calendar. |

## Project structure

```text
app/
  (public)/                 public pages: home, rhythm, calendar, serve, updates
  (portal)/portal/          volunteer pages
  (admin)/admin/            coordinator pages
  api/webhooks/             provider webhook route handlers
components/
  public/ portal/ admin/ ui/
lib/
  auth/ db/ authorization/ scheduling/ messaging/ validation/
supabase/
  migrations/ seed.sql functions/process-message-jobs/
tests/
  unit/ integration/ e2e/
```

## Pre-launch checklist

- Confirm the church’s public privacy notice, consent wording, sender identity, and SMS keyword language.
- Verify all public content is intentional and no volunteer data appears in page source or API responses.
- Set a branded sending domain and reply-to address for email.
- Test reminders in the church timezone across daylight-saving transitions.
- Invite coordinators, train them on approval and absence workflows, and publish a one-page operating guide.
- Run a small pilot week before broader rollout.
