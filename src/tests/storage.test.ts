import { beforeEach, describe, expect, it } from "vitest";
import { getLocalProfile, getOrCreateDeviceId, markRoomKicked, savePreviousScore } from "../lib/storage/chromeStorage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("privacy-safe player memory", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  });

  it("creates and persists an anonymous device id in the web fallback", async () => {
    const first = await getOrCreateDeviceId();
    const second = await getOrCreateDeviceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).toBe(first);
  });

  it("stores score and kicked-room history without cookies", async () => {
    await savePreviousScore("ABCDE", 75);
    await markRoomKicked("ABCDE");
    const profile = await getLocalProfile();
    expect(profile.history.previousScores.ABCDE).toBe(75);
    expect(profile.history.kickedRooms).toContain("ABCDE");
    expect(profile.history.previousRooms[0].status).toBe("kicked");
  });
});
