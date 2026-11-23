import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/shared/auth/server";
import { LogoutButton } from "@/shared/auth/components/logout-button";
import { todayIso } from "@/shared/lib/today";
import { appModules } from "../registry";

function todayHeading(): string {
  const text = format(new Date(`${todayIso()}T12:00:00`), "EEEE d MMMM yyyy", { locale: fr });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Home: the apps menu and a dashboard made of every module's widget.
 * Not a module itself: it only reads the registry.
 */
export async function HomePage() {
  await requireSession();
  const withWidget = appModules.filter((module) => module.widget);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Save</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayHeading()}</p>
        </div>
        <LogoutButton />
      </div>

      <section aria-labelledby="apps-title">
        <h2 id="apps-title" className="sr-only">
          Applications
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {appModules.map(({ id, name, href, description, icon: Icon }) => (
            <li key={id}>
              <Link href={href} className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted">
                <Icon className="size-6 text-primary" aria-hidden />
                <span>
                  <span className="block font-medium">{name}</span>
                  <span className="hidden text-sm text-muted-foreground sm:block">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {withWidget.length > 0 ? (
        <section aria-labelledby="dashboard-title" className="space-y-3">
          <h2 id="dashboard-title" className="text-lg font-semibold">
            Tableau de bord
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {withWidget.map(({ id, name, href, icon: Icon, widget: Widget }) =>
              Widget ? (
                <section key={id} className="rounded-xl border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-2 font-semibold">
                      <Icon className="size-4 text-primary" aria-hidden />
                      {name}
                    </h3>
                    <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      Ouvrir
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
                    <Widget />
                  </Suspense>
                </section>
              ) : null,
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
