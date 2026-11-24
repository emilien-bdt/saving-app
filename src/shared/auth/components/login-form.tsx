"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/shared/auth/actions";
import { Button } from "@/shared/ui/button";

const initialState: LoginState = { error: null };
// 17 px (≥ 16 px) keeps iOS from zooming on focus.
const fieldClass = "h-12 w-full bg-transparent px-4 text-[17px] text-foreground outline-none placeholder:text-muted-foreground";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 grid gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card focus-within:ring-2 focus-within:ring-ring/50">
        <label htmlFor="login" className="sr-only">
          Email
        </label>
        <input
          id="login"
          name="login"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          placeholder="Email"
          aria-invalid={state.error ? true : undefined}
          className={fieldClass}
        />
        <label htmlFor="password" className="sr-only">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Mot de passe"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className={fieldClass}
        />
      </div>
      {state.error ? (
        <p id="login-error" role="alert" className="px-1 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
