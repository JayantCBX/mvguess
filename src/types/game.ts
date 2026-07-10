export type Category = "bollywood" | "hollywood" | "mixed";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type RoomStatus = "lobby" | "setup" | "playing" | "round_over" | "inactive";
export type GuessType = "letter" | "full_movie" | "skip";
export type LifeWord = "BOLLYWOOD" | "HOLLYWOOD";
export type GuessVisibilityMode = "shared_public" | "private_secret";
export type SecretScoreRevealMode = "live" | "round_end";
export type LastPlayerStandingRule = "continue" | "auto_win";
export type PlayerStatus = "active" | "left" | "eliminated" | "kicked";

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
  status?: PlayerStatus;
  eliminatedAt?: string | null;
  leftAt?: string | null;
  kickedAt?: string | null;
  kickedByPlayerId?: string | null;
  deviceId?: string | null;
}

export interface RoomSettings {
  category: Category;
  difficulty: Difficulty;
  lifeWord: LifeWord;
  timerSeconds: 15 | 30 | 45 | 60;
  wrongGuessPenalty: boolean;
  maxPlayers: 2 | 3 | 4;
  guessVisibilityMode: GuessVisibilityMode;
  secretScoreRevealMode: SecretScoreRevealMode;
  lastPlayerStandingRule: LastPlayerStandingRule;
  allowHostKick: boolean;
  allowHostEliminate: boolean;
  allowLeaveDuringGame: boolean;
  allowRejoinAfterLeave: boolean;
  allowRejoinAfterElimination: boolean;
  allowRejoinAfterKick: boolean;
  showNeutralTurnMessagesInSecretMode: boolean;
  showWrongLettersInSharedMode: boolean;
  showGuessHistory: boolean;
  enableComebackBonus: boolean;
  enableStreakBonus: boolean;
  enableRoundHistory: boolean;
  enableWinnerFireworks: boolean;
  responsiveWebMode: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  category: "bollywood",
  difficulty: "medium",
  lifeWord: "BOLLYWOOD",
  timerSeconds: 30,
  wrongGuessPenalty: false,
  maxPlayers: 4,
  guessVisibilityMode: "shared_public",
  secretScoreRevealMode: "round_end",
  lastPlayerStandingRule: "continue",
  allowHostKick: true,
  allowHostEliminate: true,
  allowLeaveDuringGame: true,
  allowRejoinAfterLeave: true,
  allowRejoinAfterElimination: false,
  allowRejoinAfterKick: false,
  showNeutralTurnMessagesInSecretMode: true,
  showWrongLettersInSharedMode: true,
  showGuessHistory: true,
  enableComebackBonus: false,
  enableStreakBonus: false,
  enableRoundHistory: true,
  enableWinnerFireworks: true,
  responsiveWebMode: true
};

export interface PlayerRoundState {
  roomId: string;
  roundId: string;
  playerId: string;
  maskedMovie: string;
  guessedLetters: string[];
  wrongLetters: string[];
  lifeRemaining: number;
  isEliminated: boolean;
  pendingScore: number;
  lastGuessStatus?: "correct" | "wrong" | "skipped" | "solved" | null;
  updatedAt: string;
}

export interface GuessHistoryItem {
  id: string;
  roomId: string;
  roundId: string;
  playerId: string;
  guessType: GuessType;
  guessValue?: string;
  isCorrect?: boolean;
  visibility: "public" | "private";
  createdAt: string;
}

export interface RoundHistoryItem {
  roundId: string;
  roundNumber: number;
  movieGiverPlayerId: string | null;
  winnerPlayerId: string | null;
  movieTitle: string;
  lifeRemaining: number;
  durationSeconds: number;
  guessVisibilityMode: GuessVisibilityMode;
  scoresEarned: Record<string, number>;
  endedAt: string;
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
  playerRoundStates?: Record<string, PlayerRoundState>;
  guessHistory?: GuessHistoryItem[];
  roundHistory?: RoundHistoryItem[];
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
  startedAt?: string;
  endedAt?: string | null;
  scoreDeltas?: Record<string, number>;
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
