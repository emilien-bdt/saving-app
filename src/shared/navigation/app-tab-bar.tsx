"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavApp } from "@/modules/types";
import { PullToRefresh } from "./pull-to-refresh";

/**
 * Apps navigation on every page: tab bar at the bottom of a phone,
 * top bar on a computer. Also mounts pull-to-refresh.
 */
export function AppTabBar({ apps }: { apps: readonly NavApp[] }) {
  const pathname = usePathname();
  const items = [{ id: "home", name: "Accueil", href: "/", icon: <House aria-hidden /> }, ...apps];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-14 border-b bg-bar backdrop-blur-xl sm:block">
        <nav className="mx-auto flex h-full max-w-[1600px] items-center gap-1 px-6" aria-label="Apps">
          <Link href="/" className="mr-4 text-[17px] font-bold tracking-tight">
            Save
          </Link>
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted aria-[current=page]:bg-primary/12 aria-[current=page]:text-primary [&_svg]:size-[18px]"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <nav
        aria-label="Apps"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        <div className="flex h-[3.25rem] px-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors aria-[current=page]:text-primary [&_svg]:size-6 [&_svg]:stroke-[1.9]"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      <PullToRefresh />
    </>
  );
}
