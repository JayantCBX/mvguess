import { Film, HelpCircle, LogIn, Plus } from "lucide-react";
import type { RoomState } from "../types/game";
import { ConnectionStatus } from "../components/ConnectionStatus";

interface HomeScreenProps {
  lastRoomCode: string;
  room: RoomState | null;
  supabaseConfigured: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onLastRoom: () => void;
  onHowToPlay: () => void;
}

export function HomeScreen({ lastRoomCode, room, supabaseConfigured, onCreate, onJoin, onLastRoom, onHowToPlay }: HomeScreenProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-cinema-gold text-cinema-ink">
            <Film className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl font-black sm:text-5xl">Movie Guess Battle</h1>
            <p className="text-slate-300">Private-room Bollywood and Hollywood guessing game.</p>
          </div>
        </div>
        <ConnectionStatus online={Boolean(room)} configured={supabaseConfigured} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onCreate} className="flex items-center gap-3 rounded-lg bg-cinema-gold p-5 text-left font-black text-cinema-ink">
          <Plus className="h-6 w-6" />
          Create Room
        </button>
        <button type="button" onClick={onJoin} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-5 text-left font-black">
          <LogIn className="h-6 w-6" />
          Join Room
        </button>
        <button type="button" onClick={onLastRoom} disabled={!lastRoomCode} className="rounded-lg border border-white/10 bg-white/5 p-5 text-left font-black disabled:opacity-40">
          Last Room {lastRoomCode ? <span className="text-cinema-gold">{lastRoomCode}</span> : null}
        </button>
        <button type="button" onClick={onHowToPlay} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-5 text-left font-black">
          <HelpCircle className="h-6 w-6" />
          How to Play
        </button>
      </div>
    </main>
  );
}
