# First coordinator setup

The public app must never create volunteers or coordinators. Establish the first private administrator inside Supabase, then use the app’s invitation-only sign-in flow for ordinary access.

## One-time setup

1. In **Supabase → Authentication → URL Configuration**, set the production site URL and allow its `/portal` callback URL. For local testing, also allow `http://127.0.0.1:5173/portal`.
2. Confirm the Email provider is enabled in **Authentication → Providers**.
3. In **Authentication → Users**, create or invite the first coordinator with their real email address. The database trigger automatically creates a matching `profiles` record with the safe default of `prospect` / `invited`.
4. In **SQL Editor**, find that new profile by email, review the result, then promote exactly that account. Replace the placeholder only after verifying the selected row:

```sql
select id, email, role, status from public.profiles where email = 'coordinator@example.org';

update public.profiles
set role = 'admin', status = 'active'
where email = 'coordinator@example.org';
```

5. Open `/access`, request a magic link with the same email, and use the received link to reach `/portal` or `/coordinator`.

## Guardrails

- Do not put a Supabase service-role key in the static app or browser configuration.
- The `/access` page uses `shouldCreateUser: false`; it can sign in existing Auth users only.
- A successful sign-in is not enough by itself: the profile must also be active and have a volunteer, coordinator, or admin role before private RLS policies return data.
- For future volunteers, create or invite their Auth user only after a coordinator completes the personal invitation process.
