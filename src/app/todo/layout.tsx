import { TodoShell } from "@/modules/todo/components/todo-shell";

export default function TodoLayout({ children }: LayoutProps<"/todo">) {
  return <TodoShell>{children}</TodoShell>;
}
