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
    lastSeenAt: row.last_seen_at
  };
}

export async function setPlayerOnline(playerId: string, isOnline: boolean): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("players")
    .update({ is_online: isOnline, last_seen_at: new Date().toISOString() })
    .eq("id", playerId);
}
