"use client";

import { ChevronLeft, ChevronRight, GripVertical, Lock, LockOpen, Plus, RefreshCw, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useOptimistic, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { generateWeek, moveMeal, setMealValidated, setWeekValidated } from "../actions/meals";
import type { MealSlot } from "../domain/week";
import type { DishOption, MealView } from "../view-models";
import { dishHue, mealTitle, SLOT_LABELS } from "./labels";
import { MealEditor } from "./meal-editor";

export type DayView = { dateIso: string; label: string; isToday: boolean; lunch: MealView | null; dinner: MealView | null };

type Props = {
  week: string;
  title: string;
  previousWeek: string;
  nextWeek: string;
  days: readonly DayView[];
  /** Sunday dinner of the previous week (default of Monday's leftover). */
  dayBeforeDinner: MealView | null;
  dishes: readonly DishOption[];
};

type Key = `${string}:${MealSlot}`;
const keyOf = (dateIso: string, slot: MealSlot): Key => `${dateIso}:${slot}`;
const refOf = (key: Key) => {
  const [date = "", slot = "LUNCH"] = key.split(":") as [string, MealSlot];
  return { date, slot };
};

type Change =
  | { type: "move"; from: Key; to: Key }
  | { type: "validate"; key: Key; validated: boolean }
  | { type: "validateAll"; validated: boolean };

function applyChange(days: readonly DayView[], change: Change): DayView[] {
  const cells = new Map<Key, MealView | null>();
  for (const day of days) {
    cells.set(keyOf(day.dateIso, "LUNCH"), day.lunch);
    cells.set(keyOf(day.dateIso, "DINNER"), day.dinner);
  }
  const status = (validated: boolean): MealView["status"] => (validated ? "VALIDATED" : "PROPOSED");
  if (change.type === "move") {
    const source = cells.get(change.from) ?? null;
    const target = cells.get(change.to) ?? null;
    if (source) {
      const to = refOf(change.to);
      const from = refOf(change.from);
      cells.set(change.to, { ...source, dateIso: to.date, slot: to.slot });
      cells.set(change.from, target ? { ...target, dateIso: from.date, slot: from.slot } : null);
    }
  } else if (change.type === "validate") {
    const meal = cells.get(change.key);
    if (meal) cells.set(change.key, { ...meal, status: status(change.validated) });
  } else {
    for (const [key, meal] of cells) if (meal) cells.set(key, { ...meal, status: status(change.validated) });
  }
  return days.map((day) => ({
    ...day,
    lunch: cells.get(keyOf(day.dateIso, "LUNCH")) ?? null,
    dinner: cells.get(keyOf(day.dateIso, "DINNER")) ?? null,
  }));
}

type Drag = { from: Key; title: string; x: number; y: number; over: Key | null };

/** The week grid: generate, validate (lock), drag and drop, edit a cell. */
export function WeekBoard({ week, title, previousWeek, nextWeek, days, dayBeforeDinner, dishes }: Props) {
  const [optimisticDays, addChange] = useOptimistic(days, applyChange);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<Key | "week" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: Key; meal: MealView | null } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const meals = optimisticDays.flatMap((day) => [day.lunch, day.dinner]).filter((meal) => meal !== null);
  const validatedCount = meals.filter((meal) => meal.status === "VALIDATED").length;
  const allValidated = meals.length > 0 && validatedCount === meals.length;

  const run = (busy: Key | "week" | null, change: Change | null, action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      setBusyKey(busy);
      if (change) addChange(change);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Action impossible");
      setBusyKey(null);
    });

  const generate = (only: Key | null) =>
    run(only ?? "week", null, () => generateWeek(week, only ? refOf(only) : null));

  const previousMealDish = (key: Key): string | null => {
    const { date, slot } = refOf(key);
    const index = optimisticDays.findIndex((day) => day.dateIso === date);
    const before =
      slot === "DINNER" ? optimisticDays[index]?.lunch : index > 0 ? optimisticDays[index - 1]?.dinner : dayBeforeDinner;
    return before && before.kind !== "OUT" ? before.dishName : null;
  };

  // Drag with a handle (touch-action: none) so the page still scrolls on iPhone.
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, key: Key, meal: MealView) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: key, title: mealTitle(meal), x: event.clientX, y: event.clientY, over: null });
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-slot-key]");
    setDrag({ ...drag, x: event.clientX, y: event.clientY, over: (target?.dataset.slotKey as Key | undefined) ?? null });
  };
  const endDrag = () => {
    if (drag?.over && drag.over !== drag.from) {
      const { from, over } = drag;
      run(null, { type: "move", from, to: over }, () => moveMeal(refOf(from), refOf(over)));
    }
    setDrag(null);
  };

  const cell = (day: DayView, slot: MealSlot) => {
    const key = keyOf(day.dateIso, slot);
    const meal = slot === "LUNCH" ? day.lunch : day.dinner;
    const isOver = drag?.over === key && drag.from !== key;
    const base = "group relative flex min-h-[4.5rem] flex-col rounded-xl border p-2 text-left transition-colors";

    if (!meal) {
      return (
        <div data-slot-key={key} className={`${base} border-dashed ${isOver ? "border-primary bg-primary/5" : ""}`}>
          <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">{SLOT_LABELS[slot]}</span>
          <button
            type="button"
            onClick={() => setEditing({ key, meal: null })}
            className="mt-1 inline-flex flex-1 items-center justify-center gap-1 rounded-lg text-sm text-muted-foreground hover:bg-muted"
            aria-label={`${day.label} ${SLOT_LABELS[slot]} : ajouter un repas`}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      );
    }

    const validated = meal.status === "VALIDATED";
    const hue = meal.dishId ? dishHue(meal.dishId) : null;
    const style =
      meal.kind === "OUT" || hue === null
        ? undefined
        : { backgroundColor: `oklch(0.97 0.03 ${hue})`, borderColor: validated ? `oklch(0.72 0.09 ${hue})` : undefined };

    return (
      <div
        data-slot-key={key}
        style={style}
        className={`${base} ${validated ? "border-solid" : "border-dashed"} ${meal.kind === "OUT" ? "bg-muted/60" : ""} ${
          isOver ? "ring-2 ring-primary" : ""
        } ${drag?.from === key ? "opacity-40" : ""} dark:bg-card`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">{SLOT_LABELS[slot]}</span>
          <span className="flex items-center">
            {!validated && meal.kind !== "OUT" ? (
              <button
                type="button"
                onClick={() => generate(key)}
                disabled={pending}
                aria-label="Proposer un autre plat"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background/70 hover:text-foreground"
              >
                <RefreshCw className={`size-3.5 ${busyKey === key ? "animate-spin" : ""}`} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              aria-pressed={validated}
              aria-label={validated ? "Déverrouiller" : "Valider"}
              onClick={() => run(key, { type: "validate", key, validated: !validated }, () => setMealValidated(refOf(key), !validated))}
              className={`inline-flex size-7 items-center justify-center rounded-md hover:bg-background/70 ${
                validated ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              {validated ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
            </button>
            <button
              type="button"
              aria-label={`Déplacer « ${mealTitle(meal)} »`}
              onPointerDown={(event) => startDrag(event, key, meal)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => setDrag(null)}
              className="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-background/70 active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
          </span>
        </div>
        <button type="button" onClick={() => setEditing({ key, meal })} className="mt-0.5 flex-1 text-left">
          {meal.kind === "LEFTOVER" ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Undo2 className="size-3" aria-hidden />
              Reste
            </span>
          ) : null}
          <span className={`line-clamp-3 text-sm leading-snug ${meal.kind === "OUT" ? "text-muted-foreground italic" : "font-medium"}`}>
            {mealTitle(meal)}
          </span>
          {meal.note ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meal.note}</span> : null}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={`/repas?semaine=${previousWeek}`} aria-label="Semaine précédente" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="min-w-0 text-lg font-semibold sm:text-xl">{title}</h1>
          <Link href={`/repas?semaine=${nextWeek}`} aria-label="Semaine suivante" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {meals.length > 0 ? (
            <Button
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => run("week", { type: "validateAll", validated: !allValidated }, () => setWeekValidated(week, !allValidated))}
            >
              {allValidated ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
              {allValidated ? "Tout déverrouiller" : "Tout valider"}
            </Button>
          ) : null}
          <Button size="lg" disabled={pending || (allValidated && meals.length === 14)} onClick={() => generate(null)}>
            <Sparkles className={busyKey === "week" ? "animate-pulse" : undefined} aria-hidden />
            {meals.length > validatedCount ? "Regénérer" : "Générer"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {validatedCount}/{meals.length} repas validés · les cases en pointillés sont des propositions, le cadenas les protège de la génération.
      </p>
      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {optimisticDays.map((day) => (
          <li key={day.dateIso} className={`rounded-2xl border bg-card p-2 ${day.isToday ? "border-primary/60 ring-1 ring-primary/30" : ""}`}>
            <h2 className={`mb-2 px-1 text-sm font-semibold ${day.isToday ? "text-primary" : ""}`}>
              {day.label}
              {day.isToday ? <span className="ml-1.5 text-xs font-normal">· aujourd&apos;hui</span> : null}
            </h2>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {cell(day, "LUNCH")}
              {cell(day, "DINNER")}
            </div>
          </li>
        ))}
      </ol>

      {drag ? (
        <div
          className="pointer-events-none fixed z-50 max-w-48 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background px-3 py-2 text-sm font-medium shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.title}
        </div>
      ) : null}

      {editing ? (
        <MealEditor
          key={editing.key}
          dateIso={refOf(editing.key).date}
          slot={refOf(editing.key).slot}
          meal={editing.meal}
          dishes={dishes}
          previousDish={previousMealDish(editing.key)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
