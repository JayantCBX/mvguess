import { useCallback, useEffect, useState } from "react";
import { HowToPlayModal } from "../components/HowToPlayModal";
import { HintSetupScreen } from "../components/HintSetupScreen";
import { Toast } from "../components/Toast";
import {
  createInitialRoom,
  createLocalPlayer,
  eliminatePlayerFromRound,
  kickPlayer,
  leaveRoom as leaveLocalRoom,
  returnToLobby,
  skipTurn,
  startRound,
  submitFullMovieGuess,
  submitLetterGuess,
  transferHost
} from "../lib/game/engine";
import { applyHintPositions } from "../lib/game/hints";
import { getRevealedLetters } from "../lib/game/masking";
import { getNextMovieGiver } from "../lib/game/turns";
import { isNetlifyBackendConfigured } from "../lib/netlify/client";
import {
  beginOnlineRoundSetup as beginNetlifyRoundSetup,
  cancelOnlineRoundSetup as cancelNetlifyRoundSetup,
  eliminateOnlinePlayer as eliminateNetlifyPlayer,
  kickOnlinePlayer as kickNetlifyPlayer,
  leaveOnlineRoom as leaveNetlifyRoom,
  returnOnlineRoomToLobby as returnNetlifyRoomToLobby,
  startOnlineRound as startNetlifyRound,
  submitOnlineGuess as submitNetlifyGuess,
  transferOnlineHost as transferNetlifyHost
} from "../lib/netlify/gameActions";
import {
  createOnlineRoom as createNetlifyRoom,
  fetchRoomByCode as fetchNetlifyRoomByCode,
  joinOnlineRoom as joinNetlifyRoom,
  updateOnlineRoomSettings as updateNetlifyRoomSettings
} from "../lib/netlify/rooms";
import { isSupabaseConfigured } from "../lib/supabase/client";
import {
  beginOnlineRoundSetup as beginSupabaseRoundSetup,
  cancelOnlineRoundSetup as cancelSupabaseRoundSetup,
  eliminateOnlinePlayer as eliminateSupabasePlayer,
  kickOnlinePlayer as kickSupabasePlayer,
  leaveOnlineRoom as leaveSupabaseRoom,
  returnOnlineRoomToLobby as returnSupabaseRoomToLobby,
  startOnlineRound as startSupabaseRound,
  submitOnlineGuess as submitSupabaseGuess,
  transferOnlineHost as transferSupabaseHost
} from "../lib/supabase/gameActions";
import {
  createOnlineRoom as createSupabaseRoom,
  fetchRoomByCode as fetchSupabaseRoomByCode,
  joinOnlineRoom as joinSupabaseRoom,
  updateOnlineRoomSettings as updateSupabaseRoomSettings
} from "../lib/supabase/rooms";
import { broadcastRoomEvent, subscribeRoomChannel } from "../lib/supabase/realtime";
import {
  getLocalProfile,
  getOrCreateDeviceId,
  getOrCreatePlayerId,
  getPlayerHistory,
  markRoomEliminated,
  markRoomKicked,
  markRoomLeft,
  saveLocalProfile,
  savePreviousScore,
  type PlayerHistory
} from "../lib/storage/chromeStorage";
import { CreateRoomScreen } from "../screens/CreateRoomScreen";
import { GameScreen } from "../screens/GameScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { JoinRoomScreen } from "../screens/JoinRoomScreen";
import { LobbyScreen } from "../screens/LobbyScreen";
import { ResultScreen } from "../screens/ResultScreen";
import type { Player, RoomSettings, RoomState } from "../types/game";
import type { HintSettings } from "../types/hints";
import { getRoomInviteUrl } from "../utils/invite";

type Screen = "home" | "create" | "join" | "lobby" | "setup" | "game" | "result";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isMissingSupabaseSchema(error)) {
    return "Online database is not set up yet. Run the Supabase migrations, then create a new room.";
  }
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function isMissingSupabaseSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "PGRST205" || message.includes("Could not find the table") || message.includes("schema cache");
}

export function GameApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [lastRoomCode, setLastRoomCode] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [toast, setToast] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [forceLocalMode, setForceLocalMode] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof subscribeRoomChannel>>(null);
  const onlineBackend = isNetlifyBackendConfigured ? "netlify" : isSupabaseConfigured ? "supabase" : "local";
  const usingNetlifyBackend = onlineBackend === "netlify" && !forceLocalMode;
  const usingSupabaseBackend = onlineBackend === "supabase" && !forceLocalMode;
  const onlineMode = onlineBackend !== "local" && !forceLocalMode;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const syncRoom = useCallback(
    async (code: string) => {
      if (!onlineMode) return;
      try {
        const fetched = usingNetlifyBackend ? await fetchNetlifyRoomByCode(code, playerId) : await fetchSupabaseRoomByCode(code, playerId);
        if (!fetched) return;
        const me = fetched.players.find((player) => player.id === playerId);
        if (me?.status === "kicked") {
          await markRoomKicked(code);
          setRoom(null);
          setScreen("home");
          showToast("You were removed from this room.");
          return;
        }
        setRoom(fetched);
        if (fetched.status === "lobby") setScreen("lobby");
        if (fetched.status === "setup") setScreen("setup");
        if (fetched.status === "playing") setScreen("game");
        if (fetched.status === "round_over") setScreen("result");
      } catch (error) {
        showToast(getErrorMessage(error, "Room sync failed."));
      }
    },
    [onlineMode, playerId, showToast, usingNetlifyBackend]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    getLocalProfile().then(async (profile) => {
      const [id, anonymousDeviceId, playerHistory] = await Promise.all([getOrCreatePlayerId(), getOrCreateDeviceId(), getPlayerHistory()]);
      setPlayerId(id);
      setDeviceId(anonymousDeviceId);
      setHistory(playerHistory);
      setPlayerName(profile.playerName);
      setLastRoomCode(profile.lastRoomCode);
      if (params.get("help")) setHelpOpen(true);
      if (params.get("action") === "create") setScreen("create");
      if (params.get("action") === "join") setScreen("join");
      const roomCode = params.get("room") ?? (location.protocol === "chrome-extension:" ? profile.lastRoomCode : "");
      if (roomCode) {
        setLastRoomCode(roomCode);
        setScreen("join");
        if (onlineMode && profile.playerName) {
          try {
            const resumed = usingNetlifyBackend
              ? await joinNetlifyRoom(roomCode, id, profile.playerName, anonymousDeviceId)
              : await joinSupabaseRoom(roomCode, id, profile.playerName, anonymousDeviceId);
            setPlayerId(resumed.playerId);
            setRoom(resumed.room);
            await saveLocalProfile({ playerId: resumed.playerId, lastRoomCode: roomCode });
            setScreen(resumed.room.status === "playing" ? "game" : resumed.room.status === "round_over" ? "result" : resumed.room.status === "setup" ? "setup" : "lobby");
          } catch (error) {
            showToast(getErrorMessage(error, "Could not restore the room."));
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!room || !usingSupabaseBackend) return;
    channel?.unsubscribe();
    const nextChannel = subscribeRoomChannel(room.code, () => undefined, () => syncRoom(room.code));
    setChannel(nextChannel);
    return () => {
      nextChannel?.unsubscribe();
    };
  }, [room?.code, syncRoom, usingSupabaseBackend]);

  useEffect(() => {
    if (!room || !usingNetlifyBackend) return;
    const interval = window.setInterval(() => syncRoom(room.code), 1000);
    return () => window.clearInterval(interval);
  }, [room?.code, syncRoom, usingNetlifyBackend]);

  const createRoom = async (name: string, settings: RoomSettings) => {
    try {
      const id = playerId || (await getOrCreatePlayerId());
      setPlayerId(id);
      setPlayerName(name);
      await saveLocalProfile({ playerId: id, playerName: name, settings });
      const anonymousDeviceId = deviceId || (await getOrCreateDeviceId());
      setDeviceId(anonymousDeviceId);
      const onlineResult = usingNetlifyBackend ? await createNetlifyRoom(id, name, settings, anonymousDeviceId) : usingSupabaseBackend ? await createSupabaseRoom(id, name, settings, anonymousDeviceId) : null;
      const nextRoom = onlineResult?.room ?? createInitialRoom(createLocalPlayer(name, true, anonymousDeviceId), settings);
      const effectivePlayerId = onlineResult?.playerId ?? id;
      if (effectivePlayerId !== id) {
        setPlayerId(effectivePlayerId);
        await saveLocalProfile({ playerId: effectivePlayerId });
      }
      if (!onlineResult) {
        nextRoom.players[0].id = effectivePlayerId;
        nextRoom.hostPlayerId = effectivePlayerId;
      }
      setRoom(nextRoom);
      setLastRoomCode(nextRoom.code);
      await saveLocalProfile({ lastRoomCode: nextRoom.code });
      if (onlineResult) setForceLocalMode(false);
      setScreen("lobby");
    } catch (error) {
      if (onlineMode && isMissingSupabaseSchema(error)) {
        const fallbackPlayerId = playerId || (await getOrCreatePlayerId());
        const host = createLocalPlayer(name, true, deviceId || (await getOrCreateDeviceId()));
        host.id = fallbackPlayerId;
        const nextRoom = createInitialRoom(host, settings);
        setPlayerId(fallbackPlayerId);
        setPlayerName(name);
        setForceLocalMode(true);
        setRoom(nextRoom);
        setLastRoomCode(nextRoom.code);
        await saveLocalProfile({ playerId: fallbackPlayerId, playerName: name, settings, lastRoomCode: nextRoom.code });
        setScreen("lobby");
        showToast("Supabase tables are missing. Created a local room; run migrations for multiplayer.");
        return;
      }
      showToast(getErrorMessage(error, "Could not create room."));
    }
  };

  const joinRoom = async (name: string, code: string) => {
    try {
      if (!onlineMode) {
        showToast("Supabase env vars are required to join from another tab.");
        return;
      }
      const id = playerId || (await getOrCreatePlayerId());
      const anonymousDeviceId = deviceId || (await getOrCreateDeviceId());
      setDeviceId(anonymousDeviceId);
      const { room: nextRoom, playerId: effectivePlayerId } = usingNetlifyBackend ? await joinNetlifyRoom(code, id, name, anonymousDeviceId) : await joinSupabaseRoom(code, id, name, anonymousDeviceId);
      setPlayerId(effectivePlayerId);
      setPlayerName(name);
      setRoom(nextRoom);
      setLastRoomCode(code);
      await saveLocalProfile({ playerId: effectivePlayerId, playerName: name, lastRoomCode: code });
      if (usingSupabaseBackend) await broadcastRoomEvent(channel, "player_joined", { playerId: effectivePlayerId });
      setForceLocalMode(false);
      setScreen(nextRoom.status === "playing" ? "game" : "lobby");
    } catch (error) {
      showToast(getErrorMessage(error, "Could not join room."));
    }
  };

  const updateSettings = async (settings: RoomSettings) => {
    if (!room) return;
    const nextRoom = { ...room, settings, lifeRemaining: settings.lifeWord.length };
    setRoom(nextRoom);
    await saveLocalProfile({ settings });
    if (onlineMode) {
      try {
        if (usingNetlifyBackend) await updateNetlifyRoomSettings(room, playerId, settings);
        else {
          await updateSupabaseRoomSettings(room, settings);
          await broadcastRoomEvent(channel, "settings_updated", settings);
        }
        await syncRoom(room.code);
      } catch (error) {
        showToast(getErrorMessage(error, "Could not update settings."));
      }
    }
  };

  const addLocalPlayer = () => {
    if (!room || onlineMode || room.players.filter((player) => player.isOnline && (player.status ?? "active") === "active").length >= room.settings.maxPlayers) return;
    const now = new Date().toISOString();
    const player: Player = {
      id: crypto.randomUUID(),
      name: `Player ${room.players.length + 1}`,
      score: 0,
      isHost: false,
      isOnline: true,
      joinedAt: now,
      lastSeenAt: now
    };
    setRoom({ ...room, players: [...room.players, player] });
  };

  const beginSetup = async (selectedMovieGiverId?: string) => {
    if (!room) return;
    if (room.players.filter((player) => player.isOnline && (player.status ?? "active") === "active").length < 2) {
      showToast(onlineMode ? "Minimum 2 players required." : "Add a local test player first.");
      return;
    }
    try {
      if (onlineMode) {
        if (usingNetlifyBackend) await beginNetlifyRoundSetup({ room, playerId, movieGiverPlayerId: selectedMovieGiverId });
        else {
          await beginSupabaseRoundSetup({ room, playerId });
          await broadcastRoomEvent(channel, "round_hint_locked", { roomCode: room.code });
        }
        await syncRoom(room.code);
        return;
      }

      const players = room.players.map((player) => player.status === "eliminated" && player.isOnline ? { ...player, status: "active" as const } : player);
      const movieGiverId = selectedMovieGiverId && players.some((player) => player.id === selectedMovieGiverId) ? selectedMovieGiverId : getNextMovieGiver(players, room.round?.movieGiverPlayerId, room.hostPlayerId);
      const nextRoom = { ...room, players, status: "setup" as const, currentTurnPlayerId: movieGiverId, updatedAt: new Date().toISOString() };
      setRoom(nextRoom);
      setScreen("setup");
    } catch (error) {
      showToast(getErrorMessage(error, "Could not begin setup."));
    }
  };

  const cancelSetup = async () => {
    if (!room) return;
    try {
      if (onlineMode) {
        if (usingNetlifyBackend) await cancelNetlifyRoundSetup({ room, playerId });
        else {
          await cancelSupabaseRoundSetup({ room, playerId });
          await broadcastRoomEvent(channel, "round_restarted", { roomCode: room.code });
        }
        await syncRoom(room.code);
        return;
      }
      const status: RoomState["status"] = room.round ? "round_over" : "lobby";
      setRoom({ ...room, status, currentTurnPlayerId: null, updatedAt: new Date().toISOString() });
      setScreen(status === "round_over" ? "result" : "lobby");
    } catch (error) {
      showToast(getErrorMessage(error, "Could not cancel setup."));
    }
  };

  const startWithHints = async (movieTitle: string, positions: number[], settings: HintSettings) => {
    if (!room) return;
    try {
      if (onlineMode) {
        const maskedMovie = applyHintPositions(movieTitle, positions, settings);
        const startArgs = {
          room,
          playerId,
          movieTitle,
          maskedMovie,
          hintMode: settings.hintMode,
          hintPositions: positions,
          hintLetters: getRevealedLetters(movieTitle, positions),
          hintSettings: settings
        };
        if (usingNetlifyBackend) await startNetlifyRound(startArgs);
        else {
          await startSupabaseRound(startArgs);
          await broadcastRoomEvent(channel, "game_started", { roomCode: room.code });
        }
        await syncRoom(room.code);
        return;
      }

      const nextRoom = startRound(room, { title: movieTitle }, positions, settings, room.currentTurnPlayerId);
      setRoom(nextRoom);
      setScreen("game");
    } catch (error) {
      showToast(getErrorMessage(error, "Could not start round."));
    }
  };

  const applyRoomResult = (nextRoom: RoomState, message?: string) => {
    setRoom(nextRoom);
    if (message) showToast(message);
    if (nextRoom.status === "round_over") setScreen("result");
  };

  const handleLetterGuess = useCallback(
    async (letter: string) => {
      if (!room) return;
      try {
        if (onlineMode) {
          if (usingNetlifyBackend) await submitNetlifyGuess({ roomCode: room.code, playerId, guessType: "letter", guessValue: letter });
          else {
            await submitSupabaseGuess({ roomCode: room.code, playerId, guessType: "letter", guessValue: letter });
            await broadcastRoomEvent(channel, "guess_submitted", { playerId, guessType: "letter" });
          }
          await syncRoom(room.code);
          return;
        }
        const actorId = room.currentTurnPlayerId ?? playerId;
        const result = submitLetterGuess(room, actorId, letter);
        applyRoomResult(result.room, result.message);
      } catch (error) {
        showToast(getErrorMessage(error, "Guess failed."));
      }
    },
    [channel, onlineMode, playerId, room, showToast, syncRoom, usingNetlifyBackend]
  );

  const handleFullGuess = async (guess: string) => {
    if (!room) return;
    try {
      if (onlineMode) {
        if (usingNetlifyBackend) await submitNetlifyGuess({ roomCode: room.code, playerId, guessType: "full_movie", guessValue: guess });
        else {
          await submitSupabaseGuess({ roomCode: room.code, playerId, guessType: "full_movie", guessValue: guess });
          await broadcastRoomEvent(channel, "guess_submitted", { playerId, guessType: "full_movie" });
        }
        await syncRoom(room.code);
        return;
      }
      const actorId = room.currentTurnPlayerId ?? playerId;
      const result = submitFullMovieGuess(room, actorId, guess);
      applyRoomResult(result.room, result.message);
    } catch (error) {
      showToast(getErrorMessage(error, "Full movie guess failed."));
    }
  };

  const handleSkip = useCallback(async () => {
    if (!room) return;
    try {
      if (onlineMode) {
        if (usingNetlifyBackend) await submitNetlifyGuess({ roomCode: room.code, playerId, guessType: "skip" });
        else {
          await submitSupabaseGuess({ roomCode: room.code, playerId, guessType: "skip" });
          await broadcastRoomEvent(channel, "timer_expired", { playerId });
        }
        await syncRoom(room.code);
        return;
      }
      applyRoomResult(skipTurn(room), "Turn skipped.");
    } catch (error) {
      showToast(getErrorMessage(error, "Skip failed."));
    }
  }, [channel, onlineMode, playerId, room, showToast, syncRoom, usingNetlifyBackend]);

  const copyInvite = async () => {
    if (!room) return;
    const invite = getRoomInviteUrl(room.code);
    await navigator.clipboard?.writeText(invite);
    showToast("Invite copied.");
  };

  const leave = async () => {
    if (!room) return;
    try {
      const wasPlaying = room.status === "playing";
      if (usingNetlifyBackend) await leaveNetlifyRoom({ roomCode: room.code, playerId });
      else if (usingSupabaseBackend) await leaveSupabaseRoom({ room, playerId });
      else setRoom(leaveLocalRoom(room, playerId));
      const score = room.players.find((player) => player.id === playerId)?.score ?? 0;
      await savePreviousScore(room.code, score);
      if (wasPlaying) await markRoomEliminated(room.code);
      else await markRoomLeft(room.code);
      setHistory(await getPlayerHistory());
      setRoom(null);
      setScreen("home");
    } catch (error) {
      showToast(getErrorMessage(error, "Could not leave room."));
    }
  };

  const managePlayer = async (action: "kick" | "eliminate" | "transfer", targetPlayerId: string) => {
    if (!room) return;
    try {
      if (usingNetlifyBackend) {
        const args = { roomCode: room.code, playerId, targetPlayerId };
        if (action === "kick") await kickNetlifyPlayer(args);
        else if (action === "eliminate") await eliminateNetlifyPlayer(args);
        else await transferNetlifyHost(args);
      } else if (usingSupabaseBackend) {
        const args = { room, playerId, targetPlayerId };
        if (action === "kick") await kickSupabasePlayer(args);
        else if (action === "eliminate") await eliminateSupabasePlayer(args);
        else await transferSupabaseHost(args);
      } else {
        const nextRoom = action === "kick" ? kickPlayer(room, playerId, targetPlayerId) : action === "eliminate" ? eliminatePlayerFromRound(room, targetPlayerId) : transferHost(room, playerId, targetPlayerId);
        setRoom(nextRoom);
      }
      if (onlineMode) await syncRoom(room.code);
      showToast(action === "kick" ? "Player removed." : action === "eliminate" ? "Player eliminated." : "Host transferred.");
    } catch (error) {
      showToast(getErrorMessage(error, "Player action failed."));
    }
  };

  const handleReturnToLobby = async () => {
    if (!room) return;
    try {
      if (usingNetlifyBackend) await returnNetlifyRoomToLobby({ roomCode: room.code, playerId });
      else if (usingSupabaseBackend) await returnSupabaseRoomToLobby({ room, playerId });
      else setRoom(returnToLobby(room, playerId));
      if (onlineMode) await syncRoom(room.code);
      else setScreen("lobby");
    } catch (error) {
      showToast(getErrorMessage(error, "Waiting for host or next movie giver."));
    }
  };

  let content;
  if (screen === "create") content = <CreateRoomScreen defaultName={playerName} onCreate={createRoom} onBack={() => setScreen("home")} />;
  else if (screen === "join") content = <JoinRoomScreen defaultName={playerName} defaultRoomCode={lastRoomCode} onJoin={joinRoom} onBack={() => setScreen("home")} />;
  else if (screen === "lobby" && room)
    content = (
      <>
        <LobbyScreen
          room={room}
          currentPlayerId={playerId}
          supabaseConfigured={onlineMode}
          onSettingsChange={updateSettings}
          onSetup={beginSetup}
          onCopyInvite={copyInvite}
          onLeave={leave}
          onKick={(target) => managePlayer("kick", target)}
          onTransferHost={(target) => managePlayer("transfer", target)}
        />
        {!onlineMode ? (
          <button type="button" onClick={addLocalPlayer} className="fixed bottom-5 right-5 rounded-md bg-cinema-teal px-4 py-3 font-bold text-cinema-ink">
            Add local player
          </button>
        ) : null}
      </>
    );
  else if (screen === "setup" && room) {
    const movieGiver = room.players.find((player) => player.id === room.currentTurnPlayerId);
    const canSetup = room.currentTurnPlayerId === playerId || room.hostPlayerId === playerId || !onlineMode;
    content = (
      <HintSetupScreen
        difficulty={room.settings.difficulty}
        canSetup={canSetup}
        movieGiverName={movieGiver?.name}
        players={room.players}
        currentPlayerId={playerId}
        canManagePlayers={room.hostPlayerId === playerId}
        onKick={(target) => managePlayer("kick", target)}
        onTransferHost={(target) => managePlayer("transfer", target)}
        onStart={startWithHints}
        onCancel={canSetup ? cancelSetup : () => setScreen(room.round ? "result" : "lobby")}
      />
    );
  }
  else if (screen === "game" && room)
    content = (
      <GameScreen
        room={room}
        currentPlayerId={onlineMode ? playerId : room.currentTurnPlayerId ?? playerId}
        onLetterGuess={handleLetterGuess}
        onFullGuess={handleFullGuess}
        onSkip={handleSkip}
        onLeave={leave}
        onKick={(target) => managePlayer("kick", target)}
        onEliminate={(target) => managePlayer("eliminate", target)}
        onTransferHost={(target) => managePlayer("transfer", target)}
      />
    );
  else if (screen === "result" && room) content = <ResultScreen room={room} currentPlayerId={playerId} localMode={!onlineMode} onNextRound={beginSetup} onLobby={handleReturnToLobby} />;
  else content = <HomeScreen lastRoomCode={lastRoomCode} room={room} history={history} supabaseConfigured={onlineMode} onCreate={() => setScreen("create")} onJoin={() => setScreen("join")} onLastRoom={() => lastRoomCode && setScreen("join")} onHowToPlay={() => setHelpOpen(true)} />;

  return (
    <>
      {content}
      <HowToPlayModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toast message={toast} />
    </>
  );
}
