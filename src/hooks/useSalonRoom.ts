"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientMessage, GuessEntry, GameMode, RoomSnapshot, ServerMessage } from "../game/types";
import { createRoomCode, sanitizeRoomCode } from "../game/engine";

type ConnectionStatus = "connecting" | "online" | "offline";

type Notice = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

type AdminArticle = {
  title: string;
  url?: string;
};

const EMPTY_OUTCOME: RoomSnapshot["outcome"] = {
  hasWon: false,
  winnerCount: 0,
  revealAvailable: false
};
const PLAYER_ID_STORAGE_KEY = "salon-maestro-player-id";

export function useSalonRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("Camille");
  const [state, setState] = useState<RoomSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [lastResult, setLastResult] = useState<GuessEntry | null>(null);
  const [revealedTitle, setRevealedTitle] = useState("");
  const [adminArticle, setAdminArticle] = useState<AdminArticle | null>(null);
  const [pageBaseUrl, setPageBaseUrl] = useState("");
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingModeRef = useRef<GameMode | null>(null);
  const pendingTitleRevealRef = useRef<"fill" | "admin">("fill");

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");
    setPlayerId(getOrCreatePlayerId());
    setPageBaseUrl(`${window.location.origin}${window.location.pathname}`);
    if (urlRoom) setRoomCode(sanitizeRoomCode(urlRoom));
  }, []);

  useEffect(() => {
    if (!playerId || !roomCode) return;
    const socket = new WebSocket(buildSocketUrl(roomCode));
    socketRef.current = socket;
    setStatus("connecting");

    socket.addEventListener("open", () => {
      setStatus("online");
      sendRaw(socket, {
        type: "join",
        playerId,
        playerName
      });
      if (pendingModeRef.current) {
        sendRaw(socket, {
          type: "setMode",
          playerId,
          mode: pendingModeRef.current
        });
        pendingModeRef.current = null;
      }
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (message.type === "state") {
        setState({
          ...message.state,
          outcome: message.state.outcome ?? EMPTY_OUTCOME
        });
      }
      if (message.type === "notice") {
        pushNotice(message.level, message.message);
      }
      if (message.type === "guessResult") {
        setLastResult(message.result);
      }
      if (message.type === "revealTitle") {
        if (pendingTitleRevealRef.current === "admin") {
          setAdminArticle({ title: message.title, url: message.url });
        } else {
          setRevealedTitle(message.title);
        }
        pendingTitleRevealRef.current = "fill";
      }
    });

    socket.addEventListener("close", () => {
      setStatus("offline");
    });
    socket.addEventListener("error", () => {
      setStatus("offline");
    });

    const ping = window.setInterval(() => {
      send({ type: "ping", playerId });
    }, 20_000);

    return () => {
      window.clearInterval(ping);
      socket.close();
    };
  }, [playerId, roomCode, playerName]);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    sendRaw(socket, message);
    return true;
  }, []);

  const submitGuess = useCallback(
    (word: string) => {
      if (!playerId) return false;
      return send({ type: "guess", playerId, word });
    },
    [playerId, send]
  );

  const changeMode = useCallback(
    (mode: GameMode) => {
      if (!playerId) return false;
      return send({ type: "setMode", playerId, mode });
    },
    [playerId, send]
  );

  const resetArticle = useCallback(() => {
    if (!playerId) return false;
    setRevealedTitle("");
    setAdminArticle(null);
    setLastResult(null);
    return send({ type: "reset", playerId });
  }, [playerId, send]);

  const requestRevealTitle = useCallback(() => {
    if (!playerId) return false;
    pendingTitleRevealRef.current = "fill";
    return send({ type: "revealTitle", playerId });
  }, [playerId, send]);

  const requestAdminTitle = useCallback(
    (adminPassword: string) => {
      if (!playerId) return false;
      pendingTitleRevealRef.current = "admin";
      return send({ type: "revealTitle", playerId, adminPassword });
    },
    [playerId, send]
  );

  const joinRoom = useCallback((code: string) => {
    const sanitized = sanitizeRoomCode(code);
    pendingModeRef.current = null;
    setState(null);
    setLastResult(null);
    setRevealedTitle("");
    setAdminArticle(null);
    setRoomCode(sanitized);
    updateRoomUrl(sanitized);
  }, []);

  const createRoom = useCallback(() => {
    const code = createRoomCode();
    pendingModeRef.current = "coop";
    setState(null);
    setLastResult(null);
    setRevealedTitle("");
    setAdminArticle(null);
    setRoomCode(code);
    updateRoomUrl(code);
  }, []);

  const playSolo = useCallback(() => {
    const code = createRoomCode();
    pendingModeRef.current = "solo";
    setState(null);
    setLastResult(null);
    setRevealedTitle("");
    setAdminArticle(null);
    setRoomCode(code);
    updateRoomUrl(code);
  }, []);

  const clearAdminTitle = useCallback(() => {
    setAdminArticle(null);
  }, []);

  const updatePlayerName = useCallback((name: string) => {
    const cleaned = name.slice(0, 18);
    setPlayerName(cleaned);
  }, []);

  const inviteUrl = useMemo(() => {
    if (!pageBaseUrl) return "";
    return `${pageBaseUrl}?room=${state?.room.code ?? roomCode}`;
  }, [pageBaseUrl, roomCode, state?.room.code]);

  const copyInvite = useCallback(async () => {
    await navigator.clipboard.writeText(inviteUrl);
    pushNotice("success", "Lien d'invitation copie.");
  }, [inviteUrl]);

  function pushNotice(level: Notice["level"], message: string) {
    const notice = { id: crypto.randomUUID(), level, message };
    setNotices((current) => [notice, ...current].slice(0, 4));
    window.setTimeout(() => {
      setNotices((current) => current.filter((entry) => entry.id !== notice.id));
    }, 4_000);
  }

  return {
    state,
    status,
    roomCode,
    hasStarted: Boolean(roomCode),
    playerId,
    playerName,
    notices,
    lastResult,
    revealedTitle,
    adminArticle,
    inviteUrl,
    mounted,
    submitGuess,
    changeMode,
    resetArticle,
    requestRevealTitle,
    requestAdminTitle,
    clearAdminTitle,
    joinRoom,
    createRoom,
    playSolo,
    updatePlayerName,
    copyInvite
  };
}

function sendRaw(socket: WebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

function buildSocketUrl(roomCode: string) {
  if (typeof window === "undefined") return "";
  const code = sanitizeRoomCode(roomCode);
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocal && window.location.port === "3000") {
    return `ws://localhost:8787/api/rooms/${code}/ws`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/rooms/${code}/ws`;
}

function updateRoomUrl(code: string) {
  const next = `${window.location.pathname}?room=${code}`;
  window.history.replaceState(null, "", next);
}

function getOrCreatePlayerId() {
  const generated = crypto.randomUUID();

  try {
    const stored = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY)?.trim();
    if (stored && /^[A-Za-z0-9-]{8,80}$/.test(stored)) return stored;
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, generated);
  } catch {
    // Some browsers can block localStorage; the in-memory id still keeps the session playable.
  }

  return generated;
}
