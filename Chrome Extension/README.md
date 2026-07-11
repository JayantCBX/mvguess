# Movie Guess Battle Chrome Extension

This Manifest V3 package runs the complete game in both the toolbar popup and Chrome side panel. It uses the same Netlify room API as the deployed web app, so extension and web players can join the same room code.

## Development and release

From `Chrome Extension/`:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run cws:audit
npm run package:cws
```

The loadable package is generated at `dist/`; the audited upload ZIP and checksum are generated under ignored `releases/`. The ZIP contains only `dist` contents and has `manifest.json` at its root.

## Load unpacked

1. Open `chrome://extensions` in Chrome 116 or newer.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `Chrome Extension/dist`.
5. Pin **Movie Guess Battle**.

Click the toolbar icon to play in the popup. Use **Side panel** in the popup header, or select Movie Guess Battle from Chrome's side-panel menu, for a persistent game view.

## Play with web and extension players

1. One player creates a room in either the extension or at `https://movie-guess-battle.netlify.app`.
2. Share the five-letter room code.
3. Other players join from the popup, side panel, or web app.
4. All clients use the same HTTPS Netlify room API and refresh live room state every second.

Each browser profile has its own anonymous device/player ID in `chrome.storage.local` or web `localStorage`. Use separate Chrome profiles for multiple players on one computer.

## Permissions

- `storage`: remembers the anonymous device ID, name, preferences, and room history.
- `sidePanel`: hosts the persistent game panel.
- `https://movie-guess-battle.netlify.app/*`: allows the extension pages to access the shared multiplayer API.

The extension does not request cookies, tabs, browsing history, or broad website access.

## Privacy and architecture

The first-run disclosure must be accepted before the game mounts or any multiplayer request can occur. Local profile and consent data can be viewed conceptually in `CWS_AUDIT.md` and cleared from Privacy in the popup. The production API origin is `https://movie-guess-battle.netlify.app`. Privacy and terms are in `PRIVACY_POLICY.md` and `TERMS_OF_USE.md`; support is the project GitHub issue tracker.

All executable code is bundled locally. The production build removes the shared Google Fonts import and replaces shared Supabase modules with extension-local stubs; API responses are treated only as JSON game data. Permissions are limited to storage, Side Panel, and the exact multiplayer origin.

## Troubleshooting

- A timeout or unavailable message means the production API or network could not respond; retry after checking connectivity.
- If a room cannot be joined, confirm the five-letter code, second participant, API availability and extension-origin CORS.
- If disclosure returns after an update, its version changed or consent/local data was reset.
- For a release, update the manifest patch version once, update disclosure version only if data practices changed, run all commands above, inspect the ZIP, and complete `CWS_REQUIRED_MANUAL_ACTIONS.md`.
