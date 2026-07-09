import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./client";

export type RoomBroadcastEvent =
  | "player_joined"
  | "player_left"
  | "host_changed"
  | "settings_updated"
  | "hint_mode_changed"
  | "hint_positions_updated"
  | "hint_randomized"
  | "hint_preview_updated"
  | "round_hint_locked"
  | "game_started"
  | "guess_submitted"
  | "correct_guess"
  | "wrong_guess"
  | "turn_changed"
  | "timer_expired"
  | "round_won"
  | "round_lost"
  | "round_restarted";

export function subscribeRoomChannel(
  roomCode: string,
  onEvent: (event: RoomBroadcastEvent, payload: unknown) => void,
  onSync: () => void
): RealtimeChannel | null {
  if (!supabase) return null;
  const channel = supabase.channel(`room:${roomCode}`, {
    config: { presence: { key: roomCode } }
  });

  channel.on("broadcast", { event: "*" }, (payload) => {
    onEvent(payload.event as RoomBroadcastEvent, payload.payload);
    onSync();
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onSync();
  });

  return channel;
}

export async function broadcastRoomEvent(channel: RealtimeChannel | null, event: RoomBroadcastEvent, payload: unknown): Promise<void> {
  if (!channel) return;
  await channel.send({ type: "broadcast", event, payload });
}
