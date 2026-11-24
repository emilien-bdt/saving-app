import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatMonth } from "@/shared/lib/dates";
import { formatMonthParam } from "../domain/month-param";
import { addMonths, type YearMonth } from "../domain/period";

type Props = {
  month: YearMonth;
  currentMonth: YearMonth;
  /** Current search params, kept when changing month. */
  params: Record<string, string>;
};

export function MonthNav({ month, currentMonth, params }: Props) {
  const href = (target: YearMonth) => `?${new URLSearchParams({ ...params, mois: formatMonthParam(target) })}`;
  const isCurrent = month.year === currentMonth.year && month.month === currentMonth.month;
  const label = formatMonth(new Date(month.year, month.month - 1, 1));
  const linkClass =
    "relative inline-flex size-9 items-center justify-center rounded-full bg-card text-primary after:absolute after:-inset-1 active:opacity-60";

  return (
    <div className="flex items-center gap-1">
      <Link href={href(addMonths(month, -1))} className={linkClass} aria-label="Mois précédent">
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <h2 className="min-w-36 text-center text-[17px] font-semibold capitalize">{label}</h2>
      <Link href={href(addMonths(month, 1))} className={linkClass} aria-label="Mois suivant">
        <ChevronRight className="size-5" aria-hidden />
      </Link>
      {isCurrent ? null : (
        <Link href={href(currentMonth)} className="ml-1 inline-flex h-9 items-center rounded-full bg-card px-3.5 text-[15px] text-primary active:opacity-60">
          Aujourd&apos;hui
        </Link>
      )}
    </div>
  );
}
