import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/server";
import { findInvitation } from "../data/invitations";
import { invitationState } from "../domain/accounts";
import { hashInvitationToken, isTokenShaped } from "../domain/tokens";
import { JoinHousehold, RegisterForm, ResetForm } from "./invitation-forms";

function Frame({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-[1.1rem] bg-primary text-3xl font-bold text-primary-foreground shadow-sm">S</span>
        <h1 className="mt-4 text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{text}</p>
      </div>
      {children}
    </main>
  );
}

/** /invitation/<token>: create an account, reset a password or join a household (public page). */
export async function InvitationPage({ token }: { token: string }) {
  const invitation = isTokenShaped(token) ? await findInvitation(hashInvitationToken(token)) : null;
  const state = invitationState(invitation);
  if (!invitation || state !== "valid") {
    return (
      <Frame
        title="Lien invalide"
        text={state === "used" ? "Ce lien a déjà servi." : state === "expired" ? "Ce lien a expiré : demande-en un nouveau." : "Ce lien n'existe pas."}
      >
        <Link href="/login" className="text-center text-[17px] text-primary">
          Aller à la connexion
        </Link>
      </Frame>
    );
  }

  if (invitation.kind === "ACCOUNT") {
    return (
      <Frame title={`Bienvenue ${invitation.name ?? ""}`.trim()} text={`${invitation.createdBy.name} t'invite sur Save. Choisis ton email et ton mot de passe.`}>
        <RegisterForm token={token} name={invitation.name ?? ""} />
        <p className="text-center text-[13px] text-muted-foreground">
          Tes finances et tes tâches restent à toi. L&apos;administrateur gère les comptes mais ne voit pas tes données dans l&apos;application.
        </p>
      </Frame>
    );
  }

  if (invitation.kind === "PASSWORD_RESET") {
    return (
      <Frame title="Nouveau mot de passe" text={`Pour ${invitation.targetUser?.name ?? "ton compte"} (${invitation.targetUser?.login ?? ""}).`}>
        <ResetForm token={token} />
      </Frame>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <Frame title="Rejoindre un foyer" text={`${invitation.createdBy.name} t'invite dans son foyer. Connecte-toi d'abord (il faut un compte Save).`}>
        <Link href={`/login?next=${encodeURIComponent(`/invitation/${token}`)}`} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-[17px] font-semibold text-primary-foreground">
          Se connecter
        </Link>
      </Frame>
    );
  }
  return (
    <Frame
      title={`Rejoindre le foyer de ${invitation.createdBy.name} ?`}
      text="Vous partagerez les Repas, les Courses et les listes To do partagées. Tes Finances et tes autres listes restent à toi. Tu pourras quitter le foyer à tout moment."
    >
      <JoinHousehold token={token} />
    </Frame>
  );
}
