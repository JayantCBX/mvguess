import { useEffect, useRef, useState } from "react";
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
  onLeave: () => void;
  onKick?: (playerId: string) => void;
  onEliminate?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export function GameScreen({ room, currentPlayerId, onLetterGuess, onFullGuess, onSkip, onLeave, onKick, onEliminate, onTransferHost }: GameScreenProps) {
  const [fullGuess, setFullGuess] = useState("");
  const [remaining, setRemaining] = useState<number>(room.settings.timerSeconds);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const expiredRef = useRef(false);
  const currentViewer = room.players.find((player) => player.id === currentPlayerId);
  const personalState = room.playerRoundStates?.[currentPlayerId];
  const eliminated = currentViewer?.status === "eliminated" || personalState?.isEliminated;
  const isMovieGiver = room.round?.movieGiverPlayerId === currentPlayerId;
  const isMyTurn = room.currentTurnPlayerId === currentPlayerId && !eliminated && !isMovieGiver;
  const currentPlayer = room.players.find((player) => player.id === room.currentTurnPlayerId);
  const isHost = room.hostPlayerId === currentPlayerId;
  const privateMode = room.settings.guessVisibilityMode === "private_secret";
  const isPrivilegedSpectator = privateMode && (isHost || isMovieGiver) && !isMyTurn;
  const latestPrivateGuess = [...(room.guessHistory ?? [])].reverse().find((item) => item.visibility === "private");
  const localObservedPlayerId = latestPrivateGuess?.playerId ?? room.currentTurnPlayerId ?? undefined;
  const localObservedState = isPrivilegedSpectator && localObservedPlayerId && localObservedPlayerId !== currentPlayerId
    ? room.playerRoundStates?.[localObservedPlayerId]
    : undefined;
  const spectatorState = room.spectatorRoundState ?? (localObservedState ? {
    playerId: localObservedState.playerId,
    maskedMovie: localObservedState.maskedMovie,
    updatedAt: localObservedState.updatedAt
  } : undefined);
  const observedPlayer = room.players.find((player) => player.id === spectatorState?.playerId);
  const visibleMask = privateMode
    ? isPrivilegedSpectator && spectatorState
      ? spectatorState.maskedMovie
      : personalState?.maskedMovie ?? room.round?.initialMaskedMovie ?? room.maskedMovie
    : room.maskedMovie;
  const visibleLife = privateMode ? personalState?.lifeRemaining ?? room.settings.lifeWord.length : room.lifeRemaining;
  const visibleGuessedLetters = privateMode ? personalState?.guessedLetters ?? room.guessedLetters : room.guessedLetters;
  const visibleWrongLetters = privateMode ? personalState?.wrongLetters ?? room.wrongLetters : room.wrongLetters;

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(room.settings.timerSeconds);
  }, [room.currentTurnPlayerId, room.settings.timerSeconds]);

  useEffect(() => {
    if (!isMyTurn || eliminated) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onSkip();
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [eliminated, isMyTurn, onSkip, room.currentTurnPlayerId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isMyTurn || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (/^[a-z]$/i.test(event.key)) onLetterGuess(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMyTurn, onLetterGuess]);

  const history = (room.guessHistory ?? []).slice(-8);

  return (
    <main className="game-shell mx-auto grid min-h-screen max-w-[1440px] gap-6 px-4 pb-10 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:pt-8">
      <section className="game-workspace min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="turn-eyebrow text-xs font-bold uppercase tracking-[0.22em] text-cinema-gold">{eliminated ? "Watching round" : isMyTurn ? "Your turn" : `${currentPlayer?.name ?? "Player"} is guessing`}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Guess the movie</h1>
            <p className="mt-2 text-sm text-slate-400">{privateMode ? isPrivilegedSpectator ? `Live reveal · watching ${observedPlayer?.name ?? "the latest guesser"}` : "Private secret mode · only you see your guesses" : "Shared public mode · every reveal is live"}</p>
          </div>
          {room.settings.allowLeaveDuringGame ? <button type="button" onClick={() => setConfirmLeave(true)} className="secondary-danger min-h-11 rounded-xl px-5 text-sm font-bold text-cinema-rose">Leave Game</button> : null}
        </div>

        {eliminated ? <div className="rounded-lg border border-cinema-rose/30 bg-cinema-rose/10 p-4"><h2 className="font-black">You have been eliminated</h2><p className="mt-1 text-sm text-slate-300">You can watch the remaining turns without revealing private guesses.</p></div> : null}
        <MovieMaskDisplay maskedMovie={visibleMask} />
        <LifeWordDisplay word={room.settings.lifeWord} remaining={visibleLife} />
        <TurnTimer seconds={room.settings.timerSeconds} remaining={isMyTurn ? remaining : room.settings.timerSeconds} />
        <AlphabetKeyboard guessedLetters={visibleGuessedLetters} disabled={!isMyTurn} onGuess={onLetterGuess} />
        <form onSubmit={(event) => { event.preventDefault(); if (!isMyTurn) return; onFullGuess(fullGuess); setFullGuess(""); }} className="guess-form grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input value={fullGuess} onChange={(event) => setFullGuess(event.target.value)} disabled={!isMyTurn} maxLength={80} placeholder="Enter the full movie title" className="min-w-0 rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 outline-none transition focus:border-cinema-teal/70 focus:ring-4 focus:ring-cinema-teal/10" />
          <button type="submit" disabled={!isMyTurn || !fullGuess.trim()} className="primary-action rounded-xl bg-cinema-gold px-6 py-3 font-black text-cinema-ink disabled:opacity-40">Guess</button>
          <button type="button" disabled={!isMyTurn} onClick={onSkip} className="rounded-xl border border-white/10 px-5 py-3 font-bold transition hover:border-white/25 hover:bg-white/5 disabled:opacity-40">Skip</button>
        </form>
        {(privateMode || room.settings.showWrongLettersInSharedMode) ? <p className="break-words text-sm text-slate-400">Wrong letters: {visibleWrongLetters.join(", ") || "None"}</p> : null}
        {room.settings.showGuessHistory && history.length ? (
          <details className="history-panel rounded-2xl border border-white/10 p-3">
            <summary className="cursor-pointer font-bold">Guess history</summary>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {history.map((item) => {
                const player = room.players.find((candidate) => candidate.id === item.playerId);
                const ownPrivate = item.visibility === "private";
                return <p key={item.id}>{ownPrivate ? `You guessed ${item.guessValue ?? item.guessType}: ${item.isCorrect ? "correct" : "wrong"}` : `${player?.name ?? "A player"} ${item.guessType === "skip" ? "completed turn" : "made a guess"}`}</p>;
              })}
            </div>
          </details>
        ) : null}
      </section>
      <aside className="game-sidebar grid content-start gap-6 sm:grid-cols-2 lg:sticky lg:top-8 lg:grid-cols-1">
        <div><h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Players</h2><PlayerList players={room.players} currentTurnPlayerId={room.currentTurnPlayerId} currentPlayerId={currentPlayerId} roomStatus={room.status} canManage={isHost} onKick={onKick} onEliminate={onEliminate} onTransferHost={onTransferHost} /></div>
        <div><h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Scoreboard</h2><Scoreboard players={room.players} /></div>
      </aside>

      {confirmLeave ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-cinema-panel p-5 shadow-xl">
            <h2 id="leave-title" className="text-xl font-black">Leave game?</h2>
            <p className="mt-2 text-slate-300">Are you sure you want to leave? If you leave during a round, you will be eliminated.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-md border border-white/10 px-4 py-3">Stay</button>
              <button type="button" onClick={onLeave} className="rounded-md bg-cinema-rose px-4 py-3 font-bold text-white">Leave Game</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
