import { requireSession } from "@/shared/auth/server";
import { getSideOptions } from "../data/dishes";
import { getStapleOptions } from "../data/shopping";
import { clay } from "./clay";
import { SidesManager } from "./sides-manager";

/** /repas/parametres: the staples of the shopping list and the side items. */
export async function SettingsPage() {
  await requireSession();
  const [staples, sides] = await Promise.all([getStapleOptions(), getSideOptions()]);
  return (
    <div className={clay.page}>
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-5 pb-28 sm:pb-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Paramètres</h1>
        <SidesManager kind="staple" items={staples} />
        <SidesManager kind="side" items={sides} />
      </main>
    </div>
  );
}
