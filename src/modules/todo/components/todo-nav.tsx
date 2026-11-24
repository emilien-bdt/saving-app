"use client";

import { useState } from "react";
import type { NavApp } from "@/modules/types";
import { ModuleNav, type ModuleNavLink } from "@/shared/navigation/module-nav";
import type { ListItem } from "../view-models";
import { TaskEditor } from "./task-editor";

const LINKS: ModuleNavLink[] = [
  { href: "/todo", label: "Tâches", exact: true },
  { href: "/todo/listes", label: "Listes" },
];

/** Module frame (large title, Tâches · Listes) + « Tâche » (quick add sheet) on every page. */
export function TodoNav({ apps, lists }: { apps: readonly NavApp[]; lists: readonly ListItem[] }) {
  const [editorKey, setEditorKey] = useState<number | null>(null);
  return (
    <>
      <ModuleNav moduleName="To do" apps={apps} links={LINKS} addLabel="Tâche" onAdd={() => setEditorKey((key) => (key ?? 0) + 1)} />
      {editorKey !== null ? <TaskEditor key={editorKey} task={null} lists={lists} onClose={() => setEditorKey(null)} /> : null}
    </>
  );
}
