/**
 * Minimal RFC 4180 CSV reader (no dependency): double-quoted fields with "" escapes,
 * LF or CRLF line ends, optional UTF-8 BOM. Empty lines are dropped.
 * The separator is « , » (Revolut) or « ; » (BoursoBank): the one most present in the first line.
 */
export function parseCsv(text: string, separator?: "," | ";"): string[][] {
  const input = text.startsWith("﻿") ? text.slice(1) : text;
  const firstLine = input.slice(0, input.search(/\r?\n|$/));
  const delimiter = separator ?? (firstLine.split(";").length > firstLine.split(",").length ? ";" : ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") endRow();
    else if (char === "\r") {
      if (input[index + 1] === "\n") index++;
      endRow();
    } else field += char;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}
