import { DEFAULT_ROOM_SETTINGS } from "../../../../src/types/game";
function unavailable(): never { throw new Error("This extension uses the Movie Guess Battle multiplayer service."); }
export const defaultRoomSettings = DEFAULT_ROOM_SETTINGS;
export const createOnlineRoom = unavailable;
export const fetchRoomByCode = unavailable;
export const joinOnlineRoom = unavailable;
export const updateOnlineRoomSettings = unavailable;
