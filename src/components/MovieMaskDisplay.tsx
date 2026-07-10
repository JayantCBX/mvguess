interface MovieMaskDisplayProps {
  maskedMovie: string;
}

export function MovieMaskDisplay({ maskedMovie }: MovieMaskDisplayProps) {
  return (
    <div className="movie-stage min-w-0 overflow-hidden rounded-2xl px-4 py-10 text-center sm:px-8 sm:py-14">
      <p className="movie-mask break-all text-3xl font-black uppercase leading-relaxed text-cinema-gold sm:break-words sm:text-6xl">
        {maskedMovie || "_ _ _ _ _"}
      </p>
    </div>
  );
}
