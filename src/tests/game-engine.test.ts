import { describe, expect, it } from "vitest";
import { generateRoomCode } from "../utils/roomCode";
import { createInitialRoom, createLocalPlayer, selectRandomMovie, skipTurn, startRound, submitFullMovieGuess, submitLetterGuess } from "../lib/game/engine";
import { DEFAULT_ROOM_SETTINGS, type RoomSettings } from "../types/game";

const settings: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  category: "bollywood",
  difficulty: "easy",
  lifeWord: "BOLLYWOOD",
  timerSeconds: 30,
  wrongGuessPenalty: false,
  maxPlayers: 4
};

function testRoom() {
  const host = createLocalPlayer("Host", true);
  const guest = createLocalPlayer("Guest", false);
  const room = createInitialRoom(host, settings);
  return startRound({ ...room, players: [{ ...host, isHost: true }, guest] }, { id: "m", title: "Dhoom", difficulty: "easy", category: "bollywood" });
}

describe("game engine", () => {
  it("selects movies by category and difficulty", () => {
    expect(selectRandomMovie("bollywood", "easy").category).toBe("bollywood");
  });

  it("generates short room codes", () => {
    expect(generateRoomCode()).toMatch(/^[A-Z2-9]{5}$/);
  });

  it("handles correct alphabet reveal and scoring", () => {
    const room = testRoom();
    const result = submitLetterGuess(room, room.currentTurnPlayerId!, "o");
    expect(result.ok).toBe(true);
    expect(result.room.maskedMovie).toBe("__OO_");
    expect(result.pointsDelta).toBe(10);
  });

  it("handles wrong guess life deduction", () => {
    const room = testRoom();
    const result = submitLetterGuess(room, room.currentTurnPlayerId!, "z");
    expect(result.room.lifeRemaining).toBe(settings.lifeWord.length - 1);
    expect(result.room.wrongLetters).toContain("Z");
  });

  it("handles full movie guesses", () => {
    const room = testRoom();
    const result = submitFullMovieGuess(room, room.currentTurnPlayerId!, "dhoom");
    expect(result.room.status).toBe("round_over");
    expect(result.pointsDelta).toBe(50);
  });

  it("deducts two life letters for wrong full movie guesses", () => {
    const room = testRoom();
    const result = submitFullMovieGuess(room, room.currentTurnPlayerId!, "Sholay");
    expect(result.room.lifeRemaining).toBe(settings.lifeWord.length - 2);
  });

  it("skips turns when timer expires", () => {
    const baseRoom = testRoom();
    const room = {
      ...baseRoom,
      players: [...baseRoom.players, { ...createLocalPlayer("Third", false), id: "third" }],
      currentTurnPlayerId: baseRoom.players[1].id
    };
    const skipped = skipTurn(room);
    expect(skipped.currentTurnPlayerId).not.toBe(room.currentTurnPlayerId);
  });
});
