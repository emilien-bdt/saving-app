import { LogoutButton } from "@/shared/auth/components/logout-button";
import { requireSession } from "@/shared/auth/server";
import { getTransactionFormOptions } from "../data/form-options";
import { CategoryIcon } from "./category-icon";

export async function SettingsPage() {
  await requireSession();
  const { accounts, categories } = await getTransactionFormOptions();
  const topCategories = categories.filter((category) => !category.parentId);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-4 pb-28 sm:pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-muted-foreground">
        La modification des comptes, catégories, budgets et récurrences arrive dans les prochaines étapes.
      </p>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Comptes</h2>
        <ul className="divide-y">
          {accounts.map((account) => (
            <li key={account.id} className={`flex justify-between py-2 ${account.parentId ? "pl-6" : ""}`}>
              <span>{account.parentId ? account.name : account.displayName}</span>
              <span className="text-sm text-muted-foreground">
                {account.parentId ? "pocket" : account.type === "CHECKING" ? "courant" : "épargne"}
                {account.archived ? " · archivé" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Catégories</h2>
        <ul className="divide-y">
          {topCategories.map((category) => (
            <li key={category.id} className="py-2">
              <span className="flex items-center gap-2">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <CategoryIcon icon={category.icon} className="size-3.5" />
                </span>
                {category.name}
                <span className="text-sm text-muted-foreground">{category.kind === "INCOME" ? "revenu" : "dépense"}</span>
              </span>
              {category.hasChildren ? (
                <ul className="mt-1 ml-9 text-sm text-muted-foreground">
                  {categories
                    .filter((child) => child.parentId === category.id)
                    .map((child) => (
                      <li key={child.id}>{child.name}</li>
                    ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
