# The Altar Initiative

The Altar Initiative is a shared daily prayer rhythm—morning, noon, and evening—centered on the presence of Jesus, Scripture, worship, and prayer for awakening in our region.

This product is the private coordination hub for the Prayer Room, paired with a simple public calendar and updates signup. It supports the initiative without turning a shared call to prayer into a public scheduling system.

## Product boundaries

- The public can view public gatherings, express interest in serving, and subscribe to updates.
- Only approved volunteers can view or claim volunteer shifts.
- Coordinators manage schedules, room use, approval, reminders, and coverage needs.
- The product does not collect, store, or process prayer requests.

## Planning documents

- [Product brief](docs/product-brief.md)
- [Architecture](docs/architecture.md)
- [Development plan](docs/development-plan.md)
- [Decisions](docs/decisions.md)
- [Brand direction](docs/brand-direction.md)

## Proposed stack

React + TypeScript built as static files on the existing shared host; Supabase for database, authentication, authorization, scheduled jobs, and secure functions; Resend for email reminders. SMS is a post-pilot addition only if email reminders prove insufficient.
