import { allMovies } from "../../data/movies";
import type { Category, Difficulty, GuessResult, Movie, Player, RoomSettings, RoomState } from "../../types/game";
import type { HintSettings } from "../../types/hints";
import { generateRoomCode } from "../../utils/roomCode";
import { applyHintPositions, defaultHintSettings } from "./hints";
import { createMaskedMovie, isMovieSolved, normalizeMovieTitle, revealLetter } from "./masking";
import { calculateScore } from "./scoring";
import { getNextMovieGiver, getNextPlayerTurn } from "./turns";
import { validateGuess } from "./validation";

export function selectRandomMovie(category: Category, difficulty: Difficulty, movies: Movie[] = allMovies): Movie {
  const matching = movies.filter((movie) => {
    const categoryMatches = category === "mixed" || movie.category === category;
    return categoryMatches && movie.difficulty === difficulty;
  });
  const pool = matching.length > 0 ? matching : movies;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function applyWrongGuess(lifeRemaining: number, deduction = 1): number {
  return Math.max(0, lifeRemaining - deduction);
}

export function createLocalPlayer(name: string, isHost = false): Player {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    score: 0,
    isHost,
    isOnline: true,
    joinedAt: now,
    lastSeenAt: now
  };
}

export function createInitialRoom(host: Player, settings: RoomSettings): RoomState {
  const now = new Date().toISOString();
  const hostPlayer = { ...host, isHost: true };
  return {
    id: crypto.randomUUID(),
    code: generateRoomCode(),
    hostPlayerId: hostPlayer.id,
    status: "lobby",
    settings,
    players: [hostPlayer],
    currentTurnPlayerId: null,
    lifeRemaining: settings.lifeWord.length,
    maskedMovie: "",
    guessedLetters: [],
    wrongLetters: [],
    updatedAt: now
  };
}

export function lockHints(title: string, hintPositions: number[], hintSettings: HintSettings = defaultHintSettings): string {
  return applyHintPositions(title, hintPositions, hintSettings);
}

export function startRound(
  room: RoomState,
  movie: Movie | Pick<Movie, "title">,
  hintPositions: number[] = [],
  hintSettings: HintSettings = defaultHintSettings,
  movieGiverPlayerId: string | null = room.currentTurnPlayerId ?? getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId)
): RoomState {
  const maskedMovie = hintPositions.length > 0 ? lockHints(movie.title, hintPositions, hintSettings) : createMaskedMovie(movie.title);
  return {
    ...room,
    status: "playing",
    lifeRemaining: room.settings.lifeWord.length,
    maskedMovie,
    guessedLetters: [],
    wrongLetters: [],
    currentTurnPlayerId: getNextPlayerTurn(room.players, null, movieGiverPlayerId),
    round: {
      id: crypto.randomUUID(),
      roundNumber: (room.round?.roundNumber ?? 0) + 1,
      movieGiverPlayerId,
      movieTitlePrivate: movie.title,
      movieDisplay: movie.title,
      initialMaskedMovie: maskedMovie,
      maskedMovie,
      status: "playing",
      hintPositions,
      hintLetters: [...new Set(hintPositions.map((position) => movie.title[position]?.toUpperCase()).filter(Boolean))]
    },
    updatedAt: new Date().toISOString()
  };
}

export function endRound(room: RoomState, status: "won" | "lost", winnerPlayerId?: string | null): RoomState {
  return {
    ...room,
    status: "round_over",
    round: room.round
      ? {
          ...room.round,
          status,
          winnerPlayerId
        }
      : undefined,
    updatedAt: new Date().toISOString()
  };
}

function updatePlayerScore(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((player) => (player.id === playerId ? { ...player, score: player.score + delta } : player));
}

export function submitLetterGuess(room: RoomState, playerId: string, letter: string): GuessResult {
  const validation = validateGuess(room, playerId, letter, "letter");
  if (!validation.valid) return { ok: false, message: validation.errors[0], room, pointsDelta: 0, isCorrect: false };

  const movieTitle = room.round?.movieTitlePrivate ?? "";
  const normalizedLetter = letter.toUpperCase();
  const isCorrect = movieTitle.toUpperCase().includes(normalizedLetter);
  const pointsDelta = calculateScore(isCorrect ? "correct_letter" : "wrong_letter", room.settings.wrongGuessPenalty);
  const maskedMovie = isCorrect ? revealLetter(movieTitle, room.maskedMovie, normalizedLetter) : room.maskedMovie;
  const lifeRemaining = isCorrect ? room.lifeRemaining : applyWrongGuess(room.lifeRemaining, 1);
  const nextRoom: RoomState = {
    ...room,
    maskedMovie,
    guessedLetters: [...room.guessedLetters, normalizedLetter],
    wrongLetters: isCorrect ? room.wrongLetters : [...room.wrongLetters, normalizedLetter],
    lifeRemaining,
    players: updatePlayerScore(room.players, playerId, pointsDelta),
    currentTurnPlayerId: getNextPlayerTurn(room.players, playerId, room.round?.movieGiverPlayerId),
    round: room.round ? { ...room.round, maskedMovie } : undefined,
    updatedAt: new Date().toISOString()
  };

  if (isCorrect && isMovieSolved(movieTitle, maskedMovie)) {
    return { ok: true, message: "Movie solved.", room: endRound(nextRoom, "won", playerId), pointsDelta, isCorrect };
  }
  if (!isCorrect && lifeRemaining === 0) {
    return { ok: true, message: "Life word exhausted.", room: endRound(nextRoom, "lost", null), pointsDelta, isCorrect };
  }

  return { ok: true, message: isCorrect ? "Correct guess." : "Wrong guess.", room: nextRoom, pointsDelta, isCorrect };
}

export function submitFullMovieGuess(room: RoomState, playerId: string, guess: string): GuessResult {
  const validation = validateGuess(room, playerId, guess, "full_movie");
  if (!validation.valid) return { ok: false, message: validation.errors[0], room, pointsDelta: 0, isCorrect: false };

  const movieTitle = room.round?.movieTitlePrivate ?? "";
  const isCorrect = normalizeMovieTitle(guess) === normalizeMovieTitle(movieTitle);
  const pointsDelta = isCorrect ? calculateScore("correct_full_movie") : 0;
  const lifeRemaining = isCorrect ? room.lifeRemaining : applyWrongGuess(room.lifeRemaining, 2);
  const nextRoom: RoomState = {
    ...room,
    lifeRemaining,
    players: updatePlayerScore(room.players, playerId, pointsDelta),
    currentTurnPlayerId: getNextPlayerTurn(room.players, playerId, room.round?.movieGiverPlayerId),
    updatedAt: new Date().toISOString()
  };

  if (isCorrect) {
    return { ok: true, message: "Full movie solved.", room: endRound({ ...nextRoom, maskedMovie: movieTitle }, "won", playerId), pointsDelta, isCorrect };
  }
  if (lifeRemaining === 0) {
    return { ok: true, message: "Life word exhausted.", room: endRound(nextRoom, "lost", null), pointsDelta, isCorrect };
  }
  return { ok: true, message: "Wrong full movie guess.", room: nextRoom, pointsDelta, isCorrect };
}

export function skipTurn(room: RoomState): RoomState {
  return {
    ...room,
    currentTurnPlayerId: getNextPlayerTurn(room.players, room.currentTurnPlayerId, room.round?.movieGiverPlayerId),
    updatedAt: new Date().toISOString()
  };
}
