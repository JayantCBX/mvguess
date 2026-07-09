import { useEffect, useState } from "react";
import type { RoomState } from "../types/game";
import { AlphabetKeyboard } from "../components/AlphabetKeyboard";
import { LifeWordDisplay } from "../components/LifeWordDisplay";
import { MovieMaskDisplay } from "../components/MovieMaskDisplay";
import { PlayerList } from "../components/PlayerList";
import { Scoreboard } from "../components/Scoreboard";
import { TurnTimer } from "../components/TurnTimer";

interface GameScreenProps {
  room: RoomState;
  currentPlayerId: string;
  onLetterGuess: (letter: string) => void;
  onFullGuess: (guess: string) => void;
  onSkip: () => void;
}

export function GameScreen({ room, currentPlayerId, onLetterGuess, onFullGuess, onSkip }: GameScreenProps) {
  const [fullGuess, setFullGuess] = useState("");
  const [remaining, setRemaining] = useState<number>(room.settings.timerSeconds);
  const isMyTurn = room.currentTurnPlayerId === currentPlayerId;
  const currentPlayer = room.players.find((player) => player.id === room.currentTurnPlayerId);

  useEffect(() => {
    setRemaining(room.settings.timerSeconds);
  }, [room.currentTurnPlayerId, room.settings.timerSeconds]);

  useEffect(() => {
    if (!isMyTurn) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          onSkip();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isMyTurn, onSkip]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isMyTurn || event.target instanceof HTMLInputElement) return;
      if (/^[a-z]$/i.test(event.key)) onLetterGuess(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMyTurn, onLetterGuess]);

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-5 p-4 pt-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5">
        <div>
          <p className="text-sm uppercase tracking-widest text-cinema-gold">{isMyTurn ? "Your turn" : `${currentPlayer?.name ?? "Player"} is guessing`}</p>
          <h1 className="mt-1 text-3xl font-black">Guess the movie</h1>
        </div>
        <MovieMaskDisplay maskedMovie={room.maskedMovie} />
        <LifeWordDisplay word={room.settings.lifeWord} remaining={room.lifeRemaining} />
        <TurnTimer seconds={room.settings.timerSeconds} remaining={isMyTurn ? remaining : room.settings.timerSeconds} />
        <AlphabetKeyboard guessedLetters={room.guessedLetters} disabled={!isMyTurn} onGuess={onLetterGuess} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onFullGuess(fullGuess);
            setFullGuess("");
          }}
          className="flex gap-2"
        >
          <input value={fullGuess} onChange={(event) => setFullGuess(event.target.value)} disabled={!isMyTurn} placeholder="Full movie guess" className="min-w-0 flex-1 rounded-md border border-white/10 bg-cinema-ink px-3 py-3" />
          <button type="submit" disabled={!isMyTurn || !fullGuess.trim()} className="rounded-md bg-cinema-gold px-4 py-3 font-bold text-cinema-ink disabled:opacity-40">
            Guess
          </button>
          <button type="button" disabled={!isMyTurn} onClick={onSkip} className="rounded-md border border-white/10 px-4 py-3 disabled:opacity-40">
            Skip
          </button>
        </form>
        <p className="text-sm text-slate-400">Wrong letters: {room.wrongLetters.join(", ") || "None"}</p>
      </section>
      <aside className="space-y-5">
        <div>
          <h2 className="mb-3 text-xl font-black">Players</h2>
          <PlayerList players={room.players} currentTurnPlayerId={room.currentTurnPlayerId} />
        </div>
        <div>
          <h2 className="mb-3 text-xl font-black">Scoreboard</h2>
          <Scoreboard players={room.players} />
        </div>
      </aside>
    </main>
  );
}

