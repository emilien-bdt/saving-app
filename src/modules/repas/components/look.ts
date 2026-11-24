// iOS look of the Repas module (étape 18): same tokens as the rest of the site.
// Modifier classes (btnPlain, danger, locked…) override the base one with "!".

export const look = {
  page: "",
  day: "rounded-2xl bg-card p-3 text-card-foreground",
  dayTight: "p-2.5!",
  today: "ring-2 ring-primary",
  dayTitle: "text-[17px] font-semibold",
  meal: "relative rounded-xl bg-background p-3 text-foreground before:absolute before:top-3.5 before:right-3 before:size-2.5 before:rounded-full before:bg-[oklch(0.68_0.16_var(--hue))]",
  mealTight: "p-2.5!",
  mealTitle: "text-[17px] leading-snug font-semibold",
  proposed: "outline-2 -outline-offset-2 outline-dashed outline-warning/50",
  out: "bg-transparent! text-muted-foreground ring-1 ring-input ring-inset before:hidden",
  empty: "rounded-xl border-2 border-dashed border-input text-muted-foreground",
  over: "ring-2 ring-primary",
  dragging: "opacity-40",
  ghost: "rounded-xl bg-card px-3 py-2 text-[15px] font-semibold shadow-xl ring-1 ring-border",
  slotLabel: "inline-flex items-center gap-1 text-[13px] font-medium tracking-wide text-muted-foreground uppercase",
  iconBtn:
    "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary transition-opacity after:absolute after:-inset-1 active:opacity-60 disabled:opacity-40",
  iconBtnSm: "size-8!",
  danger: "bg-destructive/12! text-destructive!",
  locked: "bg-primary! text-primary-foreground!",
  btn: "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition active:scale-[0.97] active:opacity-80 disabled:pointer-events-none disabled:opacity-40",
  btnPlain: "bg-primary/12! text-primary!",
  btnGreen: "bg-positive! text-card!",
  btnRed: "bg-destructive/12! text-destructive!",
  btnSm: "h-8! gap-1.5! px-3! text-[13px]!",
  chip: "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 text-[15px] transition-colors active:opacity-70 disabled:opacity-50 aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  chipSm: "h-7! px-2.5! text-[13px]!",
  field:
    "h-11 w-full rounded-xl bg-muted px-3.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive",
  sheet: "",
  tint: "",
  tintTitle:
    "inline-flex items-center gap-1.5 px-1 text-[13px] font-semibold tracking-wide uppercase text-[oklch(0.5_0.15_var(--hue))] dark:text-[oklch(0.8_0.12_var(--hue))]",
} as const;
