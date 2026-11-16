import type { ReactNode } from "react";

export function Card({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {aside ? <div className="text-sm text-muted-foreground">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
