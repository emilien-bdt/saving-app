import { UtensilsCrossed } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { RepasHomeWidget } from "./components/home-widget";

export const repasModule: AppModule = {
  id: "repas",
  name: "Repas",
  href: "/repas",
  description: "Menus de la semaine et courses",
  icon: UtensilsCrossed,
  widget: RepasHomeWidget,
};
