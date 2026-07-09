import type { RoundState, RoomSettings, RoomState } from "../../types/game";
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

interface ExistingPlayerLink {
  id: string;
  room_id: string;
}

export interface OnlineRoomResult {
  room: RoomState;
  playerId: string;
}

export const defaultRoomSettings: RoomSettings = {
  category: "bollywood",
  difficulty: "medium",
  lifeWord: "BOLLYWOOD",
  timerSeconds: 30,
  wrongGuessPenalty: false,
  maxPlayers: 4
};

async function getAvailablePlayerId(preferredPlayerId: string, targetRoomId?: string): Promise<string> {
  if (!supabase) return preferredPlayerId;
  const { data, error } = await supabase.from("players").select("id, room_id").eq("id", preferredPlayerId).maybeSingle();
  if (error) throw error;
  const existing = data as ExistingPlayerLink | null;
  if (!existing) return preferredPlayerId;
  if (targetRoomId && existing.room_id === targetRoomId) return preferredPlayerId;
  return crypto.randomUUID();
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

function mapRoom(row: RoomRow, players: PlayerRow[], round?: PublicRoundRow | null): RoomState {
  return {
    id: row.id,
    code: row.code,
    hostPlayerId: row.host_player_id,
    status: row.status,
    settings: {
      ...defaultRoomSettings,
      ...(row.settings as Partial<RoomSettings>),
      category: row.category,
      difficulty: row.difficulty,
      lifeWord: row.life_word
    },
    players: players.map(mapPlayer),
    currentTurnPlayerId: row.current_turn_player_id,
    lifeRemaining: row.life_remaining,
    maskedMovie: row.masked_movie ?? round?.masked_movie ?? "",
    guessedLetters: row.guessed_letters ?? [],
    wrongLetters: row.wrong_letters ?? [],
    round: mapRound(round),
    updatedAt: row.updated_at
  };
}

export async function fetchRoomByCode(code: string): Promise<RoomState | null> {
  if (!supabase) return null;
  const { data: room, error: roomError } = await supabase.from("rooms_public").select("*").eq("code", code).maybeSingle();
  if (roomError || !room) throw roomError ?? new Error("Room not found.");

  const { data: players, error: playersError } = await supabase.from("players").select("*").eq("room_id", room.id).order("joined_at");
  if (playersError) throw playersError;

  const { data: round, error: roundError } = await supabase
    .from("rounds_public")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (roundError) throw roundError;

  return mapRoom(room as RoomRow, (players ?? []) as PlayerRow[], round as PublicRoundRow | null);
}

export async function createOnlineRoom(playerId: string, playerName: string, settings: RoomSettings): Promise<OnlineRoomResult> {
  if (!supabase) throw new Error("Supabase is not configured.");
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
    last_seen_at: now
  });
  if (playerError) throw playerError;

  const { error: hostError } = await supabase.from("rooms").update({ host_player_id: effectivePlayerId, updated_at: now }).eq("id", room.id);
  if (hostError) throw hostError;

  const fetched = await fetchRoomByCode(code);
  if (!fetched) throw new Error("Room could not be loaded after creation.");
  return { room: fetched, playerId: effectivePlayerId };
}

export async function joinOnlineRoom(code: string, playerId: string, playerName: string): Promise<OnlineRoomResult> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const room = await fetchRoomByCode(code);
  if (!room) throw new Error("Invalid room code.");
  if (room.status === "inactive") throw new Error("Room is inactive.");
  if (room.players.length >= room.settings.maxPlayers && !room.players.some((player) => player.id === playerId)) {
    throw new Error("Room is full.");
  }
  if (room.players.some((player) => player.name.toLowerCase() === playerName.trim().toLowerCase() && player.id !== playerId)) {
    throw new Error("That player name is already used in this room.");
  }

  const now = new Date().toISOString();
  const effectivePlayerId = await getAvailablePlayerId(playerId, room.id);
  const existing = room.players.find((player) => player.id === effectivePlayerId);
  if (existing) {
    await supabase.from("players").update({ is_online: true, last_seen_at: now, name: sanitizePlayerName(playerName) }).eq("id", effectivePlayerId);
  } else {
    await supabase.from("players").insert({
      id: effectivePlayerId,
      room_id: room.id,
      name: sanitizePlayerName(playerName),
      score: 0,
      is_host: false,
      is_online: true,
      joined_at: now,
      last_seen_at: now
    });
  }

  const fetched = await fetchRoomByCode(code);
  if (!fetched) throw new Error("Room could not be loaded after joining.");
  return { room: fetched, playerId: effectivePlayerId };
}

export async function updateOnlineRoomSettings(room: RoomState, settings: RoomSettings): Promise<void> {
  if (!supabase) return;
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
