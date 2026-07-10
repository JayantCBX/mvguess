interface MovieMaskDisplayProps {
  maskedMovie: string;
}

export function MovieMaskDisplay({ maskedMovie }: MovieMaskDisplayProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-cinema-gold/20 bg-cinema-ink/60 px-3 py-6 text-center shadow-glow sm:px-5 sm:py-8">
      <p className="movie-mask break-all text-2xl font-black uppercase leading-relaxed text-cinema-gold sm:break-words sm:text-5xl">
        {maskedMovie || "_ _ _ _ _"}
      </p>
    </div>
  );
}
