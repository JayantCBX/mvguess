import type { Config, Context } from "@netlify/functions";
import { beginSetup, cancelSetup, createRoom, getRoom, joinRoom, leaveRoom, startOnlineRound, submitGuess, updateSettings } from "./_shared/room-store";
import { error, json, readJson } from "./_shared/responses";

type Body = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

export default async (request: Request, context: Context) => {
  try {
    const code = context.params.code?.toUpperCase();
    const action = context.params.action;

    if (!code && request.method === "POST") {
      const body = await readJson<Body>(request);
      return json(
        await createRoom({
          playerId: text(body.playerId),
          playerName: text(body.playerName),
          settings: body.settings as never
        })
      );
    }

    if (!code) return error("Room code is required.", 400);

    if (!action && request.method === "GET") return json(await getRoom(code));

    const body = request.method === "GET" ? {} : await readJson<Body>(request);
    const playerId = text(body.playerId);

    if (action === "join" && request.method === "POST") {
      return json(await joinRoom({ code, playerId, playerName: text(body.playerName) }));
    }
    if (action === "settings" && request.method === "PATCH") {
      return json(await updateSettings({ code, playerId, settings: body.settings as never }));
    }
    if (action === "setup" && request.method === "POST") {
      return json(await beginSetup({ code, playerId }));
    }
    if (action === "setup" && request.method === "DELETE") {
      return json(await cancelSetup({ code, playerId }));
    }
    if (action === "start" && request.method === "POST") {
      return json(
        await startOnlineRound({
          code,
          playerId,
          movieTitle: text(body.movieTitle),
          hintPositions: list(body.hintPositions),
          hintSettings: body.hintSettings as never
        })
      );
    }
    if (action === "guess" && request.method === "POST") {
      return json(
        await submitGuess({
          code,
          playerId,
          guessType: text(body.guessType) as never,
          guessValue: text(body.guessValue)
        })
      );
    }
    if (action === "leave" && request.method === "POST") {
      return json(await leaveRoom({ code, playerId }));
    }

    return error("Not found.", 404);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Request failed.";
    return error(message, message === "Room not found." ? 404 : 400);
  }
};

export const config: Config = {
  path: ["/api/rooms", "/api/rooms/:code", "/api/rooms/:code/:action"]
};
