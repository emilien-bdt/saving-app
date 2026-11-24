import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { cleanRevolutLabel } from "./labels";
import { parseDecimalCents, parseRevolutStatement, parseStatementDate, SAVINGS_STATEMENT_PRODUCT, StatementError } from "./parse";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

describe("parseCsv", () => {
  it("reads quoted fields, escaped quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, ""y""",2\r\n\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "2"],
    ]);
  });
});

describe("parseDecimalCents / parseStatementDate", () => {
  it("parses Revolut amounts", () => {
    expect(parseDecimalCents("-25.90")).toBe(-2590);
    expect(parseDecimalCents("0,08€")).toBe(8);
    expect(parseDecimalCents("2 256,71€")).toBe(225671);
    expect(parseDecimalCents("1,234.5")).toBe(123450);
    expect(parseDecimalCents("abc")).toBeNull();
  });

  it("parses French and English dates", () => {
    expect(parseStatementDate("6 nov. 2026")).toBe("2026-11-06");
    expect(parseStatementDate("Nov 6, 2026")).toBe("2026-11-06");
    expect(parseStatementDate("2026-02-03 10:00:00")).toBe("2026-02-03");
    expect(parseStatementDate("demain")).toBeNull();
  });
});

describe("parseRevolutStatement", () => {
  it("reads the transactions export (all products)", () => {
    const { format, rows, errors } = parseRevolutStatement(fixture("revolut-transactions.csv"));
    expect(format).toBe("revolut");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(13);
    expect(rows[0]).toMatchObject({ kind: "INTEREST", product: "Dépôt", amountCents: 8, line: 2 });
    expect(rows[2]).toMatchObject({
      kind: "CARD",
      product: "Valeur actuelle",
      startedAt: "2026-11-05 20:22:09",
      dateIso: "2026-11-05",
      amountCents: -2590,
      state: "COMPLETED",
    });
    expect(rows.find((row) => row.description === "Boutique Exemple")?.state).toBe("CANCELLED");
    expect(rows.find((row) => row.description === "Amazon")?.state).toBe("PENDING");
    expect(rows.find((row) => row.description.startsWith("Paiement envoyé"))?.kind).toBe("TOPUP");
    expect(rows.find((row) => row.description.startsWith("Café"))?.description).toBe('Café "Le Coin", Paris');
  });

  it("reads the English headers", () => {
    const { rows } = parseRevolutStatement(
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n" +
        "Card Payment,Current,2026-01-02 10:00:00,2026-01-03 10:00:00,Tesco,-3.50,0.10,EUR,COMPLETED,10\n",
    );
    expect(rows[0]).toMatchObject({ kind: "CARD", product: "Current", amountCents: -360, state: "COMPLETED" });
  });

  it("reads a savings statement", () => {
    const { format, rows } = parseRevolutStatement(fixture("revolut-savings.csv"));
    expect(format).toBe("revolut-savings");
    expect(rows.map((row) => [row.kind, row.dateIso, row.amountCents, row.product])).toEqual([
      ["INTEREST", "2026-11-06", 8, SAVINGS_STATEMENT_PRODUCT],
      ["TRANSFER", "2026-11-23", -50000, SAVINGS_STATEMENT_PRODUCT],
      ["INTEREST", "2026-11-24", 6, SAVINGS_STATEMENT_PRODUCT],
    ]);
  });

  it("rejects an unknown layout", () => {
    expect(() => parseRevolutStatement("Date;Libellé;Montant\n")).toThrow(StatementError);
  });
});

describe("cleanRevolutLabel", () => {
  it("strips Revolut prefixes and softens names in capitals", () => {
    expect(cleanRevolutLabel("Paiement envoyé par OPEN SAS")).toBe("Open SAS");
    expect(cleanRevolutLabel("Virement à : JEAN DUPONT & MARIE MARTIN")).toBe("Jean Dupont & Marie Martin");
    expect(cleanRevolutLabel("EDF clients particuliers")).toBe("EDF clients particuliers");
    expect(cleanRevolutLabel("Magasin U")).toBe("Magasin U");
    expect(cleanRevolutLabel("   ")).toBe("Opération Revolut");
  });
});
