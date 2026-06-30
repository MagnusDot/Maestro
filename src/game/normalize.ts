export function normalizeWord(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[-‐‑‒–—]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeToken(value: string) {
  return normalizeWord(value).replace(/[^a-z0-9]/g, "");
}

export function isAutoVisibleWord(word: string) {
  return normalizeToken(word).length === 0;
}

export function splitText(value: string) {
  return value.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:[’'][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?|\s+|[^\sA-Za-zÀ-ÖØ-öø-ÿ0-9]/g) ?? [];
}

export function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function wordSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const distance = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  const base = Math.round((1 - distance / longest) * 100);
  const prefixBonus = a[0] === b[0] ? 8 : 0;
  return Math.max(0, Math.min(99, base + prefixBonus));
}
