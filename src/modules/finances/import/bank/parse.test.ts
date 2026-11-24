import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { cleanBankLabel } from "./labels";
import { parseBankStatement } from "./parse";
import { SAVINGS_STATEMENT_PRODUCT } from "./revolut";
import { parseDecimalCents, parseStatementDate, StatementError } from "./statement";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

describe("parseCsv", () => {
  it("detects the « ; » separator", () => {
    expect(parseCsv('a;b\n"1,5";2\n')).toEqual([
      ["a", "b"],
      ["1,5", "2"],
    ]);
  });

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
    expect(parseDecimalCents("-1 029,90")).toBe(-102990);
    expect(parseDecimalCents("−3,20")).toBe(-320);
    expect(parseDecimalCents("abc")).toBeNull();
  });

  it("parses French and English dates", () => {
    expect(parseStatementDate("6 nov. 2026")).toBe("2026-11-06");
    expect(parseStatementDate("Nov 6, 2026")).toBe("2026-11-06");
    expect(parseStatementDate("2026-02-03 10:00:00")).toBe("2026-02-03");
    expect(parseStatementDate("05/11/2026")).toBe("2026-11-05");
    expect(parseStatementDate("05/11/26")).toBe("2026-11-05");
    expect(parseStatementDate("demain")).toBeNull();
  });
});

describe("parseBankStatement", () => {
  it("reads the transactions export (all products)", () => {
    const { source, format, rows, errors } = parseBankStatement(fixture("revolut-transactions.csv"));
    expect([source, format]).toEqual(["REVOLUT", "revolut"]);
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
    const { rows } = parseBankStatement(
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n" +
        "Card Payment,Current,2026-01-02 10:00:00,2026-01-03 10:00:00,Tesco,-3.50,0.10,EUR,COMPLETED,10\n",
    );
    expect(rows[0]).toMatchObject({ kind: "CARD", product: "Current", amountCents: -360, state: "COMPLETED" });
  });

  it("reads a savings statement", () => {
    const { format, rows } = parseBankStatement(fixture("revolut-savings.csv"));
    expect(format).toBe("revolut-savings");
    expect(rows.map((row) => [row.kind, row.dateIso, row.amountCents, row.product])).toEqual([
      ["INTEREST", "2026-11-06", 8, SAVINGS_STATEMENT_PRODUCT],
      ["TRANSFER", "2026-11-23", -50000, SAVINGS_STATEMENT_PRODUCT],
      ["INTEREST", "2026-11-24", 6, SAVINGS_STATEMENT_PRODUCT],
    ]);
  });

  it("reads a BoursoBank export (« ; », first « Solde » = amount, bank category, suggested label)", () => {
    const { source, format, rows, errors } = parseBankStatement(fixture("boursobank.csv"));
    expect([source, format, errors]).toEqual(["BOURSOBANK", "boursobank", []]);
    expect(rows).toHaveLength(9);
    expect(rows[1]).toMatchObject({
      line: 3,
      product: "BoursoBank",
      kind: "CARD",
      dateIso: "2026-10-29",
      startedAt: "2026-10-29",
      description: "CARTE 27/10/26 SUPER U CB*0015",
      merchant: "Super U",
      bankCategory: "Vie quotidienne › Alimentation",
      amountCents: -4710,
      state: "COMPLETED",
    });
    expect(rows[0]?.bankCategory).toBe("Vie quotidienne");
    expect(rows[3]).toMatchObject({ kind: "TRANSFER", merchant: null, amountCents: 15000 });
    expect(rows[5]?.merchant).toBeNull();
    expect(rows[7]?.amountCents).toBe(-102990);
  });

  it("reads the English-named BoursoBank columns", () => {
    const { rows } = parseBankStatement(
      "dateOp;dateVal;label;category;categoryParent;supplierFound;amount;comment;accountNum;accountLabel;accountbalance\n" +
        '05/11/2026;05/11/2026;"PRLV SEPA EDF";"Electricité";"Logement";"edf";"-75,00";;1;"Compte joint";10\n',
    );
    expect(rows[0]).toMatchObject({ product: "Compte joint", dateIso: "2026-11-05", amountCents: -7500, merchant: "edf", bankCategory: "Logement › Electricité" });
  });

  it("rejects an unknown layout", () => {
    expect(() => parseBankStatement("Date;Libellé;Montant\n")).toThrow(StatementError);
  });
});

describe("cleanBankLabel", () => {
  it("strips Revolut prefixes and softens names in capitals", () => {
    expect(cleanBankLabel("Paiement envoyé par OPEN SAS")).toBe("Open SAS");
    expect(cleanBankLabel("Virement à : JEAN DUPONT & MARIE MARTIN")).toBe("Jean Dupont & Marie Martin");
    expect(cleanBankLabel("EDF clients particuliers")).toBe("EDF clients particuliers");
    expect(cleanBankLabel("Magasin U")).toBe("Magasin U");
    expect(cleanBankLabel("   ")).toBe("Opération bancaire");
    expect(cleanBankLabel("CARTE 15/11/26 LE PETIT BISTROT CB*1234")).toBe("Le Petit Bistrot");
    expect(cleanBankLabel("PRLV SEPA FREE MOBILE")).toBe("Free Mobile");
    expect(cleanBankLabel("VIR SEPA JEAN DUPONT")).toBe("Jean Dupont");
    expect(cleanBankLabel("VIR INST AMAZON PAYMENTS")).toBe("Amazon Payments");
    expect(cleanBankLabel("CARTE 18/11/26 CARREFOUR CITY CB*1234", "carrefour city")).toBe("Carrefour City");
    expect(cleanBankLabel("CARTE 27/10/26 SUPER U CB*0015", "Super U")).toBe("Super U");
    expect(cleanBankLabel("VIR Virement de Zoe MASSON")).toBe("Zoe Masson");
    expect(cleanBankLabel("VIR SEPA MASSON Zoe")).toBe("Masson Zoe");
  });
});
