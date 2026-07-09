# Roadmap

## Near Term

- Wire `startOnlineRound` and `submitOnlineGuess` into the React flow for full Supabase-driven gameplay.
- Add host reassignment on presence leave.
- Add database-backed timer expiry handling.
- Add optimistic UI rollback on room state conflicts.
- Improve extension icon assets with PNG exports.

## Server-Authoritative Version

- Move movie selection to Supabase Edge Functions or another free/serverless backend.
- Make guess validation fully server-authoritative.
- Add signed ephemeral player tokens instead of trusting local player IDs.
- Tighten RLS around joined-room membership.

## Polish

- Add more animations for life word deduction and correct letter reveals.
- Add sound effects as optional local assets.
- Add richer reconnect state and offline banners.
- Add more movies and optional custom room movie lists.
