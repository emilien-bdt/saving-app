import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireModule } from "@/shared/auth/server";
import { getTransactionFormOptions } from "../data/form-options";
import { FinancesNav } from "./finances-nav";

export async function FinancesShell({ children }: { children: ReactNode }) {
  const scope = await requireModule("finances");
  const options = await getTransactionFormOptions();
  return (
    <>
      <FinancesNav apps={getNavApps(scope.disabledModules)} options={options} />
      {children}
    </>
  );
}
