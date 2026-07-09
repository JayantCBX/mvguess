interface MovieMaskDisplayProps {
  maskedMovie: string;
}

export function MovieMaskDisplay({ maskedMovie }: MovieMaskDisplayProps) {
  return (
    <div className="rounded-lg border border-cinema-gold/20 bg-cinema-ink/60 px-5 py-8 text-center shadow-glow">
      <p className="movie-mask break-words text-3xl font-black uppercase leading-relaxed text-cinema-gold sm:text-5xl">
        {maskedMovie || "_ _ _ _ _"}
      </p>
    </div>
  );
}
