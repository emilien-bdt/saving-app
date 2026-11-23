/**
 * Imports the former weekly menu workbooks ("repas-DD-MM-YY.xlsx").
 *   npm run import:repas -- --dry-run ~/Documents/Repas/*.xlsx
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { readWorkbook } from "../src/modules/finances/import/excel/xlsx";
import { toIsoDate } from "../src/modules/repas/domain/week";
import {
  buildDishCatalogue,
  mergeAndResolve,
  parseMenuSheet,
  type SheetGrid,
} from "../src/modules/repas/import/excel/parse-menu";

const USAGE = `Usage : npm run import:repas -- [--dry-run] [--replace] repas-20-10-25.xlsx repas-17-11-25.xlsx …
  --dry-run   affiche le rapport sans rien écrire en base
  --replace   supprime d'abord les repas importés (les saisies de l'app sont conservées)
La semaine est lue dans le nom du fichier (JJ-MM-AA, ramené au lundi le plus proche).`;

const KNOWN_FLAGS = new Set(["--dry-run", "--replace", "--help"]);

/** First sheet of the workbook as row → column → text. */
function toGrid(path: string): SheetGrid {
  const workbook = readWorkbook(readFileSync(path));
  const sheet = [...workbook.sheets.values()][0];
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

  const files = paths.map((path) => parseMenuSheet(toGrid(path), basename(path)));
  const { meals, warnings } = mergeAndResolve(files);
  const catalogue = buildDishCatalogue(meals);
  const count = (kind: string) => meals.filter((meal) => meal.kind === kind).length;

  console.log(`${files.length} fichiers lus`);
  for (const file of [...files].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())) {
    console.log(`  • semaine du ${toIsoDate(file.weekStart)} : ${file.meals.length} repas, ${file.shopping.length} lignes de courses`);
  }
  console.log(`\n${meals.length} repas : ${count("DISH")} plats cuisinés, ${count("LEFTOVER")} restes, ${count("OUT")} absences / sorties`);
  console.log(`${catalogue.size} plats distincts : ${[...catalogue.values()].sort((a, b) => a.localeCompare(b, "fr")).join(", ")}`);
  const allWarnings = [...files.flatMap((file) => file.warnings), ...warnings];
  if (allWarnings.length > 0) console.log(`\nAvertissements :\n${allWarnings.map((w) => `  ⚠ ${w}`).join("\n")}`);

  if (flags.has("--dry-run")) {
    console.log("\n--dry-run : rien n'a été écrit en base.");
    return 0;
  }

  const { db } = await import("../src/shared/lib/db");
  const { applyMenuImport, deleteMenuImports } = await import("../src/modules/repas/data/import-repository");
  try {
    if (flags.has("--replace")) console.log(`\n--replace : ${await deleteMenuImports()} repas importés supprimés.`);
    const result = await applyMenuImport(meals, catalogue);
    console.log(`\nImport terminé : ${result.dishes} plats, ${result.created} repas créés, ${result.skipped} cases déjà remplies conservées.`);
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
