import type { RoomSettings, RoomState } from "../types/game";
import { HostControls } from "../components/HostControls";
import { PlayerList } from "../components/PlayerList";
import { RoomInviteCard } from "../components/RoomInviteCard";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { getNextMovieGiver } from "../lib/game/turns";

interface LobbyScreenProps {
  room: RoomState;
  currentPlayerId: string;
  supabaseConfigured: boolean;
  onSettingsChange: (settings: RoomSettings) => void;
  onSetup: () => void;
  onCopyInvite: () => void;
  onLeave: () => void;
}

export function LobbyScreen({ room, currentPlayerId, supabaseConfigured, onSettingsChange, onSetup, onCopyInvite, onLeave }: LobbyScreenProps) {
  const isHost = room.hostPlayerId === currentPlayerId;
  const enoughPlayers = room.players.length >= 2;
  const nextMovieGiverId = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  const canBeginSetup = room.status === "round_over" ? nextMovieGiverId === currentPlayerId : isHost;

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
            <button type="button" onClick={onLeave} className="rounded-md border border-white/10 px-3 py-2 text-sm">
              Leave
            </button>
          </div>
        </div>
        <RoomInviteCard code={room.code} onCopy={onCopyInvite} />
        {canBeginSetup ? (
          <HostControls settings={room.settings} disabled={!enoughPlayers} settingsDisabled={!isHost} onChange={onSettingsChange} onSetup={onSetup} />
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-slate-300">
            {room.status === "round_over" ? "Waiting for the next movie giver to start setup." : "Only the host can change settings and start setup."}
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
        <PlayerList players={room.players} currentTurnPlayerId={room.currentTurnPlayerId} />
      </aside>
    </main>
  );
}
