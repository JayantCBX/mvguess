import { describe, expect, it } from "vitest";
import { getNextMovieGiver, getNextPlayerTurn } from "../lib/game/turns";
import type { Player } from "../types/game";

const players: Player[] = [
  { id: "a", name: "A", score: 0, isHost: true, isOnline: true, joinedAt: "", lastSeenAt: "" },
  { id: "b", name: "B", score: 0, isHost: false, isOnline: true, joinedAt: "", lastSeenAt: "" },
  { id: "c", name: "C", score: 0, isHost: false, isOnline: false, joinedAt: "", lastSeenAt: "" }
];

describe("turns", () => {
  it("rotates through online players only", () => {
    expect(getNextPlayerTurn(players, null)).toBe("a");
    expect(getNextPlayerTurn(players, "a")).toBe("b");
    expect(getNextPlayerTurn(players, "b")).toBe("a");
  });

  it("skips the movie giver during guessing turns", () => {
    expect(getNextPlayerTurn(players, null, "a")).toBe("b");
    expect(getNextPlayerTurn(players, "b", "a")).toBe("b");
  });

  it("starts movie giving with the host and then rotates", () => {
    expect(getNextMovieGiver(players, null, "a")).toBe("a");
    expect(getNextMovieGiver(players, "a", "a")).toBe("b");
    expect(getNextMovieGiver(players, "b", "a")).toBe("a");
  });
});
