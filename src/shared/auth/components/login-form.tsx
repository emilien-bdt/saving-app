"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/shared/auth/actions";
import { Button } from "@/shared/ui/button";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label htmlFor="password" className="text-sm font-medium">
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
        className="h-11 rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      {state.error ? (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="h-11">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
