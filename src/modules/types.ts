import type { LucideIcon } from "lucide-react";

/** Describes an application module (Finances, Repas, ...) for navigation. */
export type AppModule = {
  id: string;
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
};
