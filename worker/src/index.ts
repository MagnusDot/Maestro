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
} from "../../src/game/engine";
import { createJeuxDeMotsSynonymResolver } from "../../src/game/synonyms";
import type { ClientMessage, GuessEntry, RoomState, ServerMessage } from "../../src/game/types";
import { fallbackArticle, fetchRandomWikipediaArticle } from "../../src/game/wiki";

const ADMIN_PASSWORD = "alois";

export type Env = {
  ROOMS: DurableObjectNamespace;
};

type Session = {
  socket: WebSocket;
  playerId?: string;
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/\/api\/rooms\/([^/]+)(?:\/ws)?$/);
    if (!match) {
      return new Response("Salon Maestro room worker", { status: 200 });
    }

    const roomCode = sanitizeRoomCode(match[1]);
    const id = env.ROOMS.idFromName(roomCode);
    const stub = env.ROOMS.get(id);
    return stub.fetch(request);
  }
};

export class PedantixRoom {
  private sessions = new Set<Session>();
  private readonly synonymResolver = createJeuxDeMotsSynonymResolver(fetch);

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request) {
    const url = new URL(request.url);
    const code = sanitizeRoomCode(url.pathname.match(/\/api\/rooms\/([^/]+)/)?.[1] ?? "SMROOM");

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      const roomState = await this.loadState(code);
      return Response.json(createSnapshot(roomState));
    }

    const roomState = await this.loadState(code);
    if (roomState.articleStatus === "loading" || roomState.articleStatus === "fallback") {
      await this.loadFreshArticle(roomState);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const session: Session = { socket: server };

    server.accept();
    this.sessions.add(session);
    this.send(session.socket, { type: "state", state: createSnapshot(await this.loadState(code)) });

    server.addEventListener("message", (event) => {
      void this.handleMessage(session, String(event.data), code);
    });
    server.addEventListener("close", () => {
      void this.closeSession(session, code);
    });
    server.addEventListener("error", () => {
      void this.closeSession(session, code);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(session: Session, data: string, code: string) {
    let message: ClientMessage;
    try {
      message = JSON.parse(data) as ClientMessage;
    } catch {
      this.send(session.socket, { type: "notice", level: "error", message: "Message temps reel invalide." });
      return;
    }

    const roomState = await this.loadState(code);
    const timestamp = Date.now();

    if (message.type === "join") {
      session.playerId = message.playerId;
      joinPlayer(roomState, message.playerId, message.playerName, timestamp);
      await this.save(roomState);
      this.broadcastState(roomState);
      return;
    }

    if (message.type === "ping") {
      touchPlayer(roomState, message.playerId, timestamp);
      await this.save(roomState);
      this.broadcastState(roomState);
      return;
    }

    if (message.type === "guess") {
      if (isAdminCommand(message.word)) {
        const article = getArticle(roomState.articleId, roomState.article);
        this.send(session.socket, { type: "revealTitle", title: article.title, url: article.url });
        return;
      }

      const result = await submitGuess(roomState, message.playerId, message.word, timestamp, {
        synonymResolver: this.synonymResolver
      });
      await this.save(roomState);
      this.broadcastGuessResult(roomState, result);
      if (result.kind === "solved") {
        this.broadcast({
          type: "notice",
          level: "success",
          message: `${result.playerName} a trouve le titre.`
        });
      }
      this.broadcastState(roomState);
      return;
    }

    if (message.type === "revealTitle") {
      const canReveal = Object.keys(roomState.winners ?? {}).length > 0 || isAdminPassword(message.adminPassword);
      if (!canReveal) {
        this.send(session.socket, {
          type: "notice",
          level: "warning",
          message: "Le titre n'est pas encore revelable."
        });
        return;
      }
      const article = getArticle(roomState.articleId, roomState.article);
      this.send(session.socket, { type: "revealTitle", title: article.title, url: article.url });
      return;
    }

    if (message.type === "setMode") {
      const changed = setRoomMode(roomState, message.mode, message.playerId);
      await this.save(roomState);
      this.broadcast({
        type: "notice",
        level: changed ? "success" : "warning",
        message: changed ? "Mode de jeu mis a jour." : "Seul le capitaine peut changer le mode."
      });
      this.broadcastState(roomState);
      return;
    }

    if (message.type === "reset") {
      const changed = resetRoom(roomState, message.playerId, timestamp);
      if (!changed) {
        this.send(session.socket, {
          type: "notice",
          level: "warning",
          message: "Seul le capitaine peut lancer un nouvel article."
        });
        return;
      }
      markArticleLoading(roomState);
      await this.save(roomState);
      this.broadcastState(roomState);
      await this.loadFreshArticle(roomState);
      this.broadcastState(roomState);
    }
  }

  private async closeSession(session: Session, code: string) {
    this.sessions.delete(session);
    if (!session.playerId) return;
    const roomState = await this.loadState(code);
    leavePlayer(roomState, session.playerId);
    await this.save(roomState);
    this.broadcastState(roomState);
  }

  private async loadState(code: string) {
    const stored = await this.state.storage.get<RoomState>("room");
    if (stored) return stored;
    const created = createRoomState(code);
    markArticleLoading(created);
    await this.save(created);
    return created;
  }

  private async loadFreshArticle(roomState: RoomState) {
    try {
      const article = await fetchRandomWikipediaArticle(fetch);
      installArticle(roomState, article);
    } catch {
      installArticle(roomState, fallbackArticle());
    }
    await this.save(roomState);
  }

  private async save(roomState: RoomState) {
    await this.state.storage.put("room", roomState);
  }

  private broadcastState(roomState: RoomState) {
    for (const session of this.sessions) {
      this.send(session.socket, {
        type: "state",
        state: createRoomSnapshot(roomState, Date.now(), session.playerId)
      });
    }
  }

  private broadcastGuessResult(roomState: RoomState, result: GuessEntry) {
    for (const session of this.sessions) {
      const canSeeAnswer = result.kind !== "solved" || result.playerId === session.playerId || Boolean(session.playerId && roomState.winners?.[session.playerId]);
      this.send(session.socket, {
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

  private broadcast(message: ServerMessage) {
    for (const session of this.sessions) {
      this.send(session.socket, message);
    }
  }

  private send(socket: WebSocket, message: ServerMessage) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The close event will clean the dead session.
    }
  }
}

function isAdminCommand(value: string) {
  const [prefix, password = ""] = value.trim().split(":");
  return prefix.toLowerCase() === "mdp" && isAdminPassword(password);
}

function isAdminPassword(value?: string) {
  return value?.trim().toLowerCase() === ADMIN_PASSWORD;
}
