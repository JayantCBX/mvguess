const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  const cryptoRef = globalThis.crypto;
  const bytes = new Uint8Array(length);
  cryptoRef?.getRandomValues(bytes);

  return Array.from(bytes, (byte) => ROOM_CHARS[byte % ROOM_CHARS.length]).join("");
}
