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
- [ALTAR Rhythm website specification](docs/altar-rhythm-website-spec.md)
- [First coordinator setup](docs/first-coordinator-setup.md)

## Proposed stack

React + TypeScript built as static files on the existing shared host; Supabase for database, authentication, authorization, scheduled jobs, and secure functions; Resend for email reminders. SMS is a post-pilot addition only if email reminders prove insufficient.

## Communications setup

The public signup on Home, Initiatives, Resources, and `/updates` embeds the published Kit form. Kit manages new marketing subscribers; the site does not use a Kit API key. Supabase and Resend still handle volunteer reminders and previously issued update confirmation/unsubscribe links. Existing confirmed Supabase subscribers remain in their separate legacy list. See [communications operations](docs/communications-operations.md) for the provider boundaries and legacy workflow.
