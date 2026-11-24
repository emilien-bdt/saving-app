import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A home dashboard card provided by a module (async Server Component): the home page
 * renders every module's widgets, sorted by `order`, without knowing any module.
 */
export type HomeWidget = {
  id: string;
  title: string;
  href: string;
  /** Full width, or half (two side by side on a phone). */
  size: "full" | "half";
  /** Position on the home page, smallest first, across all modules. */
  order: number;
  /** Icon of the card (defaults to the module's). */
  icon?: LucideIcon;
  component: () => Promise<ReactNode>;
};

/** Describes an application module (Finances, To do, ...) for the home page and navigation. */
export type AppModule = {
  id: string;
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  /** Background class of the app's icon tile (literal, e.g. "bg-app-finances"). */
  tileClass: string;
  widgets?: readonly HomeWidget[];
  /** Prepares a new account (default data), called once after it is created. */
  setupUser?: (userId: string) => Promise<void>;
};

/** Serializable app entry for the (client) navigation: the icon is already rendered. */
export type NavApp = { id: string; name: string; href: string; icon: ReactNode };
