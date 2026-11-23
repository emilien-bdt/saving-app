import { Wallet } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { FinancesHomeWidget } from "./components/home-widget";

export const financesModule: AppModule = {
  id: "finances",
  name: "Finances",
  href: "/finances",
  description: "Comptes, transactions et tableau de bord",
  icon: Wallet,
  widget: FinancesHomeWidget,
};
