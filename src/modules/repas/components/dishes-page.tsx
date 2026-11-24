import { requireSession } from "@/shared/auth/server";
import { getDishItems, getIngredientOptions } from "../data/dishes";
import { DishesBoard } from "./dishes-board";

/** /repas/plats: the dish catalogue and each dish's ingredients. */
export async function DishesPage() {
  await requireSession();
  const [dishes, ingredients] = await Promise.all([getDishItems(), getIngredientOptions()]);
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <DishesBoard dishes={dishes} ingredients={ingredients} />
    </main>
  );
}
