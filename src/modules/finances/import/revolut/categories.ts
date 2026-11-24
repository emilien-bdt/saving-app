import { normalizeLabel } from "../../domain/labels";
import type { LabelSuggestion } from "../../domain/suggestions";
import type { CategoryKind } from "../../domain/types";

export type ImportCategory = { id: string; name: string; kind: CategoryKind; archived: boolean };

/** How the category of an imported operation was chosen (shown in the preview). */
export type CategorySource = "history" | "keyword" | "default";

export type CategoryGuess = { categoryId: string; source: CategorySource } | null;

/** Common merchants → default category name (seed, see default-categories.ts). Used when the history knows nothing. */
const KEYWORDS: { words: string[]; category: string }[] = [
  {
    words: [
      "carrefour", "magasin u", "super u", "hyper u", "leclerc", "auchan", "lidl", "aldi", "intermarche", "monoprix",
      "franprix", "casino", "coccinelle", "picard", "biocoop", "boulangerie", "grand frais", "netto",
    ],
    category: "Courses, alimentation, repas travail",
  },
  {
    words: ["uber eats", "deliveroo", "just eat", "restaurant", "brasserie", "bar ", "cinema", "pathe", "mcdonald", "burger king", "kfc"],
    category: "Sorties, bar, restaurant, loisirs",
  },
  {
    words: ["station service", "total", "esso", "shell", "bp ", "sncf", "ouigo", "blablacar", "parking", "peage", "uber", "twisto", "indigo"],
    category: "Voiture, déplacement, parking",
  },
  {
    words: ["spotify", "netflix", "deezer", "disney", "apple", "google", "amazon prime", "canal", "free mobile", "sfr", "orange", "bouygues", "sosh", "red by"],
    category: "Abonnements",
  },
  { words: ["edf", "engie", "loyer", "assurance", "maif", "macif", "veolia", "eau "], category: "Logement, charges, assurances" },
  { words: ["impot", "dgfip", "tresor public", "frais"], category: "Crédits, impôts, frais bancaires" },
];

const FALLBACK: Record<CategoryKind, string> = { EXPENSE: "Autres dépenses", INCOME: "Apports" };

/**
 * Category of a new imported operation:
 * 1. the usual category of the same label in the history (or of a label starting with the same words);
 * 2. a keyword of a common merchant;
 * 3. « Autres dépenses » / « Apports ».
 */
export function guessCategory(
  label: string,
  kind: CategoryKind,
  suggestions: readonly LabelSuggestion[],
  categories: readonly ImportCategory[],
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
    const padded = ` ${labelKey} `;
    for (const rule of KEYWORDS) {
      if (rule.words.some((word) => padded.includes(` ${word.trim()} `))) {
        const category = byName(rule.category);
        if (category) return { categoryId: category.id, source: "keyword" };
      }
    }
  }
  const fallback = byName(FALLBACK[kind]);
  return fallback ? { categoryId: fallback.id, source: "default" } : null;
}
