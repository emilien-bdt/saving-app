"use client";

import { Check, ChevronLeft, ChevronRight, ClipboardCopy, ExternalLink, Plus, RotateCcw, Share2, ShoppingBasket, Undo2, X } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import {
  addShoppingItem,
  removeItem,
  restoreItem,
  setItemAmount,
  setItemChecked,
  toggleStaple,
  uncheckAllItems,
} from "../actions/shopping";
import { AISLES, UNITS } from "../domain/ingredients";
import { coursesUSearchUrl, lineQuantity, type ShoppingLine, shoppingText } from "../domain/shopping";
import type { SideOption } from "../view-models";
import { look } from "./look";
import { AISLE_LOOK } from "./labels";

type Props = {
  week: string;
  title: string;
  previousWeek: string;
  nextWeek: string;
  lines: readonly ShoppingLine[];
  staples: readonly SideOption[];
  ingredientNames: readonly SideOption[];
};

type Change =
  | { type: "check"; id: string; checked: boolean }
  | { type: "remove"; id: string; computed: boolean }
  | { type: "restore"; id: string }
  | { type: "amount"; id: string; amount: number | null }
  | { type: "uncheckAll" };

function applyChange(lines: readonly ShoppingLine[], change: Change): ShoppingLine[] {
  if (change.type === "uncheckAll") return lines.map((line) => ({ ...line, checked: false }));
  return lines.flatMap((line) => {
    if (line.ingredientId !== change.id) return [line];
    if (change.type === "check") return [{ ...line, checked: change.checked }];
    if (change.type === "remove") return change.computed ? [{ ...line, removed: true, checked: false }] : [];
    if (change.type === "restore") return [{ ...line, removed: false }];
    return [{ ...line, amount: change.amount ?? line.amount, overridden: change.amount !== null, packs: null }];
  });
}

const unitLabel = (unit: ShoppingLine["unit"]) => UNITS.find((item) => item.id === unit)?.label ?? "";

/** The week's shopping list: computed from the meals + basics + manual, by drive aisle, tickable. */
export function ShoppingBoard({ week, title, previousWeek, nextWeek, lines, staples, ingredientNames }: Props) {
  const [optimistic, addChange] = useOptimistic(lines, applyChange);
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (change: Change | null, action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      if (change) addChange(change);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Action impossible");
    });

  const active = optimistic.filter((line) => !line.removed);
  const removed = optimistic.filter((line) => line.removed);
  const done = active.filter((line) => line.checked).length;
  const inList = new Map(optimistic.map((line) => [line.ingredientId, line]));
  const text = shoppingText(optimistic, `Courses ${title}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Liste copiée");
    } catch {
      setNotice("Copie impossible sur cet appareil");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: `Courses ${title}`, text });
    } catch {
      // Cancelled by the user, or not supported: nothing to do.
    }
  };
  // Web Share (iPhone: Notes, Rappels, Messages…); false while rendering on the server.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  const add = () => {
    const value = name.trim();
    if (!value) return;
    setName("");
    run(null, () => addShoppingItem(week, value));
  };

  const saveAmount = (line: ShoppingLine) => {
    if (!editing) return;
    const raw = editing.value.trim().replace(",", ".");
    const amount = raw === "" ? null : Math.round(Number(raw));
    setEditing(null);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return setError("Quantité invalide");
    run({ type: "amount", id: line.ingredientId, amount }, () => setItemAmount(week, line.ingredientId, amount));
  };

  const row = (line: ShoppingLine) => {
    const quantity = lineQuantity(line);
    const computed = line.source === "MEALS";
    return (
      <li key={line.ingredientId} className={`flex items-center gap-1.5 rounded-xl py-0.5 ${line.checked ? "opacity-55" : ""}`}>
        <button
          type="button"
          role="checkbox"
          aria-checked={line.checked}
          aria-label={line.checked ? `${line.name} : remettre à acheter` : `${line.name} : pris`}
          onClick={() => run({ type: "check", id: line.ingredientId, checked: !line.checked }, () => setItemChecked(week, line.ingredientId, !line.checked))}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full active:scale-90 transition-transform"
        >
          {line.checked ? (
            <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3.5" strokeWidth={3.2} aria-hidden />
            </span>
          ) : (
            <span className="size-[22px] rounded-full border-2 border-muted-foreground/60" aria-hidden />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={`text-[17px] ${line.checked ? "line-through" : ""}`}>{line.name}</span>
            {editing?.id === line.ingredientId ? (
              <form
                className="inline-flex items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAmount(line);
                }}
              >
                <input
                  autoFocus
                  value={editing.value}
                  onChange={(event) => setEditing({ id: line.ingredientId, value: event.target.value })}
                  onBlur={() => saveAmount(line)}
                  inputMode="numeric"
                  aria-label={`Quantité de ${line.name} (${unitLabel(line.unit)})`}
                  placeholder="auto"
                  className={`${look.field} h-8! w-20 text-[15px]!`}
                />
                <span className="text-xs text-muted-foreground">{unitLabel(line.unit)}</span>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditing({ id: line.ingredientId, value: line.overridden && line.amount !== null ? String(line.amount) : "" })}
                className={`rounded-full px-1 text-sm font-medium underline decoration-dotted underline-offset-4 ${quantity ? "" : "text-muted-foreground"}`}
                title="Modifier la quantité"
              >
                {quantity || "quantité ?"}
                {line.overridden ? " ✎" : ""}
              </button>
            )}
          </div>
          {line.reasons.length > 0 ? <p className="truncate text-xs text-muted-foreground">{line.reasons.join(" · ")}</p> : null}
        </div>
        <a
          href={coursesUSearchUrl(line.name)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chercher ${line.name} sur Courses U`}
          title="Chercher sur Courses U"
          className={`${look.iconBtn} ${look.iconBtnSm} shrink-0`}
        >
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <button
          type="button"
          onClick={() => run({ type: "remove", id: line.ingredientId, computed }, () => removeItem(week, line.ingredientId, computed))}
          aria-label={computed ? `${line.name} : déjà au placard` : `Retirer ${line.name}`}
          title={computed ? "Déjà au placard" : "Retirer"}
          className={`${look.iconBtn} ${look.iconBtnSm} shrink-0`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/repas/courses?semaine=${previousWeek}`} aria-label="Semaine précédente" className={`${look.iconBtn} bg-card!`}>
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="px-1">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold">
              <ShoppingBasket className="size-5 shrink-0 text-app-repas" aria-hidden />
              Courses · {title}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              {done}/{active.length} pris · d&apos;après <Link href={`/repas?semaine=${week}`} className="underline underline-offset-2">les repas de la semaine</Link>
            </p>
          </div>
          <Link href={`/repas/courses?semaine=${nextWeek}`} aria-label="Semaine suivante" className={`${look.iconBtn} bg-card!`}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-1">
          {done > 0 ? (
            <button type="button" onClick={() => run({ type: "uncheckAll" }, () => uncheckAllItems(week))} className={`${look.btn} ${look.btnPlain} ${look.btnSm}`}>
              <RotateCcw className="size-4" aria-hidden />
              Tout décocher
            </button>
          ) : null}
          {canShare ? (
            <button type="button" onClick={share} className={`${look.btn} ${look.btnGreen} ${look.btnSm}`}>
              <Share2 className="size-4" aria-hidden />
              Partager
            </button>
          ) : null}
          <button type="button" onClick={copy} className={`${look.btn} ${look.btnSm}`}>
            <ClipboardCopy className="size-4" aria-hidden />
            Copier
          </button>
        </div>
      </div>

      {notice ? (
        <p className="inline-flex items-center gap-2 rounded-xl bg-positive/15 px-4 py-2.5 text-[15px] text-positive">
          <Check className="size-4" aria-hidden />
          {notice}
        </p>
      ) : null}
      {error ? <p role="alert" className="rounded-xl bg-destructive/12 px-4 py-2.5 text-[15px] text-destructive">{error}</p> : null}

      <section className={`${look.day} ${look.dayTight} grid gap-2`} aria-label="Ajouter">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <label htmlFor="shopping-add" className="sr-only">
            Ajouter un article
          </label>
          <input
            id="shopping-add"
            value={name}
            onChange={(event) => setName(event.target.value)}
            list="shopping-names"
            placeholder="Ajouter un article…"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
            className={`${look.field}`}
          />
          <datalist id="shopping-names">
            {ingredientNames.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          <button type="submit" disabled={!name.trim()} className={`${look.btn} ${look.btnSm}`} aria-label="Ajouter">
            <Plus className="size-4" aria-hidden />
          </button>
        </form>
        {staples.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Basiques">
            <span className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">Basiques</span>
            {staples.map((staple) => {
              const line = inList.get(staple.id);
              const added = line !== undefined && !line.removed;
              return (
                <button
                  key={staple.id}
                  type="button"
                  aria-pressed={added}
                  disabled={added && line?.source !== "STAPLE"}
                  onClick={() => run(null, () => toggleStaple(week, staple.id, !added))}
                  className={`${look.chip} ${look.chipSm}`}
                >
                  {staple.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {active.length === 0 ? (
        <p className={`${look.empty} p-6 text-center font-semibold`}>
          Rien à acheter : remplis la semaine, ajoute les ingrédients des plats ou tape un basique.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {AISLES.map((aisle) => {
            const inAisle = active.filter((line) => line.aisle === aisle.id);
            if (inAisle.length === 0) return null;
            return (
              <section
                key={aisle.id}
                style={{ "--hue": AISLE_LOOK[aisle.id]?.hue ?? 60 } as CSSProperties}
                className={`${look.day} ${look.tint} ${look.dayTight} min-h-36`}
                aria-labelledby={`aisle-${aisle.id}`}
              >
                <h2 id={`aisle-${aisle.id}`} className={`${look.tintTitle} mb-1`}>
                  <span aria-hidden>{AISLE_LOOK[aisle.id]?.emoji}</span>
                  {aisle.label}
                  <span className="text-muted-foreground">· {inAisle.filter((line) => !line.checked).length}</span>
                </h2>
                <ul>{inAisle.map(row)}</ul>
              </section>
            );
          })}
        </div>
      )}

      {removed.length > 0 ? (
        <details className={`${look.empty} p-4`}>
          <summary className="cursor-pointer font-semibold">Déjà au placard · {removed.length}</summary>
          <ul className="mt-2 grid gap-1">
            {removed.map((line) => (
              <li key={line.ingredientId} className="flex items-center justify-between gap-2">
                <span>
                  {line.name} <span className="text-sm text-muted-foreground">{lineQuantity(line)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => run({ type: "restore", id: line.ingredientId }, () => restoreItem(week, line.ingredientId))}
                  className={`${look.btn} ${look.btnPlain} text-sm`}
                >
                  <Undo2 className="size-4" aria-hidden />
                  À acheter
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
