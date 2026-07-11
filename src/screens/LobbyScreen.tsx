import type { RoomSettings, RoomState } from "../types/game";
import { HostControls } from "../components/HostControls";
import { PlayerList } from "../components/PlayerList";
import { RoomInviteCard } from "../components/RoomInviteCard";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { getNextMovieGiver } from "../lib/game/turns";
import { useState } from "react";

interface LobbyScreenProps {
  room: RoomState;
  currentPlayerId: string;
  supabaseConfigured: boolean;
  onSettingsChange: (settings: RoomSettings) => void;
  onSetup: (movieGiverPlayerId?: string) => void;
  onCopyInvite: () => void;
  onLeave: () => void;
  onKick?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export function LobbyScreen({ room, currentPlayerId, supabaseConfigured, onSettingsChange, onSetup, onCopyInvite, onLeave, onKick, onTransferHost }: LobbyScreenProps) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isHost = room.hostPlayerId === currentPlayerId;
  const enoughPlayers = room.players.filter((player) => player.isOnline && (player.status ?? "active") === "active").length >= 2;
  const nextMovieGiverId = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  const activePlayers = room.players.filter((player) => player.isOnline && (player.status ?? "active") === "active");
  const [selectedMovieGiverId, setSelectedMovieGiverId] = useState(nextMovieGiverId);
  const effectiveMovieGiverId = activePlayers.some((player) => player.id === selectedMovieGiverId) ? selectedMovieGiverId : nextMovieGiverId;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-5 p-4 pt-8 lg:grid-cols-[1fr_340px]">
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-cinema-gold">Lobby</p>
            <h1 className="mt-1 text-4xl font-black">Waiting for players</h1>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus online={true} configured={supabaseConfigured} />
            <button type="button" onClick={() => setConfirmLeave(true)} className="rounded-md border border-white/10 px-3 py-2 text-sm">
              Leave Lobby
            </button>
          </div>
        </div>
        <RoomInviteCard code={room.code} onCopy={onCopyInvite} />
        {isHost ? (
          <HostControls settings={room.settings} disabled={!enoughPlayers} settingsDisabled={false} onChange={onSettingsChange} onSetup={onSetup} players={activePlayers} movieGiverPlayerId={effectiveMovieGiverId} onMovieGiverChange={setSelectedMovieGiverId} />
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-300">
            Waiting for the host to choose a movie giver and start setup.
          </div>
        )}
        {!enoughPlayers ? (
          <p className="text-sm text-cinema-gold">
            {supabaseConfigured ? "Minimum 2 players required. Share the invite link or room code with another player." : "Minimum 2 players required. Use Add local player for same-device testing, or run Supabase migrations for online multiplayer."}
          </p>
        ) : null}
      </section>
      <aside className="space-y-3">
        <h2 className="text-xl font-black">Players</h2>
        <PlayerList players={room.players} currentTurnPlayerId={room.currentTurnPlayerId} currentPlayerId={currentPlayerId} roomStatus={room.status} canManage={isHost} onKick={onKick} onTransferHost={onTransferHost} />
      </aside>
      {confirmLeave ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-cinema-panel p-5">
            <h2 className="text-xl font-black">Leave lobby?</h2>
            <p className="mt-2 text-slate-300">Are you sure you want to leave? You can rejoin later if the room settings allow it.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-md border border-white/10 px-4 py-3">Stay</button>
              <button type="button" onClick={onLeave} className="rounded-md bg-cinema-rose px-4 py-3 font-bold">Leave Lobby</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
