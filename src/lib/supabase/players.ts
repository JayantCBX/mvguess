import type { Player } from "../../types/game";
import type { PlayerRow } from "../../types/supabase";
import { supabase } from "./client";

export function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    score: row.score,
    isHost: row.is_host,
    isOnline: row.is_online,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    status: row.status ?? "active",
    eliminatedAt: row.eliminated_at,
    leftAt: row.left_at,
    kickedAt: row.kicked_at,
    kickedByPlayerId: row.kicked_by_player_id,
    deviceId: row.device_id
  };
}

export async function setPlayerOnline(playerId: string, isOnline: boolean): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("players")
    .update({ is_online: isOnline, last_seen_at: new Date().toISOString() })
    .eq("id", playerId);
}
