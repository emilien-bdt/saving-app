/**
 * Calendar dates are UTC-midnight Date objects (what Prisma returns for
 * @db.Date columns). Months are 1-based.
 */

export type YearMonth = { year: number; month: number };

function assertYearMonth({ year, month }: YearMonth): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month ${year}-${month}`);
  }
}

export function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`Invalid date ${year}-${month}-${day}`);
  }
  return date;
}

export function lastDayOfMonth(yearMonth: YearMonth): number {
  assertYearMonth(yearMonth);
  return new Date(Date.UTC(yearMonth.year, yearMonth.month, 0)).getUTCDate();
}

/** Half-open range [start, nextMonthStart) for date queries. */
export function monthRange(yearMonth: YearMonth): { start: Date; end: Date } {
  assertYearMonth(yearMonth);
  return {
    start: calendarDate(yearMonth.year, yearMonth.month, 1),
    end: new Date(Date.UTC(yearMonth.year, yearMonth.month, 1)),
  };
}

/** Date given to Excel rows without a day: last day of their month. */
export function dateForUnknownDay(yearMonth: YearMonth): Date {
  return calendarDate(yearMonth.year, yearMonth.month, lastDayOfMonth(yearMonth));
}

/** Clamps a day of month (e.g. 31 for a recurring rule) to the month length. */
export function clampDay(yearMonth: YearMonth, day: number): Date {
  return calendarDate(yearMonth.year, yearMonth.month, Math.min(day, lastDayOfMonth(yearMonth)));
}

export function yearMonthOf(date: Date): YearMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const index = year * 12 + (month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
