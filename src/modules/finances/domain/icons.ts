/** Icon names stored in the database for accounts and categories (rendered by components/category-icon). */
export const ICON_NAMES = [
  "wallet",
  "piggy-bank",
  "landmark",
  "shield",
  "house",
  "car",
  "plane",
  "gift",
  "briefcase",
  "graduation-cap",
  "credit-card",
  "hand-coins",
  "party-popper",
  "repeat",
  "shapes",
  "shopping-cart",
  "utensils",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** Icons offered for accounts and pockets (the first ones of the list). */
export const ACCOUNT_ICON_NAMES: readonly IconName[] = ICON_NAMES.slice(0, 11);

/** Preset colors offered in the editors (any #rrggbb is accepted). */
export const PRESET_COLORS = ["#2563eb", "#15803d", "#16a34a", "#0d9488", "#0891b2", "#9333ea", "#db2777", "#ea580c", "#ca8a04", "#64748b"] as const;
