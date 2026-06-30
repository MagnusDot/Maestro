import { countCandidateWords } from "./engine";
import type { Article } from "./types";

type FetchLike = typeof fetch;

type WikiPage = {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  categories?: { title: string }[];
  links?: { title: string }[];
};

type WikiResponse = {
  query?: {
    pages?: WikiPage[];
  };
};

const API_URL = "https://fr.wikipedia.org/w/api.php";
const TARGET_ARTICLE_WORDS = 100;
const MAX_RANDOM_ARTICLE_ATTEMPTS = 12;

export async function fetchRandomWikipediaArticle(fetcher: FetchLike = fetch): Promise<Article> {
  for (let attempt = 0; attempt < MAX_RANDOM_ARTICLE_ATTEMPTS; attempt += 1) {
    const page = await fetchRandomPage(fetcher);
    if (!page?.extract) continue;

    const article = buildArticleFromPage(page);
    if (isPlayableArticle(article)) return article;
  }

  return fallbackArticle();
}

async function fetchRandomPage(fetcher: FetchLike) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "random",
    grnnamespace: "0",
    grnlimit: "1",
    grnfilterredir: "nonredirects",
    grnminsize: "5000",
    prop: "extracts|categories|info|links",
    explaintext: "1",
    exintro: "1",
    exsectionformat: "plain",
    clshow: "!hidden",
    cllimit: "20",
    inprop: "url",
    plnamespace: "0",
    pllimit: "20"
  });

  const response = await fetcher(`${API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "SalonMaestro/0.1 (Cloudflare Pages cooperative word game)"
    }
  });

  if (!response.ok) return undefined;
  const data = (await response.json()) as WikiResponse;
  return data.query?.pages?.[0];
}

function buildArticleFromPage(page: WikiPage): Article {
  const sections = parseSections(page.extract ?? "");
  const category = cleanCategory(page.categories?.[0]?.title);
  const relatedArticle = page.links?.find((link) => isUsefulLink(link.title))?.title ?? "Article voisin";
  const wordCount = countSectionWords(sections);

  return {
    id: `wiki-${page.pageid}`,
    title: page.title,
    theme: inferTheme(category, page.title),
    category,
    relatedArticle,
    eraPlace: inferEraOrPlace(page.extract ?? ""),
    difficulty: inferDifficulty(wordCount),
    source: "Wikipedia francophone",
    updatedAt: "article charge automatiquement",
    url: page.fullurl,
    provider: "wikipedia",
    sections
  };
}

function parseSections(extract: string): Article["sections"] {
  const paragraphs = extract
    .replace(/\r/g, "")
    .split("\n")
    .map(cleanParagraph)
    .filter(Boolean);
  const body = selectWholeParagraphs(paragraphs, TARGET_ARTICLE_WORDS);

  return [
    {
      heading: "Introduction",
      body
    }
  ];
}

function cleanParagraph(value: string) {
  return value
    .replace(/\[[0-9]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countSectionWords(sections: Article["sections"]) {
  return countWords(sections.flatMap((section) => section.body).join(" "));
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function selectWholeParagraphs(paragraphs: string[], targetWords: number) {
  const selected: string[] = [];
  let wordCount = 0;

  for (const paragraph of paragraphs) {
    selected.push(paragraph);
    wordCount += countWords(paragraph);
    if (wordCount >= targetWords) break;
  }

  return selected;
}

function cleanCategory(value?: string) {
  if (!value) return "Culture generale";
  return value
    .replace(/^Catégorie:/, "")
    .replace(/^Categorie:/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
}

function inferTheme(category: string, title: string) {
  const value = `${category} ${title}`.toLowerCase();
  if (/(science|physique|chimie|biologie|math|astronomie|medecine)/.test(value)) return "Sciences";
  if (/(histoire|siecle|guerre|empire|royaume|revolution)/.test(value)) return "Histoire";
  if (/(film|musique|roman|art|peinture|theatre|litterature)/.test(value)) return "Arts et culture";
  if (/(ville|commune|pays|region|montagne|fleuve|geographie)/.test(value)) return "Geographie";
  if (/(sport|football|rugby|tennis|cyclisme)/.test(value)) return "Sport";
  return "Culture generale";
}

function inferEraOrPlace(extract: string) {
  const year = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[0];
  const place = extract.match(/\b(?:en|a|au|aux)\s+([A-ZÀ-Ö][A-Za-zÀ-ÖØ-öø-ÿ-]{3,}(?:\s+[A-ZÀ-Ö][A-Za-zÀ-ÖØ-öø-ÿ-]{3,})?)/)?.[1];
  if (year && place) return `${year}, ${place}`;
  if (year) return `Autour de ${year}`;
  if (place) return place;
  return "Contexte encyclopedique";
}

function inferDifficulty(wordCount: number): Article["difficulty"] {
  if (wordCount < 120) return 2;
  if (wordCount < 180) return 3;
  if (wordCount < 260) return 4;
  return 5;
}

function isUsefulLink(title: string) {
  return title.length >= 4 && !title.includes(":") && !title.includes("(");
}

function isPlayableArticle(article: Article) {
  const paragraphCount = article.sections.reduce((total, section) => total + section.body.length, 0);
  return (
    article.title.length > 3 &&
    paragraphCount > 0 &&
    countSectionWords(article.sections) >= TARGET_ARTICLE_WORDS &&
    countCandidateWords(article) >= 22
  );
}

export function fallbackArticle(): Article {
  return {
    id: "wikipedia-indisponible",
    title: "Wikipedia indisponible",
    theme: "Technique",
    category: "Service externe",
    relatedArticle: "Wikipedia",
    eraPlace: "Contexte encyclopedique",
    difficulty: 2,
    source: "Message de secours",
    updatedAt: "fallback hors-ligne",
    provider: "fallback" as const,
    sections: [
      {
        heading: "Introduction",
        body: [
          "Wikipedia est momentanement indisponible pour cette room, ou aucun article aleatoire assez long n'a pu etre selectionne apres plusieurs essais. Le jeu attend normalement une introduction encyclopedique d'environ cent mots, composee de paragraphes complets, afin de proposer assez de mots a retrouver sans tronquer le texte original. Relancez un nouvel article dans quelques instants pour tenter un nouveau chargement depuis Wikipedia francophone. Ce texte de secours conserve une manche jouable pendant l'incident, mais il n'est pas destine a remplacer les vrais articles de l'encyclopedie. Les joueurs peuvent continuer a tester les propositions, puis recommencer la manche lorsque la connexion retrouve une page admissible."
        ]
      }
    ]
  };
}
