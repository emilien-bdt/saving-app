// Weeks for the Repas module. Calendar dates are Date objects at UTC midnight
// (same convention as finances/domain/period.ts). Weeks run Monday → Sunday
// and are addressed in URLs as ISO weeks: "2026-W48".

const DAY_MS = 86_400_000;

export const MEAL_SLOTS = ["LUNCH", "DINNER"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function diffInDays(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function mondayOf(date: Date): Date {
  const d = utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  return addDays(d, -weekdayIndex(d));
}

/** The Monday closest to `date` (Fri–Sun round up to the next Monday). */
export function nearestMonday(date: Date): Date {
  const monday = mondayOf(date);
  return weekdayIndex(date) >= 4 ? addDays(monday, 7) : monday;
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  return toIsoDate(date) === value ? date : null;
}

/** ISO 8601 week: the week belongs to the year of its Thursday. */
export function isoWeekOf(date: Date): { year: number; week: number } {
  const thursday = addDays(mondayOf(date), 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = addDays(mondayOf(utcDate(year, 1, 4)), 3);
  return { year, week: diffInDays(thursday, firstThursday) / 7 + 1 };
}

export function formatWeekParam(monday: Date): string {
  const { year, week } = isoWeekOf(monday);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** "2026-W48" → Monday of that week, or null if invalid. */
export function parseWeekParam(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const monday = addDays(mondayOf(utcDate(year, 1, 4)), (week - 1) * 7);
  return isoWeekOf(monday).year === year ? monday : null;
}

export type SlotRef = { date: Date; slot: MealSlot };

export function slotKey(ref: SlotRef): string {
  return `${toIsoDate(ref.date)}:${ref.slot}`;
}

/** The meal just before this one (Monday lunch → previous Sunday dinner). */
export function previousSlot(ref: SlotRef): SlotRef {
  return ref.slot === "DINNER"
    ? { date: ref.date, slot: "LUNCH" }
    : { date: addDays(ref.date, -1), slot: "DINNER" };
}

/** The 14 slots of a week in chronological order. */
export function weekSlots(monday: Date): SlotRef[] {
  return weekDays(monday).flatMap((date) => MEAL_SLOTS.map((slot) => ({ date, slot })));
}
