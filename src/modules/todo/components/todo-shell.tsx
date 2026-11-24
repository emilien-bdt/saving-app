import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireModule } from "@/shared/auth/server";
import { getLists } from "../data/lists";
import { TodoNav } from "./todo-nav";

export async function TodoShell({ children }: { children: ReactNode }) {
  const scope = await requireModule("todo");
  const lists = await getLists();
  return (
    <>
      <TodoNav apps={getNavApps(scope.disabledModules)} lists={lists} />
      {children}
    </>
  );
}
