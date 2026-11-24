/**
 * iOS-like class names shared by every screen (étape 18, maquettes du 24/11/2026).
 * Colours come from the theme variables of globals.css (light / dark follow the device).
 */
export const ios = {
  /** Page content under the module header; leaves room for the bottom tab bar on a phone. */
  page: "mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12",
  /** Wide page (Repas week grid). */
  pageWide: "mx-auto w-full max-w-[1600px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12",

  card: "rounded-2xl bg-card text-card-foreground",
  cardPad: "rounded-2xl bg-card p-4 text-card-foreground",
  /** Inset grouped list: rows separated by hairlines. */
  group: "overflow-hidden rounded-2xl bg-card text-card-foreground divide-y divide-border",
  row: "flex min-h-12 items-center gap-3 px-4 py-2.5",
  rowButton: "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-muted",
  /** Small uppercase label above a group ("MIDI", "COMPTES"). */
  sectionLabel: "px-4 pb-1.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase",
  sectionTitle: "text-xl font-bold tracking-tight",
  hint: "text-[13px] text-muted-foreground",

  field:
    "h-11 w-full rounded-xl bg-muted px-3.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive disabled:opacity-50",
  textarea:
    "min-h-24 w-full rounded-xl bg-muted px-3.5 py-2.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
  label: "px-1 text-[13px] font-medium text-muted-foreground",

  chip: "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 text-[15px] transition-colors active:opacity-70 aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  chipSm: "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 text-[13px] transition-colors active:opacity-70 aria-pressed:bg-primary aria-pressed:text-primary-foreground",

  /** Round icon button (36 px circle, 44 px touch target). */
  iconButton:
    "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary transition-opacity after:absolute after:-inset-1 active:opacity-60 disabled:opacity-40",
  iconButtonPlain:
    "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity after:absolute after:-inset-1 hover:bg-muted active:opacity-60 disabled:opacity-40",
  iconButtonDanger:
    "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive transition-opacity after:absolute after:-inset-1 active:opacity-60 disabled:opacity-40",

  badge: "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
  badgeMuted: "bg-muted text-muted-foreground",
  badgeWarning: "bg-warning/15 text-warning",
  badgePositive: "bg-positive/15 text-positive",
  badgeDanger: "bg-destructive/12 text-destructive",

  alertError: "rounded-xl bg-destructive/12 px-4 py-2.5 text-[15px] text-destructive",
  alertSuccess: "rounded-xl bg-positive/15 px-4 py-2.5 text-[15px] text-positive",
  empty: "rounded-2xl border border-dashed border-input p-6 text-center text-[15px] text-muted-foreground",
} as const;
