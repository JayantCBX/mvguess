import { useState } from "react";
import type { RoomSettings } from "../types/game";
import { defaultRoomSettings } from "../lib/supabase/rooms";
import { sanitizePlayerName } from "../lib/game/validation";
import { HostControls } from "../components/HostControls";

interface CreateRoomScreenProps {
  defaultName: string;
  onCreate: (name: string, settings: RoomSettings) => void;
  onBack: () => void;
}

export function CreateRoomScreen({ defaultName, onCreate, onBack }: CreateRoomScreenProps) {
  const [name, setName] = useState(defaultName);
  const [settings, setSettings] = useState<RoomSettings>(defaultRoomSettings);
  const cleanName = sanitizePlayerName(name);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pt-10">
      <button type="button" onClick={onBack} className="text-sm text-slate-300 hover:text-white">
        Back
      </button>
      <div>
        <p className="text-sm uppercase tracking-widest text-cinema-gold">Create private room</p>
        <h1 className="mt-1 text-4xl font-black">Host a round</h1>
      </div>
      <label className="block">
        <span className="text-sm text-slate-300">Player name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-cinema-ink px-3 py-3 text-white" maxLength={24} />
      </label>
      <HostControls settings={settings} onChange={setSettings} onSetup={() => cleanName && onCreate(cleanName, settings)} />
    </main>
  );
}
