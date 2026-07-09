import { isAlphabet } from "../lib/game/masking";

interface HintCharacterGridProps {
  title: string;
  selectedPositions: number[];
  disabled?: boolean;
  onToggle: (position: number) => void;
}

export function HintCharacterGrid({ title, selectedPositions, disabled, onToggle }: HintCharacterGridProps) {
  return (
    <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
      {[...title].map((char, index) => {
        const selectable = isAlphabet(char);
        const selected = selectedPositions.includes(index);
        return (
          <button
            key={`${char}-${index}`}
            type="button"
            disabled={disabled || !selectable}
            onClick={() => onToggle(index)}
            className={`aspect-square rounded-md border text-sm font-bold ${
              selected
                ? "border-cinema-gold bg-cinema-gold text-cinema-ink"
                : selectable
                  ? "border-white/10 bg-white/10 text-white hover:border-cinema-teal"
                  : "border-white/5 bg-white/5 text-slate-500"
            } disabled:cursor-not-allowed`}
          >
            {char === " " ? "·" : char}
          </button>
        );
      })}
    </div>
  );
}
