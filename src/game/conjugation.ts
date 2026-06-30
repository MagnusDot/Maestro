import { getConjugation, type Tense } from "french-verbs";
import type { GendersMF, Numbers } from "french-verbs";
import type { VerbsInfo } from "french-verbs-lefff";
import conjugations from "french-verbs-lefff/dist/conjugations.json";
import { normalizeToken, normalizeWord } from "./normalize";

const VERBS = conjugations as VerbsInfo;
const CONJUGATED_TENSES: readonly Tense[] = [
  "PRESENT",
  "FUTUR",
  "IMPARFAIT",
  "PASSE_SIMPLE",
  "CONDITIONNEL_PRESENT",
  "IMPERATIF_PRESENT",
  "SUBJONCTIF_PRESENT",
  "SUBJONCTIF_IMPARFAIT",
  "INFINITIF",
  "PARTICIPE_PRESENT"
];
const PAST_PARTICIPLE_AGREEMENTS: readonly [GendersMF, Numbers][] = [
  ["M", "S"],
  ["M", "P"],
  ["F", "S"],
  ["F", "P"]
];
const verbByNormalizedInfinitive = createVerbIndex(VERBS);

export function expandInfinitiveVerbGuess(value: string) {
  const normalized = normalizeToken(value);
  if (!normalized) return new Set<string>();

  const infinitive = verbByNormalizedInfinitive.get(normalized);
  if (!infinitive) return new Set([normalized]);

  const forms = new Set<string>([normalized]);
  CONJUGATED_TENSES.forEach((tense) => {
    for (let person = 0; person < 6; person += 1) {
      addForm(forms, conjugate(infinitive, tense, person));
    }
  });
  PAST_PARTICIPLE_AGREEMENTS.forEach(([agreeGender, agreeNumber]) => {
    addForm(
      forms,
      conjugate(infinitive, "PARTICIPE_PASSE", 0, {
        aux: "AVOIR",
        agreeGender,
        agreeNumber
      })
    );
  });

  return forms;
}

function createVerbIndex(verbs: VerbsInfo) {
  const index = new Map<string, string>();
  ["avoir", "être", ...Object.keys(verbs)].forEach((verb) => {
    index.set(normalizeToken(verb), verb);
  });
  return index;
}

function conjugate(
  infinitive: string,
  tense: Tense,
  person: number,
  options: Parameters<typeof getConjugation>[4] = {}
) {
  try {
    return getConjugation(VERBS, infinitive, tense, person, options, false, undefined, undefined, "Act");
  } catch {
    return "";
  }
}

function addForm(forms: Set<string>, form: string) {
  normalizeWord(form)
    .split(" ")
    .map(normalizeToken)
    .filter(Boolean)
    .forEach((token) => forms.add(token));
}
