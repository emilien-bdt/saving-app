"use client";

import { Archive, ArchiveRestore, Combine, Plus, Salad, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { convertDishToSide, deleteDish, type DishInput, mergeDish, saveDish } from "../actions/dishes";
import { type Aisle, AISLES, guessAisle, ingredientKey, type Unit, UNITS } from "../domain/ingredients";
import type { DishItem, IngredientOption } from "../view-models";
import { DishPhotoPicker } from "./dish-photo-picker";
import { look } from "./look";
import { Sheet } from "@/shared/ui/sheet";

type Row = { uid: number; name: string; amount: string; unit: Unit; aisle: Aisle; suggested: boolean };

type Props = {
  dish: DishItem;
  dishes: readonly DishItem[];
  ingredients: readonly IngredientOption[];
  onClose: () => void;
};

let nextUid = 1;

/** Edit a dish: name, ingredients for one meal for 2, archive, merge into another dish. */
export function DishEditor({ dish, dishes, ingredients, onClose }: Props) {
  const [name, setName] = useState(dish.name);
  const [archived, setArchived] = useState(dish.archived);
  const [rows, setRows] = useState<Row[]>(() =>
    dish.ingredients.map((item) => ({
      uid: nextUid++,
      name: item.name,
      amount: item.amount === null ? "" : String(item.amount),
      unit: item.unit,
      aisle: item.aisle,
      suggested: item.suggested,
    })),
  );
  const [mergeTarget, setMergeTarget] = useState(dish.duplicateOf?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const catalogue = new Map(ingredients.map((item) => [ingredientKey(item.name), item]));

  const update = (uid: number, changes: Partial<Row>) => setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...changes } : row)));
  const rename = (uid: number, value: string) => {
    const known = catalogue.get(ingredientKey(value));
    update(uid, known ? { name: value, unit: known.unit, aisle: known.aisle } : { name: value });
  };
  const addRow = () => setRows((current) => [...current, { uid: nextUid++, name: "", amount: "", unit: "PIECE", aisle: "AUTRE", suggested: false }]);

  const finish = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) onClose();
      else setError(result.error ?? "Action impossible");
    });

  const save = () => {
    const filled = rows.filter((row) => row.name.trim() !== "");
    const input: DishInput = {
      name,
      archived,
      ingredients: filled.map((row) => ({
        name: row.name,
        amount: row.amount.trim() === "" ? null : Number(row.amount.replace(",", ".")),
        unit: row.unit,
        aisle: row.aisle === "AUTRE" ? guessAisle(row.name) : row.aisle,
      })),
    };
    finish(() => saveDish(dish.id, input));
  };

  const target = dishes.find((other) => other.id === mergeTarget);
  const suggestedCount = rows.filter((row) => row.suggested).length;

  return (
    <Sheet title="Modifier le plat" onClose={onClose} wide>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="grid gap-1">
          <label htmlFor="dish-name" className="px-1 text-[13px] font-medium text-muted-foreground">
            Nom
          </label>
          <input id="dish-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={look.field} />
        </div>

        <DishPhotoPicker dishId={dish.id} dishName={dish.name} photoUrl={dish.photoUrl} />

        <section className="grid gap-2" aria-labelledby="dish-ingredients">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="dish-ingredients" className="text-lg font-bold">
              Ingrédients <span className="text-sm font-semibold text-muted-foreground">pour un repas à 2</span>
            </h3>
            {suggestedCount > 0 ? (
              <p className="text-sm font-semibold text-warning">
                {suggestedCount} suggéré{suggestedCount > 1 ? "s" : ""} d&apos;après tes Excel : vérifie, puis enregistre
              </p>
            ) : null}
          </div>
          <datalist id="ingredient-options">
            {ingredients.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucun ingrédient pour l&apos;instant.</p> : null}
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.uid} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,2fr)_6rem_6.5rem_minmax(0,1.6fr)_auto] sm:items-center">
                <input
                  value={row.name}
                  onChange={(event) => rename(row.uid, event.target.value)}
                  list="ingredient-options"
                  placeholder="Ingrédient"
                  aria-label="Ingrédient"
                  maxLength={80}
                  className={`${look.field} ${row.suggested ? "ring-2 ring-warning/60" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((other) => other.uid !== row.uid))}
                  aria-label={`Retirer ${row.name || "l'ingrédient"}`}
                  className={`${look.iconBtn} ${look.danger} self-center sm:order-last`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
                <div className="col-span-2 grid grid-cols-[6rem_6.5rem_1fr] gap-2 sm:contents">
                  <input
                    value={row.amount}
                    onChange={(event) => update(row.uid, { amount: event.target.value })}
                    inputMode="numeric"
                    placeholder="Qté"
                    aria-label="Quantité"
                    className={look.field}
                  />
                  <select
                    value={row.unit}
                    onChange={(event) => update(row.uid, { unit: event.target.value as Unit })}
                    aria-label="Unité"
                    className={look.field}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.aisle}
                    onChange={(event) => update(row.uid, { aisle: event.target.value as Aisle })}
                    aria-label="Rayon"
                    className={look.field}
                  >
                    {AISLES.map((aisle) => (
                      <option key={aisle.id} value={aisle.id}>
                        {aisle.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addRow} className={`${look.btn} ${look.btnPlain} justify-self-start text-sm`}>
            <Plus className="size-4" aria-hidden />
            Ajouter un ingrédient
          </button>
          <p className="text-xs text-muted-foreground">L&apos;unité et le rayon valent pour tous les plats qui utilisent cet ingrédient.</p>
        </section>

        <section className="grid gap-2 rounded-3xl bg-black/[0.03] p-3" aria-labelledby="dish-merge">
          <h3 id="dish-merge" className="font-bold">
            Fusionner avec un autre plat
          </h3>
          <p className="text-sm text-muted-foreground">
            Tous les repas de « {dish.name} » passent sur le plat choisi, qui garde son nom et ses ingrédients.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)} aria-label="Plat cible" className={`${look.field} max-w-sm`}>
              <option value="">Choisir un plat…</option>
              {dishes
                .filter((other) => other.id !== dish.id)
                .map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.name} ({other.cooked}×)
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!target || pending}
              onClick={() => target && finish(() => mergeDish(dish.id, target.id))}
              className={`${look.btn} ${look.btnGreen} text-sm`}
            >
              <Combine className="size-4" aria-hidden />
              Fusionner
            </button>
          </div>
        </section>

        {error ? <p role="alert" className="rounded-xl bg-destructive/12 px-4 py-2.5 text-[15px] text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setArchived(!archived)} aria-pressed={archived} className={`${look.btn} ${look.btnPlain} text-sm`}>
              {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
              {archived ? "Archivé (jamais proposé)" : "Archiver"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`« ${dish.name} » n'est pas un plat ?\nIl devient un accompagnement de ses ${dish.meals} repas et disparaît des plats.`)) {
                  finish(() => convertDishToSide(dish.id));
                }
              }}
              className={`${look.btn} ${look.btnPlain} text-sm`}
            >
              <Salad className="size-4" aria-hidden />
              Ce n&apos;est pas un plat
            </button>
            {dish.meals === 0 ? (
              <button type="button" disabled={pending} onClick={() => finish(() => deleteDish(dish.id))} className={`${look.btn} ${look.btnRed} text-sm`}>
                <Trash2 className="size-4" aria-hidden />
                Supprimer
              </button>
            ) : null}
          </div>
          <button type="submit" disabled={pending} className={look.btn}>
            Enregistrer
          </button>
        </div>
      </form>
    </Sheet>
  );
}
