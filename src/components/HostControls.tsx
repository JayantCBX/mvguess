import type { RoomSettings } from "../types/game";

interface HostControlsProps {
  settings: RoomSettings;
  disabled?: boolean;
  settingsDisabled?: boolean;
  onChange: (settings: RoomSettings) => void;
  onSetup: () => void;
}

export function HostControls({ settings, disabled, settingsDisabled, onChange, onSetup }: HostControlsProps) {
  const patch = (changes: Partial<RoomSettings>) => onChange({ ...settings, ...changes });
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
      <select disabled={settingsDisabled} value={settings.category} onChange={(event) => patch({ category: event.target.value as RoomSettings["category"] })} className="rounded-md bg-cinema-ink px-3 py-2 disabled:opacity-50">
        <option value="bollywood">Bollywood</option>
        <option value="hollywood">Hollywood</option>
        <option value="mixed">Mixed</option>
      </select>
      <select disabled={settingsDisabled} value={settings.difficulty} onChange={(event) => patch({ difficulty: event.target.value as RoomSettings["difficulty"] })} className="rounded-md bg-cinema-ink px-3 py-2 disabled:opacity-50">
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
        <option value="expert">Expert</option>
      </select>
      <select disabled={settingsDisabled} value={settings.lifeWord} onChange={(event) => patch({ lifeWord: event.target.value as RoomSettings["lifeWord"] })} className="rounded-md bg-cinema-ink px-3 py-2 disabled:opacity-50">
        <option value="BOLLYWOOD">BOLLYWOOD</option>
        <option value="HOLLYWOOD">HOLLYWOOD</option>
      </select>
      <select disabled={settingsDisabled} value={settings.timerSeconds} onChange={(event) => patch({ timerSeconds: Number(event.target.value) as RoomSettings["timerSeconds"] })} className="rounded-md bg-cinema-ink px-3 py-2 disabled:opacity-50">
        <option value={15}>15 seconds</option>
        <option value={30}>30 seconds</option>
        <option value={45}>45 seconds</option>
        <option value={60}>60 seconds</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={settingsDisabled} checked={settings.wrongGuessPenalty} onChange={(event) => patch({ wrongGuessPenalty: event.target.checked })} />
        Wrong letter penalty
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onSetup}
        className="rounded-md bg-cinema-gold px-4 py-2 font-bold text-cinema-ink disabled:opacity-50"
      >
        Start setup
      </button>
    </div>
  );
}
