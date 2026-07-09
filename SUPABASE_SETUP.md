# Supabase Setup

Use a free Supabase project for MVP testing.

## SQL

Run these migrations in order in the Supabase SQL editor:

1. `supabase/migrations/001_create_tables.sql`
2. `supabase/migrations/002_create_rls_policies.sql`
3. `supabase/migrations/003_create_views_and_rpc.sql`
4. `supabase/migrations/004_custom_movie_giver_rotation.sql`

If room creation shows a local-mode fallback, the connected Supabase project is missing these tables/views/functions. Run the SQL above in order, then refresh the app.

## Realtime

Enable Realtime for:

- `rooms`
- `players`
- `rounds`
- `guesses`

The client subscribes to `room:{roomCode}` channels for broadcast events and is structured for presence tracking.

## Security Notes

The public app reads `rooms_public` and `rounds_public`, which exclude `movie_title_private`. Sensitive round operations are implemented as RPC functions:

- `start_round_rpc`
- `submit_guess_rpc`

MVP RLS is intentionally permissive because the app uses anonymous/local player identity instead of paid auth. Production should add signed player sessions or a server-authoritative function layer.
