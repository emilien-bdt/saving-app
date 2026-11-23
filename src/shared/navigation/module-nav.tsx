"use client";

import { ChevronDown, House, type LucideIcon, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import type { NavApp } from "@/modules/types";
import { Button } from "@/shared/ui/button";

export type ModuleNavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean };

type Props = {
  /** Current module, e.g. "Finances". */
  moduleName: string;
  apps: readonly NavApp[];
  /** Module pages; on a phone, the "+" button sits after the first `mobileSplit` tabs. */
  links: readonly ModuleNavLink[];
  addLabel: string;
  onAdd: () => void;
  mobileSplit?: number;
};

/** Switches between apps (desktop menu, "Accueil" tab on a phone). Closes on navigation. */
function AppSwitcher({ moduleName, apps }: { moduleName: string; apps: readonly NavApp[] }) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  return (
    <details ref={details} className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
        {moduleName}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="absolute left-0 top-full z-40 mt-1 min-w-48 rounded-xl border bg-popover p-1 shadow-lg">
        <li>
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
            <House className="size-4" aria-hidden />
            Accueil
          </Link>
        </li>
        {apps.map((app) => (
          <li key={app.id}>
            <Link
              href={app.href}
              aria-current={pathname.startsWith(app.href) ? "true" : undefined}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted aria-[current=true]:font-medium"
            >
              {app.icon}
              {app.name}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Same navigation in every module: top bar on a computer, tab bar on a phone; "+" on every page. */
export function ModuleNav({ moduleName, apps, links, addLabel, onAdd, mobileSplit = 1 }: Props) {
  const pathname = usePathname();
  const isActive = ({ href, exact }: ModuleNavLink) => (exact ? pathname === href : pathname.startsWith(href));

  const tab = (link: ModuleNavLink): ReactNode => {
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive(link) ? "page" : undefined}
        className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground aria-[current=page]:text-foreground"
      >
        <Icon className="size-5" aria-hidden />
        {link.label}
      </Link>
    );
  };
  const home: ModuleNavLink = { href: "/", label: "Accueil", icon: House, exact: true };
  const before = [home, ...links.slice(0, mobileSplit)];
  const after = links.slice(mobileSplit);

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b bg-background/95 backdrop-blur sm:block">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4" aria-label={moduleName}>
          <Link href="/" className="mr-1 font-semibold">
            Save
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            /
          </span>
          <AppSwitcher moduleName={moduleName} apps={apps} />
          <span className="mx-2 h-5 w-px bg-border" aria-hidden />
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link) ? "page" : undefined}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                <Icon className="size-4" aria-hidden />
                {link.label}
              </Link>
            );
          })}
          <Button className="ml-auto" size="lg" onClick={onAdd}>
            <Plus aria-hidden />
            {addLabel}
          </Button>
        </nav>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label={moduleName}
      >
        <div className="grid items-center" style={{ gridTemplateColumns: `repeat(${before.length + after.length + 1}, minmax(0, 1fr))` }}>
          {before.map(tab)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onAdd}
              aria-label={addLabel}
              className="-mt-6 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            >
              <Plus className="size-7" aria-hidden />
            </button>
          </div>
          {after.map(tab)}
        </div>
      </nav>
    </>
  );
}
