import Link from "next/link";
import { appModules } from "@/modules/registry";
import { LogoutButton } from "@/shared/auth/components/logout-button";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Save</h1>
          <p className="mt-1 text-muted-foreground">Ma vie perso, en plus simple qu&apos;Excel.</p>
        </div>
        <LogoutButton />
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {appModules.map(({ id, name, href, description, icon: Icon }) => (
          <li key={id}>
            <Link
              href={href}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
            >
              <Icon className="mt-0.5 size-5 text-primary" aria-hidden />
              <span>
                <span className="block font-medium">{name}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
