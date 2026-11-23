/** ?liste=<id> | ?liste=aucune | nothing (all tasks). */
export type ParsedListFilter = { kind: "all" } | { kind: "none" } | { kind: "list"; id: string };

export const NO_LIST_PARAM = "aucune";

export function parseListFilter(value: string | string[] | undefined): ParsedListFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return { kind: "all" };
  if (raw === NO_LIST_PARAM) return { kind: "none" };
  return /^[a-z0-9]{1,64}$/i.test(raw) ? { kind: "list", id: raw } : { kind: "all" };
}

export function listFilterHref(filter: ParsedListFilter): string {
  if (filter.kind === "all") return "/todo";
  return `/todo?liste=${filter.kind === "none" ? NO_LIST_PARAM : filter.id}`;
}
