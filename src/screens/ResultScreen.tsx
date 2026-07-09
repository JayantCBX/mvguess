import type { RoomState } from "../types/game";
import { Scoreboard } from "../components/Scoreboard";
import { getNextMovieGiver } from "../lib/game/turns";

interface ResultScreenProps {
  room: RoomState;
  currentPlayerId: string;
  localMode?: boolean;
  onNextRound: () => void;
  onLobby: () => void;
}

export function ResultScreen({ room, currentPlayerId, localMode = false, onNextRound, onLobby }: ResultScreenProps) {
  const winner = room.players.find((player) => player.id === room.round?.winnerPlayerId);
  const nextMovieGiverId = getNextMovieGiver(room.players, room.round?.movieGiverPlayerId, room.hostPlayerId);
  const nextMovieGiver = room.players.find((player) => player.id === nextMovieGiverId);
  const canStartNextRound = localMode || nextMovieGiverId === currentPlayerId;
  const won = room.round?.status === "won";

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl place-items-center p-4">
      <section className="w-full space-y-5">
        <div>
          <p className="text-sm uppercase tracking-widest text-cinema-gold">Round result</p>
          <h1 className="mt-1 text-4xl font-black">{won ? `${winner?.name ?? "A player"} solved it` : "Life word exhausted"}</h1>
          <p className="mt-3 text-2xl font-black text-cinema-gold">{room.round?.movieDisplay ?? room.round?.movieTitlePrivate}</p>
          {nextMovieGiver ? <p className="mt-2 text-sm text-slate-300">Next movie: {nextMovieGiver.name}</p> : null}
        </div>
        <Scoreboard players={room.players} />
        <div className="flex flex-wrap gap-2">
          {canStartNextRound ? (
            <button type="button" onClick={onNextRound} className="rounded-md bg-cinema-gold px-4 py-3 font-bold text-cinema-ink">
              Give next movie
            </button>
          ) : null}
          <button type="button" onClick={onLobby} className="rounded-md border border-white/10 px-4 py-3">
            Lobby
          </button>
        </div>
      </section>
    </main>
  );
}
