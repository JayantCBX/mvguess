# Movie Guess Battle Chrome Extension

This Manifest V3 package runs the complete game in both the toolbar popup and Chrome side panel. It uses the same Netlify room API as the deployed web app, so extension and web players can join the same room code.

## Build

From the repository root:

```bash
npm install
npm run build:extension
```

The loadable package is generated at `Chrome Extension/dist`.

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
