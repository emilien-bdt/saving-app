"use client";

import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  DoorOpen,
  GripVertical,
  Lock,
  LockOpen,
  Moon,
  RefreshCw,
  Soup,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, useOptimistic, useState, useTransition } from "react";
import { clearMeal, generateWeek, moveMeal, setMealValidated, setWeekValidated } from "../actions/meals";
import type { MealSlot } from "../domain/week";
import type { DishOption, MealView, SideOption } from "../view-models";
import { clay } from "./clay";
import { dishHue, mealTitle, SLOT_LABELS, sidesLine } from "./labels";
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
  sides: readonly SideOption[];
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
  | { type: "clear"; key: Key }
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
  } else if (change.type === "clear") {
    cells.set(change.key, null);
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

const SlotIcon = ({ slot }: { slot: MealSlot }) =>
  slot === "LUNCH" ? <Sun className="size-3.5" aria-hidden /> : <Moon className="size-3.5" aria-hidden />;

/** The week grid: generate, validate (lock), drag and drop, delete, edit a cell. */
export function WeekBoard({ week, title, previousWeek, nextWeek, days, dayBeforeDinner, dishes, sides }: Props) {
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

  const generate = (only: Key | null) => run(only ?? "week", null, () => generateWeek(week, only ? refOf(only) : null));

  const previousMealDish = (key: Key): string | null => {
    const { date, slot } = refOf(key);
    const index = optimisticDays.findIndex((day) => day.dateIso === date);
    const before = slot === "DINNER" ? optimisticDays[index]?.lunch : index > 0 ? optimisticDays[index - 1]?.dinner : dayBeforeDinner;
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
    const label = `${day.label} ${SLOT_LABELS[slot]}`;

    if (!meal) {
      return (
        <div data-slot-key={key} className={`${clay.empty} ${isOver ? clay.over : ""} flex min-h-32 flex-col p-3`}>
          <span className={clay.slotLabel}>
            <SlotIcon slot={slot} />
            {SLOT_LABELS[slot]}
          </span>
          <button
            type="button"
            onClick={() => setEditing({ key, meal: null })}
            className="mt-1 flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold opacity-70 hover:opacity-100"
            aria-label={`${label} : ajouter un repas`}
          >
            <CookingPot className="size-7" aria-hidden />
            Ajouter
          </button>
        </div>
      );
    }

    const validated = meal.status === "VALIDATED";
    const hueId = meal.dishId ?? meal.sides[0]?.id ?? null;
    const style = meal.kind !== "OUT" && hueId ? ({ "--hue": dishHue(hueId) } as CSSProperties) : undefined;
    const classes = [
      clay.meal,
      meal.kind === "OUT" ? clay.out : validated ? "" : clay.proposed,
      isOver ? clay.over : "",
      drag?.from === key ? clay.dragging : "",
    ].join(" ");

    return (
      <div data-slot-key={key} style={style} className={`${classes} flex min-h-32 flex-col`}>
        <span className={clay.slotLabel}>
          <SlotIcon slot={slot} />
          {SLOT_LABELS[slot]}
          {!validated ? <span className="font-semibold normal-case tracking-normal">· proposé</span> : null}
        </span>
        <button type="button" onClick={() => setEditing({ key, meal })} className="mt-1 mb-2 flex-1 text-left">
          {meal.kind === "LEFTOVER" ? (
            <span className="mb-0.5 inline-flex items-center gap-1 text-xs font-bold opacity-75">
              <Soup className="size-3.5" aria-hidden />
              Reste
            </span>
          ) : null}
          {meal.kind === "OUT" ? (
            <span className="mb-0.5 inline-flex items-center gap-1 text-xs font-bold opacity-75">
              <DoorOpen className="size-3.5" aria-hidden />
              Dehors
            </span>
          ) : null}
          <span className={`${clay.mealTitle} line-clamp-3 block`}>{mealTitle(meal)}</span>
          {sidesLine(meal) ? <span className="mt-1 block text-sm font-semibold opacity-80">{sidesLine(meal)}</span> : null}
          {meal.note ? <span className="mt-0.5 block truncate text-sm opacity-75">{meal.note}</span> : null}
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={validated}
            aria-label={validated ? `${label} : déverrouiller` : `${label} : valider`}
            title={validated ? "Validé (la génération n'y touche pas)" : "Valider"}
            onClick={() => run(key, { type: "validate", key, validated: !validated }, () => setMealValidated(refOf(key), !validated))}
            className={`${clay.iconBtn} ${validated ? clay.locked : ""}`}
          >
            {validated ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
          </button>
          {!validated && meal.kind !== "OUT" ? (
            <button
              type="button"
              onClick={() => generate(key)}
              disabled={pending}
              aria-label={`${label} : proposer un autre plat`}
              title="Proposer un autre plat"
              className={clay.iconBtn}
            >
              <RefreshCw className={`size-4 ${busyKey === key ? "animate-spin" : ""}`} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`${label} : supprimer « ${mealTitle(meal)} »`}
            title="Supprimer"
            onClick={() => run(key, { type: "clear", key }, () => clearMeal(refOf(key)))}
            className={`${clay.iconBtn} ${clay.danger}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Déplacer « ${mealTitle(meal)} »`}
            title="Glisser pour déplacer"
            onPointerDown={(event) => startDrag(event, key, meal)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => setDrag(null)}
            className={`${clay.iconBtn} ml-auto cursor-grab touch-none active:cursor-grabbing`}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/repas?semaine=${previousWeek}`} aria-label="Semaine précédente" className={clay.iconBtn}>
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="px-1">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
              <ChefHat className="size-7 shrink-0" aria-hidden />
              {title}
            </h1>
            <p className="text-sm font-medium opacity-70">
              {validatedCount}/{meals.length} repas validés · pointillés = proposition, cadenas = gardé à la génération
            </p>
          </div>
          <Link href={`/repas?semaine=${nextWeek}`} aria-label="Semaine suivante" className={clay.iconBtn}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-1">
          {meals.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("week", { type: "validateAll", validated: !allValidated }, () => setWeekValidated(week, !allValidated))}
              className={`${clay.btn} ${clay.btnGreen}`}
            >
              {allValidated ? <LockOpen className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
              {allValidated ? "Tout déverrouiller" : "Tout valider"}
            </button>
          ) : null}
          <button type="button" disabled={pending || (allValidated && meals.length === 14)} onClick={() => generate(null)} className={clay.btn}>
            <Sparkles className={`size-5 ${busyKey === "week" ? "animate-pulse" : ""}`} aria-hidden />
            {meals.length > validatedCount ? "Regénérer" : "Générer"}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-100 px-4 py-2 font-semibold text-red-800">{error}</p> : null}

      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {optimisticDays.map((day) => (
          <li key={day.dateIso} className={`${clay.day} ${day.isToday ? clay.today : ""}`}>
            <h2 className={`${clay.dayTitle} mb-3 px-1`}>
              {day.label}
              {day.isToday ? <span className="ml-1.5 text-sm font-semibold opacity-70">· aujourd&apos;hui</span> : null}
            </h2>
            <div className="grid gap-3">
              {cell(day, "LUNCH")}
              {cell(day, "DINNER")}
            </div>
          </li>
        ))}
      </ol>

      {drag ? (
        <div className={`${clay.ghost} pointer-events-none fixed z-50 max-w-56 -translate-x-1/2 -translate-y-1/2`} style={{ left: drag.x, top: drag.y }}>
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
          sideOptions={sides}
          previousDish={previousMealDish(editing.key)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
