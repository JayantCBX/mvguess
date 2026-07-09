interface HintPreviewProps {
  maskedMovie: string;
  errors: string[];
}

export function HintPreview({ maskedMovie, errors }: HintPreviewProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-cinema-ink/70 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
      <p className="movie-mask mt-3 break-words text-3xl font-black text-cinema-gold">{maskedMovie}</p>
      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-cinema-rose">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
