import type { RoomState, ValidationResult } from "../../types/game";

export function validateGuess(room: RoomState, playerId: string, guess: string, type: "letter" | "full_movie"): ValidationResult {
  const errors: string[] = [];
  const trimmed = guess.trim();

  if (room.status !== "playing") errors.push("Round is not active.");
  if (room.currentTurnPlayerId !== playerId) errors.push("It is not your turn.");
  if (!trimmed) errors.push("Guess is required.");

  if (type === "letter") {
    if (!/^[a-z]$/i.test(trimmed)) errors.push("Enter one alphabet letter.");
    if (room.guessedLetters.includes(trimmed.toUpperCase())) errors.push("That letter was already guessed.");
  }

  if (type === "full_movie" && trimmed.length < 2) {
    errors.push("Full movie guess is too short.");
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizePlayerName(name: string): string {
  return name.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
}
