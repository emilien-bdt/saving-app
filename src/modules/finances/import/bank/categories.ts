import { normalizeLabel } from "../../domain/labels";
import type { LabelSuggestion } from "../../domain/suggestions";
import type { CategoryKind } from "../../domain/types";

export type ImportCategory = { id: string; name: string; kind: CategoryKind; archived: boolean };

/** How the category of an imported operation was chosen (shown in the preview). */
export type CategorySource = "history" | "keyword" | "default";

export type CategoryGuess = { categoryId: string; source: CategorySource } | null;

const COURSES = "Courses, alimentation, repas travail";
const SORTIES = "Sorties, bar, restaurant, loisirs";
const DEPLACEMENTS = "Voiture, déplacement, parking";
const ABONNEMENTS = "Abonnements";
const LOGEMENT = "Logement, charges, assurances";
const CREDITS = "Crédits, impôts, frais bancaires";

/** Common merchants → default category name (seed, see default-categories.ts). Used when the history knows nothing. */
const KEYWORDS: { words: string[]; category: string }[] = [
  {
    words: [
      "carrefour", "magasin u", "super u", "hyper u", "leclerc", "auchan", "lidl", "aldi", "intermarche", "monoprix",
      "franprix", "casino", "coccinelle", "picard", "biocoop", "boulangerie", "grand frais", "netto",
    ],
    category: COURSES,
  },
  {
    words: ["uber eats", "deliveroo", "just eat", "restaurant", "brasserie", "bar", "cinema", "pathe", "mcdonald", "burger king", "kfc"],
    category: SORTIES,
  },
  {
    words: ["station service", "total", "esso", "shell", "bp", "sncf", "ouigo", "blablacar", "parking", "peage", "uber", "twisto", "indigo"],
    category: DEPLACEMENTS,
  },
  {
    words: ["spotify", "netflix", "deezer", "disney", "apple", "google", "amazon prime", "canal", "free mobile", "sfr", "orange", "bouygues", "sosh", "red by"],
    category: ABONNEMENTS,
  },
  { words: ["edf", "engie", "loyer", "assurance", "maif", "macif", "veolia", "eau"], category: LOGEMENT },
  { words: ["impot", "impots", "dgfip", "tresor public", "frais", "cotisation"], category: CREDITS },
];

/** Words of a bank category (BoursoBank « Alimentation », « Carburant »…) → default category name. */
const BANK_CATEGORY_WORDS: { words: string[]; category: string }[] = [
  { words: ["alimentation", "supermarche", "hypermarche", "epicerie", "courses"], category: COURSES },
  { words: ["restaurant", "restaurants", "bar", "bars", "sorties", "loisirs", "spectacles", "cinema", "voyages", "vacances", "sport"], category: SORTIES },
  { words: ["carburant", "transports", "transport", "auto", "moto", "peage", "parking", "train", "taxi", "vehicule"], category: DEPLACEMENTS },
  { words: ["abonnements", "abonnement", "telephone", "internet", "multimedia", "streaming", "telecom"], category: ABONNEMENTS },
  { words: ["logement", "loyer", "energie", "electricite", "gaz", "eau", "assurance", "assurances", "habitation"], category: LOGEMENT },
  { words: ["impots", "impot", "taxes", "frais bancaires", "banque", "credit", "credits"], category: CREDITS },
];

const FALLBACK: Record<CategoryKind, string> = { EXPENSE: "Autres dépenses", INCOME: "Apports" };

const hasWord = (text: string, words: readonly string[]) => {
  const padded = ` ${normalizeLabel(text)} `;
  return words.some((word) => padded.includes(` ${word} `));
};

/**
 * Category of a new imported operation:
 * 1. the usual category of the same label in the history (or of a label starting with the same words);
 * 2. the category given by the bank (BoursoBank), then a keyword of a common merchant;
 * 3. « Autres dépenses » / « Apports ».
 */
export function guessCategory(
  label: string,
  kind: CategoryKind,
  suggestions: readonly LabelSuggestion[],
  categories: readonly ImportCategory[],
  bankCategory: string | null = null,
): CategoryGuess {
  const usable = new Map(categories.filter((category) => !category.archived && category.kind === kind).map((category) => [category.id, category]));
  const labelKey = normalizeLabel(label);
  const candidates = suggestions.filter(
    (suggestion) => suggestion.type === kind && suggestion.categoryId !== null && usable.has(suggestion.categoryId),
  );

  const exact = candidates.find((suggestion) => suggestion.labelKey === labelKey);
  if (exact?.categoryId) return { categoryId: exact.categoryId, source: "history" };
  if (labelKey.length >= 3) {
    const partial = candidates
      .filter((suggestion) => suggestion.labelKey.startsWith(`${labelKey} `) || labelKey.startsWith(`${suggestion.labelKey} `))
      .sort((a, b) => b.count - a.count)[0];
    if (partial?.categoryId) return { categoryId: partial.categoryId, source: "history" };
  }

  const byName = (name: string) => [...usable.values()].find((category) => category.name === name);
  if (kind === "EXPENSE") {
    // The bank's category first (BoursoBank's are reliable), then the merchant keywords.
    const rules = [
      ...(bankCategory ? BANK_CATEGORY_WORDS.map((rule) => ({ rule, text: bankCategory })) : []),
      ...KEYWORDS.map((rule) => ({ rule, text: label })),
    ];
    for (const { rule, text } of rules) {
      if (hasWord(text, rule.words)) {
        const category = byName(rule.category);
        if (category) return { categoryId: category.id, source: "keyword" };
      }
    }
  }
  const fallback = byName(FALLBACK[kind]);
  return fallback ? { categoryId: fallback.id, source: "default" } : null;
}
