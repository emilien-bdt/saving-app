"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TransactionFilters as Filters } from "../domain/list-filters";
import { statusParam } from "../domain/list-filters";
import type { AccountOption, CategoryOption } from "../view-models";

const selectClass = "h-9 min-w-0 rounded-lg border bg-background px-2 text-sm";

type Props = { filters: Filters; accounts: AccountOption[]; categories: CategoryOption[] };

export function TransactionFilters({ filters, accounts, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(filters.query ?? "");

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(changes)) {
      if (value) params.set(name, value);
      else params.delete(name);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  // Search as you type, without one navigation per keystroke.
  useEffect(() => {
    if (query.trim() === (filters.query ?? "")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.replace(`${pathname}?${params}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters.query, pathname, router, searchParams]);

  const topCategories = categories.filter((category) => !category.parentId);
  const childrenOf = (id: string) => categories.filter((category) => category.parentId === id);
  const active = Boolean(filters.accountId || filters.categoryId || filters.status || filters.query);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-40 flex-1">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un libellé"
          className="h-9 w-full rounded-lg border bg-background pr-2 pl-8 text-base sm:text-sm"
        />
      </label>
      <select
        aria-label="Compte"
        className={selectClass}
        value={filters.accountId ?? ""}
        onChange={(event) => update({ compte: event.target.value || null })}
      >
        <option value="">Tous les comptes</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.displayName}
            {account.archived ? " (archivé)" : ""}
          </option>
        ))}
      </select>
      <select
        aria-label="Catégorie"
        className={selectClass}
        value={filters.categoryId ?? ""}
        onChange={(event) => update({ categorie: event.target.value || null })}
      >
        <option value="">Toutes les catégories</option>
        {topCategories.map((category) =>
          category.hasChildren ? (
            <optgroup key={category.id} label={category.name}>
              <option value={category.id}>{category.name} (tout)</option>
              {childrenOf(category.id).map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ),
        )}
      </select>
      <select
        aria-label="Statut"
        className={selectClass}
        value={filters.status ? statusParam(filters.status) : ""}
        onChange={(event) => update({ statut: event.target.value || null })}
      >
        <option value="">Toutes</option>
        <option value="prevue">Prévues</option>
        <option value="pointee">Pointées</option>
      </select>
      {active ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            update({ compte: null, categorie: null, statut: null, q: null });
          }}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" aria-hidden />
          Effacer
        </button>
      ) : null}
    </div>
  );
}
