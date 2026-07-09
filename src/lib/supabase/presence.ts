import type { RealtimeChannel } from "@supabase/supabase-js";

export async function trackPresence(channel: RealtimeChannel | null, player: { id: string; name: string }): Promise<void> {
  if (!channel) return;
  await channel.track({
    playerId: player.id,
    name: player.name,
    onlineAt: new Date().toISOString()
  });
}
