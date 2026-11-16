import { describe, expect, it } from "vitest";
import { interestRateInputSchema } from "./interest-rate";

describe("interestRateInputSchema", () => {
  it("reads a French percentage as basis points", () => {
    expect(interestRateInputSchema.parse({ validFrom: "2026-11-01", rate: " 2,29 " })).toEqual({
      validFrom: new Date("2026-11-01T00:00:00Z"),
      rate: 229,
    });
    expect(interestRateInputSchema.parse({ validFrom: "2026-11-01", rate: "3" }).rate).toBe(300);
    expect(interestRateInputSchema.parse({ validFrom: "2026-11-01", rate: "0" }).rate).toBe(0);
  });

  it("refuses more than 2 decimals, negative or absurd rates and bad dates", () => {
    const field = (input: { validFrom: string; rate: string }) => interestRateInputSchema.safeParse(input).error?.issues[0]?.path[0];
    expect(field({ validFrom: "2026-11-01", rate: "2,255" })).toBe("rate");
    expect(field({ validFrom: "2026-11-01", rate: "-1" })).toBe("rate");
    expect(field({ validFrom: "2026-11-01", rate: "150" })).toBe("rate");
    expect(field({ validFrom: "01/11/2026", rate: "2" })).toBe("validFrom");
  });
});
