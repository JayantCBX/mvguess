import type { HintSettings } from "../types/hints";

interface HintSettingsPanelProps {
  settings: HintSettings;
  onChange: (settings: HintSettings) => void;
}

export function HintSettingsPanel({ settings, onChange }: HintSettingsPanelProps) {
  const patch = (changes: Partial<HintSettings>) => onChange({ ...settings, ...changes });
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.revealDuplicateLetters} onChange={(event) => patch({ revealDuplicateLetters: event.target.checked })} />
        Duplicate letters
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.allowVowelHints} onChange={(event) => patch({ allowVowelHints: event.target.checked })} />
        Vowel hints
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.allowFirstLetterHint} onChange={(event) => patch({ allowFirstLetterHint: event.target.checked })} />
        First letter
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.allowLastLetterHint} onChange={(event) => patch({ allowLastLetterHint: event.target.checked })} />
        Last letter
      </label>
      <label className="sm:col-span-2">
        <span className="text-slate-300">Minimum hidden percent: {settings.minimumHiddenPercent}%</span>
        <input
          type="range"
          min={40}
          max={90}
          value={settings.minimumHiddenPercent}
          onChange={(event) => patch({ minimumHiddenPercent: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>
    </div>
  );
}
