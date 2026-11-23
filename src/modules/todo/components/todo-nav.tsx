"use client";

import { ListChecks, ListTodo } from "lucide-react";
import { useState } from "react";
import type { NavApp } from "@/modules/types";
import { ModuleNav, type ModuleNavLink } from "@/shared/navigation/module-nav";
import type { ListItem } from "../view-models";
import { TaskEditor } from "./task-editor";

const LINKS: ModuleNavLink[] = [
  { href: "/todo", label: "Tâches", icon: ListTodo, exact: true },
  { href: "/todo/listes", label: "Listes", icon: ListChecks },
];

/** Common module navigation + "+ Tâche" (quick add) on every page. */
export function TodoNav({ apps, lists }: { apps: readonly NavApp[]; lists: readonly ListItem[] }) {
  const [editorKey, setEditorKey] = useState<number | null>(null);
  return (
    <>
      <ModuleNav
        moduleName="To do"
        apps={apps}
        links={LINKS}
        addLabel="Tâche"
        mobileSplit={1}
        onAdd={() => setEditorKey((key) => (key ?? 0) + 1)}
      />
      {editorKey !== null ? <TaskEditor key={editorKey} task={null} lists={lists} onClose={() => setEditorKey(null)} /> : null}
    </>
  );
}
