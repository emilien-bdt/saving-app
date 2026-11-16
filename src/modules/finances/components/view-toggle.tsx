"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { rememberTransactionView } from "../actions/preferences";
import type { TransactionView } from "../domain/list-filters";

const OPTIONS: { view: TransactionView; param: string; label: string }[] = [
  { view: "detailed", param: "detaillee", label: "Détaillée" },
  { view: "grouped", param: "groupee", label: "Groupée" },
];

/** Détaillée / Groupée; the choice is remembered (cookie read by the server). */
export function ViewToggle({ view }: { view: TransactionView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const select = (param: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("vue", param);
    router.replace(`${pathname}?${params}`, { scroll: false });
    startTransition(() => rememberTransactionView(param));
  };

  return (
    <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Affichage">
      {OPTIONS.map((option) => (
        <button
          key={option.view}
          type="button"
          aria-pressed={view === option.view}
          onClick={() => select(option.param)}
          className="rounded-md px-3 py-1 text-sm aria-pressed:bg-muted aria-pressed:font-medium"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
