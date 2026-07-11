const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const isNetlifyBackendConfigured = import.meta.env.VITE_ONLINE_BACKEND === "netlify" || Boolean(apiBaseUrl);

function safeApiMessage(status: number, serverMessage?: string): string {
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
  return serverMessage && serverMessage.length <= 120 && !/[()[\]{}:]/.test(serverMessage)
    ? serverMessage
    : "The multiplayer request could not be completed. Please try again.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Request failed.";
    throw new Error(safeApiMessage(response.status, message));
  }

  return data as T;
}
