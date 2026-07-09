export const SCORE = {
  correctLetter: 10,
  wrongLetter: 0,
  wrongLetterPenalty: -5,
  correctFullMovie: 50,
  skippedTurn: 0
} as const;

export function calculateScore(
  event: "correct_letter" | "wrong_letter" | "correct_full_movie" | "skip",
  wrongGuessPenalty = false
): number {
  if (event === "correct_letter") return SCORE.correctLetter;
  if (event === "correct_full_movie") return SCORE.correctFullMovie;
  if (event === "wrong_letter") {
    return wrongGuessPenalty ? SCORE.wrongLetterPenalty : SCORE.wrongLetter;
  }
  return SCORE.skippedTurn;
}
