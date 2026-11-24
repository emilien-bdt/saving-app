import { requireSession } from "@/shared/auth/server";
import { ios } from "@/shared/ui/ios";
import { getTransactionFormOptions } from "../../data/form-options";
import { listBankImports } from "../../data/bank-import";
import { ImportHistory } from "./import-history";
import { BankImport } from "./bank-import";

/** /finances/import: bank CSV statements (Revolut, BoursoBank). */
export async function ImportPage() {
  await requireSession();
  const [{ accounts, categories }, imports] = await Promise.all([getTransactionFormOptions(), listBankImports()]);
  return (
    <main className={`${ios.page} space-y-6`}>
      <h2 className={ios.sectionTitle}>Importer un relevé bancaire</h2>
      <BankImport
        accounts={accounts}
        categories={categories.filter((category) => !category.archived && !category.hasChildren)}
      />
      <ImportHistory imports={imports} />
    </main>
  );
}
