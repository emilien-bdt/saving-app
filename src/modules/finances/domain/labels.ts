/**
 * Normalized key used to group repeated purchases and to suggest labels:
 * "Carrefour - Hérouville " → "carrefour herouville".
 */
export function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}
