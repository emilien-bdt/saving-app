import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";

const DISPLAY_FORMAT = "dd/MM/yyyy";

/** Formats a date as JJ/MM/AAAA. */
export function formatDate(date: Date): string {
  return format(date, DISPLAY_FORMAT, { locale: fr });
}

/** Formats a month label, e.g. "octobre 2026". */
export function formatMonth(date: Date): string {
  return format(date, "LLLL yyyy", { locale: fr });
}

/** Parses a JJ/MM/AAAA string; returns null when invalid. */
export function parseDisplayDate(input: string): Date | null {
  const date = parse(input.trim(), DISPLAY_FORMAT, new Date());
  return isValid(date) && formatDate(date) === input.trim() ? date : null;
}
