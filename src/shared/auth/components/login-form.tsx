"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/shared/auth/actions";
import { Button } from "@/shared/ui/button";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 grid gap-2">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label htmlFor="password" className="px-1 text-[13px] font-medium text-muted-foreground">
        Mot de passe
      </label>
      {/* text-base (16px) prevents iOS from zooming on focus */}
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "login-error" : undefined}
        className="h-11 w-full rounded-xl bg-card px-3.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive disabled:opacity-50"
      />
      {state.error ? (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
