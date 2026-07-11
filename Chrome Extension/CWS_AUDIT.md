# Chrome Web Store Audit

Audit date: July 11, 2026

## Architecture and production source

`public/manifest.json` is copied by Vite and is the real manifest source. Popup and side-panel React entries mount an extension shell around the shared game UI. The extension production build statically selects the HTTPS Netlify room API at `https://movie-guess-battle.netlify.app`; extension aliases replace all shared Supabase imports with local non-operational stubs, so Supabase is absent from the bundle. `background.js` only configures the side panel.

Permissions are `storage` and `sidePanel`. The sole host permission is `https://movie-guess-battle.netlify.app/*`. No tabs, content scripts, browsing data, cookies, identity, analytics, advertising, or page modification exist. Public policy/support links go to `github.com` only after a user activates an anchor and do not require host permission.

## Data flow and local data map

| Storage key | Value | Purpose / retention | Transmitted | Deletion |
|---|---|---|---|---|
| `movieGuessBattle.profile` | IDs, name, last room, settings, room/status/score history | Restore local game state; retained until cleared/removal | Required profile and gameplay fields are sent during multiplayer | Privacy → Clear local data |
| `movieGuessBattle.privacyConsent` | accepted, version, acceptedAt | Versioned proof of local disclosure choice | No | Reset consent or clear local data |

The server receives names, anonymous IDs, room codes/membership, settings, movie titles, hints, guesses, scores, status and gameplay actions. Relevant room state is shared with room participants. Netlify may receive ordinary HTTP request/log metadata. Backend retention and log behavior cannot be verified from extension files.

## Findings and completed changes

- Incremented 0.2.1 to 0.2.2 exactly once; narrowed description, permissions, host access, and CSP.
- Removed Google Fonts at the extension build boundary and substituted system fonts.
- Removed Supabase from the extension production graph; no remote executable code is used.
- Added a disclosure gate before the game mounts, preventing pre-consent multiplayer requests, plus versioned consent and local-data controls.
- Added a fixed-origin client with HTTPS, timeout/abort handling, JSON validation, safe errors, and no sensitive production logging.
- Added an error boundary, CWS output audit, root-level ZIP packaging, privacy/terms/submission/manual-action documentation.

The API implementation, CORS behavior, server retention/deletion, infrastructure logging, deployed policy URLs, dashboard contact details, and real-browser store-package behavior cannot be proven from extension files alone and require the manual checks listed separately.
