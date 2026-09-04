# Project operating instructions

## Deployments

- Cloudflare production deploys automatically when changes are pushed to GitHub. For static-site changes, commit and push the approved code, then verify the Cloudflare build.

## Supabase

- Do not make production Supabase changes directly through the dashboard or CLI.
- Give the user a concise SQL snippet that they can run in the Supabase web SQL Editor for every Supabase database update. If a requested Supabase change cannot be expressed as SQL (for example, an Edge Function or Auth dashboard setting), clearly identify the required manual dashboard step instead of performing it.
