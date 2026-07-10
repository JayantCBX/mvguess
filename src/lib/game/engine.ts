import { allMovies } from "../../data/movies";
import type {
  Category,
  Difficulty,
  GuessHistoryItem,
  GuessResult,
  GuessType,
  Movie,
  Player,
  PlayerRoundState,
  RoomSettings,
  RoomState
} from "../../types/game";
import type { HintSettings } from "../../types/hints";
import { generateRoomCode } from "../../utils/roomCode";
import { applyHintPositions, defaultHintSettings } from "./hints";
import { createMaskedMovie, isMovieSolved, normalizeMovieTitle, revealLetter } from "./masking";
import { calculateScore } from "./scoring";
import { assignNextHost, getNextMovieGiver, getNextPlayerTurn, isActivePlayer } from "./turns";
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

export function createLocalPlayer(name: string, isHost = false, deviceId?: string): Player {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    score: 0,
    isHost,
    isOnline: true,
    joinedAt: now,
    lastSeenAt: now,
    status: "active",
    deviceId: deviceId ?? null
  };
}

export function createInitialRoom(host: Player, settings: RoomSettings): RoomState {
  const now = new Date().toISOString();
  const hostPlayer = { ...host, isHost: true, status: "active" as const };
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
    playerRoundStates: {},
    guessHistory: [],
    roundHistory: [],
    updatedAt: now
  };
}

export function lockHints(title: string, hintPositions: number[], hintSettings: HintSettings = defaultHintSettings): string {
  return applyHintPositions(title, hintPositions, hintSettings);
}

export function createPlayerRoundStates(
  room: RoomState,
  roundId: string,
  maskedMovie: string,
  movieGiverPlayerId: string | null = room.round?.movieGiverPlayerId ?? null
): Record<string, PlayerRoundState> {
  const now = new Date().toISOString();
  return Object.fromEntries(
    room.players
      .filter((player) => isActivePlayer(player) && player.id !== movieGiverPlayerId)
      .map((player) => [
        player.id,
        {
          roomId: room.id,
          roundId,
          playerId: player.id,
          maskedMovie,
          guessedLetters: [],
          wrongLetters: [],
          lifeRemaining: room.settings.lifeWord.length,
          isEliminated: false,
          pendingScore: 0,
          lastGuessStatus: null,
          updatedAt: now
        }
      ])
  );
}

export function startRound(
  room: RoomState,
  movie: Movie | Pick<Movie, "title">,
  hintPositions: number[] = [],
  hintSettings: HintSettings = defaultHintSettings,
  movieGiverPlayerId: string | null = room.currentTurnPlayerId ?? getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId)
): RoomState {
  const movieTitle = movie.title.trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 80);
  const maskedMovie = hintPositions.length > 0 ? lockHints(movieTitle, hintPositions, hintSettings) : createMaskedMovie(movieTitle);
  const roundId = crypto.randomUUID();
  const now = new Date().toISOString();
  const nextRoom: RoomState = {
    ...room,
    status: "playing",
    lifeRemaining: room.settings.lifeWord.length,
    maskedMovie,
    guessedLetters: [],
    wrongLetters: [],
    guessHistory: [],
    currentTurnPlayerId: getNextActiveGuesser(room, null, movieGiverPlayerId),
    round: {
      id: roundId,
      roundNumber: (room.round?.roundNumber ?? 0) + 1,
      movieGiverPlayerId,
      movieTitlePrivate: movieTitle,
      movieDisplay: movieTitle,
      initialMaskedMovie: maskedMovie,
      maskedMovie,
      status: "playing",
      hintPositions,
      hintLetters: [...new Set(hintPositions.map((position) => movieTitle[position]?.toUpperCase()).filter(Boolean))],
      startedAt: now,
      endedAt: null,
      scoreDeltas: {}
    },
    updatedAt: now
  };
  nextRoom.playerRoundStates = createPlayerRoundStates(nextRoom, roundId, maskedMovie, movieGiverPlayerId);
  return nextRoom;
}

function updatePlayerScore(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((player) => (player.id === playerId ? { ...player, score: player.score + delta } : player));
}

function addScoreDelta(room: RoomState, playerId: string, delta: number): RoomState {
  if (!room.round || delta === 0) return room;
  return {
    ...room,
    round: {
      ...room.round,
      scoreDeltas: {
        ...room.round.scoreDeltas,
        [playerId]: (room.round.scoreDeltas?.[playerId] ?? 0) + delta
      }
    }
  };
}

export function applyPendingSecretScores(room: RoomState): RoomState {
  if (room.settings.guessVisibilityMode !== "private_secret" || room.settings.secretScoreRevealMode !== "round_end") return room;
  const states = Object.values(room.playerRoundStates ?? {});
  let players = room.players;
  for (const state of states) players = updatePlayerScore(players, state.playerId, state.pendingScore);
  return { ...room, players };
}

function appendRoundHistory(room: RoomState, status: "won" | "lost", winnerPlayerId: string | null, endedAt: string): RoomState {
  if (!room.round || !room.settings.enableRoundHistory) return room;
  const started = room.round.startedAt ? Date.parse(room.round.startedAt) : Date.parse(endedAt);
  const scoresEarned = room.settings.secretScoreRevealMode === "round_end" && room.settings.guessVisibilityMode === "private_secret"
    ? Object.fromEntries(Object.values(room.playerRoundStates ?? {}).map((state) => [state.playerId, state.pendingScore]))
    : room.round.scoreDeltas ?? {};
  const personalLife = winnerPlayerId ? room.playerRoundStates?.[winnerPlayerId]?.lifeRemaining : undefined;
  const item = {
    roundId: room.round.id,
    roundNumber: room.round.roundNumber,
    movieGiverPlayerId: room.round.movieGiverPlayerId ?? null,
    winnerPlayerId,
    movieTitle: room.round.movieTitlePrivate ?? room.round.movieDisplay ?? "",
    lifeRemaining: personalLife ?? room.lifeRemaining,
    durationSeconds: Math.max(0, Math.round((Date.parse(endedAt) - started) / 1000)),
    guessVisibilityMode: room.settings.guessVisibilityMode,
    scoresEarned,
    endedAt
  };
  return { ...room, roundHistory: [...(room.roundHistory ?? []), item] };
}

export function endRound(room: RoomState, status: "won" | "lost", winnerPlayerId?: string | null): RoomState {
  const endedAt = new Date().toISOString();
  const scored = applyPendingSecretScores(room);
  const completed: RoomState = {
    ...scored,
    status: "round_over",
    currentTurnPlayerId: null,
    maskedMovie: room.round?.movieTitlePrivate ?? room.maskedMovie,
    round: room.round
      ? {
          ...room.round,
          maskedMovie: room.round.movieTitlePrivate ?? room.round.maskedMovie,
          status,
          winnerPlayerId: winnerPlayerId ?? null,
          endedAt
        }
      : undefined,
    updatedAt: endedAt
  };
  return appendRoundHistory(completed, status, winnerPlayerId ?? null, endedAt);
}

export function createNeutralGuessEvent(room: RoomState, playerId: string, guessType: GuessType): GuessHistoryItem {
  return {
    id: crypto.randomUUID(),
    roomId: room.id,
    roundId: room.round?.id ?? "",
    playerId,
    guessType,
    visibility: "public",
    createdAt: new Date().toISOString()
  };
}

export function createPrivateGuessEvent(
  room: RoomState,
  playerId: string,
  guessType: GuessType,
  guessValue: string | undefined,
  isCorrect: boolean | undefined
): GuessHistoryItem {
  return {
    id: crypto.randomUUID(),
    roomId: room.id,
    roundId: room.round?.id ?? "",
    playerId,
    guessType,
    guessValue,
    isCorrect,
    visibility: "private",
    createdAt: new Date().toISOString()
  };
}

function addSharedGuessHistory(room: RoomState, playerId: string, guessType: GuessType, value: string | undefined, isCorrect: boolean | undefined): RoomState {
  if (!room.settings.showGuessHistory) return room;
  return {
    ...room,
    guessHistory: [
      ...(room.guessHistory ?? []),
      { ...createPrivateGuessEvent(room, playerId, guessType, value, isCorrect), visibility: "public" }
    ]
  };
}

function addSecretGuessHistory(room: RoomState, playerId: string, guessType: GuessType, value: string | undefined, isCorrect: boolean | undefined): RoomState {
  if (!room.settings.showGuessHistory) return room;
  const events = [createPrivateGuessEvent(room, playerId, guessType, value, isCorrect)];
  if (room.settings.showNeutralTurnMessagesInSecretMode) events.unshift(createNeutralGuessEvent(room, playerId, guessType));
  return { ...room, guessHistory: [...(room.guessHistory ?? []), ...events] };
}

export function getNextActiveGuesser(room: RoomState, currentPlayerId: string | null, movieGiverPlayerId = room.round?.movieGiverPlayerId): string | null {
  const candidates = room.players.filter((player) => {
    const state = room.playerRoundStates?.[player.id];
    return isActivePlayer(player) && !state?.isEliminated;
  });
  return getNextPlayerTurn(candidates, currentPlayerId, movieGiverPlayerId);
}

export function endRoundIfNeeded(room: RoomState): RoomState {
  if (room.status !== "playing" || room.settings.guessVisibilityMode !== "private_secret") return room;
  const active = Object.values(room.playerRoundStates ?? {}).filter((state) => !state.isEliminated && room.players.some((player) => player.id === state.playerId && isActivePlayer(player)));
  if (active.length === 0) return endRound(room, "lost", null);
  if (active.length === 1 && room.settings.lastPlayerStandingRule === "auto_win") return endRound(room, "won", active[0].playerId);
  return room;
}

export function submitSharedPublicGuess(room: RoomState, playerId: string, guessType: "letter" | "full_movie", guess: string): GuessResult {
  return guessType === "letter" ? submitSharedLetterGuess(room, playerId, guess) : submitSharedFullMovieGuess(room, playerId, guess);
}

function submitSharedLetterGuess(room: RoomState, playerId: string, letter: string): GuessResult {
  const validation = validateGuess(room, playerId, letter, "letter");
  if (!validation.valid) return { ok: false, message: validation.errors[0], room, pointsDelta: 0, isCorrect: false };
  const movieTitle = room.round?.movieTitlePrivate ?? "";
  const normalizedLetter = letter.toUpperCase();
  const isCorrect = movieTitle.toUpperCase().includes(normalizedLetter);
  const pointsDelta = calculateScore(isCorrect ? "correct_letter" : "wrong_letter", room.settings.wrongGuessPenalty);
  const maskedMovie = isCorrect ? revealLetter(movieTitle, room.maskedMovie, normalizedLetter) : room.maskedMovie;
  const lifeRemaining = isCorrect ? room.lifeRemaining : applyWrongGuess(room.lifeRemaining, 1);
  let nextRoom: RoomState = {
    ...room,
    maskedMovie,
    guessedLetters: [...room.guessedLetters, normalizedLetter],
    wrongLetters: isCorrect ? room.wrongLetters : [...room.wrongLetters, normalizedLetter],
    lifeRemaining,
    players: updatePlayerScore(room.players, playerId, pointsDelta),
    currentTurnPlayerId: getNextActiveGuesser(room, playerId),
    round: room.round ? { ...room.round, maskedMovie } : undefined,
    updatedAt: new Date().toISOString()
  };
  nextRoom = addScoreDelta(nextRoom, playerId, pointsDelta);
  nextRoom = addSharedGuessHistory(nextRoom, playerId, "letter", normalizedLetter, isCorrect);
  if (isCorrect && isMovieSolved(movieTitle, maskedMovie)) return { ok: true, message: "Movie solved.", room: endRound(nextRoom, "won", playerId), pointsDelta, isCorrect };
  if (!isCorrect && lifeRemaining === 0) return { ok: true, message: "Life word exhausted.", room: endRound(nextRoom, "lost", null), pointsDelta, isCorrect };
  return { ok: true, message: isCorrect ? "Correct guess." : "Wrong guess.", room: nextRoom, pointsDelta, isCorrect };
}

function submitSharedFullMovieGuess(room: RoomState, playerId: string, guess: string): GuessResult {
  const validation = validateGuess(room, playerId, guess, "full_movie");
  if (!validation.valid) return { ok: false, message: validation.errors[0], room, pointsDelta: 0, isCorrect: false };
  const movieTitle = room.round?.movieTitlePrivate ?? "";
  const isCorrect = normalizeMovieTitle(guess) === normalizeMovieTitle(movieTitle);
  const pointsDelta = isCorrect ? calculateScore("correct_full_movie") : 0;
  const lifeRemaining = isCorrect ? room.lifeRemaining : applyWrongGuess(room.lifeRemaining, 2);
  let nextRoom: RoomState = {
    ...room,
    lifeRemaining,
    players: updatePlayerScore(room.players, playerId, pointsDelta),
    currentTurnPlayerId: getNextActiveGuesser(room, playerId),
    updatedAt: new Date().toISOString()
  };
  nextRoom = addScoreDelta(nextRoom, playerId, pointsDelta);
  nextRoom = addSharedGuessHistory(nextRoom, playerId, "full_movie", guess.trim(), isCorrect);
  if (isCorrect) return { ok: true, message: "Full movie solved.", room: endRound({ ...nextRoom, maskedMovie: movieTitle }, "won", playerId), pointsDelta, isCorrect };
  if (lifeRemaining === 0) return { ok: true, message: "Life word exhausted.", room: endRound(nextRoom, "lost", null), pointsDelta, isCorrect };
  return { ok: true, message: "Wrong full movie guess.", room: nextRoom, pointsDelta, isCorrect };
}

export function submitPrivateSecretGuess(room: RoomState, playerId: string, guessType: "letter" | "full_movie", guess: string): GuessResult {
  const validation = validateGuess(room, playerId, guess, guessType);
  if (!validation.valid) return { ok: false, message: validation.errors[0], room, pointsDelta: 0, isCorrect: false };
  const state = room.playerRoundStates?.[playerId];
  if (!state) return { ok: false, message: "Private round state is unavailable.", room, pointsDelta: 0, isCorrect: false };
  const movieTitle = room.round?.movieTitlePrivate ?? "";
  const normalizedValue = guessType === "letter" ? guess.trim().toUpperCase() : guess.trim();
  const isCorrect = guessType === "letter"
    ? movieTitle.toUpperCase().includes(normalizedValue)
    : normalizeMovieTitle(normalizedValue) === normalizeMovieTitle(movieTitle);
  const pointsDelta = guessType === "letter"
    ? calculateScore(isCorrect ? "correct_letter" : "wrong_letter", room.settings.wrongGuessPenalty)
    : isCorrect ? calculateScore("correct_full_movie") : 0;
  const maskedMovie = guessType === "letter" && isCorrect ? revealLetter(movieTitle, state.maskedMovie, normalizedValue) : state.maskedMovie;
  const solved = isCorrect && (guessType === "full_movie" || isMovieSolved(movieTitle, maskedMovie));
  const lifeDeduction = isCorrect ? 0 : guessType === "letter" ? 1 : 2;
  const lifeRemaining = applyWrongGuess(state.lifeRemaining, lifeDeduction);
  const isEliminated = !solved && lifeRemaining === 0;
  const nextState: PlayerRoundState = {
    ...state,
    maskedMovie: solved ? movieTitle : maskedMovie,
    guessedLetters: guessType === "letter" ? [...state.guessedLetters, normalizedValue] : state.guessedLetters,
    wrongLetters: guessType === "letter" && !isCorrect ? [...state.wrongLetters, normalizedValue] : state.wrongLetters,
    lifeRemaining,
    isEliminated,
    pendingScore: state.pendingScore + (room.settings.secretScoreRevealMode === "round_end" ? pointsDelta : 0),
    lastGuessStatus: solved ? "solved" : isCorrect ? "correct" : "wrong",
    updatedAt: new Date().toISOString()
  };
  let nextRoom: RoomState = {
    ...room,
    players: room.settings.secretScoreRevealMode === "live" ? updatePlayerScore(room.players, playerId, pointsDelta) : room.players,
    playerRoundStates: { ...room.playerRoundStates, [playerId]: nextState },
    currentTurnPlayerId: getNextActiveGuesser({ ...room, playerRoundStates: { ...room.playerRoundStates, [playerId]: nextState } }, playerId),
    updatedAt: new Date().toISOString()
  };
  if (room.settings.secretScoreRevealMode === "live") nextRoom = addScoreDelta(nextRoom, playerId, pointsDelta);
  nextRoom = addSecretGuessHistory(nextRoom, playerId, guessType, normalizedValue, isCorrect);
  if (solved) return { ok: true, message: "You solved the movie.", room: endRound(nextRoom, "won", playerId), pointsDelta, isCorrect };
  nextRoom = endRoundIfNeeded(nextRoom);
  const message = isEliminated ? "Your life word is exhausted. You are eliminated." : isCorrect ? "Correct guess." : "Wrong guess.";
  return { ok: true, message, room: nextRoom, pointsDelta, isCorrect };
}

export function submitLetterGuess(room: RoomState, playerId: string, letter: string): GuessResult {
  return room.settings.guessVisibilityMode === "private_secret"
    ? submitPrivateSecretGuess(room, playerId, "letter", letter)
    : submitSharedPublicGuess(room, playerId, "letter", letter);
}

export function submitFullMovieGuess(room: RoomState, playerId: string, guess: string): GuessResult {
  return room.settings.guessVisibilityMode === "private_secret"
    ? submitPrivateSecretGuess(room, playerId, "full_movie", guess)
    : submitSharedPublicGuess(room, playerId, "full_movie", guess);
}

export function skipTurn(room: RoomState): RoomState {
  const playerId = room.currentTurnPlayerId;
  if (!playerId || room.status !== "playing") return room;
  let nextRoom = room;
  if (room.settings.guessVisibilityMode === "private_secret" && room.playerRoundStates?.[playerId]) {
    const state = room.playerRoundStates[playerId];
    nextRoom = {
      ...room,
      playerRoundStates: {
        ...room.playerRoundStates,
        [playerId]: { ...state, lastGuessStatus: "skipped", updatedAt: new Date().toISOString() }
      }
    };
    nextRoom = addSecretGuessHistory(nextRoom, playerId, "skip", undefined, undefined);
  } else {
    nextRoom = addSharedGuessHistory(room, playerId, "skip", undefined, undefined);
  }
  return {
    ...nextRoom,
    currentTurnPlayerId: getNextActiveGuesser(nextRoom, playerId),
    updatedAt: new Date().toISOString()
  };
}

export function eliminatePlayerFromRound(room: RoomState, playerId: string): RoomState {
  const now = new Date().toISOString();
  const state = room.playerRoundStates?.[playerId];
  let nextRoom: RoomState = {
    ...room,
    players: room.players.map((player) => player.id === playerId ? { ...player, status: "eliminated", eliminatedAt: now } : player),
    playerRoundStates: state ? { ...room.playerRoundStates, [playerId]: { ...state, isEliminated: true, updatedAt: now } } : room.playerRoundStates,
    updatedAt: now
  };
  if (room.currentTurnPlayerId === playerId) nextRoom.currentTurnPlayerId = getNextActiveGuesser(nextRoom, playerId);
  if (room.settings.guessVisibilityMode === "private_secret") return endRoundIfNeeded(nextRoom);
  const remaining = room.players.filter((player) => player.id !== room.round?.movieGiverPlayerId && player.id !== playerId && isActivePlayer(player));
  return remaining.length === 0 && room.status === "playing" ? endRound(nextRoom, "lost", null) : nextRoom;
}

export function leaveRoom(room: RoomState, playerId: string): RoomState {
  if (room.status === "playing" && !room.settings.allowLeaveDuringGame) throw new Error("Leaving during a round is disabled.");
  const now = new Date().toISOString();
  const playing = room.status === "playing";
  let nextRoom: RoomState = {
    ...room,
    players: room.players.map((player) => player.id === playerId ? {
      ...player,
      isOnline: false,
      status: playing ? "eliminated" : "left",
      eliminatedAt: playing ? now : player.eliminatedAt,
      leftAt: playing ? player.leftAt : now,
      lastSeenAt: now
    } : player),
    updatedAt: now
  };
  if (playing) nextRoom = eliminatePlayerFromRound(nextRoom, playerId);
  if (room.hostPlayerId === playerId) {
    const players = assignNextHost(nextRoom.players, playerId);
    nextRoom = { ...nextRoom, players, hostPlayerId: players.find((player) => player.isHost)?.id ?? null };
  }
  if (room.status === "setup" && room.currentTurnPlayerId === playerId) {
    nextRoom = { ...nextRoom, status: room.round ? "round_over" : "lobby", currentTurnPlayerId: null };
  }
  return nextRoom;
}

function assertHostAction(room: RoomState, hostPlayerId: string, targetPlayerId: string): void {
  if (room.hostPlayerId !== hostPlayerId) throw new Error("Only the host can manage players.");
  if (hostPlayerId === targetPlayerId) throw new Error("Transfer host before removing yourself.");
  if (!room.players.some((player) => player.id === targetPlayerId)) throw new Error("Player not found.");
}

export function kickPlayer(room: RoomState, hostPlayerId: string, targetPlayerId: string): RoomState {
  assertHostAction(room, hostPlayerId, targetPlayerId);
  if (!room.settings.allowHostKick) throw new Error("Host kick is disabled.");
  const now = new Date().toISOString();
  const baseRoom = room.status === "playing" ? eliminatePlayerFromRound(room, targetPlayerId) : room;
  let nextRoom: RoomState = {
    ...baseRoom,
    players: baseRoom.players.map((player) => player.id === targetPlayerId ? {
      ...player,
      isOnline: false,
      status: "kicked",
      kickedAt: now,
      kickedByPlayerId: hostPlayerId,
      lastSeenAt: now
    } : player),
    updatedAt: now
  };
  if (room.status === "setup" && room.currentTurnPlayerId === targetPlayerId) {
    nextRoom = { ...nextRoom, status: room.round ? "round_over" : "lobby", currentTurnPlayerId: null };
  } else if (room.currentTurnPlayerId === targetPlayerId) {
    nextRoom.currentTurnPlayerId = getNextActiveGuesser(nextRoom, targetPlayerId);
  }
  return nextRoom;
}

export function transferHost(room: RoomState, currentHostPlayerId: string, newHostPlayerId: string): RoomState {
  if (room.hostPlayerId !== currentHostPlayerId) throw new Error("Only the host can transfer host.");
  const target = room.players.find((player) => player.id === newHostPlayerId);
  if (!target || !isActivePlayer(target)) throw new Error("New host must be online and active.");
  return {
    ...room,
    hostPlayerId: newHostPlayerId,
    players: room.players.map((player) => ({ ...player, isHost: player.id === newHostPlayerId })),
    updatedAt: new Date().toISOString()
  };
}

export function returnToLobby(room: RoomState, playerId?: string): RoomState {
  if (room.status !== "round_over" && room.status !== "lobby") throw new Error("The round has not ended.");
  if (playerId) {
    const nextGiver = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
    if (room.hostPlayerId !== playerId && nextGiver !== playerId) throw new Error("Waiting for host or next movie giver.");
  }
  return {
    ...room,
    status: "lobby",
    currentTurnPlayerId: null,
    players: room.players.map((player) => player.status === "eliminated" && player.isOnline ? { ...player, status: "active" } : player),
    updatedAt: new Date().toISOString()
  };
}

export function getVisibleRoomForPlayer(room: RoomState, playerId?: string): RoomState {
  const isRoundOver = room.status === "round_over";
  const isMovieGiver = playerId && room.round?.movieGiverPlayerId === playerId;
  const playerState = playerId ? room.playerRoundStates?.[playerId] : undefined;
  const secret = room.settings.guessVisibilityMode === "private_secret";
  const round = room.round ? {
    ...room.round,
    movieTitlePrivate: isRoundOver || isMovieGiver ? room.round.movieTitlePrivate : undefined,
    movieDisplay: isRoundOver || isMovieGiver ? room.round.movieDisplay : undefined
  } : undefined;
  const safePlayers = room.players.map((player) => ({ ...player, deviceId: null }));
  if (!secret) return { ...room, players: safePlayers, round, playerRoundStates: undefined };
  const guessHistory = (room.guessHistory ?? []).filter((item) => item.visibility === "public" || item.playerId === playerId);
  return {
    ...room,
    players: safePlayers,
    round,
    maskedMovie: isRoundOver ? room.maskedMovie : playerState?.maskedMovie ?? room.round?.initialMaskedMovie ?? "",
    guessedLetters: isRoundOver ? room.guessedLetters : playerState?.guessedLetters ?? [],
    wrongLetters: isRoundOver ? room.wrongLetters : playerState?.wrongLetters ?? [],
    lifeRemaining: isRoundOver ? room.lifeRemaining : playerState?.lifeRemaining ?? room.settings.lifeWord.length,
    playerRoundStates: playerState && playerId ? { [playerId]: playerState } : {},
    guessHistory
  };
}
