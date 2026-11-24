import { CircleCheck } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { TodoHomeWidget } from "./components/home-widget";

export const todoModule: AppModule = {
  id: "todo",
  name: "To do",
  href: "/todo",
  description: "Tâches, échéances et listes",
  icon: CircleCheck,
  tileClass: "bg-app-todo",
  widgets: [{ id: "todo", title: "To do", href: "/todo", size: "full", order: 20, component: TodoHomeWidget }],
};
