"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Segmented control container and segment (also used by in-page toggles with buttons). */
export const segmented = {
  bar: "grid w-full rounded-[10px] bg-black/[0.06] p-0.5 sm:max-w-md dark:bg-white/[0.1]",
  item: "flex h-8 min-w-0 items-center justify-center gap-1.5 truncate rounded-[8px] px-2 text-[13px] font-medium text-foreground transition-colors aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:shadow-sm aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:shadow-sm dark:aria-[current=page]:bg-input dark:aria-pressed:bg-input",
} as const;

export const columns = (count: number) => ({ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` });

export type SegmentLink = { href: string; label: string; exact?: boolean };

/** The module's pages as an iOS segmented control (Semaine · Courses · Plats…). */
export function SegmentedLinks({ links, label }: { links: readonly SegmentLink[]; label: string }) {
  const pathname = usePathname();
  const isActive = ({ href, exact }: SegmentLink) => (exact ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label={label} className={segmented.bar} style={columns(links.length)}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={isActive(link) ? "page" : undefined} className={segmented.item}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
