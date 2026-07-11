# Chrome Web Store Submission Copy

**Item name:** Movie Guess Battle

**Short summary:** Play private multiplayer movie guessing battles with friends from Chrome.

**Single purpose:** Movie Guess Battle enables users to create and join private multiplayer rooms and play a turn-based movie-title guessing game from the Chrome popup or side panel.

## Detailed description

Create a private room, share its room code with friends, and take turns choosing and guessing movie titles. Hosts configure player limits, difficulty, lives, turn timing and hint modes; players follow shared room progress, submit letter or full-title guesses, and see scores and round results. Play in a compact Chrome popup or keep the game available in Chrome's side panel.

No account or payment is required. The extension contains no advertising and no real-money gameplay. It stores an anonymous identifier, display name, preferences, consent and limited room/score history locally to restore the experience. An internet connection and the Movie Guess Battle multiplayer service are required for private-room play.

## Permission justifications

**Storage:** Used to store the player's anonymous identifier, display name, game preferences, previous room information, privacy-consent status and score history so the multiplayer game can restore local state.

**Side Panel:** Used to provide a persistent multiplayer game interface that can remain available while the user uses Chrome.

**Host permission:** Used only to communicate with the Movie Guess Battle multiplayer API at movie-guess-battle.netlify.app for creating rooms, joining rooms and synchronising game state.

## Remote code

**Answer: No, this extension does not use remote code.** All JavaScript is bundled inside the extension package. The server returns game data only; API responses are not executed as code. No external JavaScript or WebAssembly is loaded.

## Data-use declarations

| CWS category | Collected? | Local | Server | Room players | Purpose / recommended dashboard selection | Supporting path |
|---|---:|---:|---:|---:|---|---|
| Personally identifiable information | Conservatively yes | Yes | Yes | Display name yes | Select: name/display name; operate multiplayer | `src/lib/privacyStorage.ts`, shared profile/room functions |
| Authentication information | No | No | No | No | No accounts or credentials | none |
| Personal communications | Conservatively yes | Room history only | Yes | Yes, as game state | Select if dashboard treats custom titles/guesses as communications | shared game and Netlify actions |
| Location | No | No | No | No | Do not select; host may infer IP separately in logs | none |
| Web history | No | No | No | No | Do not select | none |
| User activity | Yes | History/scores | Yes | Yes | Select interaction/gameplay activity; operate game | shared game/storage code |
| Website content | No | No | No | No | Do not select; no content scripts/page access | none |
| Financial information | No | No | No | No | Do not select | none |
| Health information | No | No | No | No | Do not select | none |

Persistent anonymous IDs should be declared conservatively under the dashboard's identifier/user-activity choices. Custom movie titles and guesses are user-generated room communications even though they occur inside a game.

## Limited Use certification

Movie Guess Battle uses data only to operate and secure its private multiplayer game. Data is not sold, used for personalised advertising, transferred to data brokers, or used for credit decisions. Users receive a prominent disclosure before multiplayer data is sent. Use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including Limited Use requirements.

## Reviewer instructions

1. Install and open the extension; verify the disclosure appears before multiplayer UI.
2. Open Privacy Policy and Terms, then select **Agree and Continue**.
3. Enter a display name and create a room. Copy its five-letter code.
4. In a second Chrome profile (or incognito with the extension enabled), accept disclosure, enter another name, and join using the code.
5. As host, configure the room and begin setup. The designated movie giver enters a movie title, configures hints and starts the round.
6. As the active player, submit letter and full-movie guesses; verify turns, score and result. Return to the lobby.
7. Open the side panel from the popup and verify the game loads there.
8. Open Privacy, then test Reset privacy consent. Re-accept; return to Privacy and test Clear local data after leaving the room.

Expected: two participants share lobby/game state, the host controls setup, guesses advance gameplay, and privacy controls work without a blank screen. No login, payment or test account is required. Multiplayer requires two participants and the production API. If the API is unavailable, the extension should remain open and show a readable error.

## Listing asset checklist

- 128×128 icon (included in package; upload separately where requested)
- At least one accurate store screenshot
- Small promotional tile if the dashboard requires it
- Recommended screenshots: Create/Join, multiplayer lobby, game, side panel, result/winner, privacy disclosure
