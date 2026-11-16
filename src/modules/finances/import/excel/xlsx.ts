import { readZipEntries } from "./zip";

/**
 * Minimal .xlsx / .xlsm reader: cell values (cached results for formulas)
 * and formula texts. No styles, no dates conversion.
 */

export type CellValue = number | string | boolean | null;
export type Cell = { value: CellValue; formula: string | null };
/** Cells by reference, e.g. "J14". */
export type Sheet = Map<string, Cell>;
export type Workbook = { sheets: Map<string, Sheet> };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number(entity.slice(1)));
    return ENTITIES[entity] ?? "";
  });
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match?.[1] !== undefined ? decodeXml(match[1]) : null;
}

/** Concatenates the <t> runs of a rich text, ignoring phonetic hints. */
function textRuns(xml: string): string {
  const withoutPhonetics = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let text = "";
  for (const match of withoutPhonetics.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) text += match[1] ?? "";
  return decodeXml(text);
}

export function readWorkbook(file: Buffer): Workbook {
  const entries = readZipEntries(
    file,
    (name) =>
      name === "xl/workbook.xml" ||
      name === "xl/_rels/workbook.xml.rels" ||
      name === "xl/sharedStrings.xml" ||
      name.startsWith("xl/worksheets/sheet"),
  );
  const text = (name: string) => entries.get(name)?.toString("utf8") ?? null;

  const workbookXml = text("xl/workbook.xml");
  const relationsXml = text("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relationsXml) throw new Error("Classeur Excel invalide (workbook.xml manquant)");

  const targets = new Map<string, string>();
  for (const [tag] of relationsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attribute(tag, "Id");
    const target = attribute(tag, "Target");
    if (id && target) targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }

  const sharedStrings: string[] = [];
  for (const match of (text("xl/sharedStrings.xml") ?? "").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    sharedStrings.push(textRuns(match[1] ?? ""));
  }

  const sheets = new Map<string, Sheet>();
  for (const [tag] of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attribute(tag, "name");
    const id = attribute(tag, "r:id");
    const path = id ? targets.get(id) : undefined;
    const xml = path ? text(path) : null;
    if (name && xml) sheets.set(name, parseSheet(xml, sharedStrings));
  }
  return { sheets };
}

function parseSheet(xml: string, sharedStrings: readonly string[]): Sheet {
  const cells: Sheet = new Map();
  for (const match of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attributes = match[1] ?? "";
    const inner = match[2] ?? "";
    const ref = attribute(attributes, "r");
    if (!ref) continue;

    const type = attribute(attributes, "t");
    const rawFormula = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(inner)?.[1];
    const rawValue = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    let value: CellValue = null;

    if (type === "s" && rawValue !== undefined) value = sharedStrings[Number(rawValue)] ?? null;
    else if (type === "inlineStr") value = textRuns(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? "");
    else if (type === "str" && rawValue !== undefined) value = decodeXml(rawValue);
    else if (type === "b" && rawValue !== undefined) value = rawValue === "1";
    else if (type !== "e" && rawValue !== undefined && rawValue !== "") value = Number(rawValue);

    const formula = rawFormula ? decodeXml(rawFormula) : null;
    if (value === null && formula === null) continue;
    cells.set(ref, { value, formula });
  }
  return cells;
}
