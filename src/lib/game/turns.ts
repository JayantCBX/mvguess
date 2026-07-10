import type { Player } from "../../types/game";

export function isActivePlayer(player: Player): boolean {
  return player.isOnline && (player.status ?? "active") === "active";
}

export function getNextPlayerTurn(players: Player[], currentPlayerId: string | null, excludedPlayerId?: string | null): string | null {
  const active = players.filter((player) => isActivePlayer(player) && player.id !== excludedPlayerId);
  if (active.length === 0) return null;
  if (!currentPlayerId) return active[0].id;
  const currentIndex = active.findIndex((player) => player.id === currentPlayerId);
  if (currentIndex === -1) return active[0].id;
  return active[(currentIndex + 1) % active.length].id;
}

export function getNextMovieGiver(players: Player[], previousMovieGiverId?: string | null, hostPlayerId?: string | null): string | null {
  const active = players.filter(isActivePlayer);
  if (active.length === 0) return null;
  if (!previousMovieGiverId) {
    return active.find((player) => player.id === hostPlayerId)?.id ?? active[0].id;
  }
  return getNextPlayerTurn(active, previousMovieGiverId);
}

export function assignNextHost(players: Player[], leavingHostId?: string): Player[] {
  const online = players.filter((player) => isActivePlayer(player) && player.id !== leavingHostId);
  const nextHostId = online[0]?.id ?? null;
  return players.map((player) => ({
    ...player,
    isHost: player.id === nextHostId
  }));
}
