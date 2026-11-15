import { Wallet } from "lucide-react";
import type { AppModule } from "@/modules/types";

export const financesModule: AppModule = {
  id: "finances",
  name: "Finances",
  href: "/finances",
  description: "Comptes, transactions et tableau de bord",
  icon: Wallet,
};
