import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultScreen } from "../screens/ResultScreen";
import { createInitialRoom, createLocalPlayer, endRound, startRound } from "../lib/game/engine";
import { DEFAULT_ROOM_SETTINGS } from "../types/game";

function result(status: "won" | "lost") {
  const host = { ...createLocalPlayer("Host", true), id: "host" };
  const guest = { ...createLocalPlayer("Guest"), id: "guest" };
  const room = startRound({ ...createInitialRoom(host, DEFAULT_ROOM_SETTINGS), players: [host, guest] }, { title: "Dhoom" }, [], undefined, host.id);
  return endRound(room, status, status === "won" ? guest.id : null);
}

describe("result celebration", () => {
  it("renders fireworks and winner copy only for a won round", () => {
    const won = renderToStaticMarkup(<ResultScreen room={result("won")} currentPlayerId="host" onNextRound={() => undefined} onLobby={() => undefined} />);
    const lost = renderToStaticMarkup(<ResultScreen room={result("lost")} currentPlayerId="host" onNextRound={() => undefined} onLobby={() => undefined} />);
    expect(won).toContain("Winner Winner Chicken Dinner!");
    expect(won).toContain("fireworks");
    expect(lost).not.toContain("fireworks");
    expect(lost).toContain("Life word exhausted");
  });
});
