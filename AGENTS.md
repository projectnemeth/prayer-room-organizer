# Project operating instructions

## Deployments

- Cloudflare production deploys automatically when changes are pushed to GitHub. For static-site changes, commit and push the approved code, then verify the Cloudflare build.

## Supabase

- Use the connected Supabase plugin as the default path for production database, Auth, and Edge Function work. Make the change and verify it through the plugin rather than asking the user to run SQL or make dashboard changes.
- If the Supabase plugin is unavailable or lacks the required capability, explain the limitation and use a manual SQL/dashboard step only after confirming with the user.
- Keep the repository migration history aligned with production changes and follow the Supabase plugin's verification and security guidance.
