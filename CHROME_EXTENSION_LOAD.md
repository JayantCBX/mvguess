# Load Movie Guess Battle in Chrome

The complete Manifest V3 extension is in `Chrome Extension`. Both the toolbar popup and side panel run the full game and share rooms with the deployed web app.

## Build and load

```bash
npm install
npm run build:extension
```

1. Open `chrome://extensions` in Chrome 116 or newer.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `Chrome Extension/dist`.
5. Pin **Movie Guess Battle**.

Click the toolbar icon to play in the popup. Click **Side panel** in the popup header for the persistent side-panel version.

See `Chrome Extension/README.md` for permissions, build structure, and web/extension multiplayer instructions.
