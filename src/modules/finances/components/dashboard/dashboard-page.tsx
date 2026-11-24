import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getDashboard } from "../../data/dashboard";
import { formatMonthParam, parseMonthParam } from "../../domain/month-param";
import { MonthNav } from "../month-nav";
import { AccountsCard } from "./accounts-card";
import { ExpensesCard } from "./expenses-card";
import { HistoryChart } from "./history-chart";
import { KpiCards } from "./kpi-cards";
import { IncomesCard, PlannedCard, TopMerchantsCard, TransfersCard } from "./side-cards";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** "Piloter": the whole month on one screen (read-only). */
export async function DashboardPage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;
  const today = todayIso();
  const month = parseMonthParam(params.mois, today);
  const monthParam = formatMonthParam(month);
  const { dashboard, accountNames } = await getDashboard(month);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <h1 className="sr-only">Piloter</h1>
      <div className="flex justify-center sm:justify-start">
        <MonthNav month={month} currentMonth={parseMonthParam(undefined, today)} params={{}} />
      </div>
      <KpiCards dashboard={dashboard} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ExpensesCard dashboard={dashboard} monthParam={monthParam} />
        <AccountsCard dashboard={dashboard} />
        <HistoryChart history={dashboard.history} />
        <IncomesCard dashboard={dashboard} />
        <PlannedCard dashboard={dashboard} monthParam={monthParam} />
        <TransfersCard dashboard={dashboard} accountNames={accountNames} />
        <TopMerchantsCard dashboard={dashboard} />
      </div>
    </main>
  );
}
