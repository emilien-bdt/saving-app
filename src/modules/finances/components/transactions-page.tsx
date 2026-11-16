import { cookies } from "next/headers";
import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getTransactionFormOptions } from "../data/form-options";
import { listMonthTransactions } from "../data/transactions";
import { parseTransactionFilters, parseView, VIEW_COOKIE } from "../domain/list-filters";
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

  const [transactions, options] = await Promise.all([listMonthTransactions(month, filters), getTransactionFormOptions()]);
  const isCurrentMonth = month.year === currentMonth.year && month.month === currentMonth.month;
  const defaultDate = isCurrentMonth ? today : `${month.year}-${String(month.month).padStart(2, "0")}-01`;
  const plainParams = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-28 sm:pb-10">
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
