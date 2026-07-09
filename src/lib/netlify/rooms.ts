import type { RoomSettings, RoomState } from "../../types/game";
import { apiRequest } from "./client";

export interface OnlineRoomResult {
  room: RoomState;
  playerId: string;
}

export async function fetchRoomByCode(code: string): Promise<RoomState | null> {
  try {
    return await apiRequest<RoomState>(`/api/rooms/${code.toUpperCase()}`);
  } catch (error) {
    if (error instanceof Error && error.message === "Room not found.") return null;
    throw error;
  }
}

export async function createOnlineRoom(playerId: string, playerName: string, settings: RoomSettings): Promise<OnlineRoomResult> {
  return apiRequest<OnlineRoomResult>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ playerId, playerName, settings })
  });
}

export async function joinOnlineRoom(code: string, playerId: string, playerName: string): Promise<OnlineRoomResult> {
  return apiRequest<OnlineRoomResult>(`/api/rooms/${code.toUpperCase()}/join`, {
    method: "POST",
    body: JSON.stringify({ playerId, playerName })
  });
}

export async function updateOnlineRoomSettings(room: RoomState, playerId: string, settings: RoomSettings): Promise<RoomState> {
  return apiRequest<RoomState>(`/api/rooms/${room.code}/settings`, {
    method: "PATCH",
    body: JSON.stringify({ playerId, settings })
  });
}
