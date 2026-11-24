import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getNavApps } from "@/modules/navigation";
import { appModules } from "@/modules/registry";
import { requireAdmin } from "@/shared/auth/server";
import { AppTabBar } from "@/shared/navigation/app-tab-bar";
import { ios } from "@/shared/ui/ios";
import { PageHeader } from "@/shared/ui/page-header";
import { listMembers } from "../data/users";
import { AdminMembers } from "./admin-members";

export async function AdminPage() {
  const scope = await requireAdmin();
  const members = await listMembers();
  const modules = appModules.map(({ id, name }) => ({ id, name }));

  return (
    <>
      <AppTabBar apps={getNavApps(scope.disabledModules)} />
      <PageHeader title="Administration" eyebrow="Réglages" />
      <main className={ios.page}>
        <AdminMembers
          modules={modules}
          members={members.map((member) => ({
            id: member.id,
            name: member.name,
            login: member.login,
            role: member.role,
            active: member.active,
            enabledModules: modules.map((module) => module.id).filter((id) => !member.disabledModules.includes(id)),
            lastLoginLabel: member.lastLoginAt ? `Connecté·e ${formatDistanceToNow(member.lastLoginAt, { addSuffix: true, locale: fr })}` : "Jamais connecté·e",
            isMe: member.id === scope.userId,
          }))}
        />
      </main>
    </>
  );
}
