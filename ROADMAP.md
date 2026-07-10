# Roadmap

## Delivered

- Shared-public and private-secret modes with private masks, life, letter lists, and round-end score reveal.
- Host kick, elimination, host transfer, leave handling, and automatic host reassignment.
- Server-authoritative return-to-lobby flow for local, Netlify, and Supabase modes.
- Privacy-safe anonymous device memory with no cookie permission.
- Round/guess history, winner fireworks, reduced-motion support, and responsive web layouts.

## Next hardening

- Add signed ephemeral player tokens so online actions cannot rely on an unverified anonymous player UUID.
- Add compare-and-swap room versions for simultaneous Netlify Blob writes.
- Add server-authoritative timer deadlines instead of trusting each active browser timer.
- Add richer reconnect/offline banners and an emergency movie-giver reassignment choice during setup.
- Add end-to-end browser tests for four simultaneous sessions and the documented responsive viewport matrix.

## Optional polish

- Local sound effects with a mute control.
- More life-deduction and correct-letter transitions.
- Exportable room history and custom movie packs.
