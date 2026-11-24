import { requireSession } from "@/shared/auth/server";
import { getLists } from "../data/lists";
import { ListsManager } from "./lists-manager";

export async function ListsPage() {
  await requireSession();
  const lists = await getLists();
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Listes</h2>
        <p className="text-[15px] text-muted-foreground">Pour ranger les tâches (Perso, Maison, Admin…). Supprimer une liste garde ses tâches, sans liste.</p>
      </div>
      <ListsManager lists={lists} />
    </main>
  );
}
