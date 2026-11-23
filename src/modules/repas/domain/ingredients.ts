// Ingredients: drive aisles, quantities and normalised names. Pure functions.

import { cleanDishName, dishKey } from "./dish-key";

/** Aisles in the order of the Courses U drive. */
export const AISLES = [
  { id: "FRUITS_LEGUMES", label: "Fruits et légumes" },
  { id: "BOUCHERIE_POISSON", label: "Boucherie, volaille, poisson" },
  { id: "CHARCUTERIE_TRAITEUR", label: "Charcuterie, traiteur" },
  { id: "CREMERIE", label: "Crèmerie, œufs, fromages" },
  { id: "EPICERIE_SALEE", label: "Épicerie salée" },
  { id: "EPICERIE_SUCREE", label: "Épicerie sucrée" },
  { id: "SURGELES", label: "Surgelés" },
  { id: "BOULANGERIE", label: "Boulangerie" },
  { id: "BOISSONS", label: "Boissons" },
  { id: "HYGIENE_ENTRETIEN", label: "Hygiène, entretien" },
  { id: "AUTRE", label: "Autre" },
] as const;
export type Aisle = (typeof AISLES)[number]["id"];
export const AISLE_IDS = AISLES.map((aisle) => aisle.id) as [Aisle, ...Aisle[]];

export const UNITS = [
  { id: "PIECE", label: "pièce(s)", short: "×" },
  { id: "G", label: "g", short: "g" },
  { id: "ML", label: "ml", short: "ml" },
] as const;
export type Unit = (typeof UNITS)[number]["id"];
export const UNIT_IDS = UNITS.map((unit) => unit.id) as [Unit, ...Unit[]];

/** Same ingredient whatever the spelling or plural: "Œufs" = "oeuf", "Poireaux" = "poireau". */
export function ingredientKey(name: string): string {
  return dishKey(name)
    .split(" ")
    .map((word) => (word.endsWith("eaux") ? word.slice(0, -1) : word.length > 3 && /[^s]s$/.test(word) ? word.slice(0, -1) : word))
    .join(" ");
}

// First match wins: specific phrases before generic words.
const AISLE_RULES: readonly [RegExp, Aisle][] = [
  [/\b(pain de mie|baguette|pain|croissant|brioche|viennoiserie)\b/, "BOULANGERIE"],
  [/\b(pate (brisee|feuilletee|sablee|a pizza)|pates feuilletees|chair a saucisse)\b/, "CHARCUTERIE_TRAITEUR"],
  [/\b(saucisse fumee|lardon|jambon|chorizo|bacon|rillette|cordons? bleus?|gnocchi|tortellini|ravioli|pates fraiches|knack)/, "CHARCUTERIE_TRAITEUR"],
  [/\b(sauces? tomates?|concentre de tomates?|coulis)\b/, "EPICERIE_SALEE"],
  [/\b(pommes? de terre|patates? douces?|petits? pois)\b/, "FRUITS_LEGUMES"],
  [/\b(boeuf|steak|steack|viande|poulet|hampe|echine|porc|merguez|saucisse|poisson|saumon|dinde|veau|agneau|cote|filet|escalope|piece de)/, "BOUCHERIE_POISSON"],
  [/\b(lait|beurre|creme|oeuf|fromage|gruyere|emmental|mozza|parmesan|feta|yaourt|raclette|comte|chevre|chaource|chausse|reblochon|camembert)/, "CREMERIE"],
  [/\b(glace|surgele|frite)/, "SURGELES"],
  [/\b(salade|mache|tomate|concombre|courgette|carotte|oignon|echalote|ail|poireau|patate|legume|pasteque|melon|citron|pomme|banane|fraise|champignon|poivron|aubergine|avocat|epinard|brocoli|chou|radis|betterave|herbe|persil|basilic)/, "FRUITS_LEGUMES"],
  [/\b(panache|limonade|biere|vin|jus|eau|soda|boisson|grenadine|sirop|coca)\b/, "BOISSONS"],
  [/\b(nutella|sucre|chocolat|confiture|biscuit|gateau|cafe|the|cereale|miel|compote)/, "EPICERIE_SUCREE"],
  [/\b(pate|spaghetti|coquillette|macaroni|riz|semoule|farine|thon|mais|pesto|huile|vinaigre|vinaigrette|mayo|moutarde|ketchup|epice|sel|poivre|lentille|taboul|ratatouille|chips|wrap|bouillon|conserve|olive|tadoki)/, "EPICERIE_SALEE"],
  [/\b(lessive|papier|savon|eponge|liquide vaisselle|sac poubelle|shampo|dentifrice)/, "HYGIENE_ENTRETIEN"],
];

export function guessAisle(name: string): Aisle {
  const key = dishKey(name);
  return AISLE_RULES.find(([pattern]) => pattern.test(key))?.[1] ?? "AUTRE";
}

export type Quantity = { amount: number; unit: Unit };

const PIECE_WORDS = "(?:morceaux?|barquettes?|paquets?|boites?|sachets?|tranches?|pieces?|pots?|bottes?)";

/**
 * Splits a shopping note into name + quantity:
 * "lardons x2" → Lardons 2×, "gruyère 200g" → Gruyère 200 g, "3 poireaux" → Poireaux 3×,
 * "crème 20cl" → Crème 200 ml, "viande 2 morceau" → Viande 2×.
 */
export function parseIngredient(raw: string): { name: string; quantity: Quantity | null } {
  let text = raw.replace(/\?+/g, "").replace(/\s+/g, " ").trim();
  let quantity: Quantity | null = null;
  const take = (pattern: RegExp, toQuantity: (match: RegExpExecArray) => Quantity) => {
    const match = quantity ? null : pattern.exec(text);
    if (!match) return;
    quantity = toQuantity(match);
    text = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, " ").trim();
  };
  const metric = (value: string, unit: string): Quantity => {
    const number = Number(value.replace(",", "."));
    const u = unit.toLowerCase();
    if (u === "kg") return { amount: Math.round(number * 1000), unit: "G" };
    if (u === "g") return { amount: Math.round(number), unit: "G" };
    if (u === "l") return { amount: Math.round(number * 1000), unit: "ML" };
    if (u === "cl") return { amount: Math.round(number * 10), unit: "ML" };
    return { amount: Math.round(number), unit: "ML" };
  };
  take(/(\d+(?:[.,]\d+)?)\s*(kg|g|cl|ml|l)\b/i, (m) => metric(m[1] ?? "0", m[2] ?? "g"));
  take(/\bx\s*(\d+)\b|\b(\d+)\s*x\b|\((\d+)x?\)/i, (m) => ({ amount: Number(m[1] ?? m[2] ?? m[3]), unit: "PIECE" }));
  take(new RegExp(`\\b(\\d+)\\s*${PIECE_WORDS}\\b(?:\\s*de\\b)?`, "i"), (m) => ({ amount: Number(m[1]), unit: "PIECE" }));
  take(/^(\d+)\s+/, (m) => ({ amount: Number(m[1]), unit: "PIECE" }));
  const name = cleanDishName(text.replace(/^(de|d')\s*/i, "").replace(/[-+,]+$/, "").trim());
  return { name, quantity: quantity && (quantity as Quantity).amount > 0 ? quantity : null };
}

export function formatQuantity(amount: number | null, unit: Unit): string {
  if (amount === null) return "";
  if (unit === "G") return amount >= 1000 && amount % 100 === 0 ? `${(amount / 1000).toLocaleString("fr-FR")} kg` : `${amount} g`;
  if (unit === "ML") return amount >= 1000 && amount % 100 === 0 ? `${(amount / 1000).toLocaleString("fr-FR")} l` : amount % 10 === 0 ? `${amount / 10} cl` : `${amount} ml`;
  return `×${amount}`;
}

/** Likely duplicates: same key once side items ("+ salade", "concombre +") are removed, or one name inside the other. */
export function findLikelyDuplicates<T extends { id: string; name: string; count: number }>(dishes: readonly T[]): Map<string, T> {
  const core = (name: string) =>
    dishKey(name)
      .replace(/\b(\+ )?(salade|concombre|legumes|chips)( \+)?\b/g, " ")
      .replace(/\b(revisite|v2|maison|au four)\b/g, " ")
      .replace(/[+&/,-]/g, " ")
      .split(" ")
      .filter((word) => word.length > 1 && !["au", "aux", "a", "et", "de", "la", "le", "les"].includes(word))
      .map((word) => ingredientKey(word))
      .sort()
      .join(" ");
  const result = new Map<string, T>();
  const cores = dishes.map((dish) => ({ dish, core: core(dish.name) }));
  for (const { dish, core: mine } of cores) {
    if (!mine) continue;
    const twin = cores
      .filter((other) => other.dish.id !== dish.id && other.core === mine)
      .sort((a, b) => b.dish.count - a.dish.count)[0];
    // Point the less-eaten dish at the most-eaten one.
    if (twin && (twin.dish.count > dish.count || (twin.dish.count === dish.count && twin.dish.name < dish.name))) {
      result.set(dish.id, twin.dish);
    }
  }
  return result;
}
