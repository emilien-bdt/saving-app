import { ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getNavApps } from "@/modules/navigation";
import { logout } from "@/shared/auth/actions";
import { requireSession } from "@/shared/auth/server";
import { AppTabBar } from "@/shared/navigation/app-tab-bar";
import { ios } from "@/shared/ui/ios";
import { PageHeader } from "@/shared/ui/page-header";
import { getHomeOf, getHouseholdMembers } from "../data/households";
import { getProfile } from "../data/users";
import { HouseholdSection } from "./household-section";
import { PasswordForm, ProfileForm } from "./profile-forms";

/** /parametres: my account, my household, admin (for the admin). */
export async function SettingsPage() {
  const scope = await requireSession();
  const [profile, members, home] = await Promise.all([getProfile(scope.userId), getHouseholdMembers(scope.householdId), getHomeOf(scope.userId)]);
  const needsSetup = !profile?.passwordHash || scope.login === "admin";

  return (
    <>
      <AppTabBar apps={getNavApps(scope.disabledModules)} />
      <PageHeader title="Réglages" />
      <main className={`${ios.page} space-y-7`}>
        {needsSetup ? (
          <p className="rounded-2xl bg-warning/15 px-4 py-3 text-[15px] text-warning">
            Termine ton compte : indique ton email (il remplacera « admin » pour te connecter) et choisis ton mot de passe.
          </p>
        ) : null}

        <section aria-labelledby="profile-title">
          <h2 id="profile-title" className={ios.sectionLabel}>
            Mon compte
          </h2>
          <ProfileForm name={profile?.name ?? scope.name} login={scope.login} />
        </section>

        <section aria-labelledby="password-title">
          <h2 id="password-title" className={ios.sectionLabel}>
            Mot de passe
          </h2>
          <PasswordForm hasPassword={Boolean(profile?.passwordHash)} />
        </section>

        <section aria-labelledby="household-title">
          <h2 id="household-title" className={ios.sectionLabel}>
            Mon foyer
          </h2>
          <HouseholdSection
            members={members.map((member) => ({ ...member, isMe: member.id === scope.userId }))}
            atHome={home.soloId === home.currentId}
          />
        </section>

        {scope.role === "ADMIN" ? (
          <section aria-label="Administration">
            <Link href="/admin" className={`${ios.group} ${ios.rowButton}`}>
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <span className="flex-1 text-[17px]">Administration</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </section>
        ) : null}

        <form action={logout}>
          <button type="submit" className={`${ios.group} ${ios.rowButton} justify-center text-[17px] text-destructive`}>
            <LogOut className="size-4" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </main>
    </>
  );
}
