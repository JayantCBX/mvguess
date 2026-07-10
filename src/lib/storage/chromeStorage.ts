import type { RoomSettings } from "../../types/game";

export interface PreviousRoomEntry {
  roomCode: string;
  status: "active" | "left" | "eliminated" | "kicked";
  lastPlayedAt: string;
  score?: number;
}

export interface PlayerHistory {
  previousScores: Record<string, number>;
  previousRooms: PreviousRoomEntry[];
  leftRooms: string[];
  eliminatedRooms: string[];
  kickedRooms: string[];
}

export interface LocalProfile {
  deviceId: string;
  playerId: string;
  playerName: string;
  lastRoomCode: string;
  settings: Partial<RoomSettings>;
  history: PlayerHistory;
}

const EMPTY_HISTORY: PlayerHistory = {
  previousScores: {},
  previousRooms: [],
  leftRooms: [],
  eliminatedRooms: [],
  kickedRooms: []
};

const DEFAULT_PROFILE: LocalProfile = {
  deviceId: "",
  playerId: "",
  playerName: "",
  lastRoomCode: "",
  settings: {},
  history: EMPTY_HISTORY
};

const STORAGE_KEY = "movieGuessBattle.profile";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function normalizeProfile(value?: Partial<LocalProfile> | null): LocalProfile {
  return {
    ...DEFAULT_PROFILE,
    ...value,
    settings: { ...DEFAULT_PROFILE.settings, ...value?.settings },
    history: {
      ...EMPTY_HISTORY,
      ...value?.history,
      previousScores: { ...EMPTY_HISTORY.previousScores, ...value?.history?.previousScores },
      previousRooms: value?.history?.previousRooms ?? [],
      leftRooms: value?.history?.leftRooms ?? [],
      eliminatedRooms: value?.history?.eliminatedRooms ?? [],
      kickedRooms: value?.history?.kickedRooms ?? []
    }
  };
}

export async function getLocalProfile(): Promise<LocalProfile> {
  if (!hasChromeStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return normalizeProfile(raw ? JSON.parse(raw) as Partial<LocalProfile> : null);
    } catch {
      return normalizeProfile();
    }
  }
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY, "deviceId", "playerId", "playerName", "lastRoomCode", "settings", "history"], (items) => {
      const stored = items[STORAGE_KEY] as Partial<LocalProfile> | undefined;
      const legacy = stored ? undefined : {
        deviceId: items.deviceId,
        playerId: items.playerId,
        playerName: items.playerName,
        lastRoomCode: items.lastRoomCode,
        settings: items.settings,
        history: items.history
      } as Partial<LocalProfile>;
      resolve(normalizeProfile(stored ?? legacy));
    });
  });
}

export async function saveLocalProfile(profile: Partial<LocalProfile>): Promise<void> {
  const current = await getLocalProfile();
  const next = normalizeProfile({ ...current, ...profile, history: profile.history ?? current.history });
  if (!hasChromeStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return;
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => resolve());
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const profile = await getLocalProfile();
  if (profile.deviceId) return profile.deviceId;
  const deviceId = crypto.randomUUID();
  await saveLocalProfile({ deviceId });
  return deviceId;
}

export async function getOrCreatePlayerId(): Promise<string> {
  const profile = await getLocalProfile();
  if (profile.playerId) return profile.playerId;
  const playerId = crypto.randomUUID();
  await saveLocalProfile({ playerId });
  return playerId;
}

export async function getPlayerHistory(): Promise<PlayerHistory> {
  return (await getLocalProfile()).history;
}

export async function savePlayerHistory(history: PlayerHistory): Promise<void> {
  await saveLocalProfile({ history });
}

async function markRoom(roomCode: string, status: PreviousRoomEntry["status"]): Promise<void> {
  const profile = await getLocalProfile();
  const code = roomCode.toUpperCase();
  const listKey = status === "left" ? "leftRooms" : status === "eliminated" ? "eliminatedRooms" : status === "kicked" ? "kickedRooms" : null;
  const history: PlayerHistory = {
    ...profile.history,
    previousRooms: [
      { roomCode: code, status, lastPlayedAt: new Date().toISOString(), score: profile.history.previousScores[code] },
      ...profile.history.previousRooms.filter((entry) => entry.roomCode !== code)
    ].slice(0, 20)
  };
  if (listKey) history[listKey] = [...new Set([...history[listKey], code])];
  await saveLocalProfile({ lastRoomCode: code, history });
}

export async function markRoomLeft(roomCode: string): Promise<void> {
  await markRoom(roomCode, "left");
}

export async function markRoomEliminated(roomCode: string): Promise<void> {
  await markRoom(roomCode, "eliminated");
}

export async function markRoomKicked(roomCode: string): Promise<void> {
  await markRoom(roomCode, "kicked");
}

export async function savePreviousScore(roomCode: string, score: number): Promise<void> {
  const profile = await getLocalProfile();
  const code = roomCode.toUpperCase();
  const history: PlayerHistory = {
    ...profile.history,
    previousScores: { ...profile.history.previousScores, [code]: Math.max(score, profile.history.previousScores[code] ?? 0) },
    previousRooms: [
      { roomCode: code, status: "active" as const, lastPlayedAt: new Date().toISOString(), score },
      ...profile.history.previousRooms.filter((entry) => entry.roomCode !== code)
    ].slice(0, 20)
  };
  await saveLocalProfile({ lastRoomCode: code, history });
}
