import type { YearMonth } from "./period";

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "?mois=2026-11" → { year: 2026, month: 11 }; falls back to the month of `todayIsoDate`. */
export function parseMonthParam(value: string | string[] | undefined, todayIsoDate: string): YearMonth {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = raw ? MONTH_PARAM.exec(raw) : null;
  const year = Number(match?.[1]);
  if (match && year >= 2000 && year <= 2100) return { year, month: Number(match[2]) };
  return { year: Number(todayIsoDate.slice(0, 4)), month: Number(todayIsoDate.slice(5, 7)) };
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
