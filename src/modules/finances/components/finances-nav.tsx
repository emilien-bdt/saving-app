"use client";

import { LayoutDashboard, List, type LucideIcon, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { todayIso } from "@/shared/lib/today";
import { Button } from "@/shared/ui/button";
import type { TransactionFormOptions } from "../view-models";
import { TransactionEditor } from "./transaction-editor";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/finances", label: "Piloter", icon: LayoutDashboard },
  { href: "/finances/transactions", label: "Journal", icon: List },
  { href: "/finances/parametres", label: "Paramètres", icon: Settings },
];

/** Same navigation everywhere: top bar on a computer, tab bar on a phone; "+ Saisir" on every page. */
export function FinancesNav({ options }: { options: TransactionFormOptions }) {
  const pathname = usePathname();
  const [editorKey, setEditorKey] = useState<number | null>(null);
  const isActive = (href: string) => (href === "/finances" ? pathname === href : pathname.startsWith(href));
  const openEditor = () => setEditorKey((key) => (key ?? 0) + 1);

  const tab = ({ href, label, icon: Icon }: (typeof LINKS)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground aria-[current=page]:text-foreground"
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b bg-background/95 backdrop-blur sm:block">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4" aria-label="Finances">
          <span className="mr-4 font-semibold">Save</span>
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
          <Button className="ml-auto" size="lg" onClick={openEditor}>
            <Plus aria-hidden />
            Saisir
          </Button>
        </nav>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Finances"
      >
        <div className="grid grid-cols-4 items-center">
          {LINKS.slice(0, 2).map(tab)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openEditor}
              aria-label="Saisir une transaction"
              className="-mt-6 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            >
              <Plus className="size-7" aria-hidden />
            </button>
          </div>
          {LINKS.slice(2).map(tab)}
        </div>
      </nav>

      {editorKey !== null ? (
        <TransactionEditor
          key={editorKey}
          transaction={null}
          options={options}
          defaultDate={todayIso()}
          onClose={() => setEditorKey(null)}
        />
      ) : null}
    </>
  );
}
