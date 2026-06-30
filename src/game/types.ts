export type GameMode = "solo" | "coop";

export type Player = {
  id: string;
  name: string;
  score: number;
  color: string;
  lastSeen: number;
  online: boolean;
  isHost: boolean;
};

export type ArticleSection = {
  heading: string;
  body: string[];
};

export type Article = {
  id: string;
  title: string;
  theme: string;
  category: string;
  relatedArticle: string;
  eraPlace: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: string;
  updatedAt: string;
  url?: string;
  provider?: "wikipedia" | "fallback";
  sections: ArticleSection[];
};

export type TokenView = {
  id: string;
  text: string;
  kind: "word" | "space" | "punctuation";
  status: "visible" | "masked" | "found" | "hinted";
  length?: number;
  normalized?: string;
  nearGuess?: string;
  nearSimilarity?: number;
};

export type SectionView = {
  heading: TokenView[];
  body: TokenView[][];
};

export type ArticleView = {
  title: TokenView[];
  meta: {
    source: string;
    updatedAt: string;
    theme: string;
    category: string;
    relatedArticle: string;
    difficulty: number;
    sectionCount: number;
    estimatedWords: number;
  };
  sections: SectionView[];
};

export type GuessResultKind = "found" | "duplicate" | "near" | "miss" | "invalid" | "solved";

export type GuessEntry = {
  id: string;
  word: string;
  normalized: string;
  playerId: string;
  playerName: string;
  at: number;
  kind: GuessResultKind;
  similarity: number;
  points: number;
  matches: number;
  target?: string;
};

export type NearWord = {
  target: string;
  guess: string;
  similarity: number;
  playerName: string;
  at: number;
};

export type Winner = {
  playerId: string;
  playerName: string;
  at: number;
};

export type Hint = {
  id: string;
  label: string;
  value: string;
  unlockAt: number;
  unlocked: boolean;
  icon: "theme" | "category" | "letters" | "article" | "place" | "section" | "reveal";
};

export type RoomState = {
  code: string;
  articleId: string;
  article?: Article;
  createdAt: number;
  startedAt: number;
  mode: GameMode;
  hostId?: string;
  players: Record<string, Player>;
  foundWords: string[];
  hintedWords: string[];
  nearWords: Record<string, NearWord>;
  winners: Record<string, Winner>;
  guesses: GuessEntry[];
  score: number;
  streak: number;
  round: number;
  articleStatus: "loading" | "ready" | "fallback";
};

export type RoomSnapshot = {
  room: {
    code: string;
    createdAt: number;
    startedAt: number;
    mode: GameMode;
    round: number;
    articleStatus: RoomState["articleStatus"];
  };
  article: ArticleView;
  players: Player[];
  guesses: GuessEntry[];
  hints: Hint[];
  nextHint?: Hint;
  progress: {
    foundWords: number;
    totalWords: number;
    remainingWords: number;
    revealedPercent: number;
    estimatedWords: number;
  };
  score: {
    total: number;
    streak: number;
    percentile: number;
  };
  outcome: {
    hasWon: boolean;
    winnerCount: number;
    firstWinnerName?: string;
    answerTitle?: string;
    revealAvailable: boolean;
  };
  serverTime: number;
};

export type ClientMessage =
  | {
      type: "join";
      playerId: string;
      playerName: string;
    }
  | {
      type: "guess";
      word: string;
      playerId: string;
    }
  | {
      type: "setMode";
      mode: GameMode;
      playerId: string;
    }
  | {
      type: "reset";
      playerId: string;
    }
  | {
      type: "ping";
      playerId: string;
    }
  | {
      type: "revealTitle";
      playerId: string;
    };

export type ServerMessage =
  | {
      type: "state";
      state: RoomSnapshot;
    }
  | {
      type: "notice";
      level: "info" | "success" | "warning" | "error";
      message: string;
    }
  | {
      type: "guessResult";
      result: GuessEntry;
    }
  | {
      type: "revealTitle";
      title: string;
    };
