# Movie Guess Battle Privacy Policy

Effective date: July 11, 2026

Movie Guess Battle enables users to create and join private multiplayer rooms and play a turn-based movie-title guessing game from the Chrome popup or side panel.

## Information handled

The extension stores in `chrome.storage.local`: an anonymous device ID and player ID generated with `crypto.randomUUID()`, display name, last room code, room preferences, previous room statuses (active, left, eliminated, or kicked), previous scores, and the privacy-consent version and time. This information remains until the user clears extension data, resets Chrome storage, or removes the extension. The Privacy screen can clear it. The browser-development fallback uses localStorage.

After the user agrees to the prominent disclosure, the extension sends information necessary for multiplayer to `https://movie-guess-battle.netlify.app`: display name, anonymous player/device IDs, room code and membership, room/game settings, scores and room state, custom movie titles, hint choices, letter and full-movie guesses, skips, and gameplay/room-management actions. Other participants in the same private room can see applicable names, scores, room settings, game progress, guesses or results needed for shared play. A secret movie title may be withheld from guessers during a round by the service's game rules.

Netlify hosts the multiplayer service and may process requests and standard operational logs. Those logs may include IP address, user agent, timestamps, request paths, and error/connection metadata. The extension does not store IP addresses or user agents locally. Exact server and hosting-log retention cannot be established from the extension code; the developer must confirm and publish it before submission.

## Uses, sharing, and retention

Information is used only to create, synchronise, restore, secure, and troubleshoot private multiplayer rooms. It is disclosed to the multiplayer service, its infrastructure provider Netlify, and relevant players in the same room. It is not sold, used for personalised advertising, transferred to data brokers, used for credit decisions, or used for unrelated purposes. There is no advertising or behavioural tracking in the extension.

Server records and hosting logs follow the multiplayer service's retention and deletion practices, which require developer confirmation. Clearing local extension data does not delete server records. Until a verified private contact method is published, users may open a privacy or deletion request through [GitHub support](https://github.com/JayantCBX/mvguess/issues); do not include private information in a public issue.

## Security, children, and choices

The extension uses HTTPS, narrowly scoped Chrome permissions, a restrictive Content Security Policy, locally bundled executable code, request timeouts, and response validation. No system can guarantee absolute security. This entertainment game is not directed to children under the age required to consent to data processing in their location; guardians should supervise use where appropriate.

Policy changes will be published at this URL. A material change to extension data practices will increase the disclosure version and require users to review it again. Support and problem reports are available through the [project issue tracker](https://github.com/JayantCBX/mvguess/issues). No verified support email or mailing address is currently available.

Movie Guess Battle limits the collection, use, and transmission of user data to information necessary to provide and secure its private multiplayer movie guessing functionality.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.
