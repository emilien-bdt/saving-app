import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireSession } from "@/shared/auth/server";
import { getLists } from "../data/lists";
import { TodoNav } from "./todo-nav";

export async function TodoShell({ children }: { children: ReactNode }) {
  await requireSession();
  const lists = await getLists();
  return (
    <>
      <TodoNav apps={getNavApps()} lists={lists} />
      {children}
    </>
  );
}
