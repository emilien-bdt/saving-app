import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCents } from "@/shared/lib/money";
import type { TransactionType } from "../domain/types";

/** "2026-11-03" → "Mardi 3 novembre". */
export function formatDayHeading(dateIso: string): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const text = format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1), "EEEE d MMMM", { locale: fr });
  return text.charAt(0).toUpperCase() + text.slice(1);
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
