import type { HintMode } from "../types/hints";

const MODES: { value: HintMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "random", label: "Random" },
  { value: "smart_random", label: "Smart random" },
  { value: "none", label: "No hints" },
  { value: "difficulty_auto", label: "Auto" }
];

interface HintModeSelectorProps {
  value: HintMode;
  onChange: (mode: HintMode) => void;
}

export function HintModeSelector({ value, onChange }: HintModeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as HintMode)}
      className="w-full rounded-md border border-white/10 bg-cinema-ink px-3 py-2 text-white"
    >
      {MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  );
}
