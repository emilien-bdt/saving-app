/** The app is used from France; the server (Docker) runs in UTC. */
export const APP_TIME_ZONE = "Europe/Paris";

/** Today's calendar date in the app's time zone, as "AAAA-MM-JJ". */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** addDaysIso("2026-03-01", -1) → "2026-02-28". */
export function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
