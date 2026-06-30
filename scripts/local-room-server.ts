import { WebSocketServer, WebSocket } from "ws";
import {
  createRoomState,
  createRoomSnapshot,
  createSnapshot,
  getArticle,
  installArticle,
  joinPlayer,
  leavePlayer,
  markArticleLoading,
  resetRoom,
  sanitizeRoomCode,
  setRoomMode,
  submitGuess,
  touchPlayer
} from "../src/game/engine";
import { createJeuxDeMotsSynonymResolver } from "../src/game/synonyms";
import type { ClientMessage, GuessEntry, RoomState, ServerMessage } from "../src/game/types";
import { fallbackArticle, fetchRandomWikipediaArticle } from "../src/game/wiki";

type Session = {
  roomCode: string;
  socket: WebSocket;
  playerId?: string;
};

const PORT = 8787;
const ADMIN_PASSWORD = "alois";
const rooms = new Map<string, RoomState>();
const sessions = new Set<Session>();
const server = new WebSocketServer({ port: PORT });
const synonymResolver = createJeuxDeMotsSynonymResolver(fetch);

server.on("connection", async (socket, request) => {
  const code = sanitizeRoomCode(extractRoomCode(request.url ?? ""));
  const room = loadRoomShell(code);
  const session: Session = { roomCode: code, socket };
  sessions.add(session);
  send(socket, { type: "state", state: createSnapshot(room) });

  socket.on("message", (raw) => {
    void handleMessage(session, String(raw));
  });
  socket.on("close", () => closeSession(session));
  socket.on("error", () => closeSession(session));

  if (room.articleStatus === "loading") {
    await loadFreshArticle(room);
    broadcastState(code, room);
  }
});

setInterval(() => {
  for (const [code, room] of rooms) {
    broadcastState(code, room);
  }
}, 15_000);

console.log(`Salon Maestro room server listening on ws://localhost:${PORT}/api/rooms/SMROOM/ws`);

async function handleMessage(session: Session, data: string) {
  let message: ClientMessage;
  try {
    message = JSON.parse(data) as ClientMessage;
  } catch {
    send(session.socket, { type: "notice", level: "error", message: "Message temps reel invalide." });
    return;
  }

  const room = loadRoomShell(session.roomCode);
  const timestamp = Date.now();

  if (message.type === "join") {
    session.playerId = message.playerId;
    joinPlayer(room, message.playerId, message.playerName, timestamp);
    broadcastState(session.roomCode, room);
    return;
  }

  if (message.type === "ping") {
    touchPlayer(room, message.playerId, timestamp);
    broadcastState(session.roomCode, room);
    return;
  }

  if (message.type === "guess") {
    if (isAdminCommand(message.word)) {
      const article = getArticle(room.articleId, room.article);
      send(session.socket, { type: "revealTitle", title: article.title, url: article.url });
      return;
    }

    const result = await submitGuess(room, message.playerId, message.word, timestamp, {
      synonymResolver
    });
    broadcastGuessResult(session.roomCode, room, result);
    if (result.kind === "solved") {
      broadcast(session.roomCode, {
        type: "notice",
        level: "success",
        message: `${result.playerName} a trouve le titre.`
      });
    }
    broadcastState(session.roomCode, room);
    return;
  }

  if (message.type === "revealTitle") {
    const canReveal = Object.keys(room.winners ?? {}).length > 0 || isAdminPassword(message.adminPassword);
    if (!canReveal) {
      send(session.socket, {
        type: "notice",
        level: "warning",
        message: "Le titre n'est pas encore revelable."
      });
      return;
    }
    const article = getArticle(room.articleId, room.article);
    send(session.socket, { type: "revealTitle", title: article.title, url: article.url });
    return;
  }

  if (message.type === "setMode") {
    const changed = setRoomMode(room, message.mode, message.playerId);
    broadcast(session.roomCode, {
      type: "notice",
      level: changed ? "success" : "warning",
      message: changed ? "Mode de jeu mis a jour." : "Seul le capitaine peut changer le mode."
    });
    broadcastState(session.roomCode, room);
    return;
  }

  if (message.type === "reset") {
    const changed = resetRoom(room, message.playerId, timestamp);
    if (!changed) {
      send(session.socket, {
        type: "notice",
        level: "warning",
        message: "Seul le capitaine peut lancer un nouvel article."
      });
      return;
    }
    markArticleLoading(room);
    broadcastState(session.roomCode, room);
    await loadFreshArticle(room);
    broadcastState(session.roomCode, room);
  }
}

function closeSession(session: Session) {
  sessions.delete(session);
  const room = rooms.get(session.roomCode);
  if (!room || !session.playerId) return;
  leavePlayer(room, session.playerId);
  broadcastState(session.roomCode, room);
}

function loadRoomShell(code: string) {
  const known = rooms.get(code);
  if (known) return known;
  const room = createRoomState(code);
  markArticleLoading(room);
  rooms.set(code, room);
  return room;
}

async function loadFreshArticle(room: RoomState) {
  try {
    const article = await fetchRandomWikipediaArticle(fetch);
    installArticle(room, article);
  } catch {
    installArticle(room, fallbackArticle());
  }
}

function isAdminCommand(value: string) {
  const [prefix, password = ""] = value.trim().split(":");
  return prefix.toLowerCase() === "pass" && isAdminPassword(password);
}

function isAdminPassword(value?: string) {
  return value?.trim().toLowerCase() === ADMIN_PASSWORD;
}

function broadcastState(code: string, room: RoomState) {
  for (const session of sessions) {
    if (session.roomCode !== code) continue;
    send(session.socket, {
      type: "state",
      state: createRoomSnapshot(room, Date.now(), session.playerId)
    });
  }
}

function broadcast(code: string, message: ServerMessage) {
  for (const session of sessions) {
    if (session.roomCode !== code) continue;
    send(session.socket, message);
  }
}

function broadcastGuessResult(code: string, room: RoomState, result: GuessEntry) {
  for (const session of sessions) {
    if (session.roomCode !== code) continue;
    const canSeeAnswer = result.kind !== "solved" || result.playerId === session.playerId;
    send(session.socket, {
      type: "guessResult",
      result: canSeeAnswer
        ? result
        : {
            ...result,
            word: "Titre trouve",
            normalized: "titre-trouve",
            target: undefined
          }
    });
  }
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function extractRoomCode(path: string) {
  const match = path.match(/\/api\/rooms\/([^/]+)(?:\/ws)?/);
  return match?.[1] ?? "SMROOM";
}
