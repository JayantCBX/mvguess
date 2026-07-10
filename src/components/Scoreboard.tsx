import type { Player } from "../types/game";

interface ScoreboardProps {
  players: Player[];
}

export function Scoreboard({ players }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-2">
      {sorted.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-3">
          <span className="text-sm text-slate-300">
            #{index + 1} <span className="font-semibold text-white">{player.name}</span>
          </span>
          <span className="font-black tabular-nums text-cinema-gold">{player.score}<span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">pts</span></span>
        </div>
      ))}
    </div>
  );
}
