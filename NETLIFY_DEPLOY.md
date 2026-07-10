# Netlify Deploy

This project is ready for Netlify as a static Vite app.

## One-time Supabase setup

The deployed Netlify site now uses Netlify Functions and Netlify Blobs for multiplayer rooms, so Supabase is no longer required for the hosted game.

If you want to keep using Supabase instead, run every SQL file in `supabase/migrations` in order inside the Supabase SQL editor:

1. `001_create_tables.sql`
2. `002_create_rls_policies.sql`
3. `003_create_views_and_rpc.sql`
4. `004_custom_movie_giver_rotation.sql`
5. `005_advanced_game_modes.sql`

The Netlify backend is selected by `VITE_ONLINE_BACKEND=netlify` in `netlify.toml`.

## Netlify environment variables

These Supabase variables are optional now:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Required for the hosted Netlify backend:

- `VITE_ONLINE_BACKEND=netlify`

Netlify path: Site configuration -> Environment variables.

## Build settings

The included `netlify.toml` sets:

- Build command: `npm run build`
- Publish directory: `dist`
- Root route: `/game.html`

## Deploy commands

Preview deploy:

```bash
npx netlify deploy
```

Production deploy:

```bash
npx netlify deploy --prod
```

After deploy, open the site URL. The host creates a room and shares the room code or invite link. Other players can join from any browser without installing the Chrome extension.

## Multiplayer actions and privacy

The room function supports `/kick`, `/eliminate`, `/transfer-host`, `/leave`, and `/return-lobby` actions. Netlify Blob storage contains the authoritative full room, but every room response is projected for the requesting player. In private-secret mode, it returns only that player's detailed round state and strips the private movie from non-giver responses until the result.

No cookies are required. The browser sends a locally generated anonymous device ID so a kicked device can be recognized without using its IP address.
