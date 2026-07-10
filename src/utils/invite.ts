export function getRoomInviteUrl(code: string): string {
  const configuredBase = (import.meta.env.VITE_PUBLIC_WEB_URL ?? import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  if (configuredBase) return `${configuredBase}/game.html?room=${encodeURIComponent(code)}`;
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
}
