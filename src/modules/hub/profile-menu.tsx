import { LogOut, UserRound } from "lucide-react";
import { logout } from "@/shared/auth/actions";

/** Round profile button of the home page; its menu will get « Foyer » (phase 2). */
export function ProfileMenu() {
  return (
    <details className="group relative">
      <summary
        aria-label="Profil"
        className="relative inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-muted text-foreground after:absolute after:-inset-1 active:opacity-60 [&::-webkit-details-marker]:hidden"
      >
        <UserRound className="size-[18px]" aria-hidden />
      </summary>
      <div className="absolute top-full right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-border">
        <form action={logout}>
          <button type="submit" className="flex h-12 w-full items-center justify-between px-4 text-left text-[17px] text-destructive active:bg-muted">
            Se déconnecter
            <LogOut className="size-[18px]" aria-hidden />
          </button>
        </form>
      </div>
    </details>
  );
}
