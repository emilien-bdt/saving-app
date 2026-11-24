import { TrendingUp } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { FinancesHomeWidget } from "./components/home-widget";

export const financesModule: AppModule = {
  id: "finances",
  name: "Finances",
  href: "/finances",
  description: "Comptes, transactions et tableau de bord",
  icon: TrendingUp,
  tileClass: "bg-app-finances",
  widgets: [{ id: "finances", title: "Finances", href: "/finances", size: "half", order: 30, component: FinancesHomeWidget }],
};
