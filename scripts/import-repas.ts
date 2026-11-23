/**
 * Imports the former weekly menu workbooks:
 * - "repas-JJ-MM-AA.xlsx" (one block of two rows per day);
 * - "planning-menu-JJ-MM.xlsx" (days in columns, sheet "Planning menus en ligne"); no
 *   year in the name: the year of the file's modification date is used.
 *   npm run import:repas -- --dry-run ~/Documents/Repas/*.xlsx
 */
import "dotenv/config";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { readWorkbook } from "../src/modules/finances/import/excel/xlsx";
import { suggestDishIngredients } from "../src/modules/repas/domain/ingredient-suggestions";
import { toIsoDate } from "../src/modules/repas/domain/week";
import {
  buildDishCatalogue,
  mergeAndResolve,
  type ParsedMenuFile,
  parseMenuSheet,
  parsePlanningSheet,
  type SheetGrid,
} from "../src/modules/repas/import/excel/parse-menu";

const USAGE = `Usage : npm run import:repas -- [--dry-run] [--replace] repas-20-10-25.xlsx repas-17-11-25.xlsx …
  --dry-run   affiche le rapport sans rien écrire en base
  --replace   supprime d'abord les repas importés (les saisies de l'app sont conservées)
La semaine est lue dans le nom du fichier (JJ-MM-AA ou JJ-MM, ramené au lundi le plus proche) ;
sans année, celle de la date de modification du fichier.`;

const KNOWN_FLAGS = new Set(["--dry-run", "--replace", "--help"]);

const PLANNING_SHEET = "Planning menus en ligne";

/** One sheet of the workbook as row → column → text (default: the first one). */
function toGrid(path: string, sheetName?: string): SheetGrid {
  const workbook = readWorkbook(readFileSync(path));
  const sheet = (sheetName ? workbook.sheets.get(sheetName) : undefined) ?? [...workbook.sheets.values()][0];
  const grid = new Map<number, Map<string, string>>();
  for (const [ref, cell] of sheet ?? []) {
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    const text = cell.value === null ? "" : String(cell.value).trim();
    if (!match || text === "") continue;
    const row = Number(match[2]);
    const columns = grid.get(row) ?? new Map<string, string>();
    columns.set(match[1] ?? "", text);
    grid.set(row, columns);
  }
  return grid;
}

/** A name without year ("17-11") belongs to the last such date before the file was saved. */
function yearFor(path: string, fileName: string): number {
  const saved = statSync(path).mtime;
  const match = /(\d{1,2})-(\d{1,2})(?=\D*$)/.exec(fileName);
  const year = saved.getFullYear();
  if (!match) return year;
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  return date.getTime() - saved.getTime() > 14 * 86_400_000 ? year - 1 : year;
}

function parseFile(path: string): ParsedMenuFile {
  const fileName = basename(path);
  if (/^planning-menu/i.test(fileName)) {
    return parsePlanningSheet(toGrid(path, PLANNING_SHEET), fileName, yearFor(path, fileName));
  }
  return parseMenuSheet(toGrid(path), fileName);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const paths = args.filter((arg) => !arg.startsWith("--"));
  const unknownFlags = [...flags].filter((flag) => !KNOWN_FLAGS.has(flag));
  if (flags.has("--help") || paths.length === 0 || unknownFlags.length > 0) {
    if (unknownFlags.length > 0) console.error(`Option inconnue : ${unknownFlags.join(", ")}`);
    console.error(USAGE);
    return flags.has("--help") && unknownFlags.length === 0 ? 0 : 1;
  }

  const parsed = paths.map(parseFile);
  const files = parsed.filter((file) => file.meals.length > 0);
  const skipped = parsed.filter((file) => file.meals.length === 0);
  const { meals, warnings } = mergeAndResolve(files);
  const catalogue = buildDishCatalogue(meals);
  const count = (kind: string) => meals.filter((meal) => meal.kind === kind).length;

  console.log(`${files.length} fichiers lus`);
  for (const file of [...files].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())) {
    console.log(`  • semaine du ${toIsoDate(file.weekStart)} : ${file.meals.length} repas, ${file.shopping.length} lignes de courses`);
  }
  console.log(`\n${meals.length} repas : ${count("DISH")} plats cuisinés, ${count("LEFTOVER")} restes, ${count("OUT")} absences / sorties`);
  console.log(`${catalogue.size} plats distincts : ${[...catalogue.values()].sort((a, b) => a.localeCompare(b, "fr")).join(", ")}`);
  const allWarnings = [...parsed.flatMap((file) => file.warnings), ...warnings];
  if (skipped.length > 0) allWarnings.push(`${skipped.length} fichier(s) sans repas ignoré(s)`);
  if (allWarnings.length > 0) console.log(`\nAvertissements :\n${allWarnings.map((w) => `  ⚠ ${w}`).join("\n")}`);

  if (flags.has("--dry-run")) {
    console.log("\n--dry-run : rien n'a été écrit en base.");
    return 0;
  }

  const { db } = await import("../src/shared/lib/db");
  const { applyIngredientSuggestions, applyMenuImport, deleteMenuImports } = await import("../src/modules/repas/data/import-repository");
  try {
    if (flags.has("--replace")) console.log(`\n--replace : ${await deleteMenuImports()} repas importés supprimés.`);
    const result = await applyMenuImport(meals, catalogue);
    console.log(`\nImport terminé : ${result.dishes} plats, ${result.created} repas créés, ${result.skipped} cases déjà remplies conservées.`);
    const suggestions = suggestDishIngredients(
      meals.map((meal) => ({ date: meal.date, slot: meal.slot, kind: meal.kind, dishName: meal.kind === "OUT" ? null : meal.dishName })),
      files.flatMap((file) => file.shopping),
    );
    const filled = await applyIngredientSuggestions(suggestions);
    console.log(`Ingrédients suggérés (à valider dans Repas › Plats) : ${filled} plats pré-remplis.`);
    return 0;
  } finally {
    await db.$disconnect();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
