"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { setSideItem } from "../actions/dishes";
import type { SideOption } from "../view-models";
import { clay } from "./clay";

/** The side list: what is split from dish names and offered in one tap in the meal editor. */
export function SidesManager({ sides }: { sides: readonly SideOption[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (value: string, side: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await setSideItem(value, side);
      if (!result.ok) setError(result.error);
      else if (side) setName("");
    });

  return (
    <section className={`${clay.day} grid gap-4`} aria-labelledby="sides-title">
      <div>
        <h2 id="sides-title" className="text-xl font-extrabold">
          Accompagnements
        </h2>
        <p className="text-sm font-medium opacity-75">
          Achetés tels quels, ils ne font pas partie de la recette : séparés du nom du plat (« Croques + chips ») et proposés d&apos;un geste
          dans un repas. Les retirer de la liste ne les enlève pas des repas passés.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {sides.map((side) => (
          <li key={side.id} className={`${clay.chip} inline-flex items-center gap-1.5 pr-1.5`}>
            {side.name}
            <button
              type="button"
              disabled={pending}
              onClick={() => change(side.name, false)}
              aria-label={`Retirer ${side.name} des accompagnements`}
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
        <label htmlFor="new-side" className="sr-only">
          Nouvel accompagnement
        </label>
        <input id="new-side" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nouvel accompagnement" maxLength={80} className={`${clay.field} max-w-xs`} />
        <button type="submit" disabled={pending || !name.trim()} className={clay.btn}>
          <Plus className="size-4" aria-hidden />
          Ajouter
        </button>
      </form>
      {error ? <p className="rounded-2xl bg-red-100 px-4 py-2 font-semibold text-red-800">{error}</p> : null}
    </section>
  );
}
