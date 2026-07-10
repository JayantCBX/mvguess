import { describe, expect, it } from "vitest";
import {
  createInitialRoom,
  createLocalPlayer,
  getVisibleRoomForPlayer,
  kickPlayer,
  leaveRoom,
  returnToLobby,
  startRound,
  submitFullMovieGuess,
  submitLetterGuess,
  transferHost
} from "../lib/game/engine";
import { DEFAULT_ROOM_SETTINGS, normalizeRoomSettings, type RoomSettings } from "../types/game";

function makeRoom(overrides: Partial<RoomSettings> = {}) {
  const host = { ...createLocalPlayer("Host", true), id: "host" };
  const amit = { ...createLocalPlayer("Amit"), id: "amit" };
  const neha = { ...createLocalPlayer("Neha"), id: "neha" };
  const settings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS, ...overrides };
  const room = createInitialRoom(host, settings);
  return startRound({ ...room, players: [host, amit, neha] }, { title: "Dhoom" }, [], undefined, host.id);
}

describe("advanced game modes", () => {
  it("supports host-selected room capacities up to eight players", () => {
    expect(normalizeRoomSettings({ maxPlayers: 8 }).maxPlayers).toBe(8);
    expect(normalizeRoomSettings({ maxPlayers: 7 }).maxPlayers).toBe(7);
    expect(normalizeRoomSettings({ maxPlayers: 99 as RoomSettings["maxPlayers"] }).maxPlayers).toBe(8);
  });

  it("keeps shared public wrong guesses visible to the room", () => {
    const room = makeRoom();
    const result = submitLetterGuess(room, "amit", "z");
    expect(result.room.wrongLetters).toEqual(["Z"]);
    expect(getVisibleRoomForPlayer(result.room, "neha").wrongLetters).toEqual(["Z"]);
  });

  it("keeps secret wrong guesses and life private", () => {
    const room = makeRoom({ guessVisibilityMode: "private_secret" });
    const result = submitLetterGuess(room, "amit", "z");
    expect(result.room.wrongLetters).toEqual([]);
    expect(result.room.playerRoundStates?.amit.wrongLetters).toEqual(["Z"]);
    expect(result.room.playerRoundStates?.neha.wrongLetters).toEqual([]);
    const nehaView = getVisibleRoomForPlayer(result.room, "neha");
    expect(nehaView.playerRoundStates?.amit).toBeUndefined();
    expect(nehaView.wrongLetters).toEqual([]);
    expect(nehaView.guessHistory?.every((item) => item.guessValue === undefined)).toBe(true);
    expect(nehaView.round?.movieTitlePrivate).toBeUndefined();
    expect(nehaView.round?.movieDisplay).toBeUndefined();
  });

  it("removes anonymous device ids from player-visible room data", () => {
    const room = makeRoom();
    room.players[0].deviceId = "private-device";
    expect(getVisibleRoomForPlayer(room, "amit").players.every((player) => player.deviceId === null)).toBe(true);
  });

  it("updates only the secret guesser's mask after a correct letter", () => {
    const room = makeRoom({ guessVisibilityMode: "private_secret" });
    const result = submitLetterGuess(room, "amit", "o");
    expect(result.room.maskedMovie).toBe("_____");
    expect(result.room.playerRoundStates?.amit.maskedMovie).toBe("__OO_");
    expect(result.room.playerRoundStates?.neha.maskedMovie).toBe("_____");
  });

  it("shows the latest correct reveal to the host and movie giver without exposing private guess details", () => {
    const room = makeRoom({ guessVisibilityMode: "private_secret" });
    const result = submitLetterGuess(room, "amit", "o").room;
    const hostView = getVisibleRoomForPlayer(result, "host");
    const otherPlayerView = getVisibleRoomForPlayer(result, "neha");

    expect(hostView.spectatorRoundState).toEqual(expect.objectContaining({ playerId: "amit", maskedMovie: "__OO_" }));
    expect(hostView.playerRoundStates?.amit).toBeUndefined();
    expect(otherPlayerView.spectatorRoundState).toBeUndefined();
    expect(otherPlayerView.playerRoundStates?.amit).toBeUndefined();
  });

  it("reveals secret pending scores only when the round ends", () => {
    const room = makeRoom({ guessVisibilityMode: "private_secret", secretScoreRevealMode: "round_end" });
    const letter = submitLetterGuess(room, "amit", "o").room;
    expect(letter.players.find((player) => player.id === "amit")?.score).toBe(0);
    expect(letter.playerRoundStates?.amit.pendingScore).toBe(10);
    const solved = submitFullMovieGuess({ ...letter, currentTurnPlayerId: "amit" }, "amit", "Dhoom").room;
    expect(solved.status).toBe("round_over");
    expect(solved.players.find((player) => player.id === "amit")?.score).toBe(60);
  });

  it("prevents the movie giver from guessing", () => {
    const room = makeRoom();
    const result = submitLetterGuess({ ...room, currentTurnPlayerId: "host" }, "host", "d");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Movie giver");
  });

  it("eliminates a leaving player and advances their turn", () => {
    const room = makeRoom({ guessVisibilityMode: "private_secret" });
    const left = leaveRoom(room, "amit");
    expect(left.players.find((player) => player.id === "amit")?.status).toBe("eliminated");
    expect(left.playerRoundStates?.amit.isEliminated).toBe(true);
    expect(left.currentTurnPlayerId).toBe("neha");
  });

  it("reassigns host when the host leaves", () => {
    const room = makeRoom();
    const left = leaveRoom(room, "host");
    expect(left.hostPlayerId).toBe("amit");
    expect(left.players.find((player) => player.id === "amit")?.isHost).toBe(true);
  });

  it("allows host management and rejects non-host management", () => {
    const room = makeRoom();
    const kicked = kickPlayer(room, "host", "neha");
    expect(kicked.players.find((player) => player.id === "neha")?.status).toBe("kicked");
    expect(() => kickPlayer(room, "amit", "neha")).toThrow("Only the host");
    expect(transferHost(room, "host", "amit").hostPlayerId).toBe("amit");
  });

  it("returns a completed room to the lobby through game state", () => {
    const won = submitFullMovieGuess(makeRoom(), "amit", "Dhoom").room;
    const lobby = returnToLobby(won, "host");
    expect(lobby.status).toBe("lobby");
    expect(lobby.currentTurnPlayerId).toBeNull();
    expect(lobby.round?.status).toBe("won");
  });
});
