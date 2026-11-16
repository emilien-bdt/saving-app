import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCents } from "@/shared/lib/money";
import type { TransactionType } from "../domain/types";

/** "2026-11-03" → "Mardi 3 novembre", "2026-11-01" → "Dimanche 1er novembre". */
export function formatDayHeading(dateIso: string): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const text = `${format(date, "EEEE", { locale: fr })} ${day === 1 ? "1er" : String(day)} ${format(date, "MMMM", { locale: fr })}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 3 → "mars". */
export function monthName(month: number, style: "long" | "short" = "long"): string {
  return format(new Date(2000, month - 1, 1), style === "long" ? "MMMM" : "MMM", { locale: fr });
}

/** "+12,50 €" for an income, "−12,50 €" for an expense, "12,50 €" for a transfer. */
export function formatTransactionAmount(cents: number, type: TransactionType): string {
  const amount = formatCents(cents);
  if (type === "INCOME") return `+${amount}`;
  if (type === "EXPENSE") return `−${amount}`;
  return amount;
}

export function formatSignedCents(cents: number): string {
  return cents > 0 ? `+${formatCents(cents)}` : cents < 0 ? `−${formatCents(-cents)}` : formatCents(0);
}

/** 225 → "2,25 %" (no Intl: identical on the server and in the browser). */
export function formatRateBp(rateBp: number): string {
  return `${Math.floor(rateBp / 100)},${String(rateBp % 100).padStart(2, "0")} %`;
}

/** "2026-11-01" → "01/11/2026". */
export function formatDateFr(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  return `${day}/${month}/${year}`;
}
