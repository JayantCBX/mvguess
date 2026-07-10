import { Crown, MoreVertical } from "lucide-react";
import type { Player, RoomStatus } from "../types/game";

interface PlayerListProps {
  players: Player[];
  currentTurnPlayerId?: string | null;
  currentPlayerId?: string;
  roomStatus?: RoomStatus;
  canManage?: boolean;
  onKick?: (playerId: string) => void;
  onEliminate?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export function PlayerList({ players, currentTurnPlayerId, currentPlayerId, roomStatus, canManage, onKick, onEliminate, onTransferHost }: PlayerListProps) {
  return (
    <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,.35)_transparent]">
      {players.map((player) => {
        const status = player.status ?? (player.isOnline ? "active" : "left");
        const self = player.id === currentPlayerId;
        return (
          <div key={player.id} className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${player.id === currentTurnPlayerId ? "border-cinema-teal/50 bg-cinema-teal/10 shadow-[0_0_24px_rgba(53,208,186,0.08)]" : "border-white/[0.07] bg-white/[0.035]"}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${player.isOnline && status === "active" ? "bg-cinema-teal" : status === "kicked" ? "bg-cinema-rose" : "bg-slate-500"}`} />
                <span className="truncate font-bold">{player.name}</span>
                {player.isHost ? <Crown className="h-4 w-4 shrink-0 text-cinema-gold" aria-label="Host" /> : null}
              </div>
              <span className="ml-[18px] text-[11px] uppercase tracking-wide text-slate-400">{status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">{player.score}</span>
              {canManage && !self ? (
                <details className="relative">
                  <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-md border border-white/10" aria-label={`Manage ${player.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-white/10 bg-cinema-panel p-1 shadow-xl">
                    {onTransferHost ? <button type="button" onClick={() => onTransferHost(player.id)} className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-white/10">Make host</button> : null}
                    {roomStatus === "playing" && onEliminate ? <button type="button" onClick={() => onEliminate(player.id)} className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-white/10">Eliminate from round</button> : null}
                    {onKick ? <button type="button" onClick={() => onKick(player.id)} className="min-h-11 w-full rounded px-3 text-left text-sm text-cinema-rose hover:bg-white/10">Kick from room</button> : null}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
