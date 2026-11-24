"use client";

import { useState } from "react";
import type { NavApp } from "@/modules/types";
import { todayIso } from "@/shared/lib/today";
import { ModuleNav, type ModuleNavLink } from "@/shared/navigation/module-nav";
import type { DishOption, SideOption } from "../view-models";
import { MealEditor } from "./meal-editor";

const LINKS: ModuleNavLink[] = [
  { href: "/repas", label: "Semaine", exact: true },
  { href: "/repas/courses", label: "Courses" },
  { href: "/repas/plats", label: "Plats" },
];

/** Module frame (large title, Semaine · Courses · Plats, ⚙︎) + « Repas » (any day, any slot) on every page. */
export function RepasNav({ apps, dishes, sides }: { apps: readonly NavApp[]; dishes: readonly DishOption[]; sides: readonly SideOption[] }) {
  const [editorKey, setEditorKey] = useState<number | null>(null);
  return (
    <>
      <ModuleNav
        moduleName="Repas"
        apps={apps}
        links={LINKS}
        settingsHref="/repas/parametres"
        addLabel="Repas"
        wide
        onAdd={() => setEditorKey((key) => (key ?? 0) + 1)}
      />
      {editorKey !== null ? (
        <MealEditor
          key={editorKey}
          dateIso={todayIso()}
          slot="DINNER"
          pickSlot
          meal={null}
          dishes={dishes}
          sideOptions={sides}
          previousDish={null}
          onClose={() => setEditorKey(null)}
        />
      ) : null}
    </>
  );
}
