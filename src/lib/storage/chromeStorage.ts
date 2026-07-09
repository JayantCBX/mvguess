import type { RoomSettings } from "../../types/game";

export interface LocalProfile {
  playerId: string;
  playerName: string;
  lastRoomCode: string;
  settings: Partial<RoomSettings>;
}

const DEFAULT_PROFILE: LocalProfile = {
  playerId: "",
  playerName: "",
  lastRoomCode: "",
  settings: {}
};

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function getLocalProfile(): Promise<LocalProfile> {
  if (!hasChromeStorage()) {
    const raw = localStorage.getItem("movieGuessBattle.profile");
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_PROFILE, (items) => resolve(items as LocalProfile));
  });
}

export async function saveLocalProfile(profile: Partial<LocalProfile>): Promise<void> {
  if (!hasChromeStorage()) {
    const current = await getLocalProfile();
    localStorage.setItem("movieGuessBattle.profile", JSON.stringify({ ...current, ...profile }));
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set(profile, () => resolve());
  });
}

export async function getOrCreatePlayerId(): Promise<string> {
  const profile = await getLocalProfile();
  if (profile.playerId) return profile.playerId;
  const playerId = crypto.randomUUID();
  await saveLocalProfile({ playerId });
  return playerId;
}
