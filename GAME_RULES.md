# Game Rules

- 2 to 4 players per room.
- Exactly one host per room.
- Host chooses category, difficulty, life word, timer, and hint settings.
- The host gives the first custom movie title.
- After each round, the next online player gives the next custom movie title.
- Only the current movie giver sees the full movie during setup.
- The movie giver does not guess their own movie.
- Players see only the masked movie during play.
- Spaces, punctuation, and numbers are always visible.
- Alphabet guesses are case-insensitive.
- Repeated letters reveal together.
- A letter cannot be guessed twice.
- Only the current turn player can guess.
- Correct alphabet guess: +10.
- Wrong alphabet guess: 0 by default, optional -5.
- Correct full movie guess: +50.
- Wrong full movie guess deducts 2 life letters.
- Wrong alphabet guess deducts 1 life letter.
- Timer expiry skips the current turn.
- The round ends when the movie is solved or the life word reaches zero.

## Guess Visibility

- **Shared public** is the classic default: mask, guessed letters, wrong letters, life, and scores are shared.
- **Private secret** gives every guesser a private mask, letter lists, life count, and detailed guess history.
- Secret guesses produce only neutral events for other players. The movie giver never guesses.
- With round-end score reveal, points remain private until the round finishes.
- A secret player whose life reaches zero is eliminated while remaining guessers continue.
- The host can configure the last remaining guesser to continue or win automatically.

## Player Management and Leaving

- The host may kick a player, eliminate them from the current round, or transfer host to an online active player.
- The host cannot remove themselves without transferring host or leaving.
- Leaving during a round eliminates that player and advances the turn immediately when needed.
- When a host leaves, host passes to the next online active player.
- Kicked players cannot rejoin unless the host explicitly enables that room setting.
- Eliminated online players become active again when an authorized player returns the completed room to the lobby.

## Results

- A won round displays “Winner Winner Chicken Dinner!” and optional CSS fireworks.
- Reduced-motion preferences replace the animation with a static celebration.
- The Lobby button updates the authoritative room state; it does not only change the local screen.

## Hint Modes

- Manual: host selects exact alphabet positions.
- Random: system chooses valid random hint positions.
- Smart random: avoids predictable and overly revealing choices.
- No hints: only non-alphabet characters are visible.
- Difficulty auto: uses difficulty-based hint limits.
