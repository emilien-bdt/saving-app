"use client";

import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { NavApp } from "@/modules/types";
import { ios } from "@/shared/ui/ios";
import { PageHeader } from "@/shared/ui/page-header";
import { type SegmentLink, SegmentedLinks } from "@/shared/ui/segmented";
import { AppTabBar } from "./app-tab-bar";

export type ModuleNavLink = SegmentLink;

type Props = {
  /** Current module, e.g. "Finances" (the large title). */
  moduleName: string;
  apps: readonly NavApp[];
  /** Module pages, shown as a segmented control under the title. */
  links: readonly ModuleNavLink[];
  /** Module settings, behind the ⚙︎ button. */
  settingsHref?: string;
  addLabel: string;
  onAdd: () => void;
  eyebrow?: ReactNode;
  wide?: boolean;
};

/** Same frame in every module: apps tab bar, large title with ⚙︎ and « + », pages as segments. */
export function ModuleNav({ moduleName, apps, links, settingsHref, addLabel, onAdd, eyebrow, wide }: Props) {
  const pathname = usePathname();
  const onSettings = settingsHref ? pathname.startsWith(settingsHref) : false;

  return (
    <>
      <AppTabBar apps={apps} />
      <PageHeader
        title={moduleName}
        eyebrow={eyebrow}
        wide={wide}
        actions={
          <>
            {settingsHref ? (
              <Link
                href={settingsHref}
                aria-label="Paramètres"
                aria-current={onSettings ? "page" : undefined}
                className={`${ios.iconButton} aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground`}
              >
                <Settings className="size-[18px]" aria-hidden />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onAdd}
              aria-label={addLabel}
              className="relative inline-flex size-9 items-center justify-center gap-1.5 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground after:absolute after:-inset-1 active:opacity-70 sm:w-auto sm:pr-4 sm:pl-3"
            >
              <Plus className="size-5" strokeWidth={2.6} aria-hidden />
              <span className="hidden sm:inline">{addLabel}</span>
            </button>
          </>
        }
      >
        {links.length > 1 ? <SegmentedLinks links={links} label={`Pages ${moduleName}`} /> : null}
      </PageHeader>
    </>
  );
}
