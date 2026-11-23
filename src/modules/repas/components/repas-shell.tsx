import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireSession } from "@/shared/auth/server";
import { getDishOptions, getSideOptions } from "../data/dishes";
import { RepasNav } from "./repas-nav";

export async function RepasShell({ children }: { children: ReactNode }) {
  await requireSession();
  const [dishes, sides] = await Promise.all([getDishOptions(), getSideOptions()]);
  return (
    <>
      <RepasNav apps={getNavApps()} dishes={dishes} sides={sides} />
      {children}
    </>
  );
}
