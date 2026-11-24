"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { setSideItem } from "../actions/dishes";
import { setStapleItem } from "../actions/shopping";
import type { SideOption } from "../view-models";
import { clay } from "./clay";

const KINDS = {
  side: {
    title: "Accompagnements",
    description:
      "Achetés tels quels, ils ne font pas partie de la recette : séparés du nom du plat (« Croques + chips ») et proposés d'un geste dans un repas. Les retirer de la liste ne les enlève pas des repas passés.",
    placeholder: "Nouvel accompagnement",
    save: setSideItem,
  },
  staple: {
    title: "Basiques",
    description: "Les produits de fond, ajoutés d'un geste à la liste de courses quand ils manquent.",
    placeholder: "Nouveau basique",
    save: setStapleItem,
  },
} as const;

/** An editable list of ingredients: the side items or the staples. */
export function SidesManager({ kind, items }: { kind: keyof typeof KINDS; items: readonly SideOption[] }) {
  const config = KINDS[kind];
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (value: string, on: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await config.save(value, on);
      if (!result.ok) setError(result.error);
      else if (on) setName("");
    });

  return (
    <section className={`${clay.day} grid gap-4`} aria-labelledby={`${kind}-title`}>
      <div>
        <h2 id={`${kind}-title`} className="text-xl font-extrabold">
          {config.title}
        </h2>
        <p className="text-sm font-medium opacity-75">{config.description}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id} className={`${clay.chip} inline-flex items-center gap-1.5 pr-1.5`}>
            {item.name}
            <button
              type="button"
              disabled={pending}
              onClick={() => change(item.name, false)}
              aria-label={`Retirer ${item.name} de la liste`}
              className="inline-flex size-6 items-center justify-center rounded-full hover:bg-black/10"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) change(name, true);
        }}
      >
        <label htmlFor={`new-${kind}`} className="sr-only">
          {config.placeholder}
        </label>
        <input id={`new-${kind}`} value={name} onChange={(event) => setName(event.target.value)} placeholder={config.placeholder} maxLength={80} className={`${clay.field} max-w-xs`} />
        <button type="submit" disabled={pending || !name.trim()} className={clay.btn}>
          <Plus className="size-4" aria-hidden />
          Ajouter
        </button>
      </form>
      {error ? <p className="rounded-2xl bg-red-100 px-4 py-2 font-semibold text-red-800">{error}</p> : null}
    </section>
  );
}
