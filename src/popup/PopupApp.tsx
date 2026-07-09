import { useEffect, useState } from "react";
import { Film, HelpCircle, LogIn, Plus } from "lucide-react";
import { getLocalProfile } from "../lib/storage/chromeStorage";

function openGame(path = "") {
  const url = typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`game.html${path}`) : `/game.html${path}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PopupApp() {
  const [lastRoomCode, setLastRoomCode] = useState("");

  useEffect(() => {
    getLocalProfile().then((profile) => setLastRoomCode(profile.lastRoomCode));
  }, []);

  return (
    <main className="w-80 space-y-3 bg-cinema-ink p-4 text-white">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-cinema-gold text-cinema-ink">
          <Film className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-black">Movie Guess Battle</h1>
          <p className="text-xs text-slate-400">Opens in a full extension tab.</p>
        </div>
      </div>
      <button type="button" onClick={() => openGame("?action=create")} className="flex w-full items-center gap-2 rounded-md bg-cinema-gold px-3 py-3 font-bold text-cinema-ink">
        <Plus className="h-5 w-5" />
        Create Room
      </button>
      <button type="button" onClick={() => openGame("?action=join")} className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-3 font-bold">
        <LogIn className="h-5 w-5" />
        Join Room
      </button>
      <button type="button" disabled={!lastRoomCode} onClick={() => openGame(`?room=${lastRoomCode}`)} className="w-full rounded-md border border-white/10 px-3 py-3 text-left font-bold disabled:opacity-40">
        Last Room {lastRoomCode ? <span className="text-cinema-gold">{lastRoomCode}</span> : null}
      </button>
      <button type="button" onClick={() => openGame("?help=1")} className="flex w-full items-center gap-2 rounded-md border border-white/10 px-3 py-3 font-bold">
        <HelpCircle className="h-5 w-5" />
        How to Play
      </button>
    </main>
  );
}
