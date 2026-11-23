import { requireSession } from "@/shared/auth/server";
import { getLists } from "../data/lists";
import { ListsManager } from "./lists-manager";

export async function ListsPage() {
  await requireSession();
  const lists = await getLists();
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4 pb-28 sm:pb-10">
      <div>
        <h1 className="text-xl font-semibold">Listes</h1>
        <p className="text-sm text-muted-foreground">Pour ranger les tâches (Perso, Maison, Admin…). Supprimer une liste garde ses tâches, sans liste.</p>
      </div>
      <ListsManager lists={lists} />
    </main>
  );
}
