"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { acceptHouseholdInvite } from "../actions/household";
import { type InvitationFormState, registerWithInvitation, resetWithInvitation } from "../actions/invitations";

const initialState: InvitationFormState = { error: null };
const fieldClass = "h-12 w-full bg-transparent px-4 text-[17px] text-foreground outline-none placeholder:text-muted-foreground";
const groupClass = "divide-y divide-border overflow-hidden rounded-2xl bg-card focus-within:ring-2 focus-within:ring-ring/50";

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="px-1 text-sm text-destructive">
      {error}
    </p>
  ) : null;
}

export function RegisterForm({ token, name }: { token: string; name: string }) {
  const [state, action, pending] = useActionState(registerWithInvitation.bind(null, token), initialState);
  return (
    <form action={action} className="grid gap-3">
      <div className={groupClass}>
        <input name="name" defaultValue={name} required maxLength={60} autoComplete="given-name" placeholder="Prénom" aria-label="Prénom" className={fieldClass} />
        <input name="login" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" placeholder="Email" aria-label="Email" className={fieldClass} />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mot de passe (8 caractères min.)" aria-label="Mot de passe" className={fieldClass} />
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Confirmer le mot de passe" aria-label="Confirmer le mot de passe" className={fieldClass} />
      </div>
      <ErrorLine error={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetWithInvitation.bind(null, token), initialState);
  return (
    <form action={action} className="grid gap-3">
      <div className={groupClass}>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)" aria-label="Nouveau mot de passe" className={fieldClass} />
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Confirmer" aria-label="Confirmer le mot de passe" className={fieldClass} />
      </div>
      <ErrorLine error={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
      </Button>
    </form>
  );
}

export function JoinHousehold({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-3">
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptHouseholdInvite(token);
            if (!result.ok) return setError(result.error);
            router.push("/");
            router.refresh();
          })
        }
      >
        Rejoindre le foyer
      </Button>
      <Button type="button" size="lg" variant="ghost" onClick={() => router.push("/")}>
        Refuser
      </Button>
      <ErrorLine error={error} />
    </div>
  );
}
