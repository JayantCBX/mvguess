import type { Player } from "../types/game";

interface ScoreboardProps {
  players: Player[];
}

export function Scoreboard({ players }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-2">
      {sorted.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
          <span className="text-sm text-slate-300">
            #{index + 1} <span className="font-semibold text-white">{player.name}</span>
          </span>
          <span className="font-black text-cinema-gold">{player.score}</span>
        </div>
      ))}
    </div>
  );
}
