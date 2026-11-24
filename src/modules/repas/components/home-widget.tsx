import { Undo2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { todayIso } from "@/shared/lib/today";
import { getMealsBetween, toView } from "../data/meals";
import { getShoppingData } from "../data/shopping";
import { buildShoppingList } from "../domain/shopping";
import { addDays, formatWeekParam, mondayOf, parseIsoDate, toIsoDate } from "../domain/week";
import type { MealView } from "../view-models";
import { mealTitle, SLOT_LABELS } from "./labels";

function MealLine({ when, meal }: { when: string; meal: MealView | null }) {
  return (
    <li className="flex items-baseline gap-3 py-1.5">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{when}</span>
      {meal ? (
        <span className={`inline-flex items-center gap-1 ${meal.kind === "OUT" ? "text-muted-foreground italic" : "font-medium"}`}>
          {meal.kind === "LEFTOVER" ? <Undo2 className="size-3.5 text-muted-foreground" aria-label="Reste" /> : null}
          {mealTitle(meal)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </li>
  );
}

/** Home widget: today's lunch and dinner, tomorrow's dinner, and how much of the week is planned. */
export async function RepasHomeWidget(): Promise<ReactNode> {
  const todayIsoValue = todayIso();
  const today = parseIsoDate(todayIsoValue) ?? new Date();
  const monday = mondayOf(today);
  const [rows, shopping] = await Promise.all([getMealsBetween(monday, addDays(monday, 7)), getShoppingData(monday)]);
  const meals = rows.map(toView);
  const toBuy = buildShoppingList(shopping.meals, shopping.recipes, shopping.ingredients, shopping.stored).filter(
    (line) => !line.checked && !line.removed,
  ).length;
  const find = (dateIso: string, slot: "LUNCH" | "DINNER") => meals.find((meal) => meal.dateIso === dateIso && meal.slot === slot) ?? null;
  const tomorrowIso = toIsoDate(addDays(today, 1));
  const week = meals.filter((meal) => meal.dateIso <= toIsoDate(addDays(monday, 6)));
  const validated = week.filter((meal) => meal.status === "VALIDATED").length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Cette semaine : {week.length}/14 repas prévus, {validated} validés
      </p>
      <ul className="divide-y">
        <MealLine when={`${SLOT_LABELS.LUNCH}`} meal={find(todayIsoValue, "LUNCH")} />
        <MealLine when={`${SLOT_LABELS.DINNER}`} meal={find(todayIsoValue, "DINNER")} />
        <MealLine when="Demain soir" meal={find(tomorrowIso, "DINNER")} />
      </ul>
      <Link href={`/repas/courses?semaine=${formatWeekParam(monday)}`} className="block text-sm font-medium hover:underline">
        🧺 {toBuy === 0 ? "Liste de courses à jour" : `${toBuy} article${toBuy > 1 ? "s" : ""} à acheter cette semaine`}
      </Link>
      {week.length < 14 ? (
        <Link href="/repas" className="block text-sm text-muted-foreground hover:text-foreground">
          Compléter la semaine →
        </Link>
      ) : null}
    </div>
  );
}
