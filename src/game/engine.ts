import { ARTICLES } from "./articles";
import { isAutoVisibleWord, normalizeToken, normalizeWord, splitText, wordSimilarity } from "./normalize";
import type {
  Article,
  GuessEntry,
  Hint,
  Player,
  RoomSnapshot,
  RoomState,
  SectionView,
  TokenView
} from "./types";

const PLAYER_COLORS = ["#45a7ff", "#d8a742", "#48b879", "#ee6a5a", "#9b7cff", "#8fd14f", "#d84b83", "#45c7b7"];
const SEMANTIC_MATCH_FLOOR = 76;

const SEMANTIC_GROUPS = [
  ["savoir", "connaissance", "connaissances", "science", "sciences", "scientifique", "recherche", "etude", "theorie", "discipline"],
  ["film", "cinema", "cinematographique", "longmetrage", "courtmetrage", "acteur", "actrice", "realisation", "realisateur"],
  ["serie", "episode", "saison", "television", "diffusion", "programme", "emission"],
  ["livre", "roman", "ouvrage", "texte", "recit", "litterature", "ecrivain", "auteur", "autrice"],
  ["musique", "chanson", "album", "artiste", "chanteur", "chanteuse", "compositeur", "composition"],
  ["personne", "humain", "homme", "femme", "individu", "personnage", "figure", "heros", "protagoniste"],
  ["famille", "pere", "mere", "parent", "enfant", "fils", "fille", "frere", "soeur"],
  ["ville", "commune", "village", "capitale", "metropole", "agglomeration", "cite"],
  ["pays", "nation", "etat", "territoire", "region", "province", "departement"],
  ["mer", "ocean", "fleuve", "riviere", "lac", "eau", "littoral", "ile"],
  ["montagne", "massif", "sommet", "colline", "relief", "vallee"],
  ["politique", "gouvernement", "president", "ministre", "roi", "reine", "monarque", "parlement", "election"],
  ["guerre", "bataille", "conflit", "combat", "armee", "militaire", "soldat"],
  ["religion", "eglise", "dieu", "divinite", "culte", "spirituel", "mythe", "mythologie"],
  ["sport", "match", "competition", "championnat", "joueur", "athlete", "equipe", "club"],
  ["animal", "espece", "mammifere", "oiseau", "poisson", "insecte", "reptile"],
  ["plante", "arbre", "fleur", "vegetal", "foret", "bois"],
  ["couleur", "rouge", "bleu", "vert", "jaune", "noir", "blanc", "orange", "violet", "rose", "gris"],
  ["temps", "annee", "siecle", "epoque", "periode", "date", "jour", "mois"],
  ["naissance", "ne", "nee", "mort", "deces", "vivant", "biographie", "vie"],
  ["travail", "metier", "profession", "emploi", "carriere", "fonction", "poste"],
  ["lieu", "endroit", "site", "place", "localisation", "emplacement"],
  ["construction", "batiment", "monument", "architecture", "edifice", "maison", "palais", "chateau"],
  ["machine", "appareil", "outil", "instrument", "technique", "technologie", "invention"],
  ["argent", "economie", "commerce", "marche", "finance", "entreprise", "societe"],
  ["maladie", "sante", "medecine", "medical", "symptome", "traitement"],
  ["ecole", "universite", "enseignement", "education", "eleve", "etudiant", "professeur"],
  ["langue", "mot", "parole", "discours", "dialecte", "linguistique", "expression"],
  ["art", "peinture", "sculpture", "dessin", "oeuvre", "musee", "artiste"],
  ["prix", "recompense", "trophee", "medaille", "distinction", "honneur"]
] as const;

const SEMANTIC_INDEX = buildSemanticIndex(SEMANTIC_GROUPS);

export function now() {
  return Date.now();
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SM";
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function sanitizeRoomCode(code: string) {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return cleaned || createRoomCode();
}

export function createRoomState(code: string, timestamp = now()): RoomState {
  const article = ARTICLES[Math.abs(hashString(code)) % ARTICLES.length];
  return {
    code: sanitizeRoomCode(code),
    articleId: article.id,
    article,
    createdAt: timestamp,
    startedAt: timestamp,
    mode: "coop",
    players: {},
    foundWords: [],
    hintedWords: [],
    nearWords: {},
    winners: {},
    guesses: [],
    score: 0,
    streak: 0,
    round: 1,
    articleStatus: "fallback"
  };
}

export function installArticle(state: RoomState, article: Article, timestamp = now()) {
  state.article = article;
  state.articleId = article.id;
  state.startedAt = timestamp;
  state.foundWords = [];
  state.hintedWords = [];
  state.nearWords = {};
  state.winners = {};
  state.guesses = [];
  state.score = 0;
  state.streak = 0;
  state.articleStatus = article.provider === "wikipedia" ? "ready" : "fallback";
  Object.values(state.players).forEach((player) => {
    player.score = 0;
    player.lastSeen = timestamp;
  });
}

export function markArticleLoading(state: RoomState) {
  state.articleStatus = "loading";
}

export function getArticle(articleId: string, article?: Article): Article {
  if (article) return article;
  return ARTICLES.find((article) => article.id === articleId) ?? ARTICLES[0];
}

export function joinPlayer(state: RoomState, playerId: string, playerName: string, timestamp = now()) {
  const known = state.players[playerId];
  const isFirstPlayer = Object.keys(state.players).length === 0;
  const player: Player = {
    id: playerId,
    name: cleanPlayerName(playerName),
    score: known?.score ?? 0,
    color: known?.color ?? PLAYER_COLORS[Object.keys(state.players).length % PLAYER_COLORS.length],
    lastSeen: timestamp,
    online: true,
    isHost: known?.isHost ?? isFirstPlayer
  };
  state.players[playerId] = player;
  if (!state.hostId || isFirstPlayer) state.hostId = playerId;
  return player;
}

export function leavePlayer(state: RoomState, playerId: string, timestamp = now()) {
  const player = state.players[playerId];
  if (!player) return;
  player.online = false;
  player.lastSeen = timestamp;
}

export function touchPlayer(state: RoomState, playerId: string, timestamp = now()) {
  const player = state.players[playerId];
  if (!player) return;
  player.online = true;
  player.lastSeen = timestamp;
}

export function setRoomMode(state: RoomState, mode: RoomState["mode"], playerId: string) {
  if (state.hostId && state.hostId !== playerId) return false;
  state.mode = mode;
  return true;
}

export function resetRoom(state: RoomState, playerId: string, timestamp = now()) {
  if (state.hostId && state.hostId !== playerId) return false;
  const next = createRoomState(`${state.code}${state.round + 1}`, timestamp);
  state.articleId = next.articleId;
  state.article = next.article;
  state.startedAt = timestamp;
  state.foundWords = [];
  state.hintedWords = [];
  state.nearWords = {};
  state.winners = {};
  state.guesses = [];
  state.score = 0;
  state.streak = 0;
  state.round += 1;
  state.articleStatus = "fallback";
  Object.values(state.players).forEach((player) => {
    player.score = 0;
    player.online = true;
    player.lastSeen = timestamp;
  });
  return true;
}

export function submitGuess(state: RoomState, playerId: string, rawWord: string, timestamp = now()): GuessEntry {
  const article = getArticle(state.articleId, state.article);
  const player = state.players[playerId] ?? joinPlayer(state, playerId, "Joueur", timestamp);
  state.winners ??= {};
  state.nearWords ??= {};
  const word = rawWord.trim().slice(0, 120);
  const normalizedGuess = normalizeWord(word);
  const normalized = normalizedGuess.split(" ")[0] ?? "";
  const candidateWords = getPlayableWords(article);
  const previousGuess = state.guesses.find((guess) => guess.normalized === normalizedGuess || guess.normalized === normalized);
  const exactMatches = candidateWords.filter((candidate) => candidate.normalized === normalized);
  const alreadyFound = state.foundWords.includes(normalized);
  const isInvalid = normalized.length < 1;
  const solvedTitle = isTitleGuess(word, article.title);
  let kind: GuessEntry["kind"] = "miss";
  let points = 0;
  let similarity = 0;
  let target: string | undefined;

  if (isInvalid) {
    kind = "invalid";
  } else if (solvedTitle) {
    const alreadyWinner = Boolean(state.winners[playerId]);
    kind = alreadyWinner ? "duplicate" : "solved";
    points = alreadyWinner ? 0 : 1000;
    similarity = 100;
    target = normalizeTitle(article.title);
    if (!alreadyWinner) {
      state.winners[playerId] = {
        playerId,
        playerName: player.name,
        at: timestamp
      };
    }
  } else if (exactMatches.length > 0 && !alreadyFound) {
    kind = "found";
    points = 80 + exactMatches.length * 20 + Math.min(60, state.streak * 10);
    similarity = 100;
    state.foundWords.push(normalized);
    state.streak += 1;
  } else if (exactMatches.length > 0 || previousGuess) {
    kind = "duplicate";
    points = 0;
    similarity = exactMatches.length > 0 ? 100 : Math.max(previousGuess?.similarity ?? 0, 40);
    state.streak = 0;
  } else {
    const nearest = findNearestWord(normalized, candidateWords.map((candidate) => candidate.normalized));
    similarity = nearest.similarity;
    target = nearest.word || undefined;
    const nearThreshold = normalized.length <= 4 ? 86 : 72;
    if (similarity >= nearThreshold) {
      kind = "near";
      points = 20;
      state.streak = 0;
      if (target) {
        state.nearWords[target] = {
          target,
          guess: word,
          similarity,
          playerName: player.name,
          at: timestamp
        };
      }
    } else {
      kind = "miss";
      points = 0;
      state.streak = 0;
    }
  }

  player.score += points;
  player.lastSeen = timestamp;
  state.score += points;

  const entry: GuessEntry = {
    id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
    word,
    normalized: solvedTitle ? normalizeTitle(article.title) : normalizedGuess,
    playerId,
    playerName: player.name,
    at: timestamp,
    kind,
    similarity,
    points,
    matches: exactMatches.length,
    target
  };

  state.guesses = [entry, ...state.guesses].slice(0, 80);
  return entry;
}

export function createSnapshot(state: RoomState, timestamp = now()): RoomSnapshot {
  return createRoomSnapshot(state, timestamp);
}

export function createRoomSnapshot(state: RoomState, timestamp = now(), viewerId?: string): RoomSnapshot {
  const article = getArticle(state.articleId, state.article);
  const words = getPlayableWords(article);
  state.winners ??= {};
  state.nearWords ??= {};
  const winnerEntries = Object.values(state.winners).sort((a, b) => a.at - b.at);
  const hasWon = Boolean(viewerId && state.winners[viewerId]);
  const revealAll = hasWon;
  const allWords = new Set(words.map((word) => word.normalized));
  const found = revealAll ? allWords : new Set(state.foundWords);
  const hinted = new Set(getHintedWords(state, article, timestamp));
  const hints = getHints(state, article, timestamp);
  const nextHint = hints.find((hint) => !hint.unlocked);
  const totalWords = allWords.size;
  const foundWords = found.size;
  const revealedPercent = totalWords === 0 ? 0 : Math.round((foundWords / totalWords) * 100);

  return {
    room: {
      code: state.code,
      createdAt: state.createdAt,
      startedAt: state.startedAt,
      mode: state.mode,
      round: state.round,
      articleStatus: state.articleStatus
    },
    article: buildArticleView(article, found, hinted, revealAll ? {} : state.nearWords, "article"),
    players: Object.values(state.players)
      .sort((a, b) => Number(b.online) - Number(a.online) || b.score - a.score)
      .slice(0, 8),
    guesses: state.guesses.slice(0, 30).map((guess) => sanitizeGuessForViewer(guess, hasWon || guess.playerId === viewerId)),
    hints,
    nextHint,
    progress: {
      foundWords,
      totalWords,
      remainingWords: Math.max(0, totalWords - foundWords),
      revealedPercent,
      estimatedWords: estimateArticleWords(article)
    },
    score: {
      total: state.score,
      streak: state.streak,
      percentile: Math.min(99, Math.max(12, Math.round(28 + state.score / 65)))
    },
    outcome: {
      hasWon,
      winnerCount: winnerEntries.length,
      firstWinnerName: winnerEntries[0]?.playerName,
      answerTitle: hasWon ? article.title : undefined,
      revealAvailable: winnerEntries.length > 0 && !hasWon
    },
    serverTime: timestamp
  };
}

function buildArticleView(
  article: Article,
  found: Set<string>,
  hinted: Set<string>,
  nearWords: RoomState["nearWords"],
  prefix: string
) {
  return {
    title: tokenizeForView(article.title, found, hinted, nearWords, `${prefix}-title`),
    meta: {
      source: article.source,
      updatedAt: article.updatedAt,
      theme: article.theme,
      category: article.category,
      relatedArticle: article.relatedArticle,
      difficulty: article.difficulty,
      sectionCount: article.sections.length,
      estimatedWords: estimateArticleWords(article)
    },
    sections: article.sections.map<SectionView>((section, sectionIndex) => ({
      heading: tokenizeForView(section.heading, found, hinted, nearWords, `${prefix}-h-${sectionIndex}`),
      body: section.body.map((paragraph, paragraphIndex) =>
        tokenizeForView(paragraph, found, hinted, nearWords, `${prefix}-p-${sectionIndex}-${paragraphIndex}`)
      )
    }))
  };
}

function tokenizeForView(
  text: string,
  found: Set<string>,
  hinted: Set<string>,
  nearWords: RoomState["nearWords"],
  prefix: string
): TokenView[] {
  return splitText(text).map((part, index) => {
    if (/^\s+$/.test(part)) {
      return { id: `${prefix}-${index}`, text: part, kind: "space", status: "visible" };
    }
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(part)) {
      return { id: `${prefix}-${index}`, text: part, kind: "punctuation", status: "visible" };
    }

    const normalized = normalizeToken(part);
    const visible = isAutoVisibleWord(part);
    const status: TokenView["status"] = visible
      ? "visible"
      : found.has(normalized)
        ? "found"
        : hinted.has(normalized)
          ? "hinted"
          : "masked";

    return {
      id: `${prefix}-${index}`,
      text: status === "masked" ? "" : part,
      kind: "word",
      status,
      length: Math.max(2, normalized.length),
      normalized,
      nearGuess: status === "masked" ? nearWords[normalized]?.guess : undefined,
      nearSimilarity: status === "masked" ? nearWords[normalized]?.similarity : undefined
    };
  });
}

function getHints(state: RoomState, article: Article, timestamp: number): Hint[] {
  const firstLetters = article.title
    .split(/\s+/)
    .map((word) => `${word[0] ?? ""}${"_".repeat(Math.max(1, word.length - 1))}`)
    .join(" ");
  const titleHint = revealPattern(article.title);
  const revealWord = getPlayableWords(article).find((word) => word.normalized.length >= 7)?.raw ?? "article";

  return [
    hint("theme", "Theme", article.theme, 0, state, timestamp, "theme"),
    hint("category", "Categorie", article.category, 2 * 60_000, state, timestamp, "category"),
    hint("letters", "Premieres lettres", firstLetters, 4 * 60_000, state, timestamp, "letters"),
    hint("article", "Article lie", article.relatedArticle, 6 * 60_000, state, timestamp, "article"),
    hint("place", "Epoque / lieu", article.eraPlace, 8 * 60_000, state, timestamp, "place"),
    hint("section", "Indice de titre", titleHint, 10 * 60_000, state, timestamp, "section"),
    hint("reveal", "Lettres revelees", revealPattern(revealWord), 12 * 60_000, state, timestamp, "reveal")
  ];
}

function hint(
  id: string,
  label: string,
  value: string,
  delay: number,
  state: RoomState,
  timestamp: number,
  icon: Hint["icon"]
): Hint {
  const unlockAt = state.startedAt + delay;
  return {
    id,
    label,
    value,
    unlockAt,
    unlocked: timestamp >= unlockAt,
    icon
  };
}

function getHintedWords(state: RoomState, article: Article, timestamp: number) {
  const hints = getHints(state, article, timestamp);
  const hinted = [...state.hintedWords];
  if (hints.find((entry) => entry.id === "section")?.unlocked) {
    hinted.push(...article.sections.flatMap((section) => section.heading.split(/\s+/).map(normalizeToken)));
  }
  if (hints.find((entry) => entry.id === "reveal")?.unlocked) {
    const reveal = getPlayableWords(article).find((word) => word.normalized.length >= 7);
    if (reveal) hinted.push(reveal.normalized);
  }
  return hinted.filter(Boolean);
}

function getPlayableWords(article: Article) {
  const values = [
    article.title,
    ...article.sections.flatMap((section) => [section.heading, ...section.body])
  ];
  return collectWords(values);
}

function collectWords(values: string[]) {
  const words: { raw: string; normalized: string }[] = [];
  values.forEach((value) => {
    splitText(value).forEach((part) => {
      const normalized = normalizeToken(part);
      if (!normalized || isAutoVisibleWord(part)) return;
      words.push({ raw: part, normalized });
    });
  });
  return words;
}

function sanitizeGuessForViewer(guess: GuessEntry, canSeeAnswer: boolean): GuessEntry {
  if (guess.kind !== "solved" || canSeeAnswer) return guess;
  return {
    ...guess,
    word: "Titre trouve",
    normalized: "titre-trouve",
    target: undefined
  };
}

export function countCandidateWords(article: Article) {
  return new Set(getPlayableWords(article).map((word) => word.normalized)).size;
}

function estimateArticleWords(article: Article) {
  return article.sections.reduce((total, section) => total + section.body.join(" ").split(/\s+/).length, 0);
}

function findNearestWord(word: string, candidates: string[]) {
  return candidates.reduce(
    (best, candidate) => {
      const score = wordProximity(word, candidate);
      if (score.semantic >= SEMANTIC_MATCH_FLOOR && best.semantic < SEMANTIC_MATCH_FLOOR) {
        return { word: candidate, similarity: score.similarity, semantic: score.semantic };
      }
      if (score.semantic >= SEMANTIC_MATCH_FLOOR && score.semantic > best.semantic) {
        return { word: candidate, similarity: score.similarity, semantic: score.semantic };
      }
      if (best.semantic >= SEMANTIC_MATCH_FLOOR && score.semantic < SEMANTIC_MATCH_FLOOR) {
        return best;
      }
      return score.similarity > best.similarity
        ? { word: candidate, similarity: score.similarity, semantic: score.semantic }
        : best;
    },
    { word: "", similarity: 0, semantic: 0 }
  );
}

function wordProximity(guess: string, candidate: string) {
  const spelling = wordSimilarity(guess, candidate);
  const semantic = semanticSimilarity(guess, candidate);
  return {
    spelling,
    semantic,
    similarity: semantic >= SEMANTIC_MATCH_FLOOR ? Math.max(semantic, spelling) : spelling
  };
}

function semanticSimilarity(guess: string, candidate: string) {
  if (!guess || !candidate || guess === candidate) return guess === candidate ? 100 : 0;

  const guessStem = semanticStem(guess);
  const candidateStem = semanticStem(candidate);
  if (guessStem.length >= 5 && guessStem === candidateStem) return 88;

  const guessGroups = SEMANTIC_INDEX.get(guess) ?? SEMANTIC_INDEX.get(guessStem);
  const candidateGroups = SEMANTIC_INDEX.get(candidate) ?? SEMANTIC_INDEX.get(candidateStem);
  if (!guessGroups || !candidateGroups) return 0;

  const sharedGroup = [...guessGroups].some((group) => candidateGroups.has(group));
  if (!sharedGroup) return 0;

  if (Math.min(guess.length, candidate.length) <= 3) return 88;
  return 84;
}

function semanticStem(word: string) {
  return word
    .replace(/(?:ements|ement|ations|ation|iques|ique|istes|iste|eurs|euses|euse|teur|trice)$/u, "")
    .replace(/(?:aux)$/u, "al")
    .replace(/(?:es|s|x)$/u, "");
}

function buildSemanticIndex(groups: readonly (readonly string[])[]) {
  const index = new Map<string, Set<number>>();
  groups.forEach((group, groupIndex) => {
    group.forEach((term) => {
      const normalized = normalizeToken(term);
      const stem = semanticStem(normalized);
      [normalized, stem].filter(Boolean).forEach((key) => {
        const existing = index.get(key) ?? new Set<number>();
        existing.add(groupIndex);
        index.set(key, existing);
      });
    });
  });
  return index;
}

function revealPattern(word: string) {
  if (word.length <= 3) return word;
  return `${word[0]}${"_".repeat(Math.max(1, word.length - 3))}${word.slice(-2)}`;
}

function isTitleGuess(guess: string, title: string) {
  const normalizedGuess = normalizeTitle(guess);
  const normalizedTitle = normalizeTitle(title);
  return normalizedGuess.length > 0 && normalizedGuess === normalizedTitle;
}

function normalizeTitle(value: string) {
  return splitText(value)
    .map(normalizeToken)
    .filter(Boolean)
    .join(" ");
}

function cleanPlayerName(name: string) {
  const cleaned = name.trim().slice(0, 18);
  return cleaned || "Joueur";
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
