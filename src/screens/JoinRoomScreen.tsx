import { useState } from "react";
import { sanitizePlayerName } from "../lib/game/validation";
import { sanitizeRoomCode } from "../utils/sanitize";

interface JoinRoomScreenProps {
  defaultName: string;
  defaultRoomCode: string;
  onJoin: (name: string, code: string) => void;
  onBack: () => void;
}

export function JoinRoomScreen({ defaultName, defaultRoomCode, onJoin, onBack }: JoinRoomScreenProps) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(defaultRoomCode);
  const cleanName = sanitizePlayerName(name);
  const cleanCode = sanitizeRoomCode(code);

  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pt-10">
      <button type="button" onClick={onBack} className="text-sm text-slate-300 hover:text-white">
        Back
      </button>
      <div>
        <p className="text-sm uppercase tracking-widest text-cinema-gold">Join private room</p>
        <h1 className="mt-1 text-4xl font-black">Enter invite code</h1>
      </div>
      <label className="block">
        <span className="text-sm text-slate-300">Player name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-cinema-ink px-3 py-3 text-white" maxLength={24} />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Room code</span>
        <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-2 w-full rounded-md border border-white/10 bg-cinema-ink px-3 py-3 text-white" maxLength={6} />
      </label>
      <button type="button" disabled={!cleanName || cleanCode.length < 4} onClick={() => onJoin(cleanName, cleanCode)} className="w-full rounded-md bg-cinema-gold px-4 py-3 font-black text-cinema-ink disabled:opacity-40">
        Join Room
      </button>
    </main>
  );
}
