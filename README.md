# Movie Guess Battle

The complete Chrome MV3 popup and side-panel package lives in [`Chrome Extension`](./Chrome%20Extension). Build it with `npm run build:extension`, then load `Chrome Extension/dist` as an unpacked extension.

Movie Guess Battle is a Manifest V3 Chrome Extension MVP for a private-room multiplayer movie guessing game inspired by the Indian paper movie guessing game. The popup is only a launcher; gameplay opens in `game.html` as a full extension page/new tab.

## Features

- Chrome Extension Manifest V3 with minimum `storage` permission.
- React, Vite, TypeScript, Tailwind CSS.
- Local Bollywood and Hollywood movie catalogs remain available for code/tests, while live rounds now use custom movie titles entered by the assigned movie giver.
- Local game engine for masking, hints, turns, scoring, full guesses, and life word deduction.
- Rotating movie-giver setup: the host gives the first custom movie, then each next player gives a movie in turn.
- Hint setup: manual, random, smart random, no hints, and difficulty auto.
- Netlify Functions + Netlify Blobs backend for hosted multiplayer rooms.
- Optional Supabase schema for alternate database-backed testing.
- Public views exclude `movie_title_private`.
- Vitest coverage for masking, hints, scoring, turns, room codes, guesses, and timer skips.
- Shared-public and private-secret guess modes with per-player masks, life, guessed letters, and optional round-end score reveal.
- Host kick, eliminate, and host-transfer controls plus safe leave/reconnect handling.
- Round and guess history, a server-backed return-to-lobby action, and reduced-motion-friendly winner fireworks.
- Responsive browser play from 360px upward, including touch-sized controls and mobile host-setting accordions.
- No paid APIs, no ads, no tracking scripts, no external movie API.

## File Tree

```text
public/icons/
src/popup/
src/game/
src/components/
src/screens/
src/lib/game/
src/lib/supabase/
src/lib/storage/
src/data/
src/tests/
supabase/migrations/
manifest.json
popup.html
game.html
package.json
```

## Local Setup

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run build
```

For Netlify-hosted multiplayer, `netlify.toml` sets `VITE_ONLINE_BACKEND=netlify`.

Create `.env` from `.env.example` only when testing the optional Supabase backend. Vite does not load `.env.example` automatically:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Multiplayer Testing

Without an online backend, the app runs in local test mode and the lobby exposes an `Add local player` button so the local game loop can be tested in one tab.

With the Netlify backend deployed:

1. Deploy to Netlify.
2. Open the site URL.
3. Create a room and copy the invite link or room code.
4. Choose a room capacity from 2 to 8, then share the invite link or have players open `game.html?action=join` and enter the room code.
5. Each player joins with a unique name and waits in the lobby.
6. The host enters the first movie. After that round ends, the next player shown on the result screen enters the next movie.

### Multi-player and secret-mode testing

Open the deployed game in separate browser profiles or private windows so each player has a different anonymous device ID. For capacity testing, select **8 players** and join eight sessions. Choose **Private secret**, leave score reveal on **Round end**, and verify that each guesser sees only their own letters, life, mask, and detailed history. Other players should see only a neutral turn event. Use the host player menu to test kick, eliminate, and host transfer. After the result, use **Lobby** and verify every client remains in the lobby instead of returning to the result screen.

## Privacy-safe player memory

This app uses a local anonymous device ID to restore player name and score history. It does not read browser cookies. The extension uses only `chrome.storage.local`; the normal web build falls back to same-origin `localStorage`. No cookie, tabs, or broad host permission is requested, and IP addresses are not used as player identity.

## Responsive web limitation

The Chrome extension itself is not supported by every mobile browser. The deployed `game.html` page is a responsive normal web experience and is the recommended way to play on phones and tablets.

## Known MVP Limitations

This is a free MVP. The hosted Netlify backend stores room state in Netlify Blobs and keeps movie titles server-side after setup.

The UI includes local gameplay plus Netlify-backed room creation, joining, custom movie setup, guesses, skips, and polling-based public round sync. The remaining hardening work is stronger anonymous player authorization and conflict handling for very fast simultaneous actions.

## Documentation

- [SETUP.md](./SETUP.md)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- [CHROME_EXTENSION_LOAD.md](./CHROME_EXTENSION_LOAD.md)
- [GAME_RULES.md](./GAME_RULES.md)
- [ROADMAP.md](./ROADMAP.md)

