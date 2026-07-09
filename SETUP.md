# Setup

## Requirements

- Node.js 20+
- npm
- Chrome or Chromium
- Optional: Supabase free-tier project

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
