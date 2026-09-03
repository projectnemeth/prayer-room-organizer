# Multi-shift assignment plan

The current role-based model keeps volunteer self-claims available: a claim reserves a volunteer's time, while a coordinator later assigns the role coverage. The safest next feature is a coordinator-only **Assign across shifts** flow—not a recurring assignment that silently changes the schedule.

## Proposed experience

1. Start with one approved volunteer and select a date range or the visible week/month.
2. Show eligible, non-overlapping shifts with each shift's still-open roles.
3. The coordinator checks one or more shifts, then selects one or more roles for each selected shift. The same role combination can be applied to all selected shifts and adjusted per shift before sending.
4. Review a single summary, then send all invitations. Each shift remains its own assignment and has its own accept/decline status.

## Backend shape

Add a `coordinator_request_volunteer_for_shifts(p_profile_id, p_assignments jsonb)` RPC where each JSON item has `shift_id` and `roles`. It should:

- validate the caller, active volunteer, each role requirement, and role capacity;
- reject overlaps with the volunteer's confirmed, assigned, or newly selected shifts;
- lock affected role-requirement rows in a stable `shift_id, role` order to avoid overbooking and deadlocks;
- create or reactivate the normal per-shift assignment and role rows in one transaction; and
- return a per-shift result so the UI can show what was invited.

Do not introduce a parent “series assignment” as the first version. Separate shift assignments preserve independent responses, absences, cancellation, reminders, audit history, and role changes. A later optional `assignment_batch` record can group invitations for reporting and one-click cancellation without changing that behavior.

## Guardrails

- Never auto-assign a role that has no available capacity.
- Treat pending invitations as reserved coverage, as the single-shift flow already does.
- Default to warning on long runs (for example, more than four consecutive weeks), but allow the coordinator to proceed.
- A changed or cancelled shift affects only its own assignment; the batch is an audit grouping, not a recurring rule.
