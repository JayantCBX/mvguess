import type { RoomState, ValidationResult } from "../../types/game";

export function validateGuess(room: RoomState, playerId: string, guess: string, type: "letter" | "full_movie"): ValidationResult {
  const errors: string[] = [];
  const trimmed = guess.trim();

  if (room.status !== "playing") errors.push("Round is not active.");
  if (room.currentTurnPlayerId !== playerId) errors.push("It is not your turn.");
  if (!trimmed) errors.push("Guess is required.");
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player || !player.isOnline || (player.status ?? "active") !== "active") errors.push("You are not active in this round.");
  if (room.round?.movieGiverPlayerId === playerId) errors.push("Movie giver cannot guess their own movie.");

  if (type === "letter") {
    if (!/^[a-z]$/i.test(trimmed)) errors.push("Enter one alphabet letter.");
    const guessedLetters =
      room.settings.guessVisibilityMode === "private_secret"
        ? room.playerRoundStates?.[playerId]?.guessedLetters ?? []
        : room.guessedLetters;
    if (guessedLetters.includes(trimmed.toUpperCase())) errors.push("That letter was already guessed.");
  }

  if (type === "full_movie" && (trimmed.length < 2 || trimmed.length > 80)) {
    errors.push("Full movie guess is too short.");
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizePlayerName(name: string): string {
  return name.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
}
