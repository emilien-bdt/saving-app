import Link from "next/link";

/** Round button with the person's initial: opens Réglages (account, household, admin). */
export function ProfileMenu({ name }: { name: string }) {
  return (
    <Link
      href="/parametres"
      aria-label="Réglages : compte et foyer"
      className="relative inline-flex size-9 items-center justify-center rounded-full bg-muted text-[15px] font-semibold text-foreground after:absolute after:-inset-1 active:opacity-60"
    >
      {name.charAt(0).toUpperCase()}
    </Link>
  );
}
