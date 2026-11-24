import { cookies } from "next/headers";
import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getTransactionFormOptions } from "../data/form-options";
import { getInterestTransactions } from "../data/interest";
import { listMonthTransactions } from "../data/transactions";
import { matchesListFilters, parseTransactionFilters, parseView, VIEW_COOKIE } from "../domain/list-filters";
import { formatMonthParam } from "../domain/month-param";
import { parseMonthParam } from "../domain/month-param";
import { summarizeMonth } from "../domain/transaction-list";
import { MonthNav } from "./month-nav";
import { MonthSummary } from "./month-summary";
import { TransactionFilters } from "./transaction-filters";
import { TransactionsView } from "./transactions-view";
import { ViewToggle } from "./view-toggle";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function TransactionsPage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;
  const today = todayIso();
  const currentMonth = parseMonthParam(undefined, today);
  const month = parseMonthParam(params.mois, today);
  const filters = parseTransactionFilters(params);
  const view = parseView(params.vue, (await cookies()).get(VIEW_COOKIE)?.value);

  const [stored, options, interest] = await Promise.all([
    listMonthTransactions(month, filters),
    getTransactionFormOptions(),
    getInterestTransactions(),
  ]);
  // Daily interest of the month (computed, read-only), one line per account.
  const monthKey = formatMonthParam(month);
  const transactions = [
    ...stored,
    ...interest.filter((item) => item.dateIso.startsWith(monthKey) && matchesListFilters(item, filters)),
  ];
  const isCurrentMonth = month.year === currentMonth.year && month.month === currentMonth.month;
  const defaultDate = isCurrentMonth ? today : `${month.year}-${String(month.month).padStart(2, "0")}-01`;
  const plainParams = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="sr-only">Journal</h1>
        <MonthNav month={month} currentMonth={currentMonth} params={plainParams} />
        <ViewToggle view={view} />
      </header>
      <MonthSummary summary={summarizeMonth(transactions)} />
      <TransactionFilters filters={filters} accounts={options.accounts} categories={options.categories} />
      <TransactionsView transactions={transactions} view={view} options={options} defaultDate={defaultDate} />
    </main>
  );
}
