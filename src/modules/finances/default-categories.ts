import type { CategoryKind } from "./domain/types";

/**
 * Default categories (seed) — the same names as the blocks of the former
 * Excel file, which the import relies on (through their key).
 */
export type DefaultCategoryKey =
  | "APPORTS"
  | "TICKETS_RESTAURANT"
  | "CHARGES_FIXES"
  | "LOGEMENT"
  | "ABONNEMENTS"
  | "CREDITS"
  | "COURSES"
  | "SORTIES"
  | "DEPLACEMENTS"
  | "AUTRES";

export type DefaultCategory = {
  key: DefaultCategoryKey;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  parentKey?: DefaultCategoryKey;
};

/** Parents come before their children. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: "APPORTS", name: "Apports", kind: "INCOME", color: "#16a34a", icon: "hand-coins" },
  { key: "TICKETS_RESTAURANT", name: "Tickets restaurant", kind: "INCOME", color: "#65a30d", icon: "utensils" },
  { key: "CHARGES_FIXES", name: "Charges fixes", kind: "EXPENSE", color: "#7c3aed", icon: "house" },
  { key: "LOGEMENT", name: "Logement, charges, assurances", kind: "EXPENSE", color: "#7c3aed", icon: "house", parentKey: "CHARGES_FIXES" },
  { key: "ABONNEMENTS", name: "Abonnements", kind: "EXPENSE", color: "#7c3aed", icon: "repeat", parentKey: "CHARGES_FIXES" },
  { key: "CREDITS", name: "Crédits, impôts, frais bancaires", kind: "EXPENSE", color: "#7c3aed", icon: "landmark", parentKey: "CHARGES_FIXES" },
  { key: "COURSES", name: "Courses, alimentation, repas travail", kind: "EXPENSE", color: "#ea580c", icon: "shopping-cart" },
  { key: "SORTIES", name: "Sorties, bar, restaurant, loisirs", kind: "EXPENSE", color: "#db2777", icon: "party-popper" },
  { key: "DEPLACEMENTS", name: "Voiture, déplacement, parking", kind: "EXPENSE", color: "#0891b2", icon: "car" },
  { key: "AUTRES", name: "Autres dépenses", kind: "EXPENSE", color: "#64748b", icon: "shapes" },
];
