import { getStore } from "@netlify/blobs";
import {
  createInitialRoom,
  createLocalPlayer,
  eliminatePlayerFromRound,
  getVisibleRoomForPlayer,
  kickPlayer,
  leaveRoom as leaveRoomState,
  returnToLobby,
  skipTurn,
  startRound,
  submitFullMovieGuess,
  submitLetterGuess,
  transferHost
} from "../../../src/lib/game/engine";
import { getNextMovieGiver, isActivePlayer } from "../../../src/lib/game/turns";
import { normalizeRoomSettings, type GuessType, type Player, type RoomSettings, type RoomState } from "../../../src/types/game";
import type { HintSettings } from "../../../src/types/hints";
import { generateRoomCode } from "../../../src/utils/roomCode";
import { sanitizePlayerName } from "../../../src/lib/game/validation";

const store = getStore({ name: "movie-guess-rooms", consistency: "strong" });

function roomKey(code: string): string {
  return `rooms/${code.toUpperCase()}`;
}

async function loadRoom(code: string): Promise<RoomState | null> {
  const stored = (await store.get(roomKey(code), { type: "json" })) as RoomState | null;
  if (!stored) return null;
  return {
    ...stored,
    settings: normalizeRoomSettings(stored.settings),
    players: stored.players.map((player) => ({ ...player, status: player.status ?? (player.isOnline ? "active" : "left") })),
    playerRoundStates: stored.playerRoundStates ?? {},
    guessHistory: stored.guessHistory ?? [],
    roundHistory: stored.roundHistory ?? []
  };
}

async function saveRoom(room: RoomState): Promise<RoomState> {
  const nextRoom = { ...room, updatedAt: new Date().toISOString() };
  await store.setJSON(roomKey(nextRoom.code), nextRoom);
  return nextRoom;
}

async function saveVisible(room: RoomState, playerId: string): Promise<RoomState> {
  return getVisibleRoomForPlayer(await saveRoom(room), playerId);
}

async function createUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    if (!(await loadRoom(code))) return code;
  }
  throw new Error("Could not allocate a room code.");
}

function assertRoom(room: RoomState | null): RoomState {
  if (!room) throw new Error("Room not found.");
  return room;
}

function assertCurrentPlayer(room: RoomState, playerId: string): Player {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Join the room before playing.");
  if (player.status === "kicked") throw new Error("You were removed from this room.");
  return player;
}

function touchPlayer(room: RoomState, playerId: string, changes: Partial<Player> = {}): RoomState {
  const now = new Date().toISOString();
  return {
    ...room,
    players: room.players.map((player) => player.id === playerId ? {
      ...player,
      ...changes,
      isOnline: changes.isOnline ?? true,
      status: changes.status ?? "active",
      lastSeenAt: now
    } : player)
  };
}

export async function getRoom(code: string, playerId?: string): Promise<RoomState> {
  return getVisibleRoomForPlayer(assertRoom(await loadRoom(code)), playerId);
}

export async function createRoom(args: { playerId?: string; deviceId?: string; playerName: string; settings: RoomSettings }): Promise<{ room: RoomState; playerId: string }> {
  const playerId = args.playerId || crypto.randomUUID();
  const host = createLocalPlayer(sanitizePlayerName(args.playerName), true, args.deviceId);
  host.id = playerId;
  const room = createInitialRoom(host, args.settings);
  room.code = await createUniqueRoomCode();
  room.hostPlayerId = playerId;
  room.players[0] = host;
  const saved = await saveRoom(room);
  return { room: getVisibleRoomForPlayer(saved, playerId), playerId };
}

export async function joinRoom(args: { code: string; playerId?: string; deviceId?: string; playerName: string }): Promise<{ room: RoomState; playerId: string }> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.status === "inactive") throw new Error("Room is inactive.");
  const playerId = args.playerId || crypto.randomUUID();
  const playerName = sanitizePlayerName(args.playerName);
  if (!playerName) throw new Error("Player name is required.");
  const existingById = room.players.find((player) => player.id === playerId);
  const existingByDevice = args.deviceId ? room.players.find((player) => player.deviceId === args.deviceId) : undefined;
  const existing = existingById ?? existingByDevice;
  if (existing?.status === "kicked" && !room.settings.allowRejoinAfterKick) throw new Error("You were removed from this room.");
  if (existing?.status === "left" && !room.settings.allowRejoinAfterLeave) throw new Error("Rejoining after leaving is disabled.");
  if (existing?.status === "eliminated" && !room.settings.allowRejoinAfterElimination) throw new Error("You were eliminated from this round.");
  const duplicateName = room.players.find((player) => player.name.toLowerCase() === playerName.toLowerCase() && player.id !== existing?.id && player.status !== "left" && player.status !== "kicked");
  if (duplicateName) throw new Error("That player name is already used in this room.");
  const occupied = room.players.filter((player) => !["left", "kicked"].includes(player.status ?? "active")).length;
  if (!existing && occupied >= room.settings.maxPlayers) throw new Error("Room is full.");
  if (existing) {
    const next = touchPlayer(room, existing.id, { name: playerName, deviceId: args.deviceId ?? existing.deviceId, status: "active", isOnline: true });
    return { room: await saveVisible(next, existing.id), playerId: existing.id };
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
    lastSeenAt: now,
    status: "active",
    deviceId: args.deviceId ?? null
  };
  return { room: await saveVisible({ ...room, players: [...room.players, player] }, playerId), playerId };
}

export async function updateSettings(args: { code: string; playerId: string; settings: RoomSettings }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.hostPlayerId !== args.playerId) throw new Error("Only the host can update settings.");
  const settings = normalizeRoomSettings(args.settings);
  return saveVisible({ ...room, settings, lifeRemaining: settings.lifeWord.length }, args.playerId);
}

export async function beginSetup(args: { code: string; playerId: string }): Promise<RoomState> {
  const loadedRoom = assertRoom(await loadRoom(args.code));
  const room = {
    ...loadedRoom,
    players: loadedRoom.players.map((player) => player.status === "eliminated" && player.isOnline ? { ...player, status: "active" as const } : player)
  };
  assertCurrentPlayer(room, args.playerId);
  if (!["lobby", "round_over"].includes(room.status)) throw new Error("Round setup is not available.");
  if (room.players.filter(isActivePlayer).length < 2) throw new Error("Minimum 2 online players required.");
  const movieGiverId = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  if (movieGiverId !== args.playerId) {
    const giver = room.players.find((player) => player.id === movieGiverId);
    throw new Error(`Only ${giver?.name ?? "the next movie giver"} can set the next movie.`);
  }
  return saveVisible({ ...room, status: "setup", currentTurnPlayerId: movieGiverId, maskedMovie: "", guessedLetters: [], wrongLetters: [] }, args.playerId);
}

export async function cancelSetup(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.status !== "setup") throw new Error("Room is not in setup.");
  if (room.currentTurnPlayerId !== args.playerId && room.hostPlayerId !== args.playerId) throw new Error("Only the movie giver or host can cancel setup.");
  return saveVisible({ ...room, status: room.round ? "round_over" : "lobby", currentTurnPlayerId: null }, args.playerId);
}

export async function startOnlineRound(args: { code: string; playerId: string; movieTitle: string; hintPositions: number[]; hintSettings: HintSettings }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  assertCurrentPlayer(room, args.playerId);
  if (!["setup", "lobby", "round_over"].includes(room.status)) throw new Error("Round setup is not available.");
  const giver = room.status === "setup" ? room.currentTurnPlayerId : getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  if (giver !== args.playerId) throw new Error("Only the assigned movie giver can start this round.");
  if (!/[a-z]/i.test(args.movieTitle.trim()) || args.movieTitle.trim().length < 2) throw new Error("Movie title is required.");
  return saveVisible(startRound(room, { title: args.movieTitle }, args.hintPositions, args.hintSettings, giver), args.playerId);
}

export async function submitGuess(args: { code: string; playerId: string; guessType: GuessType; guessValue?: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  assertCurrentPlayer(room, args.playerId);
  if (room.status !== "playing") throw new Error("Round is not active.");
  if (room.currentTurnPlayerId !== args.playerId) throw new Error("It is not your turn.");
  let nextRoom: RoomState;
  if (args.guessType === "letter") {
    const result = submitLetterGuess(room, args.playerId, args.guessValue ?? "");
    if (!result.ok) throw new Error(result.message);
    nextRoom = result.room;
  } else if (args.guessType === "full_movie") {
    const result = submitFullMovieGuess(room, args.playerId, args.guessValue ?? "");
    if (!result.ok) throw new Error(result.message);
    nextRoom = result.room;
  } else if (args.guessType === "skip") nextRoom = skipTurn(room);
  else throw new Error("Invalid guess type.");
  return saveVisible(nextRoom, args.playerId);
}

export async function leaveRoom(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  return saveVisible(leaveRoomState(room, args.playerId), args.playerId);
}

export async function kickRoomPlayer(args: { code: string; playerId: string; targetPlayerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  return saveVisible(kickPlayer(room, args.playerId, args.targetPlayerId), args.playerId);
}

export async function eliminateRoomPlayer(args: { code: string; playerId: string; targetPlayerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  if (room.hostPlayerId !== args.playerId) throw new Error("Only the host can eliminate players.");
  if (!room.settings.allowHostEliminate) throw new Error("Host elimination is disabled.");
  return saveVisible(eliminatePlayerFromRound(room, args.targetPlayerId), args.playerId);
}

export async function transferRoomHost(args: { code: string; playerId: string; targetPlayerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  return saveVisible(transferHost(room, args.playerId, args.targetPlayerId), args.playerId);
}

export async function returnRoomToLobby(args: { code: string; playerId: string }): Promise<RoomState> {
  const room = assertRoom(await loadRoom(args.code));
  return saveVisible(returnToLobby(room, args.playerId), args.playerId);
}
