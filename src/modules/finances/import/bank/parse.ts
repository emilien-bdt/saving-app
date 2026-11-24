import { readBoursobank } from "./boursobank";
import { parseCsv } from "./csv";
import { readRevolut } from "./revolut";
import { type ParsedStatement, StatementError } from "./statement";

/** Reads a bank CSV (Revolut, BoursoBank); throws StatementError when the layout is unknown. */
export function parseBankStatement(text: string): ParsedStatement {
  const table = parseCsv(text);
  if (!table[0]) throw new StatementError("Le fichier est vide");
  const statement = readRevolut(table) ?? readBoursobank(table);
  if (!statement) {
    throw new StatementError(
      "Format non reconnu : exporte un relevé Revolut (Relevé › Excel) ou BoursoBank (Exporter les opérations, CSV)",
    );
  }
  return statement;
}
