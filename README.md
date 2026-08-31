# Altar Initiative

The Altar Initiative is a private coordination hub for a church Prayer Room, paired with a simple public calendar and updates signup.

## Product boundaries

- The public can view public gatherings, express interest in serving, and subscribe to updates.
- Only approved volunteers can view or claim volunteer shifts.
- Coordinators manage schedules, room use, approval, reminders, and coverage needs.
- The product does not collect, store, or process prayer requests.

## Planning documents

- [Product brief](docs/product-brief.md)
- [Architecture](docs/architecture.md)
- [Decisions](docs/decisions.md)

## Proposed stack

Next.js + TypeScript, PostgreSQL/Supabase, Supabase Auth, Resend for email, Twilio for SMS, and Vercel for hosting.

