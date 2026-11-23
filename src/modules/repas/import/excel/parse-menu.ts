// Parsing of the weekly menu workbooks ("repas-DD-MM-YY.xlsx").
//
// Layout (one sheet): a header row with "Midi" / "Soir", then one block of two
// rows per day (Lundi … Dimanche, sometimes + Lundi/Mardi of the next week).
// Column D = day name, E:F (merged) = lunch, G:H (merged) = dinner, I and
// beyond = shopping notes for that week. The workbook reader is injected as a
// plain grid so this module stays pure and testable.

import { cleanDishName, dishKey } from "../../domain/dish-key";
import {
  type MealSlot,
  addDays,
  nearestMonday,
  previousSlot,
  slotKey,
  toIsoDate,
  utcDate,
  weekdayIndex,
} from "../../domain/week";

/** row number → column letters → cell text (only non-empty cells). */
export type SheetGrid = ReadonlyMap<number, ReadonlyMap<string, string>>;

export type ParsedMeal =
  | { kind: "DISH"; date: Date; slot: MealSlot; dishName: string; note: string | null }
  | { kind: "LEFTOVER"; date: Date; slot: MealSlot; dishName: string | null; hint: string | null; note: string | null }
  | { kind: "OUT"; date: Date; slot: MealSlot; label: string; note: string | null };

export type ParsedShoppingLine = { weekStart: Date; date: Date; label: string };

export type ParsedMenuFile = {
  weekStart: Date;
  meals: ParsedMeal[];
  shopping: ParsedShoppingLine[];
  warnings: string[];
};

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function columnIndex(letters: string): number {
  let index = 0;
  for (const char of letters.toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64);
  return index;
}

/**
 * "repas-20-10-25.xlsx", "repas-3-11-25.xlsx" → nearest Monday of that date.
 * "planning-menu-17-11.xlsx" has no year: `fallbackYear` is used.
 */
export function weekStartFromFileName(fileName: string, fallbackYear?: number): Date | null {
  const match = /(?:^|\D)(\d{1,2})-(\d{1,2})(?:-(\d{2}))?(?=\D*$)/.exec(fileName.replace(/\.xlsx?m?$/i, ""));
  if (!match) return null;
  const year = match[3] ? 2000 + Number(match[3]) : fallbackYear;
  if (year === undefined) return null;
  const date = utcDate(year, Number(match[2]), Number(match[1]));
  if (date.getUTCDate() !== Number(match[1]) || date.getUTCMonth() + 1 !== Number(match[2])) return null;
  return nearestMonday(date);
}

const OUT_PATTERNS: readonly RegExp[] = [
  /^noel\b/,
  /^jour de l'an/,
  /^restaurant\b/,
  /^anniv/,
  /^lycee\b/,
  /^appartement\b/,
  /^match\b/,
  /^chez\b/,
  /^(maman|papa|papy|mamie)\b/,
];

const ZOE = /\bzoe\b/;

type Classified =
  | { kind: "DISH"; dishName: string; note: string | null }
  | { kind: "LEFTOVER"; hint: string | null; note: string | null }
  | { kind: "OUT"; label: string; note: string | null }
  | null;

/** Turns one lunch/dinner cell into a meal (null = nothing planned). */
export function classifyMealCell(raw: string): Classified {
  let text = raw.trim();
  let note: string | null = null;

  // "zoe : …", "(zoë)", "reste zoë" → meal also for Zoë, kept as a note.
  const zoePrefix = /^zo[eë]\s*:\s*/i;
  if (zoePrefix.test(text)) {
    text = text.replace(zoePrefix, "");
    note = "Zoë";
  }
  if (/\(\s*zo[eë]\s*\)/i.test(text)) {
    text = text.replace(/\s*\(\s*zo[eë]\s*\)\s*/gi, " ").trim();
    note = "Zoë";
  }
  // Unclosed parenthesis = free comment ("steak (+ lendemain midi").
  if (text.includes("(") && !text.includes(")")) {
    note = text.slice(text.indexOf("(") + 1).replace(/^\+\s*/, "").trim() || note;
    text = text.slice(0, text.indexOf("(")).trim();
  }

  // "pates au pesto (reste)" = leftover of "pates au pesto".
  if (/\(\s*reste\s*\)/i.test(text)) {
    const hint = dishKey(text.replace(/\s*\(\s*reste\s*\)\s*/gi, " "));
    return { kind: "LEFTOVER", hint: hint === "" ? null : hint, note };
  }

  const key = dishKey(text);
  if (key === "" || key === "?" || key.length < 2 && key !== "x") return null;
  if (key === "x") return { kind: "OUT", label: "Absent", note };

  if (key.startsWith("reste")) {
    let hint = key.replace(/^reste\b/, "").replace(/^[\s|:\-–]+/, "");
    if (ZOE.test(hint)) {
      note = "Zoë";
      hint = hint.replace(ZOE, "");
    }
    hint = hint
      .replace(/\(.*?\)/g, "")
      .replace(/^(de la veille|de|du|des)\b/, "")
      .replace(/^[\s|:\-–]+/, "")
      .trim();
    return { kind: "LEFTOVER", hint: hint === "" ? null : hint, note };
  }

  if (OUT_PATTERNS.some((pattern) => pattern.test(key))) {
    return { kind: "OUT", label: cleanDishName(text), note };
  }
  return { kind: "DISH", dishName: cleanDishName(text), note };
}

/** "chorizo - feta + lait, pain" → ["Chorizo", "Feta", "Lait", "Pain"]. */
export function splitShoppingCell(raw: string): string[] {
  return raw
    .split(/\s*[+,/]\s*|\s+-\s+|\s*&\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part !== "??")
    .map(cleanDishName);
}

export function parseMenuSheet(grid: SheetGrid, fileName: string, fallbackYear?: number): ParsedMenuFile {
  const warnings: string[] = [];
  const weekStart = weekStartFromFileName(fileName, fallbackYear);
  if (!weekStart) {
    return { weekStart: utcDate(1970, 1, 1), meals: [], shopping: [], warnings: [`${fileName} : date introuvable dans le nom du fichier`] };
  }

  const rows = [...grid.keys()].sort((a, b) => a - b);
  let headerRow: number | null = null;
  let lunchCol: string | null = null;
  let dinnerCol: string | null = null;
  for (const row of rows) {
    for (const [col, value] of grid.get(row) ?? []) {
      const key = dishKey(value);
      if (key === "midi") lunchCol = col;
      if (key === "soir") dinnerCol = col;
    }
    if (lunchCol && dinnerCol) {
      headerRow = row;
      break;
    }
    lunchCol = dinnerCol = null;
  }
  if (headerRow === null || !lunchCol || !dinnerCol) {
    return { weekStart, meals: [], shopping: [], warnings: [`${fileName} : en-têtes « Midi » / « Soir » introuvables`] };
  }
  const shoppingFrom = Math.max(columnIndex(lunchCol), columnIndex(dinnerCol)) + 2;

  // Day blocks: a row whose cell before the lunch column is a day name.
  type DayBlock = { row: number; dayIndex: number };
  const blocks: DayBlock[] = [];
  for (const row of rows) {
    if (row <= headerRow) continue;
    for (const [col, value] of grid.get(row) ?? []) {
      const dayIndex = DAY_NAMES.indexOf(dishKey(value));
      if (dayIndex >= 0 && columnIndex(col) < columnIndex(lunchCol)) {
        blocks.push({ row, dayIndex });
        break;
      }
    }
  }

  const meals: ParsedMeal[] = [];
  const shopping: ParsedShoppingLine[] = [];
  let previousDate: Date | null = null;
  blocks.forEach((block, i) => {
    // First block: first matching weekday from the Monday; then the next one.
    const from: Date = previousDate ? addDays(previousDate, 1) : weekStart;
    const date = addDays(from, (block.dayIndex - weekdayIndex(from) + 7) % 7);
    previousDate = date;
    const endRow = blocks[i + 1]?.row ?? Number.POSITIVE_INFINITY;

    for (const [slot, col] of [["LUNCH", lunchCol], ["DINNER", dinnerCol]] as const) {
      const value = grid.get(block.row)?.get(col);
      if (value === undefined) continue;
      const classified = classifyMealCell(value);
      if (!classified) {
        if (dishKey(value) !== "?") warnings.push(`${fileName} : ${toIsoDate(date)} ${slot} ignoré (« ${value.trim()} »)`);
        continue;
      }
      if (classified.kind === "LEFTOVER") {
        meals.push({ kind: "LEFTOVER", date, slot, dishName: null, hint: classified.hint, note: classified.note });
      } else if (classified.kind === "OUT") {
        meals.push({ kind: "OUT", date, slot, label: classified.label, note: classified.note });
      } else {
        meals.push({ kind: "DISH", date, slot, dishName: classified.dishName, note: classified.note });
      }
    }

    for (const row of rows) {
      if (row < block.row || row >= endRow) continue;
      for (const [col, value] of grid.get(row) ?? []) {
        if (columnIndex(col) < shoppingFrom) continue;
        for (const label of splitShoppingCell(value)) shopping.push({ weekStart, date, label });
      }
    }
  });

  return { weekStart, meals, shopping, warnings };
}

const pushMeal = (meals: ParsedMeal[], date: Date, slot: MealSlot, value: string): boolean => {
  const classified = classifyMealCell(value);
  if (!classified) return false;
  if (classified.kind === "LEFTOVER") meals.push({ kind: "LEFTOVER", date, slot, dishName: null, hint: classified.hint, note: classified.note });
  else if (classified.kind === "OUT") meals.push({ kind: "OUT", date, slot, label: classified.label, note: classified.note });
  else meals.push({ kind: "DISH", date, slot, dishName: classified.dishName, note: classified.note });
  return true;
};

/**
 * "planning-menu-JJ-MM.xlsx" (sheet "Planning menus en ligne"): days in
 * columns (Lundi … Dimanche on one row), sections "Midi" / "Soir" with
 * Entrée / Plat / Dessert rows; only "Plat" is kept. Rows below the last
 * section are the week's shopping, column = day.
 */
export function parsePlanningSheet(grid: SheetGrid, fileName: string, fallbackYear?: number): ParsedMenuFile {
  const weekStart = weekStartFromFileName(fileName, fallbackYear);
  if (!weekStart) {
    return { weekStart: utcDate(1970, 1, 1), meals: [], shopping: [], warnings: [`${fileName} : date introuvable dans le nom du fichier`] };
  }
  const warnings: string[] = [];
  const rows = [...grid.keys()].sort((a, b) => a - b);

  // Row of day names → column of each day.
  const dayColumns = new Map<string, number>();
  let daysRow = -1;
  for (const row of rows) {
    for (const [col, value] of grid.get(row) ?? []) {
      const dayIndex = DAY_NAMES.indexOf(dishKey(value));
      if (dayIndex >= 0 && !dayColumns.has(col)) dayColumns.set(col, dayIndex);
    }
    if (dayColumns.size >= 7) {
      daysRow = row;
      break;
    }
    dayColumns.clear();
  }
  if (daysRow < 0) return { weekStart, meals: [], shopping: [], warnings: [`${fileName} : ligne des jours introuvable`] };
  const firstDayCol = Math.min(...[...dayColumns.keys()].map(columnIndex));

  const meals: ParsedMeal[] = [];
  const shopping: ParsedShoppingLine[] = [];
  let section: MealSlot | null = null;
  let lastSectionRow = daysRow;
  for (const row of rows) {
    if (row <= daysRow) continue;
    const cells = grid.get(row) ?? new Map<string, string>();
    const labels = [...cells.entries()].filter(([col]) => columnIndex(col) < firstDayCol).map(([, v]) => dishKey(v));
    if (labels.includes("midi")) section = "LUNCH";
    if (labels.includes("soir")) section = "DINNER";
    if (labels.some((label) => ["midi", "soir", "entree", "plat", "dessert"].includes(label))) lastSectionRow = row;
    if (!section || !labels.includes("plat")) continue;
    for (const [col, value] of cells) {
      const dayIndex = dayColumns.get(col);
      if (dayIndex === undefined) continue;
      const date = addDays(weekStart, dayIndex);
      if (!pushMeal(meals, date, section, value) && dishKey(value) !== "?") {
        warnings.push(`${fileName} : ${toIsoDate(date)} ${section} ignoré (« ${value.trim()} »)`);
      }
    }
  }
  for (const row of rows) {
    if (row <= lastSectionRow) continue;
    for (const [col, value] of grid.get(row) ?? []) {
      const dayIndex = dayColumns.get(col);
      if (dayIndex === undefined) continue;
      for (const label of splitShoppingCell(value)) shopping.push({ weekStart, date: addDays(weekStart, dayIndex), label });
    }
  }
  return { weekStart, meals, shopping, warnings };
}

export type ResolvedMeal =
  | { kind: "DISH" | "LEFTOVER"; date: Date; slot: MealSlot; dishName: string; note: string | null }
  | { kind: "OUT"; date: Date; slot: MealSlot; label: string; note: string | null };

/**
 * Merges several files (a later week overrides an earlier one on the same
 * slot) and resolves leftovers:
 * - "reste" alone → the meal just before;
 * - "reste gratin" → the most recent dish (within 3 days) containing "gratin",
 *   otherwise a dish named after the hint;
 * - a lunch identical to the previous dinner is a leftover of it.
 */
export function mergeAndResolve(files: readonly ParsedMenuFile[]): { meals: ResolvedMeal[]; warnings: string[] } {
  const warnings: string[] = [];
  const bySlot = new Map<string, ParsedMeal>();
  const sorted = [...files].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  for (const file of sorted) for (const meal of file.meals) bySlot.set(slotKey(meal), meal);

  const chronological = [...bySlot.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || (a.slot === "LUNCH" ? -1 : 1) - (b.slot === "LUNCH" ? -1 : 1),
  );

  const resolved = new Map<string, ResolvedMeal>();
  const dishBefore = (meal: ParsedMeal, lookBack: number, matches: (key: string) => boolean): string | null => {
    let ref = previousSlot(meal);
    for (let i = 0; i < lookBack; i++) {
      const found = resolved.get(slotKey(ref));
      if (found && found.kind !== "OUT" && matches(dishKey(found.dishName))) return found.dishName;
      ref = previousSlot(ref);
    }
    return null;
  };

  for (const meal of chronological) {
    const key = slotKey(meal);
    if (meal.kind === "OUT") {
      resolved.set(key, meal);
      continue;
    }
    if (meal.kind === "DISH") {
      const isLeftover =
        meal.slot === "LUNCH" && dishBefore(meal, 1, (k) => k === dishKey(meal.dishName)) !== null;
      resolved.set(key, { ...meal, kind: isLeftover ? "LEFTOVER" : "DISH" });
      continue;
    }
    const hint = meal.hint;
    const dishName = hint
      ? (dishBefore(meal, 6, (k) => k.includes(hint)) ?? cleanDishName(hint))
      : dishBefore(meal, 2, () => true);
    if (!dishName) {
      warnings.push(`${toIsoDate(meal.date)} ${meal.slot} : reste sans plat d'origine, ignoré`);
      continue;
    }
    resolved.set(key, { kind: "LEFTOVER", date: meal.date, slot: meal.slot, dishName, note: meal.note });
  }

  return { meals: [...resolved.values()], warnings };
}

/** Catalogue: one dish per key, named after its most frequent spelling. */
export function buildDishCatalogue(meals: readonly ResolvedMeal[]): Map<string, string> {
  const spellings = new Map<string, Map<string, number>>();
  for (const meal of meals) {
    if (meal.kind === "OUT") continue;
    const key = dishKey(meal.dishName);
    const counts = spellings.get(key) ?? new Map<string, number>();
    counts.set(meal.dishName, (counts.get(meal.dishName) ?? 0) + 1);
    spellings.set(key, counts);
  }
  const catalogue = new Map<string, string>();
  for (const [key, counts] of spellings) {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (best) catalogue.set(key, best[0]);
  }
  return catalogue;
}
