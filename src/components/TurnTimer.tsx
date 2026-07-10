interface TurnTimerProps {
  seconds: number;
  remaining: number;
}

export function TurnTimer({ seconds, remaining }: TurnTimerProps) {
  const percent = Math.max(0, Math.min(100, (remaining / seconds) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        <span>Turn timer</span>
        <span className="font-mono text-sm tracking-normal text-white">{remaining}s</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="timer-progress h-full transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
