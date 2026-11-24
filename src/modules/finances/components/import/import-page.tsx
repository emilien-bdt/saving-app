import { requireSession } from "@/shared/auth/server";
import { ios } from "@/shared/ui/ios";
import { getTransactionFormOptions } from "../../data/form-options";
import { listRevolutImports } from "../../data/revolut-import";
import { ImportHistory } from "./import-history";
import { RevolutImport } from "./revolut-import";

/** /finances/import: Revolut CSV statements. */
export async function ImportPage() {
  await requireSession();
  const [{ accounts, categories }, imports] = await Promise.all([getTransactionFormOptions(), listRevolutImports()]);
  return (
    <main className={`${ios.page} space-y-6`}>
      <h2 className={ios.sectionTitle}>Importer un relevé Revolut</h2>
      <RevolutImport
        accounts={accounts}
        categories={categories.filter((category) => !category.archived && !category.hasChildren)}
      />
      <ImportHistory imports={imports} />
    </main>
  );
}
