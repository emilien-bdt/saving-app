import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getDishOptions, getSideOptions } from "../data/dishes";
import { getWeekMeals, toView } from "../data/meals";
import { addDays, formatWeekParam, mondayOf, parseIsoDate, parseWeekParam, toIsoDate, weekDays } from "../domain/week";
import { dayLabel, weekTitle } from "./labels";
import { type DayView, WeekBoard } from "./week-board";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The week's grid (?semaine=AAAA-Wss, current week by default). */
export async function WeekPage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;
  const today = todayIso();
  const param = typeof params.semaine === "string" ? params.semaine : null;
  const monday = parseWeekParam(param) ?? mondayOf(parseIsoDate(today) ?? new Date());

  const [rows, dishes, sides] = await Promise.all([getWeekMeals(monday), getDishOptions(), getSideOptions()]);
  const meals = rows.map(toView);
  const find = (dateIso: string, slot: "LUNCH" | "DINNER") => meals.find((meal) => meal.dateIso === dateIso && meal.slot === slot) ?? null;

  const days: DayView[] = weekDays(monday).map((date) => {
    const dateIso = toIsoDate(date);
    return { dateIso, label: dayLabel(dateIso), isToday: dateIso === today, lunch: find(dateIso, "LUNCH"), dinner: find(dateIso, "DINNER") };
  });

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <WeekBoard
        week={formatWeekParam(monday)}
        title={weekTitle(toIsoDate(monday), toIsoDate(addDays(monday, 6)))}
        previousWeek={formatWeekParam(addDays(monday, -7))}
        nextWeek={formatWeekParam(addDays(monday, 7))}
        days={days}
        dayBeforeDinner={find(toIsoDate(addDays(monday, -1)), "DINNER")}
        dishes={dishes}
        sides={sides}
      />
    </main>
  );
}
