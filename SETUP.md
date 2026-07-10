# Setup

## Requirements

- Node.js 20+
- npm
- Chrome or Chromium
- Optional: Supabase free-tier project
- Optional: Netlify free tier for the default hosted multiplayer backend

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite serves `popup.html` and `game.html`. Use `game.html` for the full game page.

## Verify

```bash
npm run test
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env` when testing Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not put real keys in source control.

## Multiplayer QA

For four-player testing, use four browser profiles/private windows so every player receives a different local device ID. Test these flows in both shared and private-secret mode:

1. Host creates the room and three players join with unique names.
2. Start setup, confirm only the movie giver can enter the title, and play several turns.
3. In secret mode, compare screens and confirm letters, correctness, life, and pending score never appear on another player's screen.
4. From the host player menu, test **Eliminate**, **Kick**, and **Make host**.
5. Leave while it is your turn and confirm the turn advances once.
6. Finish the round, select **Lobby**, and confirm all clients remain in the lobby.

Responsive checks: `360x640`, `390x844`, `768x1024`, and `1366x768`. Also test a short landscape viewport. Controls should remain at least 44px high, the keyboard must wrap, and the player/score columns should move below the game on narrow screens.
