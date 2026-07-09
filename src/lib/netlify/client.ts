export const isNetlifyBackendConfigured = import.meta.env.VITE_ONLINE_BACKEND === "netlify";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}
