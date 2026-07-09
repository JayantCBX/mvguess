import { useMemo, useState } from "react";
import type { Difficulty } from "../types/game";
import type { HintSettings } from "../types/hints";
import {
  applyHintPositions,
  defaultHintSettings,
  generateDifficultyAutoHintPositions,
  generateRandomHintPositions,
  generateSmartRandomHintPositions,
  validateHintPositions
} from "../lib/game/hints";
import { HintCharacterGrid } from "./HintCharacterGrid";
import { HintModeSelector } from "./HintModeSelector";
import { HintPreview } from "./HintPreview";
import { HintSettingsPanel } from "./HintSettingsPanel";

interface HintSetupScreenProps {
  title?: string;
  difficulty: Difficulty;
  canSetup?: boolean;
  movieGiverName?: string;
  onStart: (title: string, positions: number[], settings: HintSettings) => void;
  onCancel: () => void;
}

function cleanMovieTitle(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function HintSetupScreen({ title = "", difficulty, canSetup = true, movieGiverName = "Movie giver", onStart, onCancel }: HintSetupScreenProps) {
  const [movieTitle, setMovieTitle] = useState(title);
  const [settings, setSettings] = useState<HintSettings>(defaultHintSettings);
  const [positions, setPositions] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const cleanTitle = cleanMovieTitle(movieTitle);
  const titleReady = /[a-z]/i.test(cleanTitle) && cleanTitle.length >= 2;

  const validation = useMemo(() => (titleReady ? validateHintPositions(cleanTitle, positions, settings, difficulty) : { valid: false, errors: ["Enter a movie title first."] }), [cleanTitle, positions, settings, difficulty, titleReady]);
  const maskedMovie = useMemo(() => (titleReady ? (settings.hintMode === "none" ? applyHintPositions(cleanTitle, [], settings) : applyHintPositions(cleanTitle, positions, settings)) : ""), [cleanTitle, positions, settings, titleReady]);

  const toggle = (position: number) => {
    setPositions((current) => (current.includes(position) ? current.filter((item) => item !== position) : [...current, position].sort((a, b) => a - b)));
  };

  const randomize = () => {
    if (!titleReady) return;
    if (settings.hintMode === "smart_random") setPositions(generateSmartRandomHintPositions(cleanTitle, difficulty, settings));
    else if (settings.hintMode === "difficulty_auto") setPositions(generateDifficultyAutoHintPositions(cleanTitle, difficulty, settings));
    else setPositions(generateRandomHintPositions(cleanTitle, difficulty, settings));
  };

  if (!canSetup) {
    return (
      <main className="mx-auto grid min-h-screen max-w-3xl place-items-center p-4">
        <section className="w-full rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-sm uppercase tracking-widest text-cinema-gold">Round setup</p>
          <h1 className="mt-2 text-3xl font-black">{movieGiverName} is choosing the movie</h1>
          <p className="mt-3 text-slate-300">You will enter the game automatically when the hints are locked.</p>
          <button type="button" onClick={onCancel} className="mt-5 rounded-md border border-white/10 px-4 py-2">
            Back
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-cinema-gold">Movie setup</p>
          <h1 className="mt-1 text-3xl font-black">Enter a custom movie</h1>
          <p className="mt-2 text-sm text-slate-300">Use any Hollywood, Bollywood, or other industry title.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-4 py-2">
          Back to lobby
        </button>
      </div>

      <label className="block rounded-lg border border-white/10 bg-white/5 p-4">
        <span className="text-sm font-bold text-slate-200">Movie name</span>
        <input
          value={movieTitle}
          onChange={(event) => {
            setMovieTitle(event.target.value);
            setPositions([]);
          }}
          placeholder="Type the exact movie title"
          maxLength={80}
          className="mt-2 w-full rounded-md border border-white/10 bg-cinema-ink px-3 py-3 text-lg font-bold text-white"
        />
      </label>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <HintModeSelector
            value={settings.hintMode}
            onChange={(hintMode) => {
              setSettings({ ...settings, hintMode });
              if (hintMode === "none") setPositions([]);
            }}
          />
          <HintSettingsPanel settings={settings} onChange={setSettings} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={randomize} disabled={!titleReady || settings.hintMode === "manual" || settings.hintMode === "none"} className="rounded-md bg-cinema-teal px-4 py-2 font-bold text-cinema-ink disabled:opacity-40">
              Randomize
            </button>
            <button type="button" onClick={() => setPositions([])} className="rounded-md border border-white/10 px-4 py-2">
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <HintCharacterGrid title={cleanTitle} selectedPositions={positions} disabled={!titleReady || settings.hintMode !== "manual"} onToggle={toggle} />
          <HintPreview maskedMovie={maskedMovie} errors={validation.errors} />
          <button
            type="button"
            disabled={!titleReady || (!validation.valid && settings.hintMode !== "none")}
            onClick={() => setConfirming(true)}
            className="w-full rounded-md bg-cinema-gold px-4 py-3 font-black text-cinema-ink disabled:opacity-40"
          >
            Lock hints and start round
          </button>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="max-w-md rounded-lg border border-white/10 bg-cinema-panel p-5">
            <h2 className="text-xl font-black">Start round?</h2>
            <p className="mt-2 text-sm text-slate-300">Once the round starts, hint letters cannot be changed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-white/10 px-4 py-2">
                Cancel
              </button>
              <button type="button" onClick={() => onStart(cleanTitle, settings.hintMode === "none" ? [] : positions, settings)} className="rounded-md bg-cinema-gold px-4 py-2 font-bold text-cinema-ink">
                Start
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
