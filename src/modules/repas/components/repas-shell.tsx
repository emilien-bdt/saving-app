import type { ReactNode } from "react";
import { getNavApps } from "@/modules/navigation";
import { requireModule } from "@/shared/auth/server";
import { getDishOptions, getSideOptions } from "../data/dishes";
import { RepasNav } from "./repas-nav";

export async function RepasShell({ children }: { children: ReactNode }) {
  const scope = await requireModule("repas");
  const [dishes, sides] = await Promise.all([getDishOptions(), getSideOptions()]);
  return (
    <>
      <RepasNav apps={getNavApps(scope.disabledModules)} dishes={dishes} sides={sides} />
      {children}
    </>
  );
}
