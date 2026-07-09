export { sanitizePlayerName } from "../lib/game/validation";

export function sanitizeRoomCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
}
