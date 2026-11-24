"use client";

import { Combine, Search, Sparkles } from "lucide-react";
import { type CSSProperties, useState, useTransition } from "react";
import { formatDate } from "@/shared/lib/dates";
import { mergeDish } from "../actions/dishes";
import { formatQuantity } from "../domain/ingredients";
import type { DishItem, IngredientOption } from "../view-models";
import { clay } from "./clay";
import { DishEditor } from "./dish-editor";
import { dishHue } from "./labels";

type Filter = "all" | "todo" | "duplicates" | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "todo", label: "Ingrédients à compléter" },
  { id: "duplicates", label: "Doublons probables" },
  { id: "archived", label: "Archivés" },
];

const needsIngredients = (dish: DishItem) => dish.ingredients.length === 0 || dish.ingredients.some((item) => item.suggested || item.amount === null);

/** The dish catalogue: search, review ingredients, merge duplicates. */
export function DishesBoard({ dishes, ingredients }: { dishes: readonly DishItem[]; ingredients: readonly IngredientOption[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts: Record<Filter, number> = {
    all: dishes.filter((dish) => !dish.archived).length,
    todo: dishes.filter((dish) => !dish.archived && needsIngredients(dish)).length,
    duplicates: dishes.filter((dish) => dish.duplicateOf).length,
    archived: dishes.filter((dish) => dish.archived).length,
  };
  const search = query.trim().toLowerCase();
  const shown = dishes.filter((dish) => {
    if (search && !dish.name.toLowerCase().includes(search)) return false;
    if (filter === "archived") return dish.archived;
    if (dish.archived) return false;
    if (filter === "todo") return needsIngredients(dish);
    if (filter === "duplicates") return dish.duplicateOf !== null;
    return true;
  });
  const editing = dishes.find((dish) => dish.id === editingId) ?? null;

  const quickMerge = (dish: DishItem) => {
    const twin = dish.duplicateOf;
    if (!twin || !window.confirm(`Fusionner « ${dish.name} » dans « ${twin.name} » ?\nSes ${dish.meals} repas passeront sur « ${twin.name} ».`)) return;
    startTransition(async () => {
      setError(null);
      const result = await mergeDish(dish.id, twin.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Plats</h1>
          <p className="text-sm font-medium opacity-70">
            Les ingrédients sont pour un repas à 2 ; ils servent à calculer la liste de courses.
          </p>
        </div>
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Rechercher un plat</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 opacity-60" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un plat" className={`${clay.field} h-10 pl-10 text-sm`} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtre">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`${clay.chip} ${clay.chipSm}`}>
            {item.label} · {counts[item.id]}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-2xl bg-red-100 px-4 py-2 font-semibold text-red-800">{error}</p> : null}

      {shown.length === 0 ? (
        <p className={`${clay.empty} p-6 text-center font-semibold`}>Aucun plat ici.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {shown.map((dish) => {
            const suggested = dish.ingredients.filter((item) => item.suggested).length;
            return (
              <li key={dish.id} style={{ "--hue": dishHue(dish.id) } as CSSProperties} className={`${clay.meal} ${clay.mealTight} ${dish.archived ? clay.proposed : ""} flex h-full min-h-28 flex-col gap-1.5`}>
                <button type="button" onClick={() => setEditingId(dish.id)} className="flex flex-1 flex-col gap-0.5 text-left">
                  <span className="line-clamp-2 text-[0.95rem] leading-tight font-bold">{dish.name}</span>
                  <span className="text-xs font-medium opacity-75">
                    {dish.cooked > 0 ? `Cuisiné ${dish.cooked} fois` : "Jamais cuisiné"}
                    {dish.lastIso ? ` · dernier le ${formatDate(new Date(`${dish.lastIso}T12:00:00`))}` : ""}
                  </span>
                  {dish.ingredients.length > 0 ? (
                    <span className="mt-0.5 line-clamp-2 text-xs">
                      {dish.ingredients
                        .map((item) => `${item.name}${item.amount !== null ? ` ${formatQuantity(item.amount, item.unit)}` : ""}`)
                        .join(" · ")}
                    </span>
                  ) : (
                    <span className="mt-0.5 text-xs font-semibold opacity-80">Ingrédients à compléter</span>
                  )}
                  {suggested > 0 ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 self-start rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-bold text-amber-800">
                      <Sparkles className="size-3" aria-hidden />
                      {suggested} suggéré{suggested > 1 ? "s" : ""} à vérifier
                    </span>
                  ) : null}
                </button>
                {dish.duplicateOf ? (
                  <button type="button" disabled={pending} onClick={() => quickMerge(dish)} className={`${clay.btn} ${clay.btnPlain} ${clay.btnSm} self-start text-xs`}>
                    <Combine className="size-3.5" aria-hidden />
                    = « {dish.duplicateOf.name} » ? Fusionner
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editing ? <DishEditor key={editing.id} dish={editing} dishes={dishes} ingredients={ingredients} onClose={() => setEditingId(null)} /> : null}
    </div>
  );
}
