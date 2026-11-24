"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  /** Small uppercase line above the title (date, week…). */
  eyebrow?: ReactNode;
  /** Round buttons on the right of the title. */
  actions?: ReactNode;
  /** Under the title (segmented control…). */
  children?: ReactNode;
  wide?: boolean;
};

/**
 * iOS large title: scrolls away with the page and leaves a compact translucent bar
 * with the title (and the actions) at the top of the screen.
 */
export function PageHeader({ title, eyebrow, actions, children, wide = false }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(entry ? !entry.isIntersecting : false), {
      rootMargin: "-56px 0px 0px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = wide ? "max-w-[1600px]" : "max-w-5xl";

  return (
    <>
      <div
        inert={!compact}
        className={`fixed inset-x-0 top-0 z-20 border-b bg-bar backdrop-blur-xl transition-opacity duration-200 sm:top-14 ${compact ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className={`mx-auto flex h-11 w-full ${width} items-center gap-2 px-4 sm:px-6`}>
          <span className="flex-1" />
          <span className="absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate text-[17px] font-semibold">{title}</span>
          {actions ? <div className="flex shrink-0 items-center gap-2 [&>*]:scale-90">{actions}</div> : null}
        </div>
      </div>

      <div className={`mx-auto w-full ${width} px-4 pt-5 pb-4 sm:px-6 sm:pt-8`}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">{eyebrow}</p> : null}
            <h1 className="truncate text-[34px] leading-[41px] font-bold tracking-tight">{title}</h1>
            <div ref={sentinel} className="h-px" aria-hidden />
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2 pb-1.5">{actions}</div> : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </>
  );
}
