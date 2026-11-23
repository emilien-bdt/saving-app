import { ListTodo } from "lucide-react";
import type { AppModule } from "@/modules/types";

export const todoModule: AppModule = {
  id: "todo",
  name: "To do",
  href: "/todo",
  description: "Tâches, échéances et listes",
  icon: ListTodo,
};
