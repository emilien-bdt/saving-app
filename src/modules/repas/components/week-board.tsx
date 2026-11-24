"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  GripVertical,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Soup,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, useOptimistic, useState, useTransition } from "react";
import { clearMeal, generateWeek, moveMeal, setMealValidated, setWeekValidated } from "../actions/meals";
import type { MealSlot } from "../domain/week";
import type { DishOption, MealView, SideOption } from "../view-models";
import { ios } from "@/shared/ui/ios";
import { DishPhoto } from "./dish-photo";
import { look } from "./look";
import { dishHue, longDayLabel, mealTitle, SLOT_LABELS, sidesLine } from "./labels";
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

  // Phone: one day at a time (today by default), chosen in the week strip.
  const [selected, setSelected] = useState(() => Math.max(0, days.findIndex((day) => day.isToday)));
  const selectedDay = optimisticDays[selected] ?? optimisticDays[0];

  const validate = (key: Key, validated: boolean) =>
    run(key, { type: "validate", key, validated }, () => setMealValidated(refOf(key), validated));
  const clear = (key: Key) => run(key, { type: "clear", key }, () => clearMeal(refOf(key)));

  /** Drag handle: move or swap a meal (any day on a computer; lunch ↔ dinner on a phone). */
  const grip = (key: Key, meal: MealView) => (
    <button
      type="button"
      aria-label={`Déplacer « ${mealTitle(meal)} »`}
      title="Glisser pour déplacer"
      onPointerDown={(event) => startDrag(event, key, meal)}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => setDrag(null)}
      className={`${look.iconBtn} cursor-grab touch-none bg-transparent! text-muted-foreground! active:cursor-grabbing`}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );

  const hueStyle = (meal: MealView) => {
    const hueId = meal.dishId ?? meal.sides[0]?.id ?? null;
    return meal.kind !== "OUT" && hueId ? ({ "--hue": dishHue(hueId) } as CSSProperties) : undefined;
  };

  const mealText = (meal: MealView, large: boolean) => (
    <>
      {meal.kind === "LEFTOVER" ? (
        <span className="mb-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
          <Soup className="size-3.5" aria-hidden />
          Reste
        </span>
      ) : null}
      {meal.kind === "OUT" ? (
        <span className="mb-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
          <DoorOpen className="size-3.5" aria-hidden />
          Dehors
        </span>
      ) : null}
      <span className={`block pr-5 ${large ? "text-xl leading-tight font-semibold" : `${look.mealTitle} line-clamp-3`}`}>{mealTitle(meal)}</span>
      {sidesLine(meal) ? <span className="mt-1 block text-[15px] text-muted-foreground">{sidesLine(meal)}</span> : null}
      {meal.note ? <span className="mt-0.5 block truncate text-[15px] text-muted-foreground">{meal.note}</span> : null}
    </>
  );

  /** Computer: one cell of the week grid. */
  const cell = (day: DayView, slot: MealSlot) => {
    const key = keyOf(day.dateIso, slot);
    const meal = slot === "LUNCH" ? day.lunch : day.dinner;
    const isOver = drag?.over === key && drag.from !== key;
    const label = `${day.label} ${SLOT_LABELS[slot]}`;

    if (!meal) {
      return (
        <div data-slot-key={key} className="flex h-full min-h-36 flex-col gap-1">
          <span className={look.slotLabel}>{SLOT_LABELS[slot]}</span>
          <button
            type="button"
            onClick={() => setEditing({ key, meal: null })}
            className={`${look.empty} ${isOver ? look.over : ""} flex flex-1 items-center justify-center gap-1.5 text-[15px] font-medium text-primary! active:opacity-60`}
            aria-label={`${label} : ajouter un repas`}
          >
            <Plus className="size-4" aria-hidden />
            Ajouter
          </button>
        </div>
      );
    }

    const validated = meal.status === "VALIDATED";
    const classes = [look.meal, meal.kind === "OUT" ? look.out : validated ? "" : look.proposed, isOver ? look.over : "", drag?.from === key ? look.dragging : ""].join(" ");

    return (
      <div data-slot-key={key} className="flex h-full min-h-36 flex-col gap-1">
        <span className={look.slotLabel}>
          {SLOT_LABELS[slot]}
          {!validated ? <span className="font-semibold tracking-normal text-warning normal-case">· proposé</span> : null}
        </span>
        <div style={hueStyle(meal)} className={`${classes} flex flex-1 flex-col`}>
          <button type="button" onClick={() => setEditing({ key, meal })} className="mb-2 flex-1 text-left active:opacity-60">
            {meal.photoUrl ? <DishPhoto src={meal.photoUrl} className="mb-2 aspect-[4/3] w-full rounded-lg" /> : null}
            {mealText(meal, false)}
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={validated}
              aria-label={validated ? `${label} : déverrouiller` : `${label} : valider`}
              title={validated ? "Validé (la génération n'y touche pas)" : "Valider"}
              onClick={() => validate(key, !validated)}
              className={`${look.iconBtn} ${look.iconBtnSm} ${validated ? look.locked : ""}`}
            >
              {validated ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
            </button>
            {!validated && meal.kind !== "OUT" ? (
              <button
                type="button"
                onClick={() => generate(key)}
                disabled={pending}
                aria-label={`${label} : proposer un autre plat`}
                title="Proposer un autre plat"
                className={`${look.iconBtn} ${look.iconBtnSm}`}
              >
                <RefreshCw className={`size-3.5 ${busyKey === key ? "animate-spin" : ""}`} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              aria-label={`${label} : supprimer « ${mealTitle(meal)} »`}
              title="Supprimer"
              onClick={() => clear(key)}
              className={`${look.iconBtn} ${look.iconBtnSm} ${look.danger}`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
            <span className="ml-auto">{grip(key, meal)}</span>
          </div>
        </div>
      </div>
    );
  };

  /** Phone: one meal of the selected day, as a large card. */
  const slotCard = (day: DayView, slot: MealSlot) => {
    const key = keyOf(day.dateIso, slot);
    const meal = slot === "LUNCH" ? day.lunch : day.dinner;
    const isOver = drag?.over === key && drag.from !== key;
    const label = `${day.label} ${SLOT_LABELS[slot]}`;

    return (
      <section key={slot} data-slot-key={key} aria-label={SLOT_LABELS[slot]}>
        <h3 className={ios.sectionLabel}>{SLOT_LABELS[slot]}</h3>
        {!meal ? (
          <button
            type="button"
            onClick={() => setEditing({ key, meal: null })}
            className={`${look.empty} ${isOver ? look.over : ""} flex h-16 w-full items-center justify-center gap-2 text-[15px] font-medium text-primary! active:opacity-60`}
            aria-label={`${label} : choisir un repas`}
          >
            <Plus className="size-4" aria-hidden />
            Choisir un repas
          </button>
        ) : (
          (() => {
            const validated = meal.status === "VALIDATED";
            return (
              <div
                style={hueStyle(meal)}
                className={`relative overflow-hidden rounded-2xl bg-card p-4 ${meal.kind === "OUT" ? "text-muted-foreground" : ""} ${isOver ? look.over : ""} ${drag?.from === key ? look.dragging : ""}`}
              >
                {meal.photoUrl ? (
                  <button type="button" onClick={() => setEditing({ key, meal })} className="-mx-4 -mt-4 mb-3 block w-[calc(100%+2rem)]" aria-label={`Modifier « ${mealTitle(meal)} »`}>
                    <DishPhoto src={meal.photoUrl} className="aspect-[16/9] w-full" />
                  </button>
                ) : null}
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => setEditing({ key, meal })} className="min-w-0 flex-1 text-left active:opacity-60">
                    {mealText(meal, true)}
                  </button>
                  {validated ? (
                    <button
                      type="button"
                      onClick={() => validate(key, false)}
                      aria-label={`${label} : déverrouiller`}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[13px] text-muted-foreground active:opacity-60"
                    >
                      <Lock className="size-3.5" aria-hidden />
                      Validé
                    </button>
                  ) : (
                    <span className={`${ios.badge} ${ios.badgeWarning} mt-1`}>Proposé</span>
                  )}
                </div>
                {!validated ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {meal.kind !== "OUT" ? (
                      <button type="button" onClick={() => generate(key)} disabled={pending} className={`${look.btn} ${look.btnPlain} h-11!`}>
                        <RefreshCw className={`size-4 ${busyKey === key ? "animate-spin" : ""}`} aria-hidden />
                        Autre plat
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="button" onClick={() => validate(key, true)} className={`${look.btn} h-11!`}>
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                      Valider
                    </button>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  {grip(key, meal)}
                  <button
                    type="button"
                    aria-label={`${label} : supprimer « ${mealTitle(meal)} »`}
                    onClick={() => clear(key)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[15px] text-destructive active:opacity-60"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </section>
    );
  };

  const dayHasProposed = (day: DayView) => [day.lunch, day.dinner].some((meal) => meal && meal.status !== "VALIDATED");
  const dayHasMeal = (day: DayView) => Boolean(day.lunch || day.dinner);
  const selectedProposed = selectedDay ? [selectedDay.lunch, selectedDay.dinner].filter((meal) => meal && meal.status !== "VALIDATED").length : 0;
  const validateDay = (day: DayView) => {
    for (const [slot, meal] of [["LUNCH", day.lunch], ["DINNER", day.dinner]] as const) {
      if (meal && meal.status !== "VALIDATED") validate(keyOf(day.dateIso, slot), true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1">
          <Link href={`/repas?semaine=${previousWeek}`} aria-label="Semaine précédente" className={`${look.iconBtn} bg-card!`}>
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h2 className="min-w-0 truncate px-1 text-[17px] font-semibold">{title}</h2>
          <Link href={`/repas?semaine=${nextWeek}`} aria-label="Semaine suivante" className={`${look.iconBtn} bg-card!`}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <p className={`${ios.hint} hidden lg:block`}>
          {validatedCount}/{meals.length} repas validés · pointillés = proposition, cadenas = gardé à la génération
        </p>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          {meals.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("week", { type: "validateAll", validated: !allValidated }, () => setWeekValidated(week, !allValidated))}
              className={`${look.btn} ${look.btnPlain} ${look.btnSm} flex-1 sm:flex-none`}
            >
              {allValidated ? <LockOpen className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              {allValidated ? "Tout déverrouiller" : "Tout valider"}
            </button>
          ) : null}
          <button type="button" disabled={pending || (allValidated && meals.length === 14)} onClick={() => generate(null)} className={`${look.btn} ${look.btnSm} flex-1 sm:flex-none`}>
            <Sparkles className={`size-4 ${busyKey === "week" ? "animate-pulse" : ""}`} aria-hidden />
            {meals.length > validatedCount ? "Regénérer" : "Générer"}
          </button>
        </div>
      </div>

      {error ? <p role="alert" className={ios.alertError}>{error}</p> : null}

      {/* Phone: week strip + the selected day. */}
      <div className="space-y-4 sm:hidden">
        <div className="grid grid-cols-7 gap-0.5" role="tablist" aria-label="Jours de la semaine">
          {optimisticDays.map((day, index) => {
            const on = index === selected;
            return (
              <button
                key={day.dateIso}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`${day.label}${dayHasProposed(day) ? ", repas proposés" : ""}`}
                onClick={() => setSelected(index)}
                className="flex h-16 flex-col items-center gap-1 rounded-xl active:opacity-60"
              >
                <span className={`text-xs font-semibold ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>{day.label.charAt(0)}</span>
                <span
                  className={`inline-flex size-9 items-center justify-center rounded-full text-[17px] ${on ? "bg-primary font-bold text-primary-foreground" : day.isToday ? "font-semibold text-primary" : "font-medium"}`}
                >
                  {day.label.split(" ")[1]}
                </span>
                <span
                  className={`size-1.5 rounded-full ${dayHasProposed(day) ? "bg-warning" : dayHasMeal(day) ? "bg-muted-foreground/60" : "bg-transparent"}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {selectedDay ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="text-xl font-bold tracking-tight">
                {longDayLabel(selectedDay.dateIso)}
                {selectedDay.isToday ? <span className="ml-1.5 text-[15px] font-medium text-primary">aujourd&apos;hui</span> : null}
              </h3>
              {selectedProposed > 0 ? (
                <button type="button" onClick={() => validateDay(selectedDay)} className="h-11 shrink-0 text-[15px] font-medium text-primary active:opacity-60">
                  {selectedProposed > 1 ? `Tout valider (${selectedProposed})` : "Valider la journée"}
                </button>
              ) : null}
            </div>
            {slotCard(selectedDay, "LUNCH")}
            {slotCard(selectedDay, "DINNER")}
          </div>
        ) : null}
      </div>

      {/* Computer: the whole week. */}
      <ol className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {optimisticDays.map((day) => (
          <li key={day.dateIso} className={`${look.day} ${day.isToday ? look.today : ""} flex flex-col`}>
            <h3 className={`${look.dayTitle} mb-2 px-1`}>
              {day.label}
              {day.isToday ? <span className="ml-1.5 text-[13px] font-medium text-primary">aujourd&apos;hui</span> : null}
            </h3>
            <div className="grid flex-1 auto-rows-fr gap-3">
              {cell(day, "LUNCH")}
              {cell(day, "DINNER")}
            </div>
          </li>
        ))}
      </ol>

      {drag ? (
        <div className={`${look.ghost} pointer-events-none fixed z-50 max-w-56 -translate-x-1/2 -translate-y-1/2`} style={{ left: drag.x, top: drag.y }}>
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
