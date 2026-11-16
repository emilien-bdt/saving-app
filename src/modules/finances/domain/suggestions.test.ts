import { describe, expect, it } from "vitest";
import { buildLabelSuggestions, type LabelUsage, matchSuggestions } from "./suggestions";

const usage = (overrides: Partial<LabelUsage>): LabelUsage => ({
  labelKey: "carrefour herouville",
  label: "Carrefour - Herouville",
  type: "EXPENSE",
  categoryId: "courses",
  count: 1,
  lastDateIso: "2026-01-01",
  ...overrides,
});

describe("buildLabelSuggestions", () => {
  const suggestions = buildLabelSuggestions([
    usage({ count: 50 }),
    usage({ label: "Carrefour - Hérouville", count: 9 }),
    usage({ categoryId: "autres", count: 3, lastDateIso: "2026-10-01" }),
    usage({ labelKey: "essence", label: "Essence", categoryId: "deplacements", count: 42 }),
    usage({ labelKey: "boulangerie", label: "Boulangerie", categoryId: "courses", count: 4, lastDateIso: "2026-01-01" }),
    usage({ labelKey: "boulangerie", label: "Boulangerie", categoryId: "sorties", count: 4, lastDateIso: "2026-09-01" }),
  ]);

  it("keeps one suggestion per label, most used spelling and category, sorted by use", () => {
    expect(suggestions).toEqual([
      { labelKey: "carrefour herouville", label: "Carrefour - Herouville", type: "EXPENSE", categoryId: "courses", count: 62 },
      { labelKey: "essence", label: "Essence", type: "EXPENSE", categoryId: "deplacements", count: 42 },
      { labelKey: "boulangerie", label: "Boulangerie", type: "EXPENSE", categoryId: "sorties", count: 8 },
    ]);
  });

  it("matches what is typed: prefix first, then contains", () => {
    expect(matchSuggestions(suggestions, "her").map((s) => s.label)).toEqual(["Carrefour - Herouville"]);
    expect(matchSuggestions(suggestions, "e").map((s) => s.label)).toEqual(["Essence", "Carrefour - Herouville", "Boulangerie"]);
    expect(matchSuggestions(suggestions, "essence")).toEqual([]);
    expect(matchSuggestions(suggestions, "  ")).toEqual([]);
  });
});
