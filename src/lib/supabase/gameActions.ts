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
