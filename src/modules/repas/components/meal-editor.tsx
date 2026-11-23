"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Lock, LockOpen, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { clearMeal, saveMeal } from "../actions/meals";
import type { MealKind } from "../domain/grid";
import type { MealSlot } from "../domain/week";
import type { DishOption, MealView } from "../view-models";
import { longDayLabel, SLOT_LABELS } from "./labels";

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";
const chipClass =
  "rounded-full border px-3 py-1.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground";

const KINDS: { kind: MealKind; label: string }[] = [
  { kind: "DISH", label: "Plat" },
  { kind: "LEFTOVER", label: "Reste" },
  { kind: "OUT", label: "Absent / dehors" },
];
const OUT_SUGGESTIONS = ["Absent", "Restaurant", "Chez Maman", "Chez Zoë"];

type Props = {
  /** Slot being edited; `pickSlot` lets the user choose it (the "+" button). */
  dateIso: string;
  slot: MealSlot;
  pickSlot?: boolean;
  meal: MealView | null;
  dishes: readonly DishOption[];
  /** Dish of the meal just before: default of a leftover. */
  previousDish: string | null;
  onClose: () => void;
};

type Values = { dateIso: string; slot: MealSlot; kind: MealKind; dishName: string; label: string; note: string; validated: boolean };

export function MealEditor({ dateIso, slot, pickSlot = false, meal, dishes, previousDish, onClose }: Props) {
  const [values, setValues] = useState<Values>(() => ({
    dateIso,
    slot,
    kind: meal?.kind ?? "DISH",
    dishName: meal?.dishName ?? "",
    label: meal?.label ?? "Absent",
    note: meal?.note ?? "",
    // A meal chosen by hand is validated; a generated one stays proposed until locked.
    validated: meal ? meal.status === "VALIDATED" : true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dishRef = useRef<HTMLInputElement>(null);
  const set = (changes: Partial<Values>) => setValues((current) => ({ ...current, ...changes }));

  const ref = { date: values.dateIso, slot: values.slot };
  const submit = () =>
    startTransition(async () => {
      const common = { note: values.note, validated: values.validated };
      const result = await saveMeal(
        ref,
        values.kind === "OUT" ? { kind: "OUT", label: values.label, ...common } : { kind: values.kind, dishName: values.dishName, ...common },
      );
      if (result.ok) onClose();
      else {
        setErrors(result.fieldErrors);
        setFormError(result.error);
      }
    });

  const clear = () =>
    startTransition(async () => {
      const result = await clearMeal(ref);
      if (result.ok) onClose();
      else setFormError(result.error);
    });

  const query = values.dishName.trim().toLowerCase();
  const quickDishes = (query ? dishes.filter((dish) => dish.name.toLowerCase().includes(query)) : dishes).slice(0, 10);

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={dishRef}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {pickSlot ? "Nouveau repas" : `${longDayLabel(values.dateIso)} · ${SLOT_LABELS[values.slot]}`}
            </Dialog.Title>
            <Dialog.Close className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted" aria-label="Fermer">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {pickSlot ? (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="meal-date" className="sr-only">
                  Date
                </label>
                <input
                  id="meal-date"
                  type="date"
                  required
                  value={values.dateIso}
                  onChange={(event) => set({ dateIso: event.target.value })}
                  className="h-9 rounded-full border bg-background px-3 text-sm"
                />
                {(["LUNCH", "DINNER"] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={values.slot === option} onClick={() => set({ slot: option })} className={chipClass}>
                    {SLOT_LABELS[option]}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2" role="group" aria-label="Type de repas">
              {KINDS.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  aria-pressed={values.kind === option.kind}
                  onClick={() =>
                    set({
                      kind: option.kind,
                      dishName: option.kind === "LEFTOVER" && !values.dishName && previousDish ? previousDish : values.dishName,
                    })
                  }
                  className={chipClass}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {values.kind === "OUT" ? (
              <div className="grid gap-2">
                <label htmlFor="meal-label" className="sr-only">
                  Où ?
                </label>
                <input
                  id="meal-label"
                  value={values.label}
                  onChange={(event) => set({ label: event.target.value })}
                  maxLength={120}
                  autoComplete="off"
                  aria-invalid={errors.label ? true : undefined}
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  {OUT_SUGGESTIONS.map((label) => (
                    <button key={label} type="button" aria-pressed={values.label === label} onClick={() => set({ label })} className={chipClass}>
                      {label}
                    </button>
                  ))}
                </div>
                {errors.label ? <p className="text-sm text-destructive">{errors.label}</p> : null}
              </div>
            ) : (
              <div className="grid gap-2">
                <label htmlFor="meal-dish" className="sr-only">
                  {values.kind === "LEFTOVER" ? "Reste de quel plat ?" : "Plat"}
                </label>
                <input
                  id="meal-dish"
                  ref={dishRef}
                  value={values.dishName}
                  onChange={(event) => set({ dishName: event.target.value })}
                  placeholder={values.kind === "LEFTOVER" ? "Reste de…" : "Quel plat ?"}
                  maxLength={120}
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-invalid={errors.dishName ? true : undefined}
                  className={inputClass}
                />
                {quickDishes.length > 0 ? (
                  <div className="flex flex-wrap gap-2" aria-label="Plats connus">
                    {quickDishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        aria-pressed={values.dishName === dish.name}
                        onClick={() => set({ dishName: dish.name })}
                        className={chipClass}
                      >
                        {dish.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {errors.dishName ? <p className="text-sm text-destructive">{errors.dishName}</p> : null}
              </div>
            )}

            <div className="grid gap-1">
              <label htmlFor="meal-note" className="text-sm text-muted-foreground">
                Note
              </label>
              <input
                id="meal-note"
                value={values.note}
                onChange={(event) => set({ note: event.target.value })}
                maxLength={500}
                autoComplete="off"
                placeholder="Facultatif (« Zoë », « double portion »…)"
                className={inputClass}
              />
            </div>

            <button
              type="button"
              aria-pressed={values.validated}
              onClick={() => set({ validated: !values.validated })}
              className="inline-flex items-center gap-2 justify-self-start rounded-full border px-3 py-1.5 text-sm aria-pressed:border-emerald-600 aria-pressed:bg-emerald-600/10 aria-pressed:text-emerald-700 dark:aria-pressed:text-emerald-400"
            >
              {values.validated ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
              {values.validated ? "Validé : la génération n'y touchera pas" : "Proposé : peut être regénéré"}
            </button>

            {formError && Object.keys(errors).length === 0 ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex items-center justify-between gap-2">
              {meal ? (
                <Button type="button" variant="destructive" size="lg" disabled={pending} onClick={clear}>
                  Vider la case
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={pending}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
