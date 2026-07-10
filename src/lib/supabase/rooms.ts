import { DEFAULT_ROOM_SETTINGS, normalizeRoomSettings, type GuessHistoryItem, type PlayerRoundState, type RoundState, type RoomSettings, type RoomState } from "../../types/game";
import type { RoomRow, PlayerRow } from "../../types/supabase";
import { generateRoomCode } from "../../utils/roomCode";
import { sanitizePlayerName } from "../game/validation";
import { supabase } from "./client";
import { mapPlayer } from "./players";

interface PublicRoundRow {
  id: string;
  round_number: number;
  movie_giver_player_id: string | null;
  movie_display: string;
  initial_masked_movie: string;
  masked_movie: string;
  status: "setup" | "playing" | "won" | "lost";
  hint_positions: number[];
  winner_player_id: string | null;
}

interface PlayerRoundStateRow {
  room_id: string;
  round_id: string;
  player_id: string;
  masked_movie: string;
  guessed_letters: string[];
  wrong_letters: string[];
  life_remaining: number;
  is_eliminated: boolean;
  pending_score: number;
  last_guess_status: PlayerRoundState["lastGuessStatus"];
  updated_at: string;
}

interface GuessHistoryRow {
  id: string;
  room_id: string;
  round_id: string;
  player_id: string;
  guess_type: GuessHistoryItem["guessType"];
  guess_value: string | null;
  is_correct: boolean | null;
  visibility: GuessHistoryItem["visibility"];
  created_at: string;
}

export interface OnlineRoomResult {
  room: RoomState;
  playerId: string;
}

export const defaultRoomSettings: RoomSettings = DEFAULT_ROOM_SETTINGS;

async function getAvailablePlayerId(preferredPlayerId: string, targetRoomId?: string): Promise<string> {
  if (!supabase) return preferredPlayerId;
  const { data, error } = await supabase.rpc("get_available_player_id_rpc", {
    p_preferred_player_id: preferredPlayerId,
    p_target_room_id: targetRoomId ?? null
  });
  if (error) throw error;
  return typeof data === "string" ? data : preferredPlayerId;
}

function mapRound(row?: PublicRoundRow | null): RoundState | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    roundNumber: row.round_number,
    movieGiverPlayerId: row.movie_giver_player_id,
    movieDisplay: row.movie_display,
    initialMaskedMovie: row.initial_masked_movie,
    maskedMovie: row.masked_movie,
    status: row.status,
    hintPositions: row.hint_positions ?? [],
    hintLetters: [],
    winnerPlayerId: row.winner_player_id
  };
}

function mapPersonalState(row?: PlayerRoundStateRow | null): PlayerRoundState | undefined {
  if (!row) return undefined;
  return {
    roomId: row.room_id,
    roundId: row.round_id,
    playerId: row.player_id,
    maskedMovie: row.masked_movie,
    guessedLetters: row.guessed_letters ?? [],
    wrongLetters: row.wrong_letters ?? [],
    lifeRemaining: row.life_remaining,
    isEliminated: row.is_eliminated,
    pendingScore: row.pending_score,
    lastGuessStatus: row.last_guess_status,
    updatedAt: row.updated_at
  };
}

function mapRoom(row: RoomRow, players: PlayerRow[], round?: PublicRoundRow | null, personalState?: PlayerRoundState, guessHistory: GuessHistoryItem[] = []): RoomState {
  const mappedRound = mapRound(round);
  if (mappedRound && row.status !== "round_over") mappedRound.movieDisplay = undefined;
  return {
    id: row.id,
    code: row.code,
    hostPlayerId: row.host_player_id,
    status: row.status,
    settings: normalizeRoomSettings({
      ...defaultRoomSettings,
      ...(row.settings as Partial<RoomSettings>),
      category: row.category,
      difficulty: row.difficulty,
      lifeWord: row.life_word
    }),
    players: players.map(mapPlayer),
    currentTurnPlayerId: row.current_turn_player_id,
    lifeRemaining: row.life_remaining,
    maskedMovie: personalState?.maskedMovie ?? row.masked_movie ?? round?.masked_movie ?? "",
    guessedLetters: personalState?.guessedLetters ?? row.guessed_letters ?? [],
    wrongLetters: personalState?.wrongLetters ?? row.wrong_letters ?? [],
    playerRoundStates: personalState ? { [personalState.playerId]: personalState } : {},
    guessHistory,
    round: mappedRound,
    updatedAt: row.updated_at
  };
}

export async function fetchRoomByCode(code: string, playerId?: string): Promise<RoomState | null> {
  if (!supabase) return null;
  const { data: room, error: roomError } = await supabase.from("rooms_public").select("*").eq("code", code).maybeSingle();
  if (roomError || !room) throw roomError ?? new Error("Room not found.");

  const { data: players, error: playersError } = await supabase.from("players_public").select("*").eq("room_id", room.id).order("joined_at");
  if (playersError) throw playersError;

  const { data: round, error: roundError } = await supabase
    .from("rounds_public")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (roundError) throw roundError;

  let personalState: PlayerRoundState | undefined;
  let guessHistory: GuessHistoryItem[] = [];
  const settings = { ...DEFAULT_ROOM_SETTINGS, ...((room.settings ?? {}) as Partial<RoomSettings>) };
  if (playerId && settings.guessVisibilityMode === "private_secret" && room.status === "playing") {
    const { data, error } = await supabase.rpc("get_my_player_round_state_rpc", { p_room_id: room.id, p_player_id: playerId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    personalState = mapPersonalState(row as PlayerRoundStateRow | null);
  }
  if (playerId && settings.showGuessHistory && round) {
    const { data, error } = await supabase.rpc("get_visible_guess_history_rpc", { p_room_id: room.id, p_player_id: playerId });
    if (error) throw error;
    guessHistory = ((data ?? []) as GuessHistoryRow[]).map((item) => ({
      id: item.id,
      roomId: item.room_id,
      roundId: item.round_id,
      playerId: item.player_id,
      guessType: item.guess_type,
      guessValue: item.guess_value ?? undefined,
      isCorrect: item.is_correct ?? undefined,
      visibility: item.visibility,
      createdAt: item.created_at
    }));
  }
  return mapRoom(room as RoomRow, (players ?? []) as PlayerRow[], round as PublicRoundRow | null, personalState, guessHistory);
}

export async function createOnlineRoom(playerId: string, playerName: string, settings: RoomSettings, deviceId?: string): Promise<OnlineRoomResult> {
  if (!supabase) throw new Error("Supabase is not configured.");
  settings = normalizeRoomSettings(settings);
  const code = generateRoomCode();
  const now = new Date().toISOString();
  const effectivePlayerId = await getAvailablePlayerId(playerId);
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code,
      host_player_id: null,
      status: "lobby",
      category: settings.category,
      difficulty: settings.difficulty,
      life_word: settings.lifeWord,
      life_remaining: settings.lifeWord.length,
      settings,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const { error: playerError } = await supabase.from("players").insert({
    id: effectivePlayerId,
    room_id: room.id,
    name: sanitizePlayerName(playerName),
    score: 0,
    is_host: true,
    is_online: true,
    joined_at: now,
    last_seen_at: now,
    status: "active",
    device_id: deviceId ?? null
  });
  if (playerError) throw playerError;

  const { error: hostError } = await supabase.from("rooms").update({ host_player_id: effectivePlayerId, updated_at: now }).eq("id", room.id);
  if (hostError) throw hostError;

  const fetched = await fetchRoomByCode(code);
  if (!fetched) throw new Error("Room could not be loaded after creation.");
  return { room: fetched, playerId: effectivePlayerId };
}

export async function joinOnlineRoom(code: string, playerId: string, playerName: string, deviceId?: string): Promise<OnlineRoomResult> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const room = await fetchRoomByCode(code);
  if (!room) throw new Error("Invalid room code.");
  if (room.status === "inactive") throw new Error("Room is inactive.");
  const occupied = room.players.filter((player) => !["left", "kicked"].includes(player.status ?? "active")).length;
  if (occupied >= room.settings.maxPlayers && !room.players.some((player) => player.id === playerId)) {
    throw new Error("Room is full.");
  }
  if (room.players.some((player) => player.name.toLowerCase() === playerName.trim().toLowerCase() && player.id !== playerId && !["left", "kicked"].includes(player.status ?? "active"))) {
    throw new Error("That player name is already used in this room.");
  }

  const now = new Date().toISOString();
  const effectivePlayerId = await getAvailablePlayerId(playerId, room.id);
  const existing = room.players.find((player) => player.id === effectivePlayerId);
  if (existing) {
    if (existing.status === "kicked" && !room.settings.allowRejoinAfterKick) throw new Error("You were removed from this room.");
    if (existing.status === "left" && !room.settings.allowRejoinAfterLeave) throw new Error("Rejoining after leaving is disabled.");
    if (existing.status === "eliminated" && !room.settings.allowRejoinAfterElimination) throw new Error("You were eliminated from this round.");
    await supabase.from("players").update({ is_online: true, status: "active", last_seen_at: now, name: sanitizePlayerName(playerName), device_id: deviceId ?? existing.deviceId }).eq("id", effectivePlayerId);
  } else {
    await supabase.from("players").insert({
      id: effectivePlayerId,
      room_id: room.id,
      name: sanitizePlayerName(playerName),
      score: 0,
      is_host: false,
      is_online: true,
      joined_at: now,
      last_seen_at: now,
      status: "active",
      device_id: deviceId ?? null
    });
  }

  const fetched = await fetchRoomByCode(code);
  if (!fetched) throw new Error("Room could not be loaded after joining.");
  return { room: fetched, playerId: effectivePlayerId };
}

export async function updateOnlineRoomSettings(room: RoomState, settings: RoomSettings): Promise<void> {
  if (!supabase) return;
  settings = normalizeRoomSettings(settings);
  await supabase
    .from("rooms")
    .update({
      category: settings.category,
      difficulty: settings.difficulty,
      life_word: settings.lifeWord,
      life_remaining: settings.lifeWord.length,
      settings,
      updated_at: new Date().toISOString()
    })
    .eq("id", room.id);
}
