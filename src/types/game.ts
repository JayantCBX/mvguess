export type Category = "bollywood" | "hollywood" | "mixed";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type RoomStatus = "lobby" | "setup" | "playing" | "round_over" | "inactive";
export type GuessType = "letter" | "full_movie" | "skip";
export type LifeWord = "BOLLYWOOD" | "HOLLYWOOD";

export interface Movie {
  id: string;
  title: string;
  year?: number;
  difficulty: Difficulty;
  category: Exclude<Category, "mixed">;
}

export interface Player {
  id: string;
  roomId?: string;
  name: string;
  score: number;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface RoomSettings {
  category: Category;
  difficulty: Difficulty;
  lifeWord: LifeWord;
  timerSeconds: 15 | 30 | 45 | 60;
  wrongGuessPenalty: boolean;
  maxPlayers: 2 | 3 | 4;
}

export interface RoomState {
  id: string;
  code: string;
  hostPlayerId: string | null;
  status: RoomStatus;
  settings: RoomSettings;
  players: Player[];
  currentTurnPlayerId: string | null;
  lifeRemaining: number;
  maskedMovie: string;
  guessedLetters: string[];
  wrongLetters: string[];
  round?: RoundState;
  updatedAt: string;
}

export interface RoundState {
  id: string;
  roundNumber: number;
  movieGiverPlayerId?: string | null;
  movieTitlePrivate?: string;
  movieDisplay?: string;
  initialMaskedMovie: string;
  maskedMovie: string;
  status: "setup" | "playing" | "won" | "lost";
  hintPositions: number[];
  hintLetters: string[];
  winnerPlayerId?: string | null;
}

export interface GuessResult {
  ok: boolean;
  message: string;
  room: RoomState;
  pointsDelta: number;
  isCorrect: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
