# Required Manual Actions Before Submission

- Commit and push `PRIVACY_POLICY.md` and `TERMS_OF_USE.md` to `main`; verify both public GitHub links without signing in.
- Provide and publish a private method for privacy/deletion requests (ideally a support email). GitHub issues are public and are not suitable for private personal data.
- Confirm and document multiplayer records' actual retention and deletion process; confirm Netlify retention of IP address, user-agent and error/access logs.
- Enter the public privacy-policy URL in the CWS dashboard and verify developer contact details.
- Complete dashboard data-use declarations, Limited Use certification, permission justifications, and reviewer instructions from `CWS_SUBMISSION.md`.
- Upload a 128×128 icon, at least one accurate store screenshot, and any promotional tile required by the dashboard. Recommended: Create/Join, lobby, game, side panel, result, disclosure.
- Confirm the production API is live and test every flow with two participants. Verify CORS permits requests from the final `chrome-extension://<extension-id>` origin.
- Extract and load the generated ZIP in Chrome; also load `dist/`. Confirm popup, side panel, disclosure, links, local clearing, timeout/offline states, and gameplay behave identically with no console errors or third-party requests.
- Complete/pay for Chrome Web Store developer registration and supply truthful listing/dashboard details.
