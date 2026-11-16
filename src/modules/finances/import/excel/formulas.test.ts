import { describe, expect, it } from "vitest";
import { columnIndex, columnName, offsetColumn } from "./cells";
import { parseSumifRange, splitConstantSum } from "./formulas";

describe("parseSumifRange", () => {
  it("reads block headers", () => {
    expect(parseSumifRange('SUMIF(K3:K14,"ü",J3:J14)')).toEqual({
      checkColumn: "K",
      amountColumn: "J",
      firstRow: 3,
      lastRow: 14,
    });
    expect(parseSumifRange('=SUMIF($AF$29:$AF$42,"ü",$AE$29:$AE$42)')?.amountColumn).toBe("AE");
  });

  it.each(['SUMIF(K17,"ü",J17)', 'SUMIF(K3:K12,"x",J3:J12)', 'SUMIF(K3:K12,"ü",J3:J13)', "Q15+Q23+Q34"])(
    "rejects %j",
    (formula) => {
      expect(parseSumifRange(formula)).toBeNull();
    },
  );
});

describe("splitConstantSum", () => {
  it("splits plain sums of constants", () => {
    expect(splitConstantSum("15+15+1.95+5.61+1.79")).toEqual([15, 15, 1.95, 5.61, 1.79]);
    expect(splitConstantSum("=10 + 40")).toEqual([10, 40]);
  });

  it.each(["41.91-25", "10*3", "A1+2", "42", "", "1++2"])("returns null for %j", (formula) => {
    expect(splitConstantSum(formula)).toBeNull();
  });
});

describe("columns", () => {
  it("converts and offsets column names", () => {
    expect(columnIndex("A")).toBe(1);
    expect(columnIndex("AE")).toBe(31);
    expect(columnName(31)).toBe("AE");
    expect(offsetColumn("AE", -4)).toBe("AA");
    expect(offsetColumn("J", -4)).toBe("F");
    expect(offsetColumn("Z", 1)).toBe("AA");
  });
});
