import { LogoutButton } from "@/shared/auth/components/logout-button";
import { requireSession } from "@/shared/auth/server";
import { getAccountsForSettings } from "../data/accounts";
import { getTransactionFormOptions } from "../data/form-options";
import { CategoryIcon } from "./category-icon";
import { AccountsSettings } from "./settings/accounts-settings";

export async function SettingsPage() {
  await requireSession();
  const [{ categories }, accounts] = await Promise.all([getTransactionFormOptions(), getAccountsForSettings()]);
  const topCategories = categories.filter((category) => !category.parentId);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-4 pb-28 sm:pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-muted-foreground">
        La modification des catégories, budgets et récurrences arrive dans les prochaines étapes.
      </p>

      <AccountsSettings accounts={accounts} />

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
