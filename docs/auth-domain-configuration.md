# Authentication domain configuration

Checked and corrected on October 2, 2026 for Supabase project `fuwuwcyzerrdemxhrsjn`.

- Auth Site URL: `https://altarrhythm.com`.
- Production redirect URLs: `https://altarrhythm.com/portal` and `https://altar.lighthouseprayerroom.org/portal`.
- Development redirect URLs retained: `http://localhost:5173/portal` and `http://127.0.0.1:5173/portal`.
- `invite-volunteer` accepts both production origins; JWT verification and active coordinator/admin authorization remain enabled.
- Browser callbacks are handled on all routes, including the public homepage used as the Site URL fallback. Failed callbacks lead to `/access` with instructions to request a fresh link.

The new domain had not been added to Supabase Auth's redirect allowlist. Sign-in requests therefore fell back to the old Site URL. Auth logs showed a successful login at 14:46:16 UTC, followed by a rejected reuse of the same one-time link at 14:46:32 UTC. Both administrator profiles remained active. Browser sessions are specific to their domain; signing in on the old domain does not sign in the new domain.

These are Auth configuration and Edge Function changes, not database schema changes, so no SQL migration is required. Future domain changes must update both Auth URL configuration and the invitation service's origin allowlist. Request new links from `/access` on the intended domain and use only the newest email. Existing email links may retain their original redirect target.

Verification: 67 automated tests, TypeScript production build, lint, persisted dashboard URL configuration, and production Edge Function readback. A fresh email sign-in must be completed by the account owner to verify their browser session end to end.
