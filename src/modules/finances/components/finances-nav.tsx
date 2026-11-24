"use client";

import { useState } from "react";
import type { NavApp } from "@/modules/types";
import { todayIso } from "@/shared/lib/today";
import { ModuleNav, type ModuleNavLink } from "@/shared/navigation/module-nav";
import type { TransactionFormOptions } from "../view-models";
import { TransactionEditor } from "./transaction-editor";

const LINKS: ModuleNavLink[] = [
  { href: "/finances", label: "Piloter", exact: true },
  { href: "/finances/transactions", label: "Journal" },
];

/** Module frame (large title, Piloter · Journal, ⚙︎) + « Saisir » (quick transaction sheet) on every page. */
export function FinancesNav({ apps, options }: { apps: readonly NavApp[]; options: TransactionFormOptions }) {
  const [editorKey, setEditorKey] = useState<number | null>(null);
  return (
    <>
      <ModuleNav
        moduleName="Finances"
        apps={apps}
        links={LINKS}
        settingsHref="/finances/parametres"
        addLabel="Saisir"
        onAdd={() => setEditorKey((key) => (key ?? 0) + 1)}
      />
      {editorKey !== null ? (
        <TransactionEditor key={editorKey} transaction={null} options={options} defaultDate={todayIso()} onClose={() => setEditorKey(null)} />
      ) : null}
    </>
  );
}
