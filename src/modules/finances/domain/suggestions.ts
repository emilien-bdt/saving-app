import { normalizeLabel } from "./labels";
import type { TransactionType } from "./types";

/** One row per (label spelling, type, category) with its number of uses. */
export type LabelUsage = {
  labelKey: string;
  label: string;
  type: TransactionType;
  categoryId: string | null;
  count: number;
  /** "AAAA-MM-JJ" */
  lastDateIso: string;
};

export type LabelSuggestion = {
  labelKey: string;
  label: string;
  type: TransactionType;
  categoryId: string | null;
  count: number;
};

/**
 * One suggestion per normalized label: its most used spelling and its usual
 * (type, category) — the most frequent, then the most recent. Sorted by use.
 */
export function buildLabelSuggestions(usages: readonly LabelUsage[], limit = 300): LabelSuggestion[] {
  type Entry = { total: number; spellings: Map<string, number>; targets: Map<string, { usage: LabelUsage; count: number }> };
  const byKey = new Map<string, Entry>();

  for (const usage of usages) {
    const entry = byKey.get(usage.labelKey) ?? { total: 0, spellings: new Map(), targets: new Map() };
    entry.total += usage.count;
    entry.spellings.set(usage.label, (entry.spellings.get(usage.label) ?? 0) + usage.count);
    const targetKey = `${usage.type}|${usage.categoryId ?? ""}`;
    const target = entry.targets.get(targetKey);
    if (!target) entry.targets.set(targetKey, { usage, count: usage.count });
    else {
      target.count += usage.count;
      if (usage.lastDateIso > target.usage.lastDateIso) target.usage = usage;
    }
    byKey.set(usage.labelKey, entry);
  }

  const suggestions: LabelSuggestion[] = [];
  for (const [labelKey, entry] of byKey) {
    const [label] = [...entry.spellings.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    const [best] = [...entry.targets.values()].sort(
      (a, b) => b.count - a.count || b.usage.lastDateIso.localeCompare(a.usage.lastDateIso),
    );
    if (!label || !best) continue;
    suggestions.push({ labelKey, label, type: best.usage.type, categoryId: best.usage.categoryId, count: entry.total });
  }
  return suggestions.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr")).slice(0, limit);
}

/** Suggestions for what is being typed: label starting with it first, then containing it. */
export function matchSuggestions(
  suggestions: readonly LabelSuggestion[],
  query: string,
  limit = 5,
): LabelSuggestion[] {
  const key = normalizeLabel(query);
  if (!key) return [];
  const starts = suggestions.filter((suggestion) => suggestion.labelKey.startsWith(key));
  const contains = suggestions.filter(
    (suggestion) => !suggestion.labelKey.startsWith(key) && suggestion.labelKey.includes(key),
  );
  return [...starts, ...contains].filter((suggestion) => suggestion.labelKey !== key).slice(0, limit);
}
