import { describe, expect, it } from "vitest";
import {
  type AccountState,
  accountGroupOf,
  checkAccountSave,
  checkArchive,
  checkDelete,
  checkUnarchive,
  moveAccount,
  nextSortOrder,
} from "./accounts";

const account = (overrides: Partial<AccountState> & { id: string }): AccountState => ({
  name: overrides.id,
  type: "CHECKING",
  parentId: null,
  archived: false,
  sortOrder: 0,
  usageCount: 0,
  ...overrides,
});

const accounts: AccountState[] = [
  account({ id: "cc", name: "Compte Courant", usageCount: 500 }),
  account({ id: "matelas", name: "Matelas de sécurité", type: "SAVINGS", sortOrder: 1, usageCount: 20 }),
  account({ id: "la", name: "Livret A", type: "SAVINGS", sortOrder: 0, archived: true, usageCount: 30 }),
  account({ id: "appart", name: "Appartement", type: "SAVINGS", parentId: "cc", sortOrder: 0, usageCount: 5 }),
  account({ id: "voiture", name: "Voiture", type: "SAVINGS", parentId: "cc", sortOrder: 1 }),
  account({ id: "vacances", name: "Vacances", type: "SAVINGS", parentId: "cc", sortOrder: 2 }),
];

describe("accountGroupOf", () => {
  it("counts pockets apart, whatever their type", () => {
    expect(accountGroupOf({ type: "CHECKING", parentId: null })).toBe("CHECKING");
    expect(accountGroupOf({ type: "SAVINGS", parentId: null })).toBe("SAVINGS");
    expect(accountGroupOf({ type: "SAVINGS", parentId: "cc" })).toBe("POCKETS");
    expect(accountGroupOf({ type: "CHECKING", parentId: "cc" })).toBe("POCKETS");
  });
});

describe("checkAccountSave", () => {
  it("accepts a new account and a new pocket", () => {
    expect(checkAccountSave({ id: null, name: "Revolut", parentId: null }, accounts)).toEqual([]);
    expect(checkAccountSave({ id: null, name: "Cadeaux", parentId: "cc" }, accounts)).toEqual([]);
  });

  it("refuses a pocket inside a pocket, an unknown or archived parent", () => {
    expect(checkAccountSave({ id: null, name: "X", parentId: "voiture" }, accounts)[0]?.message).toBe(
      "Un pocket ne peut pas contenir de pocket",
    );
    expect(checkAccountSave({ id: null, name: "X", parentId: "nope" }, accounts)[0]?.field).toBe("parentId");
    expect(checkAccountSave({ id: null, name: "X", parentId: "la" }, accounts)[0]?.message).toBe("Ce compte est archivé");
  });

  it("refuses to turn an account with pockets into a pocket, or an account into its own pocket", () => {
    expect(checkAccountSave({ id: "cc", name: "Compte Courant", parentId: "matelas" }, accounts)[0]?.message).toMatch(/a des pockets/);
    expect(checkAccountSave({ id: "matelas", name: "Matelas", parentId: "matelas" }, accounts)[0]?.field).toBe("parentId");
  });

  it("refuses a duplicate name among siblings (case and accents ignored)", () => {
    expect(checkAccountSave({ id: null, name: "  voiture ", parentId: "cc" }, accounts)).toEqual([
      { field: "name", message: "Ce nom est déjà utilisé" },
    ]);
    expect(checkAccountSave({ id: null, name: "Voiture", parentId: null }, accounts)).toEqual([]);
    expect(checkAccountSave({ id: "voiture", name: "Voiture", parentId: "cc" }, accounts)).toEqual([]);
  });

  it("reports a deleted account", () => {
    expect(checkAccountSave({ id: "nope", name: "X", parentId: null }, accounts)[0]?.message).toBe("Ce compte n'existe plus");
  });
});

describe("archive / unarchive / delete", () => {
  it("archives a parent only once its pockets are archived", () => {
    expect(checkArchive("cc", accounts)).toBe("Archive d'abord ses pockets (Appartement, Voiture, Vacances)");
    expect(checkArchive("voiture", accounts)).toBeNull();
  });

  it("unarchives a pocket only if its parent is active", () => {
    const archivedParent = [account({ id: "p", name: "Ancien", archived: true }), account({ id: "c", parentId: "p", archived: true })];
    expect(checkUnarchive("c", archivedParent)).toBe("Désarchive d'abord Ancien");
    expect(checkUnarchive("p", archivedParent)).toBeNull();
  });

  it("deletes only unused accounts without pockets", () => {
    expect(checkDelete("appart", accounts)).toBe("Ce compte a des opérations : archive-le plutôt");
    expect(checkDelete("voiture", accounts)).toBeNull();
    expect(checkDelete("cc", [account({ id: "cc" }), account({ id: "p", parentId: "cc" })])).toBe("Supprime d'abord ses pockets");
  });
});

describe("moveAccount / nextSortOrder", () => {
  it("swaps with the neighbour among active siblings", () => {
    expect(moveAccount("voiture", -1, accounts)).toEqual([
      { id: "voiture", sortOrder: 0 },
      { id: "appart", sortOrder: 1 },
    ]);
    expect(moveAccount("vacances", 1, accounts)).toEqual([]);
    expect(moveAccount("nope", 1, accounts)).toBeNull();
  });

  it("keeps top-level accounts within their type and renumbers ties", () => {
    const ties = [account({ id: "a", name: "A" }), account({ id: "b", name: "B" }), account({ id: "s", type: "SAVINGS" })];
    expect(moveAccount("b", -1, ties)).toEqual([{ id: "a", sortOrder: 1 }]);
    expect(moveAccount("s", -1, ties)).toEqual([]);
  });

  it("puts a new account after its siblings", () => {
    expect(nextSortOrder({ type: "SAVINGS", parentId: "cc" }, accounts)).toBe(3);
    expect(nextSortOrder({ type: "SAVINGS", parentId: null }, accounts)).toBe(2);
    expect(nextSortOrder({ type: "CHECKING", parentId: "matelas" }, accounts)).toBe(0);
  });
});
