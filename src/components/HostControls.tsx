import type { RoomSettings } from "../types/game";
import type { Player } from "../types/game";

interface HostControlsProps {
  settings: RoomSettings;
  disabled?: boolean;
  settingsDisabled?: boolean;
  onChange: (settings: RoomSettings) => void;
  onSetup: (movieGiverPlayerId?: string) => void;
  players?: Player[];
  movieGiverPlayerId?: string | null;
  onMovieGiverChange?: (playerId: string) => void;
}

interface ToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, disabled, onChange }: ToggleProps) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-cinema-gold" />
    </label>
  );
}

export function HostControls({ settings, disabled, settingsDisabled, onChange, onSetup, players, movieGiverPlayerId, onMovieGiverChange }: HostControlsProps) {
  const patch = (changes: Partial<RoomSettings>) => onChange({ ...settings, ...changes });
  const selectClass = "min-h-11 rounded-md border border-white/10 bg-cinema-ink px-3 py-2 disabled:opacity-50";
  const sectionClass = "group rounded-lg border border-white/10 bg-white/[0.04] p-3 open:bg-white/[0.06]";
  return (
    <div className="space-y-3">
      <details className={sectionClass} open>
        <summary className="cursor-pointer font-black">Basic Settings</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select aria-label="Movie category" disabled={settingsDisabled} value={settings.category} onChange={(event) => patch({ category: event.target.value as RoomSettings["category"] })} className={selectClass}>
            <option value="bollywood">Bollywood</option><option value="hollywood">Hollywood</option><option value="mixed">Mixed</option>
          </select>
          <select aria-label="Difficulty" disabled={settingsDisabled} value={settings.difficulty} onChange={(event) => patch({ difficulty: event.target.value as RoomSettings["difficulty"] })} className={selectClass}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="expert">Expert</option>
          </select>
          <select aria-label="Life word" disabled={settingsDisabled} value={settings.lifeWord} onChange={(event) => patch({ lifeWord: event.target.value as RoomSettings["lifeWord"] })} className={selectClass}>
            <option value="BOLLYWOOD">BOLLYWOOD</option><option value="HOLLYWOOD">HOLLYWOOD</option>
          </select>
          <select aria-label="Turn timer" disabled={settingsDisabled} value={settings.timerSeconds} onChange={(event) => patch({ timerSeconds: Number(event.target.value) as RoomSettings["timerSeconds"] })} className={selectClass}>
            <option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option>
          </select>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Player capacity
            <select aria-label="Player capacity" disabled={settingsDisabled} value={settings.maxPlayers} onChange={(event) => patch({ maxPlayers: Number(event.target.value) as RoomSettings["maxPlayers"] })} className={`${selectClass} text-base font-bold normal-case tracking-normal text-white`}>
              {[2, 3, 4, 5, 6, 7, 8].map((limit) => <option key={limit} value={limit}>{limit} players</option>)}
            </select>
          </label>
        </div>
      </details>

      <details className={sectionClass}>
        <summary className="cursor-pointer font-black">Hint Settings</summary>
        <p className="mt-3 text-sm text-slate-300">The assigned movie giver chooses manual, random, smart, or no-hint mode during setup.</p>
      </details>

      <details className={sectionClass} open={settings.guessVisibilityMode === "private_secret"}>
        <summary className="cursor-pointer font-black">Guess Visibility</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select aria-label="Guess visibility" disabled={settingsDisabled} value={settings.guessVisibilityMode} onChange={(event) => patch({ guessVisibilityMode: event.target.value as RoomSettings["guessVisibilityMode"], secretScoreRevealMode: event.target.value === "private_secret" ? "round_end" : settings.secretScoreRevealMode })} className={selectClass}>
            <option value="shared_public">Shared public</option><option value="private_secret">Private secret</option>
          </select>
          <select aria-label="Secret score reveal" disabled={settingsDisabled || settings.guessVisibilityMode !== "private_secret"} value={settings.secretScoreRevealMode} onChange={(event) => patch({ secretScoreRevealMode: event.target.value as RoomSettings["secretScoreRevealMode"] })} className={selectClass}>
            <option value="round_end">Scores at round end</option><option value="live">Live scores</option>
          </select>
          <select aria-label="Last player standing" disabled={settingsDisabled} value={settings.lastPlayerStandingRule} onChange={(event) => patch({ lastPlayerStandingRule: event.target.value as RoomSettings["lastPlayerStandingRule"] })} className={selectClass}>
            <option value="continue">Continue until solved</option><option value="auto_win">Auto-win last player</option>
          </select>
          <Toggle label="Neutral secret turn messages" disabled={settingsDisabled} checked={settings.showNeutralTurnMessagesInSecretMode} onChange={(value) => patch({ showNeutralTurnMessagesInSecretMode: value })} />
        </div>
      </details>

      <details className={sectionClass}>
        <summary className="cursor-pointer font-black">Player Management</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle label="Allow host kick" disabled={settingsDisabled} checked={settings.allowHostKick} onChange={(value) => patch({ allowHostKick: value })} />
          <Toggle label="Allow host eliminate" disabled={settingsDisabled} checked={settings.allowHostEliminate} onChange={(value) => patch({ allowHostEliminate: value })} />
          <Toggle label="Allow leaving during game" disabled={settingsDisabled} checked={settings.allowLeaveDuringGame} onChange={(value) => patch({ allowLeaveDuringGame: value })} />
        </div>
      </details>

      <details className={sectionClass}>
        <summary className="cursor-pointer font-black">Rejoin Rules</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle label="Rejoin after leave" disabled={settingsDisabled} checked={settings.allowRejoinAfterLeave} onChange={(value) => patch({ allowRejoinAfterLeave: value })} />
          <Toggle label="Rejoin after elimination" disabled={settingsDisabled} checked={settings.allowRejoinAfterElimination} onChange={(value) => patch({ allowRejoinAfterElimination: value })} />
          <Toggle label="Rejoin after kick" disabled={settingsDisabled} checked={settings.allowRejoinAfterKick} onChange={(value) => patch({ allowRejoinAfterKick: value })} />
        </div>
      </details>

      <details className={sectionClass}>
        <summary className="cursor-pointer font-black">Score Rules</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle label="Wrong letter penalty" disabled={settingsDisabled} checked={settings.wrongGuessPenalty} onChange={(value) => patch({ wrongGuessPenalty: value })} />
          <Toggle label="Comeback bonus" disabled={settingsDisabled} checked={settings.enableComebackBonus} onChange={(value) => patch({ enableComebackBonus: value })} />
          <Toggle label="Streak bonus" disabled={settingsDisabled} checked={settings.enableStreakBonus} onChange={(value) => patch({ enableStreakBonus: value })} />
        </div>
      </details>

      <details className={sectionClass}>
        <summary className="cursor-pointer font-black">UI / Effects</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle label="Show shared wrong letters" disabled={settingsDisabled} checked={settings.showWrongLettersInSharedMode} onChange={(value) => patch({ showWrongLettersInSharedMode: value })} />
          <Toggle label="Guess history" disabled={settingsDisabled} checked={settings.showGuessHistory} onChange={(value) => patch({ showGuessHistory: value })} />
          <Toggle label="Round history" disabled={settingsDisabled} checked={settings.enableRoundHistory} onChange={(value) => patch({ enableRoundHistory: value })} />
          <Toggle label="Winner fireworks" disabled={settingsDisabled} checked={settings.enableWinnerFireworks} onChange={(value) => patch({ enableWinnerFireworks: value })} />
          <Toggle label="Responsive web mode" disabled={settingsDisabled} checked={settings.responsiveWebMode} onChange={(value) => patch({ responsiveWebMode: value })} />
        </div>
      </details>

      {players?.length && onMovieGiverChange ? (
        <label className="grid gap-1 rounded-lg border border-cinema-gold/30 bg-cinema-gold/5 p-3 text-xs font-bold uppercase tracking-[0.12em] text-cinema-gold">
          Choose movie giver
          <select aria-label="Choose movie giver" value={movieGiverPlayerId ?? ""} onChange={(event) => onMovieGiverChange(event.target.value)} className={`${selectClass} text-base font-bold normal-case tracking-normal text-white`}>
            {players.map((player) => <option key={player.id} value={player.id}>{player.name}{player.isHost ? " (Host)" : ""}</option>)}
          </select>
          <span className="font-normal normal-case tracking-normal text-slate-300">The host can still enter the movie and start the round if needed.</span>
        </label>
      ) : null}

      <button type="button" disabled={disabled} onClick={() => onSetup(movieGiverPlayerId ?? undefined)} className="min-h-11 w-full rounded-md bg-cinema-gold px-4 py-3 font-black text-cinema-ink disabled:opacity-50">
        Start setup
      </button>
    </div>
  );
}
