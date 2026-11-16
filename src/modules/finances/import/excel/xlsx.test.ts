import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeXml, readWorkbook } from "./xlsx";

// Anonymized workbook built for the tests: deflated + stored entries, shared,
// inline and rich-text strings, XML entities, formulas with cached values.
const fixture = readFileSync(new URL("./__fixtures__/Budget-2025.xlsx", import.meta.url));

describe("readWorkbook", () => {
  const workbook = readWorkbook(fixture);
  const sheet = workbook.sheets.get("03");

  it("lists the sheets in order", () => {
    expect([...workbook.sheets.keys()]).toEqual(["03", "Stats"]);
    expect(workbook.sheets.get("Stats")?.get("A1")?.value).toBe("ignoré");
  });

  it("reads shared, inline and rich-text strings", () => {
    expect(sheet?.get("B14")?.value).toBe("Livret A");
    expect(sheet?.get("B20")?.value).toBe("Livret Jeune");
    expect(sheet?.get("P3")?.value).toBe("Papa");
    expect(sheet?.get("I3")?.value).toBe("Bourses & aides");
    expect(sheet?.get("I17")?.value).toBe("Compte Courant --> Livret A");
    expect(sheet?.get("K3")?.value).toBe("ü");
  });

  it("reads numbers and formulas with their cached value", () => {
    expect(sheet?.get("J3")).toEqual({ value: 500, formula: null });
    expect(sheet?.get("J4")).toEqual({ value: 20, formula: "10+10" });
    expect(sheet?.get("J2")?.formula).toBe('SUMIF(K3:K12,"ü",J3:J12)');
  });

  it("skips empty cells", () => {
    expect(sheet?.has("A50")).toBe(false);
  });

  it("rejects a file that is not a workbook", () => {
    expect(() => readWorkbook(Buffer.from("not a zip at all, definitely not"))).toThrow();
  });
});

describe("decodeXml", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeXml("a &amp; b &lt;c&gt; &quot;d&quot; &#233; &#xE9;")).toBe('a & b <c> "d" é é');
  });
});
