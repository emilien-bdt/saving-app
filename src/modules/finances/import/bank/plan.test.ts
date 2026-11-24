import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LabelSuggestion } from "../../domain/suggestions";
import type { ImportCategory } from "./categories";
import { parseBankStatement } from "./parse";
import { defaultProductAccounts, type ExistingTransaction, type ImportAccount, type PlanContext, planBankImport } from "./plan";
import type { BankSource } from "./statement";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

const accounts: ImportAccount[] = [
  { id: "cc", name: "Compte Courant", type: "CHECKING", parentId: null, archived: false },
  { id: "mat", name: "Matelas de sécurité", type: "SAVINGS", parentId: null, archived: false },
  { id: "app", name: "Appartement", type: "SAVINGS", parentId: "cc", archived: false },
  { id: "la", name: "Livret A", type: "SAVINGS", parentId: null, archived: true },
  { id: "bourso", name: "Compte Bourso", type: "CHECKING", parentId: null, archived: false },
];

const categories: ImportCategory[] = [
  { id: "courses", name: "Courses, alimentation, repas travail", kind: "EXPENSE", archived: false },
  { id: "sorties", name: "Sorties, bar, restaurant, loisirs", kind: "EXPENSE", archived: false },
  { id: "abos", name: "Abonnements", kind: "EXPENSE", archived: false },
  { id: "logement", name: "Logement, charges, assurances", kind: "EXPENSE", archived: false },
  { id: "deplacements", name: "Voiture, déplacement, parking", kind: "EXPENSE", archived: false },
  { id: "autres", name: "Autres dépenses", kind: "EXPENSE", archived: false },
  { id: "apports", name: "Apports", kind: "INCOME", archived: false },
];

const suggestions: LabelSuggestion[] = [
  { labelKey: "au tour du monde", label: "Au Tour du Monde", type: "EXPENSE", categoryId: "sorties", count: 3 },
];

const transactions = parseBankStatement(fixture("revolut-transactions.csv")).rows;

const context = (existing: ExistingTransaction[] = [], rows = transactions, source: BankSource = "REVOLUT"): PlanContext => ({
  userId: "user-1",
  source,
  accounts,
  productAccounts: defaultProductAccounts(rows, accounts, source),
  existing,
  suggestions,
  categories,
});

const existingTx = (values: Partial<ExistingTransaction> & Pick<ExistingTransaction, "id" | "dateIso" | "amountCents">): ExistingTransaction => ({
  dayUnknown: false,
  type: "EXPENSE",
  status: "CLEARED",
  accountId: "cc",
  toAccountId: null,
  label: "?",
  importRef: null,
  ...values,
});

describe("defaultProductAccounts", () => {
  it("maps the current account and the savings account named in the descriptions", () => {
    expect(defaultProductAccounts(transactions, accounts)).toEqual({ Dépôt: "mat", "Valeur actuelle": "cc" });
  });
});

describe("planBankImport (new file)", () => {
  const plan = planBankImport(transactions, context());
  const byLabel = (label: string) => plan.operations.find((operation) => operation.label === label);

  it("skips interest, cancelled and foreign-currency rows", () => {
    expect(plan.skipped.map((row) => [row.line, row.reason])).toEqual([
      [2, "Intérêts : déjà calculés par l'app"],
      [6, "Annulée par la banque (renvoyé)"],
      [14, "Devise USD non gérée"],
    ]);
  });

  it("merges the two sides of an internal transfer", () => {
    const transfers = plan.operations.filter((operation) => operation.type === "TRANSFER");
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({
      lines: [3, 10],
      label: "Matelas de sécurité → Compte Courant",
      accountId: "mat",
      toAccountId: "cc",
      amountCents: 50000,
      status: "CLEARED",
      categoryId: null,
      action: "create",
    });
  });

  it("creates expenses and incomes with a category", () => {
    expect(plan.operations.every((operation) => operation.action === "create")).toBe(true);
    expect(plan.operations).toHaveLength(9);
    expect(byLabel("Au Tour Du Monde")).toMatchObject({ type: "EXPENSE", amountCents: 2590, categoryId: "sorties", categorySource: "history" });
    expect(byLabel("Magasin U")).toMatchObject({ categoryId: "courses", categorySource: "keyword" });
    expect(byLabel("Spotify")).toMatchObject({ categoryId: "abos", categorySource: "keyword" });
    expect(byLabel("EDF clients particuliers")).toMatchObject({ type: "EXPENSE", categoryId: "logement" });
    expect(byLabel("Open SAS")).toMatchObject({ type: "INCOME", amountCents: 1500, categoryId: "apports", categorySource: "default" });
    expect(byLabel("Jean Dupont & Marie Martin")).toMatchObject({ type: "EXPENSE", categoryId: "autres", categorySource: "default" });
    expect(byLabel("Amazon")).toMatchObject({ status: "PLANNED", dateIso: "2026-11-23" });
    expect(plan.period).toEqual({ from: "2026-11-05", to: "2026-11-24" });
  });

  it("gives every row a stable reference (same file twice → same references)", () => {
    const again = planBankImport(transactions, context());
    expect(again.operations.map((operation) => operation.ref)).toEqual(plan.operations.map((operation) => operation.ref));
    expect(new Set(plan.operations.map((operation) => operation.ref)).size).toBe(plan.operations.length);
    expect(plan.operations[0]?.ref).toMatch(/^revolut:[0-9a-f]{32}$/);
  });
});

describe("planBankImport (against existing data)", () => {
  const first = planBankImport(transactions, context());
  const asStored = first.operations.map((operation, index) =>
    existingTx({
      id: `t${index}`,
      dateIso: operation.dateIso,
      amountCents: operation.amountCents,
      type: operation.type,
      status: operation.status,
      accountId: operation.accountId,
      toAccountId: operation.toAccountId,
      label: operation.label,
      importRef: operation.ref,
    }),
  );

  it("changes nothing when the same file is imported again", () => {
    const plan = planBankImport(transactions, context(asStored));
    expect(new Set(plan.operations.map((operation) => operation.action))).toEqual(new Set(["unchanged"]));
    expect(plan.removals).toEqual([]);
  });

  it("clears a pending operation once completed", () => {
    const completed = parseBankStatement(
      fixture("revolut-transactions.csv").replace(",Amazon,-169.89,0.00,EUR,EN ATTENTE,", ",Amazon,-169.89,0.00,EUR,TERMINÉ,0"),
    ).rows;
    const plan = planBankImport(completed, context(asStored, completed));
    expect(plan.operations.find((operation) => operation.label === "Amazon")).toMatchObject({ action: "clear", status: "CLEARED" });
  });

  it("removes a pending operation cancelled by the bank or gone from the statement", () => {
    const pendingFirst = parseBankStatement(
      fixture("revolut-transactions.csv").replace("EUR,RENVOYÉ,", "EUR,EN ATTENTE,"),
    ).rows;
    const pendingPlan = planBankImport(pendingFirst, context());
    const boutique = pendingPlan.operations.find((operation) => operation.label === "Boutique Exemple");
    expect(boutique?.status).toBe("PLANNED");
    const stored = [
      existingTx({ id: "boutique", dateIso: "2026-11-08", amountCents: 4794, status: "PLANNED", label: "Boutique Exemple", importRef: boutique?.ref ?? null }),
      existingTx({ id: "gone", dateIso: "2026-11-15", amountCents: 999, status: "PLANNED", label: "Disparue", importRef: "revolut:0000" }),
      existingTx({ id: "outside", dateIso: "2026-10-15", amountCents: 999, status: "PLANNED", label: "Hors période", importRef: "revolut:0001" }),
      existingTx({ id: "manual", dateIso: "2026-11-15", amountCents: 999, status: "PLANNED", label: "Prévue à la main" }),
    ];
    const plan = planBankImport(transactions, context(stored));
    expect(plan.removals.map((removal) => [removal.id, removal.reason])).toEqual([
      ["boutique", "Annulée par la banque"],
      ["gone", "N'apparaît plus dans le relevé (annulée ou montant modifié)"],
    ]);
  });

  it("links operations typed by hand (same account, type and amount within 3 days)", () => {
    const stored = [
      existingTx({ id: "u", dateIso: "2026-11-10", amountCents: 4759, label: "Super U" }),
      existingTx({ id: "spotify", dateIso: "2026-11-21", amountCents: 1720, status: "PLANNED", label: "Spotify" }),
      existingTx({ id: "far", dateIso: "2026-11-01", amountCents: 2590, label: "Trop loin" }),
      existingTx({ id: "month", dateIso: "2026-11-30", dayUnknown: true, amountCents: 1250, label: "Virement commun" }),
      existingTx({ id: "virement", dateIso: "2026-11-23", amountCents: 50000, type: "TRANSFER", accountId: "mat", toAccountId: "cc" }),
    ];
    const plan = planBankImport(transactions, context(stored));
    const actionOf = (label: string) => {
      const operation = plan.operations.find((item) => item.label === label);
      return [operation?.action, operation?.existing?.id ?? null];
    };
    expect(actionOf("Magasin U")).toEqual(["link", "u"]);
    expect(actionOf("Spotify")).toEqual(["link", "spotify"]);
    expect(actionOf("Au Tour Du Monde")).toEqual(["create", null]);
    expect(actionOf("Jean Dupont & Marie Martin")).toEqual(["link", "month"]);
    expect(actionOf("Matelas de sécurité → Compte Courant")).toEqual(["link", "virement"]);
  });

  it("recognises a savings statement already imported from the transactions export", () => {
    const savings = parseBankStatement(fixture("revolut-savings.csv")).rows;
    const plan = planBankImport(savings, context(asStored, savings));
    expect(plan.products).toEqual([{ product: "Épargne", rowCount: 3, accountId: "mat" }]);
    expect(plan.skipped).toHaveLength(2);
    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({ type: "TRANSFER", accountId: "mat", toAccountId: "cc", action: "duplicate" });
  });

  it("ignores the rows of a product without account", () => {
    const plan = planBankImport(transactions, { ...context(), productAccounts: { "Valeur actuelle": "cc", Dépôt: null } });
    expect(plan.skipped.filter((row) => row.reason === "Aucun compte choisi pour « Dépôt »")).toHaveLength(2);
    // The current-account side of the transfer still names the savings account.
    expect(plan.operations.find((operation) => operation.type === "TRANSFER")).toMatchObject({ lines: [10], accountId: "mat", toAccountId: "cc" });
  });
});

describe("planBankImport (BoursoBank)", () => {
  const rows = parseBankStatement(fixture("boursobank.csv")).rows;
  const withOpening = accounts.map((account) => (account.id === "bourso" ? { ...account, openedIso: "2024-01-01" } : account));
  const boursoContext = (existing: ExistingTransaction[] = []): PlanContext => ({ ...context(existing, rows, "BOURSOBANK"), accounts: withOpening });
  const plan = planBankImport(rows, boursoContext());
  const byLabel = (label: string) => plan.operations.filter((operation) => operation.label === label);

  it("proposes the account named « …Bourso… »", () => {
    expect(plan.products).toEqual([{ product: "BoursoBank", rowCount: 9, accountId: "bourso" }]);
  });

  it("ignores the rows before the account was opened in Save, or before the chosen date", () => {
    expect(plan.skipped.map((row) => [row.line, row.reason])).toEqual([[10, "Avant l'ouverture du compte dans Save (01/01/2024)"]]);
    const fromDate = planBankImport(rows, { ...boursoContext(), fromDate: "2026-10-28" });
    expect(fromDate.operations).toHaveLength(3);
    expect(fromDate.skipped[0]?.reason).toBe("Avant le 28/10/2026");
  });

  it("labels with the suggested label and guesses categories from keywords, then from the bank category", () => {
    expect(plan.source).toBe("BOURSOBANK");
    expect(byLabel("Super U")[0]).toMatchObject({ type: "EXPENSE", accountId: "bourso", amountCents: 4710, categoryId: "courses" });
    expect(byLabel("Apple")[0]).toMatchObject({ categoryId: "abos", categorySource: "keyword" });
    expect(byLabel("Orange")[0]).toMatchObject({ categoryId: "abos", categorySource: "keyword" });
    expect(byLabel("TotalEnergies")[0]).toMatchObject({ categoryId: "deplacements", categorySource: "keyword" });
    expect(byLabel("Jean Dupont")[0]).toMatchObject({ type: "INCOME", categoryId: "apports", categorySource: "default" });
    expect(byLabel("Amazon Payments")[0]).toMatchObject({ type: "EXPENSE", amountCents: 102990, categoryId: "autres" });
  });

  it("keeps two identical operations of the same day (two references)", () => {
    const bistrot = byLabel("Le Petit Bistrot");
    expect(bistrot).toHaveLength(2);
    expect(bistrot.map((operation) => operation.categoryId)).toEqual(["sorties", "sorties"]);
    expect(bistrot[0]?.ref).not.toBe(bistrot[1]?.ref);
    expect(bistrot[0]?.ref).toMatch(/^boursobank:[0-9a-f]{32}$/);
  });

  it("recognises a BoursoBank import as already imported and an entry typed by hand", () => {
    const stored = plan.operations.slice(0, 2).map((operation, index) =>
      existingTx({ id: `b${index}`, dateIso: operation.dateIso, amountCents: operation.amountCents, type: operation.type, accountId: "bourso", label: operation.label, importRef: operation.ref }),
    );
    stored.push(existingTx({ id: "hand", dateIso: "2026-10-24", amountCents: 6000, accountId: "bourso", label: "Essence" }));
    const again = planBankImport(rows, boursoContext(stored));
    expect(again.operations.filter((operation) => operation.action === "unchanged")).toHaveLength(2);
    expect(again.operations.find((operation) => operation.label === "TotalEnergies")).toMatchObject({ action: "link", existing: { id: "hand" } });
  });
});
