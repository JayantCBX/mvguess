# Supabase Setup

Use a free Supabase project for MVP testing.

## SQL

Run these migrations in order in the Supabase SQL editor:

1. `supabase/migrations/001_create_tables.sql`
2. `supabase/migrations/002_create_rls_policies.sql`
3. `supabase/migrations/003_create_views_and_rpc.sql`
4. `supabase/migrations/004_custom_movie_giver_rotation.sql`
5. `supabase/migrations/005_advanced_game_modes.sql`

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
- `return_to_lobby_rpc`
- `kick_player_rpc`
- `eliminate_player_rpc`
- `transfer_host_rpc`
- `leave_room_rpc`
- `get_my_player_round_state_rpc`

Migration 005 keeps private-secret detail in `player_round_states`, revokes anonymous direct access to that table, and exposes only the requested player's row through an RPC. Public round views hide the movie title until the round ends. Anonymous player IDs are still an MVP identity mechanism; production should add signed ephemeral player sessions for stronger anti-spoofing guarantees.
