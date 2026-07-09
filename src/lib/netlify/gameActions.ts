import type { RoomState } from "../../types/game";
import type { HintSettings } from "../../types/hints";
import { apiRequest } from "./client";

export async function beginOnlineRoundSetup(args: { room: RoomState; playerId: string }) {
  return apiRequest<RoomState>(`/api/rooms/${args.room.code}/setup`, {
    method: "POST",
    body: JSON.stringify({ playerId: args.playerId })
  });
}

export async function cancelOnlineRoundSetup(args: { room: RoomState; playerId: string }) {
  return apiRequest<RoomState>(`/api/rooms/${args.room.code}/setup`, {
    method: "DELETE",
    body: JSON.stringify({ playerId: args.playerId })
  });
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
  return apiRequest<RoomState>(`/api/rooms/${args.room.code}/start`, {
    method: "POST",
    body: JSON.stringify({
      playerId: args.playerId,
      movieTitle: args.movieTitle,
      hintPositions: args.hintPositions,
      hintSettings: args.hintSettings
    })
  });
}

export async function submitOnlineGuess(args: {
  roomCode: string;
  playerId: string;
  guessType: "letter" | "full_movie" | "skip";
  guessValue?: string;
}) {
  return apiRequest<RoomState>(`/api/rooms/${args.roomCode}/guess`, {
    method: "POST",
    body: JSON.stringify(args)
  });
}

export async function leaveOnlineRoom(args: { roomCode: string; playerId: string }) {
  return apiRequest<RoomState>(`/api/rooms/${args.roomCode}/leave`, {
    method: "POST",
    body: JSON.stringify({ playerId: args.playerId })
  });
}
