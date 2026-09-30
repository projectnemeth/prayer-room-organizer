# Supabase migration history repair

On 2026-09-30, the Supabase GitHub check failed while replaying
`202609010001_initial_schema.sql`: the `profiles_set_updated_at` trigger already
existed. The production database contained the schema, functions, policies, and
October seed records from the repository migrations, but
`supabase_migrations.schema_migrations` listed only four later versions.

The 17 missing versions were recorded as applied through the connected Supabase
plugin after checking the corresponding database objects and seed counts. No
schema objects or application data were changed during this repair. The tracker
now lists all 21 migration files in this repository. Future schema changes should
use new migration files and keep their applied versions in the tracker.
