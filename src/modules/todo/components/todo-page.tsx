import Link from "next/link";
import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { getLists } from "../data/lists";
import { getCompletedTasks, getOpenTasks } from "../data/tasks";
import { listFilterHref, NO_LIST_PARAM, type ParsedListFilter, parseListFilter } from "../domain/list-filter";
import { groupOpenTasks } from "../domain/tasks";
import { TaskBoard } from "./task-board";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function FilterChip({ filter, current, label, color }: { filter: ParsedListFilter; current: ParsedListFilter; label: string; color?: string }) {
  const active = filter.kind === current.kind && (filter.kind !== "list" || (current.kind === "list" && current.id === filter.id));
  return (
    <Link
      href={listFilterHref(filter)}
      aria-current={active ? "page" : undefined}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
    >
      {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden /> : null}
      {label}
    </Link>
  );
}

/** Open tasks grouped by due date, filterable by list. */
export async function TodoPage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;
  const lists = await getLists();
  const parsed = parseListFilter(params.liste);
  // Unknown list (deleted, bad link): show every task.
  const filter: ParsedListFilter = parsed.kind === "list" && !lists.some((list) => list.id === parsed.id) ? { kind: "all" } : parsed;
  const today = todayIso();
  const [open, completed] = await Promise.all([getOpenTasks(filter), getCompletedTasks(filter)]);
  const listParam = filter.kind === "all" ? null : filter.kind === "none" ? NO_LIST_PARAM : filter.id;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-28 sm:pb-10">
      <h1 className="sr-only">Tâches</h1>
      {lists.length > 0 ? (
        <nav aria-label="Listes" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <FilterChip filter={{ kind: "all" }} current={filter} label="Toutes" />
          {lists.map((list) => (
            <FilterChip key={list.id} filter={{ kind: "list", id: list.id }} current={filter} label={list.name} color={list.color} />
          ))}
          <FilterChip filter={{ kind: "none" }} current={filter} label="Sans liste" />
        </nav>
      ) : null}
      <TaskBoard
        groups={groupOpenTasks(open, today)}
        completed={completed}
        lists={lists}
        today={today}
        listParam={listParam}
        showList={filter.kind === "all"}
      />
    </main>
  );
}
