# Architecture — Altar Initiative MVP

## Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | React + TypeScript, built with Vite | Produces static assets the existing shared host can serve; no application host subscription. |
| UI | Tailwind CSS + accessible component primitives | Fast, restrained church-specific visual system without custom UI infrastructure. |
| Database | PostgreSQL through Supabase | Relational scheduling data, managed backups, and row-level security. |
| Authentication | Supabase Auth with invitation-only access | Fits the approved-volunteer model and avoids open account creation. |
| Authorization | Application roles plus PostgreSQL row-level security | Enforces the public / volunteer / coordinator boundary at both layers. |
| Email | Resend | Transactional confirmations and scheduled reminders; the only new communications vendor in the MVP. |
| SMS | Deferred | Add an opt-in SMS provider only after the pilot shows email reminders are insufficient. |
| Background work | Supabase Cron + Edge Function + durable job table | Delivers time-sensitive reminders without relying on a hosting-plan cron cadence. |
| Hosting | Existing shared web host | Serves the built static front end at an Altar Initiative subdomain or path. |
| Observability | Sentry | Error reporting without logging sensitive operational notes. |

The browser app is static and carries no privileged credentials. Supabase Cron selects due message jobs and invokes an Edge Function; the function claims each job atomically, calls the email provider adapter, and records the outcome. This avoids relying on the shared host for background work or secrets. Keep an SMS adapter out of the MVP until it is genuinely needed.

## Application areas

```text
Public site
  /                         Altar Initiative overview
  /calendar                 Public gatherings
  /rhythm                   Morning / noon / evening rhythm and daily focus
  /serve                    Interest form
  /updates                  Email updates consent form

Authenticated portal
  /portal                   Volunteer home and upcoming shifts
  /portal/schedule          Eligible open shifts and assigned shifts
  /portal/settings          Contact and reminder preferences

Coordinator console
  /admin/schedule           Shift templates, assignments, and conflicts
  /admin/calendar           Public and private room events
  /admin/people             Interest review, approval, volunteer status
  /admin/coverage           Gaps, confirmations, workload, and trends
  /admin/messages           Message previews and delivery history
```

## Access-control rules

| Data | Public | Approved volunteer | Coordinator / admin |
| --- | --- | --- | --- |
| Public event | Read | Read | Create and manage |
| Private room event | No access | Only relevant details | Create and manage |
| Shift assignment | No access | Own assignment only | All assignments |
| Open shift | No access | Eligible shifts only | All shifts |
| Volunteer identity | No access | Minimal display where needed | All volunteer records |
| Interest submission | Submit only | No access | Review and act |
| Messaging history | No access | Own preferences only | All delivery history |

## Initial data model

```text
profiles(id, display_name, email, phone_e164, role, status)
interest_submissions(id, name, email, phone_e164, availability, notes, status, reviewed_by)
notification_preferences(id, profile_id, email_opt_in, consented_at)
room_events(id, title, starts_at, ends_at, visibility, event_type, description, created_by)
shift_templates(id, weekday, starts_at, ends_at, required_volunteers, eligibility_rule)
shifts(id, template_id, starts_at, ends_at, status, room_event_id)
shift_assignments(id, shift_id, profile_id, assignment_status, confirmed_at)
prayer_focuses(id, date, title, public_summary, scripture_reference, resource_url, volunteer_notes, published_at)
message_jobs(id, channel, template_key, recipient_profile_id, scheduled_for, status, provider_message_id)
audit_log(id, actor_profile_id, action, entity_type, entity_id, created_at)
```

Keep message content limited to scheduling and initiative communications. Do not create a prayer-request table or a generic free-form pastoral-record table.

## Notification design

- Record explicit email consent and an unsubscribe timestamp.
- Use a job record with idempotency keys before attempting delivery, so scheduler retries cannot duplicate reminders. Resend accepts an idempotency key for email sends.
- Store provider IDs and delivery status, not more message content than operationally necessary.
- Send reminders according to configurable templates: assignment confirmation, one-week reminder, 24-hour reminder, unconfirmed shift alert, and coverage request.

SMS is intentionally outside the MVP. If it is later added, implement distinct opt-in/opt-out state, provider webhooks, and compliant sender/STOP messaging as a separate milestone.

## Build sequence

1. Set up the static React app, visual foundation, database migrations, authentication, and role model.
2. Configure a shared-host subdomain/path and build the public calendar, updates signup, and serve-interest form.
3. Build coordinator approval and invitation flow.
4. Build private schedule, assignment, and absence/swap workflows.
5. Add reminder jobs, delivery monitoring, and coverage reporting.
6. Add room-conflict rules, audit logging, accessibility review, and launch hardening.
