import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { todayIso } from "@/shared/lib/today";
import { ios } from "@/shared/ui/ios";
import { getMealsBetween, toView } from "../data/meals";
import { getShoppingData } from "../data/shopping";
import { buildShoppingList } from "../domain/shopping";
import { addDays, mondayOf, parseIsoDate, toIsoDate } from "../domain/week";
import type { MealView } from "../view-models";
import { DishPhoto } from "./dish-photo";
import { mealTitle } from "./labels";

function MealLine({ when, meal }: { when: string; meal: MealView | null }) {
  const sides = meal && meal.kind !== "OUT" && meal.dishName && meal.sides.length > 0 ? meal.sides.map((side) => side.name).join(", ") : "";
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-24 shrink-0 text-[13px] text-muted-foreground">{when}</span>
      {meal?.photoUrl ? <DishPhoto src={meal.photoUrl} className="size-9 shrink-0 rounded-lg" /> : null}
      {meal ? (
        <span className={`min-w-0 flex-1 truncate text-[17px] ${meal.kind === "OUT" ? "text-muted-foreground" : "font-semibold"}`}>
          {meal.kind === "LEFTOVER" ? "Reste · " : ""}
          {mealTitle(meal)}
          {sides ? <span className="font-normal text-muted-foreground"> · {sides}</span> : null}
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-muted-foreground">—</span>
      )}
      {meal ? (
        meal.status === "VALIDATED" ? (
          <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Validé" />
        ) : (
          <span className="shrink-0 text-xs font-semibold text-warning">Proposé</span>
        )
      ) : null}
    </li>
  );
}

/** Home widget: today's lunch and dinner, tomorrow's dinner, and how much of the week is planned. */
export async function RepasHomeWidget(): Promise<ReactNode> {
  const todayIsoValue = todayIso();
  const today = parseIsoDate(todayIsoValue) ?? new Date();
  const monday = mondayOf(today);
  const rows = await getMealsBetween(monday, addDays(monday, 7));
  const meals = rows.map(toView);
  const find = (dateIso: string, slot: "LUNCH" | "DINNER") => meals.find((meal) => meal.dateIso === dateIso && meal.slot === slot) ?? null;
  const tomorrowIso = toIsoDate(addDays(today, 1));
  const week = meals.filter((meal) => meal.dateIso <= toIsoDate(addDays(monday, 6)));
  const validated = week.filter((meal) => meal.status === "VALIDATED").length;

  return (
    <div>
      <ul className="divide-y divide-border">
        <MealLine when="Ce midi" meal={find(todayIsoValue, "LUNCH")} />
        <MealLine when="Ce soir" meal={find(todayIsoValue, "DINNER")} />
        <MealLine when="Demain soir" meal={find(tomorrowIso, "DINNER")} />
      </ul>
      <p className={`${ios.hint} mt-1`}>
        Cette semaine : {week.length}/14 repas prévus, {validated} validé{validated > 1 ? "s" : ""}
      </p>
    </div>
  );
}

/** Home widget: what is left to buy this week. */
export async function CoursesHomeWidget(): Promise<ReactNode> {
  const monday = mondayOf(parseIsoDate(todayIso()) ?? new Date());
  const shopping = await getShoppingData(monday);
  const lines = buildShoppingList(shopping.meals, shopping.recipes, shopping.ingredients, shopping.stored).filter((line) => !line.removed);
  const toBuy = lines.filter((line) => !line.checked).length;
  const done = lines.length - toBuy;
  const percent = lines.length === 0 ? 0 : Math.round((done / lines.length) * 100);

  return (
    <div className="flex flex-1 flex-col">
      <p className={ios.hint}>Cette semaine</p>
      <p className="text-2xl font-bold tracking-tight">{toBuy === 0 ? "À jour" : `${toBuy} article${toBuy > 1 ? "s" : ""}`}</p>
      <p className={ios.hint}>{toBuy === 0 ? "rien à acheter" : "à acheter"}</p>
      {lines.length > 0 ? (
        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-app-repas" style={{ width: `${percent}%` }} />
          </div>
          <p className={`${ios.hint} mt-1.5`}>
            {done} sur {lines.length} dans le panier
          </p>
        </div>
      ) : null}
    </div>
  );
}
