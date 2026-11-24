"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ios } from "@/shared/ui/ios";
import { createPasswordReset, inviteMember, setMemberActive, setMemberModules } from "../actions/admin";
import { ShareLink } from "./share-link";

export type AdminMember = {
  id: string;
  name: string;
  login: string;
  role: "ADMIN" | "MEMBER";
  active: boolean;
  enabledModules: string[];
  lastLoginLabel: string;
  isMe: boolean;
};

type Props = { members: AdminMember[]; modules: { id: string; name: string }[] };

function MemberCard({ member, modules }: { member: AdminMember; modules: Props["modules"] }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(member.enabledModules);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Action impossible");
      router.refresh();
    });

  return (
    <li className={`${ios.card} grid gap-3 p-4 ${member.active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[17px] font-semibold">{member.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold">
            {member.name}
            {member.role === "ADMIN" ? <span className={`${ios.badge} ${ios.badgeMuted} ml-2 align-middle`}>Admin</span> : null}
            {!member.active ? <span className={`${ios.badge} ${ios.badgeDanger} ml-2 align-middle`}>Désactivé</span> : null}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">{member.login}</p>
          <p className="text-[13px] text-muted-foreground">{member.lastLoginLabel}</p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-xl bg-muted/60">
        {modules.map((module) => {
          const on = enabled.includes(module.id);
          return (
            <label key={module.id} className="flex min-h-11 items-center justify-between gap-3 px-3 text-[15px]">
              {module.name}
              <input
                type="checkbox"
                role="switch"
                checked={on}
                disabled={pending}
                onChange={() => {
                  const next = on ? enabled.filter((id) => id !== module.id) : [...enabled, module.id];
                  setEnabled(next);
                  run(() => setMemberModules(member.id, next));
                }}
                className="ios-switch"
                aria-label={`${module.name} pour ${member.name}`}
              />
            </label>
          );
        })}
      </div>

      <ShareLink
        create={() => createPasswordReset(member.id)}
        label="Lien pour changer le mot de passe"
        hint={`Envoie ce lien à ${member.name} (valable 2 jours) : il·elle choisira un nouveau mot de passe, que tu ne verras pas.`}
        shareText="Choisis ton nouveau mot de passe Save :"
      />

      {!member.isMe ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setMemberActive(member.id, !member.active))}
          className={`justify-self-start text-[15px] ${member.active ? "text-destructive" : "text-primary"}`}
        >
          {member.active ? "Désactiver le compte" : "Réactiver le compte"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** Admin: accounts and their modules. Never households nor anyone's data. */
export function AdminMembers({ members, modules }: Props) {
  const [name, setName] = useState("");
  const [inviteKey, setInviteKey] = useState(0);

  return (
    <div className="grid gap-7">
      <section aria-labelledby="invite-title" className="grid gap-2">
        <h2 id="invite-title" className={ios.sectionLabel}>
          Inviter quelqu&apos;un
        </h2>
        <div className={`${ios.card} grid gap-3 p-4`}>
          <label className="grid gap-1.5">
            <span className={ios.label}>Prénom</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setInviteKey((key) => key + 1);
              }}
              maxLength={60}
              placeholder="Camille"
              className={ios.field}
            />
          </label>
          {name.trim() ? (
            <ShareLink
              key={inviteKey}
              create={() => inviteMember(name)}
              label={`Créer le lien pour ${name.trim()}`}
              hint="Lien valable 7 jours, une seule fois : la personne choisit son email et son mot de passe."
              shareText="Crée ton compte Save :"
            />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="members-title" className="grid gap-2">
        <h2 id="members-title" className={ios.sectionLabel}>
          Comptes ({members.length})
        </h2>
        <ul className="grid gap-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} modules={modules} />
          ))}
        </ul>
        <p className="px-1 text-[13px] text-muted-foreground">
          Tu gères les comptes et leurs modules. Les foyers et les données de chacun ne sont pas affichés ici.
        </p>
      </section>
    </div>
  );
}
