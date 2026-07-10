import { Film, HelpCircle, LogIn, Plus } from "lucide-react";
import type { RoomState } from "../types/game";
import { ConnectionStatus } from "../components/ConnectionStatus";
import type { PlayerHistory } from "../lib/storage/chromeStorage";

interface HomeScreenProps {
  lastRoomCode: string;
  room: RoomState | null;
  history: PlayerHistory | null;
  supabaseConfigured: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onLastRoom: () => void;
  onHowToPlay: () => void;
}

export function HomeScreen({ lastRoomCode, room, history, supabaseConfigured, onCreate, onJoin, onLastRoom, onHowToPlay }: HomeScreenProps) {
  const bestScore = Math.max(0, ...Object.values(history?.previousScores ?? {}));
  const lastEntry = history?.previousRooms.find((entry) => entry.roomCode === lastRoomCode);
  const canRejoin = Boolean(lastRoomCode) && lastEntry?.status !== "kicked";
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center p-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-cinema-gold text-cinema-ink">
            <Film className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-black sm:text-5xl">Movie Guess Battle</h1>
            <p className="break-words text-slate-300">Private-room Bollywood and Hollywood guessing game.</p>
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
        <button type="button" onClick={onLastRoom} disabled={!canRejoin} className="min-h-20 rounded-lg border border-white/10 bg-white/5 p-5 text-left font-black disabled:opacity-40">
          Last Room {lastRoomCode ? <span className="text-cinema-gold">{lastRoomCode}</span> : null}
          {lastEntry ? <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{lastEntry.status === "kicked" ? "Removed · rejoin unavailable" : `${lastEntry.status} · rejoin room`}</span> : null}
        </button>
        <button type="button" onClick={onHowToPlay} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-5 text-left font-black">
          <HelpCircle className="h-6 w-6" />
          How to Play
        </button>
      </div>
      {history?.previousRooms.length ? <p className="mt-4 text-sm text-slate-400">Previous best score: <span className="font-black text-cinema-gold">{bestScore}</span></p> : null}
    </main>
  );
}
