import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getIngredientNames, getShoppingData, getStapleOptions } from "../data/shopping";
import { buildShoppingList } from "../domain/shopping";
import { addDays, formatWeekParam, mondayOf, parseIsoDate, parseWeekParam, toIsoDate } from "../domain/week";
import { weekTitle } from "./labels";
import { ShoppingBoard } from "./shopping-board";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** /repas/courses?semaine=AAAA-Wss: the week's shopping list (current week by default). */
export async function ShoppingPage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;
  const param = typeof params.semaine === "string" ? params.semaine : null;
  const monday = parseWeekParam(param) ?? mondayOf(parseIsoDate(todayIso()) ?? new Date());

  const [data, staples, ingredientNames] = await Promise.all([getShoppingData(monday), getStapleOptions(), getIngredientNames()]);
  const lines = buildShoppingList(data.meals, data.recipes, data.ingredients, data.stored);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <ShoppingBoard
        week={formatWeekParam(monday)}
        title={weekTitle(toIsoDate(monday), toIsoDate(addDays(monday, 6)))}
        previousWeek={formatWeekParam(addDays(monday, -7))}
        nextWeek={formatWeekParam(addDays(monday, 7))}
        lines={lines}
        staples={staples}
        ingredientNames={ingredientNames}
      />
    </main>
  );
}
