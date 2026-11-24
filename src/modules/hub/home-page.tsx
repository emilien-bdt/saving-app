import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/shared/auth/server";
import { todayIso } from "@/shared/lib/today";
import { AppTabBar } from "@/shared/navigation/app-tab-bar";
import { ios } from "@/shared/ui/ios";
import { PageHeader } from "@/shared/ui/page-header";
import { getNavApps } from "../navigation";
import { appModules } from "../registry";
import { ProfileMenu } from "./profile-menu";

function todayHeading(): string {
  return format(new Date(`${todayIso()}T12:00:00`), "EEEE d MMMM", { locale: fr });
}

/**
 * Home: every module's widgets as iOS cards, in their declared order and size.
 * Not a module itself: it only reads the registry.
 */
export async function HomePage() {
  await requireSession();
  const widgets = appModules
    .flatMap((module) => (module.widgets ?? []).map((widget) => ({ widget, module })))
    .sort((a, b) => a.widget.order - b.widget.order);

  return (
    <>
      <AppTabBar apps={getNavApps()} />
      <PageHeader title="Accueil" eyebrow={todayHeading()} actions={<ProfileMenu />} />
      <main className={ios.page}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map(({ widget, module }) => {
            const Icon = widget.icon ?? module.icon;
            const Content = widget.component;
            return (
              <section
                key={`${module.id}-${widget.id}`}
                aria-labelledby={`widget-${widget.id}`}
                className={`${ios.card} flex min-w-0 flex-col px-4 pt-3.5 pb-4 ${widget.size === "full" ? "col-span-2" : "col-span-1"}`}
              >
                <Link href={widget.href} className="-mx-1 mb-2 flex items-center gap-2 rounded-lg px-1 py-0.5 active:opacity-60">
                  <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-white ${module.tileClass} [&_svg]:size-[15px] [&_svg]:stroke-[2.2]`}>
                    <Icon aria-hidden />
                  </span>
                  <h2 id={`widget-${widget.id}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                    {widget.title}
                  </h2>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
                  <Content />
                </Suspense>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
