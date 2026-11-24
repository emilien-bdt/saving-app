"use client";

import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { type ReactNode, type RefObject, useState } from "react";

type Props = {
  title: ReactNode;
  /** Called once the sheet has finished closing (swipe down, backdrop, ✕ or Échap). */
  onClose: () => void;
  children: ReactNode;
  /** Extra header content, before the ✕ (e.g. a delete button). */
  headerAside?: ReactNode;
  /** Field focused when the sheet opens (opens the keyboard on a phone). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Wider on a computer (dish editor). */
  wide?: boolean;
};

/**
 * iOS sheet: rises from the bottom, closes by swiping it down (Base UI Drawer).
 * Mounted open; the parent unmounts it in `onClose`. On a computer it floats, centred.
 */
export function Sheet({ title, onClose, children, headerAside, initialFocus, wide = false }: Props) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => setOpen(next)}
      onOpenChangeComplete={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black opacity-[calc(0.35*(1-var(--drawer-swipe-progress,0)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 dark:opacity-[calc(0.6*(1-var(--drawer-swipe-progress,0)))] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <Drawer.Popup
            initialFocus={initialFocus}
            className={`flex max-h-[calc(100dvh-2.75rem)] w-full ${wide ? "max-w-3xl" : "max-w-xl"} flex-col rounded-t-[1.35rem] bg-card text-card-foreground shadow-2xl outline-none [transform:translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform data-swiping:select-none data-starting-style:[transform:translateY(110%)] data-ending-style:[transform:translateY(110%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.35rem]`}
          >
            <div className="shrink-0 touch-none px-4 pt-2 pb-3 select-none">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/35" aria-hidden />
              <div className="flex items-center gap-2">
                <Drawer.Title className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</Drawer.Title>
                {headerAside}
                <Drawer.Close
                  aria-label="Fermer"
                  className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground after:absolute after:-inset-1.5 active:opacity-60"
                >
                  <X className="size-4" strokeWidth={2.5} aria-hidden />
                </Drawer.Close>
              </div>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
