import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireSession } from "@/shared/auth/server";
import { getDishOptions } from "../data/dishes";
import { RepasNav } from "./repas-nav";

export async function RepasShell({ children }: { children: ReactNode }) {
  await requireSession();
  const dishes = await getDishOptions();
  return (
    <>
      <RepasNav apps={getNavApps()} dishes={dishes} />
      {children}
    </>
  );
}
