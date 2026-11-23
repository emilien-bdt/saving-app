import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Describes an application module (Finances, To do, ...) for the home page and navigation. */
export type AppModule = {
  id: string;
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  /**
   * Optional home dashboard widget (async Server Component): the home page renders the
   * widget of every module, so a new module brings its own without touching the others.
   */
  widget?: () => Promise<ReactNode>;
};

/** Serializable app entry for the (client) navigation: the icon is already rendered. */
export type NavApp = { id: string; name: string; href: string; icon: ReactNode };
