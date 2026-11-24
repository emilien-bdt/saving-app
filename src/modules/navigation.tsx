import { appModules } from "./registry";
import type { NavApp } from "./types";

/**
 * Server side only (the registry imports the modules' widgets, hence Prisma):
 * turns the registry into plain data for the client navigation.
 * Icons are unsized: the navigation sizes them.
 */
export function getNavApps(): NavApp[] {
  return appModules.map(({ id, name, href, icon: Icon }) => ({
    id,
    name,
    href,
    icon: <Icon aria-hidden />,
  }));
}
