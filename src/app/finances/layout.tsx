import { FinancesShell } from "@/modules/finances/components/finances-shell";

export default function FinancesLayout({ children }: LayoutProps<"/finances">) {
  return <FinancesShell>{children}</FinancesShell>;
}
