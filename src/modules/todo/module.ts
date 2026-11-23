import { ListTodo } from "lucide-react";
import type { AppModule } from "@/modules/types";
import { TodoHomeWidget } from "./components/home-widget";

export const todoModule: AppModule = {
  id: "todo",
  name: "To do",
  href: "/todo",
  description: "Tâches, échéances et listes",
  icon: ListTodo,
  widget: TodoHomeWidget,
};
