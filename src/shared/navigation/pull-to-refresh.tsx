"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const THRESHOLD = 64;

/**
 * Pull down at the top of a page to reload its data (router.refresh), like an iOS list.
 * Ignored inside sheets and on drag handles (`touch-none`, `data-no-pull`).
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const current = useRef(0);

  useEffect(() => {
    const set = (value: number) => {
      current.current = value;
      setPull(value);
    };
    const onStart = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (window.scrollY > 0 || target?.closest("[data-no-pull], [role='dialog'], .touch-none")) {
        startY.current = null;
        return;
      }
      startY.current = event.touches[0]?.clientY ?? null;
    };
    const onMove = (event: TouchEvent) => {
      if (startY.current === null) return;
      const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current;
      set(delta > 0 && window.scrollY <= 0 ? Math.min(delta * 0.5, 96) : 0);
    };
    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (current.current >= THRESHOLD) startTransition(() => router.refresh());
      set(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const visible = pending || pull > 8;
  return (
    <div
      aria-hidden={!pending}
      role={pending ? "status" : undefined}
      className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center transition-opacity"
      style={{ opacity: visible ? Math.max(pending ? 1 : pull / THRESHOLD, 0.2) : 0, transform: `translateY(${pending ? 16 : pull / 2}px)` }}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-md">
        <RefreshCw
          className={`size-4 ${pending ? "animate-spin" : ""}`}
          style={pending ? undefined : { transform: `rotate(${pull * 4}deg)` }}
          aria-hidden
        />
        {pending ? <span className="sr-only">Actualisation…</span> : null}
      </span>
    </div>
  );
}
