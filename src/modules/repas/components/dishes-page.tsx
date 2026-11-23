import { requireSession } from "@/shared/auth/server";
import { getDishItems, getIngredientOptions } from "../data/dishes";
import { clay } from "./clay";
import { DishesBoard } from "./dishes-board";

/** /repas/plats: the dish catalogue and each dish's ingredients. */
export async function DishesPage() {
  await requireSession();
  const [dishes, ingredients] = await Promise.all([getDishItems(), getIngredientOptions()]);
  return (
    <div className={clay.page}>
      <main className="mx-auto w-full max-w-[1800px] px-4 pt-5 pb-28 sm:px-6 sm:pb-10">
        <DishesBoard dishes={dishes} ingredients={ingredients} />
      </main>
    </div>
  );
}
