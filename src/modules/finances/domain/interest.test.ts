import { describe, expect, it } from "vitest";
import { buildInterestTransactions, computeAccountInterest, dailyInterestCents, movementsOf } from "./interest";

const deposit = (dateIso: string, deltaCents: number, cleared = true) => ({ dateIso, deltaCents, cleared });

describe("dailyInterestCents", () => {
  it("balance × rate / 365, rounded to the cent", () => {
    // 10 000 € at 2,25 %: 61,64 cents → 62
    expect(dailyInterestCents(1_000_000, 225)).toBe(62);
    expect(dailyInterestCents(100_000, 225)).toBe(6); // 6,16
    expect(dailyInterestCents(10_000, 225)).toBe(1); // 0,62
  });

  it("nothing on a balance ≤ 0 or at 0 %", () => {
    expect(dailyInterestCents(-500_000, 225)).toBe(0);
    expect(dailyInterestCents(0, 225)).toBe(0);
    expect(dailyInterestCents(1_000_000, 0)).toBe(0);
  });
});

describe("computeAccountInterest", () => {
  const base = { initialBalanceCents: 0, todayIso: "2026-11-04", untilIso: "2026-11-30" };

  it("earns interest every day up to yesterday (Actuel) and for the whole month (Prévisionnel)", () => {
    const [november] = computeAccountInterest({
      ...base,
      movements: [deposit("2026-11-01", 1_000_000)],
      rates: [{ validFromIso: "2026-11-01", rateBp: 225 }],
    });
    // 1st, 2nd, 3rd: 62 each (the 62 cents earned do not change the rounding yet)
    expect(november).toEqual({ monthKey: "2026-11", clearedCents: 186, projectedCents: 1_860 });
  });

  it("interest earns interest (compounding)", () => {
    const [november] = computeAccountInterest({
      ...base,
      todayIso: "2026-11-03",
      movements: [deposit("2026-11-01", 100_000_000)],
      rates: [{ validFromIso: "2026-11-01", rateBp: 10_000 }],
    });
    // day 1: 1 000 000 € × 100 % / 365 = 273 972,6 → 273 973 ; day 2 on 100 273 973 → 274 723,2 → 274 723
    expect(november?.clearedCents).toBe(273_973 + 274_723);
  });

  it("applies a rate from its date, even when added in the past, and 0 % stops it", () => {
    const months = computeAccountInterest({
      ...base,
      movements: [deposit("2026-11-01", 1_000_000)],
      rates: [
        { validFromIso: "2026-11-03", rateBp: 0 },
        { validFromIso: "2026-11-01", rateBp: 225 },
      ],
    });
    expect(months).toEqual([{ monthKey: "2026-11", clearedCents: 124, projectedCents: 124 }]);
  });

  it("starts at the first rate, uses earlier cleared movements for the balance", () => {
    const months = computeAccountInterest({
      ...base,
      initialBalanceCents: 400_000,
      todayIso: "2026-11-02",
      movements: [deposit("2026-09-10", 600_000), deposit("2026-09-12", 50_000, false)],
      rates: [{ validFromIso: "2026-10-30", rateBp: 225 }],
    });
    // 10 000 € (the planned movement of September is ignored): 30 and 31 Oct, then 1 Nov cleared
    expect(months[0]).toEqual({ monthKey: "2026-10", clearedCents: 124, projectedCents: 124 });
    expect(months[1]?.clearedCents).toBe(62);
    expect(months[1]?.projectedCents).toBe(1_860);
  });

  it("counts planned movements in the projection only", () => {
    const [november] = computeAccountInterest({
      ...base,
      movements: [deposit("2026-11-01", 1_000_000), deposit("2026-11-21", 1_000_000, false)],
      rates: [{ validFromIso: "2026-11-01", rateBp: 225 }],
    });
    expect(november?.clearedCents).toBe(186);
    // 20 days on 10 000 € (62) + 10 days on 20 000 € (123,3 → 123)
    expect(november?.projectedCents).toBe(20 * 62 + 10 * 123);
  });

  it("no interest on a negative balance, nothing without rates", () => {
    expect(
      computeAccountInterest({ ...base, movements: [deposit("2026-11-01", -1_000)], rates: [{ validFromIso: "2026-11-01", rateBp: 225 }] }),
    ).toEqual([]);
    expect(computeAccountInterest({ ...base, movements: [deposit("2026-11-01", 1_000_000)], rates: [] })).toEqual([]);
  });
});

describe("movementsOf / buildInterestTransactions", () => {
  const transactions = [
    { dateIso: "2026-11-01", type: "TRANSFER" as const, status: "CLEARED" as const, amountCents: 1_000_000, accountId: "cc", toAccountId: "matelas" },
    { dateIso: "2026-11-02", type: "EXPENSE" as const, status: "CLEARED" as const, amountCents: 5_000, accountId: "cc", toAccountId: null },
    { dateIso: "2026-11-25", type: "TRANSFER" as const, status: "PLANNED" as const, amountCents: 200_000, accountId: "matelas", toAccountId: "cc" },
  ];

  it("turns transactions into balance movements of one account", () => {
    expect(movementsOf("matelas", transactions)).toEqual([
      { dateIso: "2026-11-01", deltaCents: 1_000_000, cleared: true },
      { dateIso: "2026-11-25", deltaCents: -200_000, cleared: false },
    ]);
  });

  it("builds one cleared and one planned computed income per month and account", () => {
    const computed = buildInterestTransactions({
      accounts: [
        { id: "cc", initialBalanceCents: 0 },
        { id: "matelas", initialBalanceCents: 0 },
      ],
      transactions,
      ratesByAccount: new Map([["matelas", [{ validFromIso: "2026-11-01", rateBp: 225 }]]]),
      todayIso: "2026-11-04",
      untilIso: "2026-11-30",
    });
    expect(computed.map(({ id, status, amountCents, dateIso, label }) => ({ id, status, amountCents, dateIso, label }))).toEqual([
      { id: "interest:matelas:2026-11:cleared", status: "CLEARED", amountCents: 186, dateIso: "2026-11-30", label: "Intérêts" },
      // 24 days on 10 000 € + 6 days on 8 000 € (49,3 → 49) − 186 already earned
      { id: "interest:matelas:2026-11:planned", status: "PLANNED", amountCents: 24 * 62 + 6 * 49 - 186, dateIso: "2026-11-30", label: "Intérêts" },
    ]);
    expect(computed.every((transaction) => transaction.type === "INCOME" && transaction.dayUnknown && transaction.computed)).toBe(true);
  });
});
