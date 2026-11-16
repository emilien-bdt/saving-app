import { describe, expect, it } from "vitest";
import { accountKeyFromName, parseTransferLabel, splitLabelAndNote } from "./mapping";

describe("splitLabelAndNote", () => {
  it.each([
    ["Auchan - Herouville(Crêpes)", "Auchan - Herouville", "Crêpes"],
    ["Bowling - Oncle Scott (mondeville)", "Bowling - Oncle Scott", "mondeville"],
    ["Carrefour - Herouville", "Carrefour - Herouville", null],
    ["  Uber   eats ", "Uber eats", null],
    ["(Crêpes)", "(Crêpes)", null],
    ["Achat ()", "Achat ()", null],
  ])("%j → %j / %j", (raw, label, note) => {
    expect(splitLabelAndNote(raw)).toEqual({ label, note });
  });
});

describe("accounts", () => {
  it.each([
    ["Compte Courant", "CC"],
    ["Compte Courant Rev", "CC"],
    ["Compte Courant CA", "CC"],
    ["Livret A", "LA"],
    ["Livret Jeune", "LJ"],
    ["Matelas de séurité", "MATELAS"],
    ["Appartement", "APPARTEMENT"],
    ["Voiture", "VOITURE"],
    ["Livret Asie", null],
  ])("%j → %j", (name, key) => {
    expect(accountKeyFromName(name)).toBe(key);
  });

  it("parses transfer labels", () => {
    expect(parseTransferLabel("Compte Courant --> Livret A")).toEqual({ from: "CC", to: "LA" });
    expect(parseTransferLabel("Voiture -> Appartement")).toEqual({ from: "VOITURE", to: "APPARTEMENT" });
    expect(parseTransferLabel("Livret A --> Livret A")).toBeNull();
    expect(parseTransferLabel("Compte Courant --> Banque inconnue")).toBeNull();
    expect(parseTransferLabel("Virements internes")).toBeNull();
  });
});
