import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireSession } from "@/shared/auth/server";
import { getTransactionFormOptions } from "../data/form-options";
import { FinancesNav } from "./finances-nav";

export async function FinancesShell({ children }: { children: ReactNode }) {
  await requireSession();
  const options = await getTransactionFormOptions();
  return (
    <>
      <FinancesNav apps={getNavApps()} options={options} />
      {children}
    </>
  );
}
