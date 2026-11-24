"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ios } from "@/shared/ui/ios";
import { Button } from "@/shared/ui/button";
import { changePassword, saveProfile } from "../actions/profile";

const rowField = "h-11 min-w-0 flex-1 bg-transparent text-right text-[17px] text-foreground outline-none placeholder:text-muted-foreground";

export function ProfileForm({ name, login }: { name: string; login: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ name, login: login === "admin" ? "" : login });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = values.name !== name || values.login !== login;

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveProfile(values);
          setMessage(result.ok ? { ok: true, text: "Enregistré" } : { ok: false, text: result.error });
          if (result.ok) router.refresh();
        });
      }}
    >
      <div className={ios.group}>
        <label className={ios.row}>
          <span className="w-24 shrink-0 text-[17px]">Prénom</span>
          <input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} maxLength={60} autoComplete="given-name" className={rowField} />
        </label>
        <label className={ios.row}>
          <span className="w-24 shrink-0 text-[17px]">Email</span>
          <input
            value={values.login}
            onChange={(event) => setValues({ ...values, login: event.target.value })}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="ton@email.fr"
            maxLength={254}
            className={rowField}
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <p className={`text-[13px] ${message ? (message.ok ? "text-positive" : "text-destructive") : "text-muted-foreground"}`} role="status">
          {message?.text ?? "Ton email sert à te connecter."}
        </p>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (values.next !== values.confirm) return setMessage({ ok: false, text: "Les deux mots de passe sont différents" });
        startTransition(async () => {
          const result = await changePassword({ current: values.current, next: values.next });
          setMessage(result.ok ? { ok: true, text: "Mot de passe changé (tes autres appareils sont déconnectés)" } : { ok: false, text: result.error });
          if (result.ok) setValues({ current: "", next: "", confirm: "" });
        });
      }}
    >
      <div className={ios.group}>
        {hasPassword ? (
          <label className={ios.row}>
            <span className="sr-only">Mot de passe actuel</span>
            <input type="password" value={values.current} onChange={(event) => setValues({ ...values, current: event.target.value })} autoComplete="current-password" placeholder="Mot de passe actuel" className={`${rowField} text-left`} />
          </label>
        ) : null}
        <label className={ios.row}>
          <span className="sr-only">Nouveau mot de passe</span>
          <input type="password" value={values.next} onChange={(event) => setValues({ ...values, next: event.target.value })} autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)" className={`${rowField} text-left`} />
        </label>
        <label className={ios.row}>
          <span className="sr-only">Confirmer</span>
          <input type="password" value={values.confirm} onChange={(event) => setValues({ ...values, confirm: event.target.value })} autoComplete="new-password" placeholder="Confirmer" className={`${rowField} text-left`} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <p className={`text-[13px] ${message ? (message.ok ? "text-positive" : "text-destructive") : "text-muted-foreground"}`} role="status">
          {message?.text ?? ""}
        </p>
        <Button type="submit" size="sm" disabled={pending || values.next.length < 8}>
          {hasPassword ? "Changer" : "Choisir"}
        </Button>
      </div>
    </form>
  );
}
