import { Crown } from "lucide-react";
import type { Player } from "../types/game";

interface PlayerListProps {
  players: Player[];
  currentTurnPlayerId?: string | null;
}

export function PlayerList({ players, currentTurnPlayerId }: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center justify-between rounded-md border px-3 py-2 ${
            player.id === currentTurnPlayerId ? "border-cinema-gold bg-cinema-gold/10" : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${player.isOnline ? "bg-cinema-teal" : "bg-slate-500"}`} />
            <span className="font-medium">{player.name}</span>
            {player.isHost ? <Crown className="h-4 w-4 text-cinema-gold" aria-label="Host" /> : null}
          </div>
          <span className="text-sm text-slate-300">{player.score}</span>
        </div>
      ))}
    </div>
  );
}
