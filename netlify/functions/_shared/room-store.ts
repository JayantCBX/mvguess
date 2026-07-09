import { getStore } from "@netlify/blobs";
import { createInitialRoom, createLocalPlayer, skipTurn, startRound, submitFullMovieGuess, submitLetterGuess } from "../../../src/lib/game/engine";
import { getNextMovieGiver } from "../../../src/lib/game/turns";
import type { GuessType, Player, RoomSettings, RoomState } from "../../../src/types/game";
import type { HintSettings } from "../../../src/types/hints";
import { generateRoomCode } from "../../../src/utils/roomCode";
import { sanitizePlayerName } from "../../../src/lib/game/validation";

const store = getStore({ name: "movie-guess-rooms", consistency: "strong" });

function roomKey(code: string): string {
  return `rooms/${code.toUpperCase()}`;
}

async function loadRoom(code: string): Promise<RoomState | null> {
  return (await store.get(roomKey(code), { type: "json" })) as RoomState | null;
}

async function saveRoom(room: RoomState): Promise<RoomState> {
  const nextRoom = { ...room, updatedAt: new Date().toISOString() };
  await store.setJSON(roomKey(nextRoom.code), nextRoom);
  return nextRoom;
}

async function createUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    if (!(await loadRoom(code))) return code;
  }
  throw new Error("Could not allocate a room code.");
}

function getOrCreatePlayerId(playerId?: string): string {
  return playerId || crypto.randomUUID();
}

function assertRoom(room: RoomState | null): RoomState {
  if (!room) throw new Error("Room not found.");
  return room;
}

function assertCurrentPlayer(room: RoomState, playerId: string): void {
  if (!room.players.some((player) => player.id === playerId)) {
    throw new Error("Join the room before playing.");
  }
}

function touchPlayer(room: RoomState, playerId: string, changes: Partial<Player> = {}): RoomState {
  const now = new Date().toISOString();
  return {
    ...room,
    players: room.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            ...changes,
            isOnline: changes.isOnline ?? true,
            lastSeenAt: now
          }
        : player
    )
  };
}

export async function getRoom(code: string): Promise<RoomState> {
  return assertRoom(await loadRoom(code));
}

export async function createRoom(args: { playerId?: string; playerName: string; settings: RoomSettings }): Promise<{ room: RoomState; playerId: string }> {
  const playerId = getOrCreatePlayerId(args.playerId);
  const host = createLocalPlayer(sanitizePlayerName(args.playerName), true);
  host.id = playerId;
  const room = createInitialRoom(host, args.settings);
  room.code = await createUniqueRoomCode();
  room.hostPlayerId = playerId;
  room.players[0] = host;
  return { room: await saveRoom(room), playerId };
}

export async function joinRoom(args: { code: string; playerId?: string; playerName: string }): Promise<{ room: RoomState; playerId: string }> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.status === "inactive") throw new Error("Room is inactive.");

  const playerId = getOrCreatePlayerId(args.playerId);
  const playerName = sanitizePlayerName(args.playerName);
  if (!playerName) throw new Error("Player name is required.");

  const existingById = room.players.find((player) => player.id === playerId);
  const duplicateName = room.players.find((player) => player.name.toLowerCase() === playerName.toLowerCase() && player.id !== playerId);
  if (duplicateName) throw new Error("That player name is already used in this room.");
  if (!existingById && room.players.length >= room.settings.maxPlayers) throw new Error("Room is full.");

  if (existingById) {
    return { room: await saveRoom(touchPlayer(room, playerId, { name: playerName })), playerId };
  }

  const now = new Date().toISOString();
  const player: Player = {
    id: playerId,
    roomId: room.id,
    name: playerName,
    score: 0,
    isHost: false,
    isOnline: true,
    joinedAt: now,
    lastSeenAt: now
  };

  return { room: await saveRoom({ ...room, players: [...room.players, player] }), playerId };
}

export async function updateSettings(args: { code: string; playerId: string; settings: RoomSettings }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.hostPlayerId !== args.playerId) throw new Error("Only the host can update settings.");
  return saveRoom({
    ...room,
    settings: args.settings,
    lifeRemaining: args.settings.lifeWord.length
  });
}

export async function beginSetup(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  assertCurrentPlayer(room, args.playerId);
  if (!["lobby", "round_over"].includes(room.status)) throw new Error("Round setup is not available.");
  if (room.players.filter((player) => player.isOnline).length < 2) throw new Error("Minimum 2 online players required.");

  const movieGiverId = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  if (!movieGiverId) throw new Error("No movie giver available.");
  if (movieGiverId !== args.playerId) {
    const movieGiver = room.players.find((player) => player.id === movieGiverId);
    throw new Error(`Only ${movieGiver?.name ?? "the next movie giver"} can set the next movie.`);
  }

  return saveRoom({
    ...room,
    status: "setup",
    currentTurnPlayerId: movieGiverId,
    maskedMovie: "",
    guessedLetters: [],
    wrongLetters: []
  });
}

export async function cancelSetup(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.status !== "setup") throw new Error("Room is not in setup.");
  if (room.currentTurnPlayerId !== args.playerId && room.hostPlayerId !== args.playerId) {
    throw new Error("Only the movie giver or host can cancel setup.");
  }
  return saveRoom({
    ...room,
    status: room.round ? "round_over" : "lobby",
    currentTurnPlayerId: null
  });
}

export async function startOnlineRound(args: {
  code: string;
  playerId: string;
  movieTitle: string;
  hintPositions: number[];
  hintSettings: HintSettings;
}): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  assertCurrentPlayer(room, args.playerId);
  if (!["setup", "lobby", "round_over"].includes(room.status)) throw new Error("Round setup is not available.");
  const movieGiverId = room.status === "setup" ? room.currentTurnPlayerId : getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  if (movieGiverId !== args.playerId) throw new Error("Only the assigned movie giver can start this round.");
  if (!/[a-z]/i.test(args.movieTitle.trim()) || args.movieTitle.trim().length < 2) throw new Error("Movie title is required.");

  return saveRoom(startRound(room, { title: args.movieTitle.trim() }, args.hintPositions, args.hintSettings, movieGiverId));
}

export async function submitGuess(args: { code: string; playerId: string; guessType: GuessType; guessValue?: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  assertCurrentPlayer(room, args.playerId);
  if (room.status !== "playing") throw new Error("Round is not active.");
  if (room.currentTurnPlayerId !== args.playerId) throw new Error("It is not your turn.");
  if (room.round?.movieGiverPlayerId === args.playerId) throw new Error("Movie giver cannot guess their own movie.");

  if (args.guessType === "letter") {
    const result = submitLetterGuess(room, args.playerId, args.guessValue ?? "");
    if (!result.ok) throw new Error(result.message);
    return saveRoom(result.room);
  }
  if (args.guessType === "full_movie") {
    const result = submitFullMovieGuess(room, args.playerId, args.guessValue ?? "");
    if (!result.ok) throw new Error(result.message);
    return saveRoom(result.room);
  }
  if (args.guessType === "skip") {
    return saveRoom(skipTurn(room));
  }

  throw new Error("Invalid guess type.");
}

export async function leaveRoom(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  return saveRoom(touchPlayer(room, args.playerId, { isOnline: false }));
}
