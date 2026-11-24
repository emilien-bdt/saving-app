"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { deleteList, moveList, saveList } from "../actions/lists";
import type { ListItem } from "../view-models";
import { LIST_COLORS } from "./colors";

function ListForm({ list, onDone }: { list: ListItem | null; onDone: () => void }) {
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[6]);
  const [shared, setShared] = useState(list?.shared ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-2xl bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveList(list?.id ?? null, { name, color, shared });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          if (list) onDone();
          else setName("");
        });
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={`list-name-${list?.id ?? "new"}`} className="sr-only">
          Nom de la liste
        </label>
        <input
          id={`list-name-${list?.id ?? "new"}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={list ? "Nom" : "Nouvelle liste"}
          maxLength={60}
          aria-invalid={error ? true : undefined}
          className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3.5 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive"
        />
        <Button type="submit" size="lg" disabled={pending || name.trim() === ""}>
          {list ? "Enregistrer" : "Ajouter"}
        </Button>
        {list ? (
          <Button type="button" size="lg" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur">
        {LIST_COLORS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={color === value}
            aria-label={value}
            onClick={() => setColor(value)}
            className="size-7 rounded-full ring-offset-2 ring-offset-background aria-checked:ring-2 aria-checked:ring-foreground"
            style={{ backgroundColor: value }}
          />
        ))}
      </div>
      {!list || list.mine ? (
        <label className="flex min-h-11 items-center justify-between gap-3 px-1 text-[15px]">
          <span>
            Partager avec le foyer
            <span className="block text-[13px] text-muted-foreground">Les membres de ton foyer voient et cochent ses tâches.</span>
          </span>
          <input type="checkbox" role="switch" checked={shared} onChange={(event) => setShared(event.target.checked)} className="ios-switch" />
        </label>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function ListsManager({ lists }: { lists: ListItem[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.ok ? null : (result.error ?? "Erreur"));
    });

  return (
    <div className="space-y-4">
      <ListForm list={null} onDone={() => undefined} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune liste pour l&apos;instant : les tâches restent « sans liste ».</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
          {lists.map((list, index) =>
            editingId === list.id ? (
              <li key={list.id} className="p-2">
                <ListForm list={list} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={list.id} className="flex min-h-12 items-center gap-1 py-1 pr-2 pl-4">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: list.color }} aria-hidden />
                <span className="ml-2 min-w-0 flex-1 truncate text-[17px]">
                  {list.name}
                  {list.shared ? <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 align-middle text-xs text-muted-foreground">Foyer</span> : null}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {list.openCount} à faire
                </span>
                <Button variant="ghost" size="icon" aria-label={`Monter ${list.name}`} disabled={pending || index === 0} onClick={() => run(() => moveList(list.id, "up"))}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Descendre ${list.name}`}
                  disabled={pending || index === lists.length - 1}
                  onClick={() => run(() => moveList(list.id, "down"))}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Modifier ${list.name}`} onClick={() => setEditingId(list.id)}>
                  <Pencil aria-hidden />
                </Button>
                {confirmId === list.id ? (
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => deleteList(list.id))}>
                    Supprimer ?
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" aria-label={`Supprimer ${list.name}`} onClick={() => setConfirmId(list.id)}>
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
