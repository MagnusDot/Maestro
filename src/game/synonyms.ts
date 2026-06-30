import { normalizeToken } from "./normalize";

export type SynonymMatch = {
  word: string;
  similarity: number;
};

export type SynonymResolver = (guess: string, candidates: readonly string[]) => Promise<SynonymMatch | undefined>;

type SynonymEntry = {
  normalized: string;
  weight: number;
};

type FetchLike = typeof fetch;

const JEUX_DE_MOTS_URL = "https://www.jeuxdemots.org/rezo-dump.php";
const SYNONYM_RELATION_TYPE = 5;
const MIN_SYNONYM_WEIGHT = 70;
const MIN_SYNONYM_TERM_LENGTH = 4;
const REQUEST_TIMEOUT_MS = 1_200;
const MAX_CACHE_ENTRIES = 240;

export function createJeuxDeMotsSynonymResolver(fetcher: FetchLike = fetch): SynonymResolver {
  const cache = new Map<string, Promise<SynonymEntry[]>>();

  return async (guess, candidates) => {
    const normalizedGuess = normalizeToken(guess);
    if (normalizedGuess.length < MIN_SYNONYM_TERM_LENGTH || candidates.length === 0) return undefined;

    const synonyms = await getCachedSynonyms(cache, normalizedGuess, fetcher);
    const candidateSet = new Set(candidates);
    let best: SynonymMatch | undefined;

    synonyms.forEach((synonym) => {
      if (!candidateSet.has(synonym.normalized)) return;
      const similarity = weightToSimilarity(synonym.weight);
      if (!best || similarity > best.similarity) {
        best = { word: synonym.normalized, similarity };
      }
    });

    return best;
  };
}

function getCachedSynonyms(cache: Map<string, Promise<SynonymEntry[]>>, term: string, fetcher: FetchLike) {
  const known = cache.get(term);
  if (known) return known;

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  const pending = fetchJeuxDeMotsSynonyms(term, fetcher).catch(() => []);
  cache.set(term, pending);
  return pending;
}

async function fetchJeuxDeMotsSynonyms(term: string, fetcher: FetchLike): Promise<SynonymEntry[]> {
  const params = new URLSearchParams({
    gotermsubmit: "Chercher",
    gotermrel: term,
    rel: String(SYNONYM_RELATION_TYPE)
  });
  const response = await fetchWithTimeout(fetcher, `${JEUX_DE_MOTS_URL}?${params.toString()}`);
  if (!response.ok) return [];

  const html = await decodeLatin1(response);
  const dump = extractDump(html);
  if (!dump) return [];

  return parseSynonymDump(dump, term);
}

async function fetchWithTimeout(fetcher: FetchLike, url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetcher(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SalonMaestro/0.1 synonym lookup"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function decodeLatin1(response: Response) {
  const buffer = await response.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function extractDump(html: string) {
  return html
    .match(/<code>([\s\S]*?)<\/code>/i)?.[1]
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function parseSynonymDump(dump: string, term: string): SynonymEntry[] {
  const normalizedTerm = normalizeToken(term);
  const entries = parseEntries(dump);
  const synonyms = new Map<string, number>();
  const relationPattern = /^r;\d+;(\d+);(\d+);5;(-?\d+)(?:;|$)/gm;
  let match: RegExpExecArray | null;

  while ((match = relationPattern.exec(dump))) {
    const weight = Number(match[3]);
    if (!Number.isFinite(weight) || weight < MIN_SYNONYM_WEIGHT) continue;

    [match[1], match[2]].forEach((nodeId) => {
      const normalized = normalizeSynonymName(entries.get(nodeId) ?? "");
      if (!normalized || normalized === normalizedTerm) return;
      synonyms.set(normalized, Math.max(synonyms.get(normalized) ?? Number.NEGATIVE_INFINITY, weight));
    });
  }

  return [...synonyms.entries()].map(([normalized, weight]) => ({ normalized, weight }));
}

function parseEntries(dump: string) {
  const entries = new Map<string, string>();
  const entryPattern = /^e;(\d+);'([^']+)';\d+;-?\d+/gm;
  let match: RegExpExecArray | null;

  while ((match = entryPattern.exec(dump))) {
    entries.set(match[1], match[2]);
  }

  return entries;
}

function normalizeSynonymName(name: string) {
  if (!name || /[>:\s;]/u.test(name)) return "";
  return normalizeToken(name);
}

function weightToSimilarity(weight: number) {
  if (weight >= 150) return 91;
  if (weight >= 100) return 88;
  return 84;
}
