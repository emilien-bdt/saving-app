import { requireSession } from "@/shared/auth/server";
import { getSideOptions } from "../data/dishes";
import { getStapleOptions } from "../data/shopping";
import { SidesManager } from "./sides-manager";

/** /repas/parametres: the staples of the shopping list and the side items. */
export async function SettingsPage() {
  await requireSession();
  const [staples, sides] = await Promise.all([getStapleOptions(), getSideOptions()]);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <h2 className="text-xl font-bold tracking-tight">Paramètres</h2>
      <SidesManager kind="staple" items={staples} />
      <SidesManager kind="side" items={sides} />
    </main>
  );
}
