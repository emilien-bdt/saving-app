import { ShoppingCart, UtensilsCrossed } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { CoursesHomeWidget, RepasHomeWidget } from "./components/home-widget";

export const repasModule: AppModule = {
  id: "repas",
  name: "Repas",
  href: "/repas",
  description: "Menus de la semaine et courses",
  icon: UtensilsCrossed,
  tileClass: "bg-app-repas",
  widgets: [
    { id: "repas", title: "Repas", href: "/repas", size: "full", order: 10, component: RepasHomeWidget },
    { id: "courses", title: "Courses", href: "/repas/courses", size: "half", order: 40, icon: ShoppingCart, component: CoursesHomeWidget },
  ],
};
