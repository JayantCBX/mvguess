interface LifeWordDisplayProps {
  word: string;
  remaining: number;
}

export function LifeWordDisplay({ word, remaining }: LifeWordDisplayProps) {
  const visibleCount = Math.max(0, remaining);
  return (
    <div className="flex flex-wrap gap-2" aria-label={`${visibleCount} life letters remaining`}>
      {[...word].map((letter, index) => {
        const alive = index < visibleCount;
        return (
          <span
            key={`${letter}-${index}`}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-black transition duration-300 sm:h-10 sm:w-10 sm:text-sm ${
              alive
                ? "border-cinema-gold/60 bg-cinema-gold text-cinema-ink shadow-glow"
                : "deducted border-white/10 bg-white/5 text-slate-500"
            }`}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}
