import type { RoomState } from "../types/game";
import { Scoreboard } from "../components/Scoreboard";
import { Fireworks } from "../components/Fireworks";
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
  const winnerDelta = winner ? room.round?.scoreDeltas?.[winner.id] ?? room.playerRoundStates?.[winner.id]?.pendingScore : undefined;

  return (
    <main className={`relative mx-auto grid min-h-screen max-w-5xl place-items-center overflow-hidden p-4 ${won ? "result-won" : "result-lost"}`}>
      {won && room.settings.enableWinnerFireworks ? <Fireworks /> : null}
      <section className="relative z-10 w-full space-y-5 rounded-xl border border-white/10 bg-cinema-ink/80 p-5 shadow-glow backdrop-blur-sm sm:p-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-widest text-cinema-gold">Round result</p>
          <h1 className="mt-2 text-4xl font-black leading-none sm:text-6xl">{won ? "Winner Winner Chicken Dinner!" : "Life word exhausted"}</h1>
          <p className={`mt-3 text-lg font-bold ${won ? "text-cinema-teal" : "text-cinema-rose"}`}>{won ? `${winner?.name ?? "A player"} wins the round` : "The movie stayed hidden this time."}</p>
          <p className="mt-3 break-words text-2xl font-black text-cinema-gold">{room.round?.movieDisplay ?? room.round?.movieTitlePrivate}</p>
          {winnerDelta !== undefined ? <p className="mt-2 text-sm text-slate-300">Round score: {winnerDelta >= 0 ? "+" : ""}{winnerDelta}</p> : null}
          {nextMovieGiver ? <p className="mt-2 text-sm text-slate-300">Next movie: {nextMovieGiver.name}</p> : null}
        </div>
        <Scoreboard players={room.players} />
        {room.settings.enableRoundHistory && room.roundHistory?.length ? (
          <details className="rounded-lg border border-white/10 p-3">
            <summary className="cursor-pointer font-bold">Round history</summary>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {room.roundHistory.slice().reverse().map((item) => <p key={item.roundId}>Round {item.roundNumber}: {item.movieTitle} · {item.durationSeconds}s</p>)}
            </div>
          </details>
        ) : null}
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
