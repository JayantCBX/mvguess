import { EXTENSION_CONFIG } from "../config/extensionConfig";

export const isNetlifyBackendConfigured = true;
const REQUEST_TIMEOUT_MS = 12_000;

function safeMessage(status: number, serverMessage?: string): string {
  const normalized = serverMessage?.toLowerCase() ?? "";
  if (
    normalized.includes("netlify blobs") ||
    normalized.includes("decode token") ||
    normalized.includes("token expired") ||
    normalized.includes("internal error")
  ) return "The multiplayer service needs maintenance. Please try again later.";
  if (status === 404 || normalized.includes("not found")) return "Room not found.";
  if (status === 409 && normalized.includes("full")) return "This room is full.";
  if (normalized.includes("room expired") || normalized.includes("room has expired")) return "This room has expired.";
  if (status >= 500) return "The multiplayer service is temporarily unavailable. Please try again.";
  return "The multiplayer request could not be completed. Please check the room and try again.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/api/")) throw new Error("Unexpected multiplayer request.");
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => timeoutController.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(`${EXTENSION_CONFIG.multiplayerApiOrigin}${path}`, {
      ...init,
      signal: timeoutController.signal,
      headers: { "Content-Type": "application/json", "Accept": "application/json", ...(init.headers ?? {}) }
    });
    const type = response.headers.get("content-type") ?? "";
    if (!type.toLowerCase().includes("application/json")) throw new Error("The multiplayer service returned an unexpected response.");
    const data: unknown = await response.json();
    if (!response.ok) {
      const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : undefined;
      throw new Error(safeMessage(response.status, message));
    }
    if (data === null || typeof data !== "object") throw new Error("The multiplayer service returned an unexpected response.");
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The multiplayer request timed out. Please try again.");
    if (error instanceof TypeError) throw new Error("Unable to reach the multiplayer service. Check your connection and try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}
