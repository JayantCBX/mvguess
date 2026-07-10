import type { RoomState } from "../../types/game";
import type { HintSettings } from "../../types/hints";
import { supabase } from "./client";

export async function beginOnlineRoundSetup(args: {
  room: RoomState;
  playerId: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("begin_round_setup_rpc", {
    p_room_id: args.room.id,
    p_player_id: args.playerId
  });
  if (error) throw error;
  return data;
}

export async function cancelOnlineRoundSetup(args: {
  room: RoomState;
  playerId: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("cancel_round_setup_rpc", {
    p_room_id: args.room.id,
    p_player_id: args.playerId
  });
  if (error) throw error;
  return data;
}

export async function startOnlineRound(args: {
  room: RoomState;
  playerId: string;
  movieTitle: string;
  maskedMovie: string;
  hintMode: HintSettings["hintMode"];
  hintPositions: number[];
  hintLetters: string[];
  hintSettings: HintSettings;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("start_round_rpc", {
    p_room_id: args.room.id,
    p_player_id: args.playerId,
    p_movie_title: args.movieTitle,
    p_movie_display: args.movieTitle,
    p_masked_movie: args.maskedMovie,
    p_hint_mode: args.hintMode,
    p_hint_positions: args.hintPositions,
    p_hint_letters: args.hintLetters,
    p_hint_settings: args.hintSettings
  });
  if (error) throw error;
  return data;
}

export async function submitOnlineGuess(args: {
  roomCode: string;
  playerId: string;
  guessType: "letter" | "full_movie" | "skip";
  guessValue?: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("submit_guess_rpc", {
    p_room_code: args.roomCode,
    p_player_id: args.playerId,
    p_guess_type: args.guessType,
    p_guess_value: args.guessValue ?? null
  });
  if (error) throw error;
  return data;
}

async function roomPlayerAction(
  rpc: "kick_player_rpc" | "eliminate_player_rpc" | "transfer_host_rpc",
  args: { room: RoomState; playerId: string; targetPlayerId: string }
) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const targetKey = rpc === "transfer_host_rpc" ? "p_new_host_player_id" : "p_target_player_id";
  const { data, error } = await supabase.rpc(rpc, {
    p_room_id: args.room.id,
    [rpc === "transfer_host_rpc" ? "p_current_host_player_id" : "p_host_player_id"]: args.playerId,
    [targetKey]: args.targetPlayerId
  });
  if (error) throw error;
  return data;
}

export const kickOnlinePlayer = (args: { room: RoomState; playerId: string; targetPlayerId: string }) => roomPlayerAction("kick_player_rpc", args);
export const eliminateOnlinePlayer = (args: { room: RoomState; playerId: string; targetPlayerId: string }) => roomPlayerAction("eliminate_player_rpc", args);
export const transferOnlineHost = (args: { room: RoomState; playerId: string; targetPlayerId: string }) => roomPlayerAction("transfer_host_rpc", args);

export async function leaveOnlineRoom(args: { room: RoomState; playerId: string }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("leave_room_rpc", { p_room_id: args.room.id, p_player_id: args.playerId });
  if (error) throw error;
  return data;
}

export async function returnOnlineRoomToLobby(args: { room: RoomState; playerId: string }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("return_to_lobby_rpc", { p_room_id: args.room.id, p_player_id: args.playerId });
  if (error) throw error;
  return data;
}
