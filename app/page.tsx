"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  Check,
  Clock3,
  Copy,
  Crown,
  DoorOpen,
  ExternalLink,
  Flag,
  Flame,
  Gauge,
  History,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Medal,
  MessageSquare,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { useSalonRoom } from "../src/hooks/useSalonRoom";
import type { Hint, RoomSnapshot, TokenView } from "../src/game/types";

const EMPTY_OUTCOME: RoomSnapshot["outcome"] = {
  hasWon: false,
  winnerCount: 0,
  revealAvailable: false
};
const ADMIN_GUESS_PREFIX = "mdp:";
const PEDANTIX_URL = "https://pedantix.certitudes.org/";
const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions legales" },
  { href: "/confidentialite", label: "Confidentialite" },
  { href: "/conditions-utilisation", label: "Conditions" }
];

const DEMO_STATE: RoomSnapshot = {
  room: {
    code: "MAE5TRO",
    createdAt: 0,
    startedAt: 0,
    mode: "coop",
    round: 1,
    articleStatus: "loading"
  },
  article: {
    title: [{ id: "t", text: "", kind: "word", status: "masked", length: 8 }],
    meta: {
      source: "Wikipedia francophone",
      updatedAt: "chargement",
      theme: "Culture generale",
      category: "Encyclopedie",
      relatedArticle: "Article lie",
      difficulty: 3,
      sectionCount: 3,
      estimatedWords: 180
    },
    sections: [
      {
        heading: [{ id: "h", text: "", kind: "word", status: "masked", length: 12 }],
        body: [
          [
            { id: "p1", text: "", kind: "word", status: "masked", length: 2 },
            { id: "p2", text: " ", kind: "space", status: "visible" },
            { id: "p3", text: "", kind: "word", status: "masked", length: 7 },
            { id: "p4", text: " ", kind: "space", status: "visible" },
            { id: "p5", text: "", kind: "word", status: "masked", length: 8 },
            { id: "p6", text: " ", kind: "space", status: "visible" },
            { id: "p7", text: "", kind: "word", status: "masked", length: 2 },
            { id: "p8", text: " ", kind: "space", status: "visible" },
            { id: "p9", text: "", kind: "word", status: "masked", length: 7 }
          ]
        ]
      }
    ]
  },
  players: [],
  guesses: [],
  hints: [],
  progress: {
    foundWords: 0,
    totalWords: 40,
    remainingWords: 40,
    revealedPercent: 0,
    estimatedWords: 180
  },
  score: {
    total: 0,
    streak: 0,
    percentile: 28
  },
  outcome: EMPTY_OUTCOME,
  serverTime: 0
};

export default function Home() {
  const room = useSalonRoom();
  const state = room.state ?? DEMO_STATE;
  const outcome = state.outcome ?? EMPTY_OUTCOME;
  const [guess, setGuess] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "found" | "near">("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revealChecked, setRevealChecked] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const wasWinnerRef = useRef(false);

  const visibleGuesses = useMemo(() => {
    if (historyFilter === "all") return state.guesses;
    return state.guesses.filter((entry) => entry.kind === historyFilter);
  }, [historyFilter, state.guesses]);

  useEffect(() => {
    if (!room.revealedTitle) return;
    setGuess(room.revealedTitle);
  }, [room.revealedTitle]);

  useEffect(() => {
    if (outcome.hasWon && !wasWinnerRef.current) {
      setConfettiOn(true);
      window.setTimeout(() => setConfettiOn(false), 5200);
    }
    wasWinnerRef.current = outcome.hasWon;
  }, [outcome.hasWon]);

  useEffect(() => {
    setRevealChecked(false);
    wasWinnerRef.current = false;
  }, [state.room.code, state.room.round]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = guess.trim();
    if (!value) return;
    if (value.toLowerCase().startsWith(ADMIN_GUESS_PREFIX)) {
      room.requestAdminTitle(value.slice(ADMIN_GUESS_PREFIX.length).trim());
      setGuess("");
      return;
    }
    room.submitGuess(value);
    setGuess("");
  }

  function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinCode.trim()) return;
    room.joinRoom(joinCode);
    setJoinCode("");
  }

  if (!room.hasStarted) {
    return (
      <StartScreen
        playerName={room.playerName}
        updatePlayerName={room.updatePlayerName}
        createRoom={room.createRoom}
        playSolo={room.playSolo}
        onJoin={onJoin}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
      />
    );
  }

  return (
    <main className="shell">
      {confettiOn ? <Confetti /> : null}
      <TopBar
        state={state}
        status={room.status}
        createRoom={room.createRoom}
        resetArticle={room.resetArticle}
        copyInvite={room.copyInvite}
        mode={state.room.mode}
        changeMode={room.changeMode}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
      />

      <div className="game-layout">
        <section className="article-stage">
          {outcome.hasWon || outcome.winnerCount > 0 ? <VictoryBanner outcome={outcome} /> : null}
          <ArticleTabs state={state} />
          <ArticleSurface state={state} />
          <GuessComposer
            guess={guess}
            setGuess={setGuess}
            onSubmit={onSubmit}
            lastSimilarity={room.lastResult?.similarity ?? 0}
            lastResultKind={room.lastResult?.kind}
            articleLoading={room.mounted && state.room.articleStatus === "loading"}
            revealAvailable={outcome.revealAvailable}
            hasWon={outcome.hasWon}
            answerTitle={outcome.answerTitle}
            answerUrl={outcome.answerUrl}
            revealChecked={revealChecked}
            onReveal={() => {
              setRevealChecked(true);
              room.requestRevealTitle();
            }}
          />
        </section>

        <aside className="right-rail">
          <HistoryPanel guesses={visibleGuesses} filter={historyFilter} setFilter={setHistoryFilter} />
          <ScorePanel state={state} />
          <HintsPanel hints={state.hints} serverTime={state.serverTime} nextHint={state.nextHint} />
        </aside>
      </div>

      <div className="toast-stack">
        {room.notices.map((notice) => (
          <div key={notice.id} className={clsx("toast", notice.level)}>
            {notice.message}
          </div>
        ))}
      </div>

      {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow">Parametres</p>
              <h2>Salon Maestro</h2>
            </div>
            <label>
              Nom visible
              <input value={room.playerName} onChange={(event) => room.updatePlayerName(event.target.value)} />
            </label>
            <p>
              Les articles sont charges automatiquement depuis Wikipedia cote room. Si l'API est indisponible, la
              manche affiche un message de secours.
            </p>
            <button type="button" onClick={() => setSettingsOpen(false)}>
              <Check size={18} />
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      {room.adminArticle ? (
        <div className="modal-backdrop" onClick={room.clearAdminTitle}>
          <div className="modal admin-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow">Mode admin</p>
              <h2>Article a trouver</h2>
            </div>
            <strong className="admin-answer">{room.adminArticle.title}</strong>
            {room.adminArticle.url ? (
              <a className="admin-link" href={room.adminArticle.url} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
                Ouvrir l'article Wikipedia
              </a>
            ) : null}
            <button type="button" onClick={room.clearAdminTitle}>
              <Check size={18} />
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function VictoryBanner({ outcome }: { outcome: RoomSnapshot["outcome"] }) {
  return (
    <div className={clsx("victory-banner", outcome.hasWon && "won")}>
      <Trophy size={18} />
      {outcome.hasWon ? (
        <span>
          Bravo, titre trouve : <strong>{outcome.answerTitle}</strong>
          {outcome.answerUrl ? (
            <a className="admin-link victory-link" href={outcome.answerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Ouvrir l'article
            </a>
          ) : null}
        </span>
      ) : (
        <span>
          <strong>{outcome.firstWinnerName}</strong> a trouve le titre. Vous pouvez continuer a chercher.
        </span>
      )}
    </div>
  );
}

function Confetti() {
  return (
    <div className="confetti-layer" aria-hidden="true">
      {Array.from({ length: 80 }).map((_, index) => (
        <i
          key={index}
          style={
            {
              "--x": `${(index * 37) % 100}%`,
              "--delay": `${(index % 16) * 0.08}s`,
              "--duration": `${2.7 + (index % 9) * 0.18}s`,
              "--color": ["#d7a84e", "#45a7ff", "#38a86b", "#ef6554", "#7fe3c2", "#c84f68"][index % 6],
              "--spin": `${(index % 2 ? 1 : -1) * (180 + index * 9)}deg`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StartScreen({
  playerName,
  updatePlayerName,
  createRoom,
  playSolo,
  onJoin,
  joinCode,
  setJoinCode
}: {
  playerName: string;
  updatePlayerName: (value: string) => void;
  createRoom: () => void;
  playSolo: () => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
}) {
  return (
    <main className="start-shell">
      <section className="start-panel">
        <div className="start-brand">
          <Image src="/maestro-mascot.png" width={118} height={118} alt="Mascotte Salon Maestro" priority />
          <div>
            <p className="eyebrow">Wikipedia cache, esprit Pedantix</p>
            <h1>Salon Maestro</h1>
            <span>Choisissez comment lancer la partie.</span>
          </div>
        </div>

        <label className="start-name">
          Votre nom
          <input value={playerName} onChange={(event) => updatePlayerName(event.target.value)} />
        </label>

        <div className="start-actions">
          <button type="button" className="start-primary" onClick={createRoom}>
            <DoorOpen size={22} />
            <span>
              <strong>Creer une room</strong>
              <small>Coop temps reel avec lien d'invitation</small>
            </span>
          </button>
          <button type="button" className="start-secondary" onClick={playSolo}>
            <Medal size={22} />
            <span>
              <strong>Jouer seul</strong>
              <small>Une manche privee, sans attente</small>
            </span>
          </button>
        </div>

        <form className="start-join" onSubmit={onJoin}>
          <KeyRound size={18} />
          <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Rejoindre avec un code" />
          <button type="submit">
            <Send size={17} />
            Rejoindre
          </button>
        </form>

        <div className="start-footer-links">
          <PedantixCredit />
          <LegalLinks />
        </div>
      </section>
    </main>
  );
}

function TopBar({
  state,
  status,
  createRoom,
  resetArticle,
  copyInvite,
  mode,
  changeMode,
  settingsOpen,
  setSettingsOpen
}: {
  state: RoomSnapshot;
  status: string;
  createRoom: () => void;
  resetArticle: () => void;
  copyInvite: () => void;
  mode: "solo" | "coop";
  changeMode: (mode: "solo" | "coop") => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}) {
  const onlinePlayers = state.players.filter((player) => player.online).length;
  return (
    <header className="topbar">
      <div className="room-title">
        <span>Salon</span>
        <strong>{state.room.code}</strong>
        <button type="button" onClick={copyInvite} aria-label="Copier le code du salon">
          <Copy size={18} />
        </button>
      </div>
      <div className="status-chip">
        {status === "online" ? <Wifi size={18} /> : <WifiOff size={18} />}
        <span>{status === "online" ? "En ligne" : status === "connecting" ? "Connexion" : "Hors ligne"}</span>
      </div>
      <div className="avatar-strip" aria-label={`${onlinePlayers} joueurs connectes`}>
        {state.players.slice(0, 5).map((player) => (
          <span key={player.id} style={{ background: player.color }} title={player.name}>
            {player.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
        <button type="button" onClick={createRoom} title="Creer une room">
          <Plus size={16} />
        </button>
      </div>
      <div className="segmented">
        <button type="button" className={clsx(mode === "solo" && "active")} onClick={() => changeMode("solo")}>
          Solo
        </button>
        <button type="button" className={clsx(mode === "coop" && "active")} onClick={() => changeMode("coop")}>
          Coop
          <Users size={16} />
        </button>
      </div>
      <nav className="top-actions">
        <button type="button" onClick={copyInvite}>
          <Share2 size={18} />
          Partager
        </button>
        <button type="button" onClick={copyInvite}>
          <Link2 size={18} />
          Inviter
        </button>
        <button type="button" onClick={resetArticle}>
          <RefreshCw size={18} />
          Nouvel article
        </button>
        <button type="button" onClick={() => setSettingsOpen(!settingsOpen)}>
          <Settings size={18} />
          Parametres
        </button>
      </nav>
    </header>
  );
}

function BrandBlock() {
  return (
    <div className="brand-block">
      <div>
        <span>Salon</span>
        <strong>Maestro</strong>
      </div>
      <small>Wiki</small>
    </div>
  );
}

function RoomPanel({
  code,
  inviteUrl,
  mounted,
  status,
  copyInvite,
  onJoin,
  joinCode,
  setJoinCode
}: {
  code: string;
  inviteUrl: string;
  mounted: boolean;
  status: string;
  copyInvite: () => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
}) {
  return (
    <section className="rail-section">
      <h2>
        <Flag size={17} />
        Salon
      </h2>
      <label className="code-label">
        Code du salon
        <strong>{code}</strong>
      </label>
      <label className="link-label">
        Lien d'invitation
        <span suppressHydrationWarning>{mounted && inviteUrl ? inviteUrl.replace(/^https?:\/\//, "") : "pret apres connexion"}</span>
        <button type="button" onClick={copyInvite} aria-label="Copier le lien">
          <Copy size={17} />
        </button>
      </label>
      <button className="primary-button" type="button" onClick={copyInvite}>
        <Users size={18} />
        Inviter des joueurs
      </button>
      <form className="join-form" onSubmit={onJoin}>
        <KeyRound size={17} />
        <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Code a rejoindre" />
        <button type="submit" aria-label="Rejoindre">
          <Send size={16} />
        </button>
      </form>
      <div className="connection-line">
        <Clock3 size={16} />
        <span>Statut</span>
        <strong>{status === "online" ? "WebSocket actif" : "Connexion..."}</strong>
      </div>
    </section>
  );
}

function PlayersPanel({
  state,
  playerName,
  updatePlayerName
}: {
  state: RoomSnapshot;
  playerName: string;
  updatePlayerName: (value: string) => void;
}) {
  return (
    <section className="rail-section players">
      <h2>
        <Users size={17} />
        Joueurs <span>({state.players.filter((player) => player.online).length}/8)</span>
      </h2>
      <label className="name-field">
        Votre nom
        <input value={playerName} onChange={(event) => updatePlayerName(event.target.value)} />
      </label>
      <div className="player-list">
        {state.players.length === 0 ? <p className="empty">En attente de joueurs.</p> : null}
        {state.players.map((player) => (
          <div key={player.id} className={clsx("player-row", !player.online && "offline")}>
            <span className="player-avatar" style={{ background: player.color }}>
              {player.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>
                {player.name}
                {player.isHost ? <Crown size={13} /> : null}
              </strong>
              <small>{player.online ? "En ligne" : "Absent"}</small>
            </span>
            <b>{player.score}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModePanel({
  mode,
  changeMode
}: {
  mode: "solo" | "coop";
  changeMode: (mode: "solo" | "coop") => void;
}) {
  return (
    <section className="rail-section">
      <h2>
        <Gauge size={17} />
        Mode de jeu
      </h2>
      <div className="mode-list">
        <button type="button" className={clsx(mode === "coop" && "selected")} onClick={() => changeMode("coop")}>
          <Users size={19} />
          <span>
            <strong>Cooperatif</strong>
            <small>Tous ensemble pour deviner</small>
          </span>
        </button>
        <button type="button" className={clsx(mode === "solo" && "selected")} onClick={() => changeMode("solo")}>
          <Medal size={19} />
          <span>
            <strong>Solo</strong>
            <small>Room privee, progression personnelle</small>
          </span>
        </button>
      </div>
    </section>
  );
}

function ArticleTabs({ state }: { state: RoomSnapshot }) {
  return (
    <div className="article-tabs">
      <div className="tab active">
        <BookOpen size={18} />
        Article
      </div>
      <div className="article-source">
        Source : {state.article.meta.source}
        {state.article.meta.source.includes("Wikipedia") && " "}
        {state.article.meta.source.includes("Wikipedia") ? <ExternalLink size={14} /> : null}
        <PedantixCredit className="source-credit" />
      </div>
    </div>
  );
}

function ArticleSurface({ state }: { state: RoomSnapshot }) {
  const [lengthVisibleTokens, setLengthVisibleTokens] = useState<Set<string>>(() => new Set());
  const lengthTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setLengthVisibleTokens(new Set());
    lengthTimers.current.forEach((timer) => clearTimeout(timer));
    lengthTimers.current.clear();
  }, [state.room.startedAt]);

  useEffect(() => {
    return () => {
      lengthTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const showTokenLength = (tokenId: string) => {
    setLengthVisibleTokens((current) => {
      const next = new Set(current);
      next.add(tokenId);
      return next;
    });

    const currentTimer = lengthTimers.current.get(tokenId);
    if (currentTimer) clearTimeout(currentTimer);

    const timer = setTimeout(() => {
      lengthTimers.current.delete(tokenId);
      setLengthVisibleTokens((current) => {
        const next = new Set(current);
        next.delete(tokenId);
        return next;
      });
    }, 3000);

    lengthTimers.current.set(tokenId, timer);
  };

  return (
    <article className="article-surface">
      <div className="article-progress">
        <span>Article progresse</span>
        <div>
          <i style={{ width: `${state.progress.revealedPercent}%` }} />
        </div>
        <strong>{state.progress.revealedPercent}%</strong>
        <span>Mots trouves : {state.progress.foundWords} / {state.progress.totalWords}</span>
      </div>
      {state.room.articleStatus === "loading" ? (
        <div className="loading-article">
          <Loader2 size={22} />
          Chargement d'un article Wikipedia...
        </div>
      ) : null}
      <header className="wiki-heading">
        <h1>{renderTokens(state.article.title, lengthVisibleTokens, showTokenLength)}</h1>
        <button type="button" aria-label="Modifier le titre">
          <ScrollText size={19} />
        </button>
      </header>
      <div className="article-meta">
        <span>~ {state.article.meta.estimatedWords} mots</span>
        <span>{state.article.meta.sectionCount} sections</span>
        <span>
          Difficulte :
          {Array.from({ length: 5 }).map((_, index) => (
            <i key={index} className={index < state.article.meta.difficulty ? "on" : ""} />
          ))}
        </span>
        <b>{state.article.meta.theme}</b>
      </div>
      {state.article.sections.map((section, index) => (
        <section key={index} className="wiki-section">
          {index > 0 ? <h2>{renderTokens(section.heading, lengthVisibleTokens, showTokenLength)}</h2> : null}
          {section.body.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>{renderTokens(paragraph, lengthVisibleTokens, showTokenLength)}</p>
          ))}
        </section>
      ))}
      <footer>
        <span>
          <Sparkles size={16} />
          Les mots trouves restent surlignes. Les indices temporels revelent des themes, lettres et sections.
        </span>
        <div className="article-footer-links">
          <PedantixCredit />
          <LegalLinks />
        </div>
      </footer>
    </article>
  );
}

function PedantixCredit({ className }: { className?: string }) {
  return (
    <a className={clsx("pedantix-credit", className)} href={PEDANTIX_URL} target="_blank" rel="noreferrer">
      Inspire par Pedantix
      <ExternalLink size={13} />
    </a>
  );
}

function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Pages legales">
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function GuessComposer({
  guess,
  setGuess,
  onSubmit,
  lastSimilarity,
  lastResultKind,
  articleLoading,
  revealAvailable,
  hasWon,
  answerTitle,
  answerUrl,
  revealChecked,
  onReveal
}: {
  guess: string;
  setGuess: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  lastSimilarity: number;
  lastResultKind?: string;
  articleLoading: boolean;
  revealAvailable: boolean;
  hasWon: boolean;
  answerTitle?: string;
  answerUrl?: string;
  revealChecked: boolean;
  onReveal: () => void;
}) {
  return (
    <form className="guess-composer" onSubmit={onSubmit}>
      <label>
        Votre proposition
        <span>Un mot par proposition. Les accents sont ignores.</span>
      </label>
      <div className="guess-row">
        <div className="guess-input">
          <Search size={20} />
          <input value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="Entrez un mot..." />
        </div>
        <button type="submit" disabled={articleLoading}>
          <Check size={19} />
          Valider
        </button>
        <div className="similarity">
          <span>Indice de similarite</span>
          <div>
            {Array.from({ length: 8 }).map((_, index) => (
              <i key={index} className={index < Math.round(lastSimilarity / 12.5) ? "on" : ""} />
            ))}
          </div>
          <strong>
            {lastResultKind === "solved"
              ? "Gagne"
              : lastResultKind === "found"
                ? "Trouve"
                : lastSimilarity
                  ? `${lastSimilarity}%`
                  : "En attente"}
          </strong>
        </div>
      </div>
      <label className="reveal-check">
        <input
          type="checkbox"
          checked={revealChecked || hasWon}
          disabled={!revealAvailable || hasWon}
          onChange={(event) => {
            if (event.currentTarget.checked) onReveal();
          }}
        />
        <span>Révéler</span>
        <small>{hasWon ? "Article dévoilé" : revealAvailable ? "Mettre le titre trouvé dans la validation" : "Disponible quand un joueur trouve"}</small>
      </label>
      {hasWon ? (
        <div className="winner-actions">
          <span>{answerTitle ? `Titre : ${answerTitle}` : "Tous les mots sont reveles pour vous."}</span>
          {answerUrl ? (
            <a className="admin-link victory-link" href={answerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Ouvrir l'article
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function HistoryPanel({
  guesses,
  filter,
  setFilter
}: {
  guesses: RoomSnapshot["guesses"];
  filter: "all" | "found" | "near";
  setFilter: (filter: "all" | "found" | "near") => void;
}) {
  return (
    <section className="right-section history-panel">
      <div className="section-head">
        <h2>
          <History size={18} />
          Historique des propositions
        </h2>
        <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "found" | "near")}>
          <option value="all">Tout</option>
          <option value="found">Trouves</option>
          <option value="near">Proches</option>
        </select>
      </div>
      <div className="guess-list">
        {guesses.length === 0 ? <p className="empty">Les propositions apparaitront ici.</p> : null}
        {guesses.map((guess) => (
          <div key={guess.id} className={clsx("guess-entry", guess.kind)}>
            <time>{formatTime(guess.at)}</time>
            <strong>{guess.word}</strong>
            <span>{guess.playerName}</span>
            <SimilarityDots value={guess.similarity} />
            <b>{guess.points ? `+${guess.points}` : guess.kind === "duplicate" ? "deja" : "0"}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScorePanel({ state }: { state: RoomSnapshot }) {
  return (
    <section className="right-section score-panel">
      <h2>
        <Trophy size={19} />
        Score de l'equipe
      </h2>
      <div className="score-grid">
        <div>
          <strong>{state.score.total.toLocaleString("fr-FR")}</strong>
          <span>pts</span>
          <small>Top {state.score.percentile}% cette semaine</small>
        </div>
        <dl>
          <dt>Mots trouves</dt>
          <dd>{state.progress.foundWords}</dd>
          <dt>Mots restants</dt>
          <dd>{state.progress.remainingWords}</dd>
          <dt>Serie</dt>
          <dd>
            <Flame size={15} />
            x{state.score.streak}
          </dd>
        </dl>
      </div>
    </section>
  );
}

function HintsPanel({ hints, serverTime, nextHint }: { hints: Hint[]; serverTime: number; nextHint?: Hint }) {
  return (
    <section className="right-section hints-panel">
      <div className="section-head">
        <h2>
          <Sparkles size={18} />
          Indices progressifs
        </h2>
        <span>{nextHint ? `Prochain dans ${formatCountdown(nextHint.unlockAt - serverTime)}` : "Tous reveles"}</span>
      </div>
      <div className="hint-list">
        {hints.map((hint) => (
          <div key={hint.id} className={clsx("hint-row", hint.unlocked && "unlocked")}>
            <div className="hint-time">{formatDuration(hint.unlockAt - (hints[0]?.unlockAt ?? hint.unlockAt))}</div>
            <span className="hint-dot" />
            <div className="hint-body">
              <HintIcon hint={hint} />
              <span>
                <strong>{hint.label}</strong>
                <small>{hint.unlocked ? hint.value : "Verrouille"}</small>
              </span>
              {!hint.unlocked ? <Lock size={15} /> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HintIcon({ hint }: { hint: Hint }) {
  const icons = {
    theme: Sparkles,
    category: Flag,
    letters: KeyRound,
    article: BookOpen,
    place: ScrollText,
    section: MessageSquare,
    reveal: Search
  };
  const Icon = icons[hint.icon];
  return <Icon size={18} />;
}

function SimilarityDots({ value }: { value: number }) {
  return (
    <div className="similarity-dots">
      {Array.from({ length: 5 }).map((_, index) => (
        <i key={index} className={index < Math.round(value / 20) ? "on" : ""} />
      ))}
    </div>
  );
}

function renderTokens(tokens: TokenView[], lengthVisibleTokens: Set<string>, showTokenLength: (tokenId: string) => void) {
  return tokens.map((token) => {
    if (token.kind !== "word") return token.text;
    if (token.status === "masked") {
      const showLength = lengthVisibleTokens.has(token.id);
      const length = token.length ?? 0;
      return (
        <button
          type="button"
          key={token.id}
          className={clsx("mask-token", token.nearGuess && "near", showLength && "length-visible")}
          style={{ "--token": token.length ?? 5 } as CSSProperties}
          title={showLength ? `${length} lettres` : token.nearGuess ? `${token.nearGuess} - ${token.nearSimilarity}% proche` : "Afficher le nombre de lettres"}
          aria-label={showLength ? `Mot masque de ${length} lettres` : "Afficher le nombre de lettres du mot masque"}
          onClick={() => showTokenLength(token.id)}
        >
          {showLength ? <span className="mask-length">{length}</span> : token.nearGuess ? <span className="near-guess">{token.nearGuess}</span> : " "}
        </button>
      );
    }
    return (
      <span key={token.id} className={clsx("word-token", token.status)}>
        {token.text}
      </span>
    );
  });
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return `${String(minutes).padStart(2, "0")}:00`;
}
