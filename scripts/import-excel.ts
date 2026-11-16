/**
 * Imports the former Excel budget files.
 *   npm run import:excel -- --dry-run ~/Documents/Budget-2024.xlsm ~/Documents/Budget-2025.xlsm …
 * See the usage text below for the options.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { buildImportPlan } from "../src/modules/finances/import/excel/plan";
import { reconcile } from "../src/modules/finances/import/excel/reconcile";
import { formatImportReport } from "../src/modules/finances/import/excel/report";
import { readWorkbook } from "../src/modules/finances/import/excel/xlsx";

const USAGE = `Usage : npm run import:excel -- [--dry-run] [--replace] Budget-2024.xlsm Budget-2025.xlsm …
  --dry-run   affiche le rapport sans rien écrire en base
  --replace   supprime d'abord tous les imports précédents (les saisies manuelles sont conservées)
Les fichiers peuvent être donnés dans n'importe quel ordre ; l'année est lue dans leur nom.`;

const KNOWN_FLAGS = new Set(["--dry-run", "--replace", "--help"]);

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

  const plan = buildImportPlan(
    paths.map((path) => ({ fileName: basename(path), workbook: readWorkbook(readFileSync(path)) })),
  );
  console.log(formatImportReport(plan, reconcile(plan)));

  if (flags.has("--dry-run")) {
    console.log("\n--dry-run : rien n'a été écrit en base.");
    return 0;
  }

  const { db } = await import("../src/shared/lib/db");
  const { applyImportPlan, deleteAllImports } = await import("../src/modules/finances/data/import-repository");
  try {
    if (flags.has("--replace")) {
      console.log(`\n--replace : ${await deleteAllImports()} transactions importées supprimées.`);
    }
    const result = await applyImportPlan(plan);
    console.log(`\nImport terminé : ${result.created} transactions créées, ${result.alreadyImported} déjà présentes.`);
    for (const file of result.files) console.log(`  • ${file.fileName} : ${file.created}`);
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
    console.error(error instanceof Error ? `Erreur : ${error.message}` : error);
    process.exitCode = 1;
  });
