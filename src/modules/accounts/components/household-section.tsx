"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ios } from "@/shared/ui/ios";
import { createHouseholdInvite, leaveHousehold } from "../actions/household";
import { ShareLink } from "./share-link";

type Props = { members: { id: string; name: string; isMe: boolean }[]; atHome: boolean };

/** Foyer: who shares the Repas, Courses and shared lists; invite someone; leave. */
export function HouseholdSection({ members, atHome }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3">
      <ul className={ios.group}>
        {members.map((member) => (
          <li key={member.id} className={ios.row}>
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-[15px] font-semibold">{member.name.charAt(0).toUpperCase()}</span>
            <span className="flex-1 text-[17px]">{member.name}</span>
            {member.isMe ? <span className={ios.hint}>Moi</span> : null}
          </li>
        ))}
      </ul>
      <p className="px-1 text-[13px] text-muted-foreground">
        Le foyer partage les Repas, les Courses et les listes To do marquées « Partager ». Tes Finances et tes autres listes restent à toi.
      </p>
      <ShareLink
        create={createHouseholdInvite}
        label="Inviter dans mon foyer"
        hint="Lien valable 7 jours, une seule fois. La personne a besoin d'un compte Save et choisit d'accepter."
        shareText="Rejoins mon foyer sur Save :"
      />
      {!atHome ? (
        confirm ? (
          <div className="grid gap-2 rounded-xl bg-destructive/12 p-3">
            <p className="text-[15px]">Tu retrouveras ton propre foyer. Les repas et listes partagés restent à ce foyer-ci.</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await leaveHousehold();
                    if (!result.ok) return setError(result.error);
                    router.refresh();
                  })
                }
                className="h-9 rounded-lg bg-destructive px-3 text-[15px] font-semibold text-card disabled:opacity-50"
              >
                Quitter le foyer
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="h-9 rounded-lg px-3 text-[15px] text-primary">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="justify-self-start px-1 text-[15px] text-destructive">
            Quitter ce foyer…
          </button>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
