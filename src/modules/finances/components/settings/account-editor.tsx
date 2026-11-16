"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { deleteAccount, saveAccount, setAccountArchived } from "../../actions/accounts";
import { ACCOUNT_ICON_NAMES, PRESET_COLORS } from "../../domain/icons";
import type { AccountKind } from "../../schemas/account";
import type { AccountSettingsItem } from "../../view-models";
import { CategoryIcon } from "../category-icon";
import { InterestRatesEditor } from "./interest-rates-editor";

const KINDS: { kind: AccountKind; label: string }[] = [
  { kind: "CHECKING", label: "Courant" },
  { kind: "SAVINGS", label: "Épargne" },
  { kind: "POCKET", label: "Pocket" },
];

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type Props = {
  /** null = new account. */
  account: AccountSettingsItem | null;
  /** Kind and parent preselected for a new account. */
  initial?: { kind: AccountKind; parentId: string | null };
  accounts: AccountSettingsItem[];
  onClose: () => void;
};

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

const kindOf = (account: AccountSettingsItem): AccountKind => (account.parentId ? "POCKET" : account.type);

export function AccountEditor({ account, initial, accounts, onClose }: Props) {
  const isNew = account === null;
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account ? kindOf(account) : (initial?.kind ?? "SAVINGS"));
  const [color, setColor] = useState(account?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string | null>(account?.icon ?? null);
  const hasPockets = account ? accounts.some((candidate) => candidate.parentId === account.id) : false;
  const parents = accounts.filter(
    (candidate) => !candidate.parentId && candidate.id !== account?.id && (!candidate.archived || candidate.id === account?.parentId),
  );
  const [parentId, setParentId] = useState<string>(
    account?.parentId ?? initial?.parentId ?? parents.find((candidate) => candidate.type === "CHECKING")?.id ?? parents[0]?.id ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string; fieldErrors: Record<string, string> }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onClose();
      else {
        setErrors(result.fieldErrors);
        setFormError(result.error);
      }
    });

  const submit = () =>
    run(() => saveAccount(account?.id ?? null, { name, kind, parentId: kind === "POCKET" ? parentId : null, color, icon }));

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={nameRef}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {isNew ? (kind === "POCKET" ? "Nouveau pocket" : "Nouveau compte") : `Modifier ${account.name}`}
            </Dialog.Title>
            <Dialog.Close className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted" aria-label="Fermer">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label className="grid gap-1 text-sm font-medium">
              Nom
              <input
                ref={nameRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                className={inputClass}
              />
              <FieldError message={errors.name} />
            </label>

            <div className="grid gap-1">
              <span className="text-sm font-medium">Type</span>
              <div className="grid grid-cols-3 rounded-lg border p-0.5" role="group" aria-label="Type">
                {KINDS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    aria-pressed={kind === option.kind}
                    disabled={option.kind === "POCKET" && hasPockets}
                    onClick={() => setKind(option.kind)}
                    className="rounded-md py-1.5 text-sm disabled:opacity-40 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {kind === "POCKET"
                  ? "Un pocket est une réserve dans un compte (façon Revolut) ; il a son propre total."
                  : kind === "SAVINGS"
                    ? "Compté dans l'Épargne."
                    : "Compté dans le Courant."}
              </p>
            </div>

            {kind === "POCKET" ? (
              <label className="grid gap-1 text-sm font-medium">
                Dans le compte
                <select
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                  aria-invalid={errors.parentId ? true : undefined}
                  className={inputClass}
                >
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.parentId} />
              </label>
            ) : (
              <FieldError message={errors.parentId} />
            )}

            <fieldset>
              <legend className="mb-1 text-sm font-medium">Couleur</legend>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={preset}
                    aria-pressed={color === preset}
                    onClick={() => setColor(preset)}
                    className="size-8 rounded-full ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-foreground"
                    style={{ backgroundColor: preset }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Autre couleur"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="size-8 cursor-pointer rounded-full border bg-transparent"
                />
              </div>
              <FieldError message={errors.color} />
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm font-medium">Icône</legend>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_ICON_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    aria-pressed={icon === name}
                    onClick={() => setIcon(icon === name ? null : name)}
                    className="inline-flex size-10 items-center justify-center rounded-full border aria-pressed:border-transparent aria-pressed:text-white"
                    style={icon === name ? { backgroundColor: color } : undefined}
                  >
                    <CategoryIcon icon={name} className="size-4" />
                  </button>
                ))}
              </div>
              <FieldError message={errors.icon} />
            </fieldset>

            {isNew ? (
              <p className="text-sm text-muted-foreground">
                Le compte démarre à 0 € : alimente-le par un virement ou une opération.
                {kind === "SAVINGS" ? " Les intérêts journaliers se règlent une fois le compte ajouté." : ""}
              </p>
            ) : null}

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {account ? (
                confirmDelete ? (
                  <span className="mr-auto flex items-center gap-2 text-sm">
                    Supprimer ?
                    <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => run(() => deleteAccount(account.id))}>
                      Oui, supprimer
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Non
                    </Button>
                  </span>
                ) : (
                  <span className="mr-auto flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      disabled={pending}
                      onClick={() => run(() => setAccountArchived(account.id, !account.archived))}
                    >
                      {account.archived ? "Désarchiver" : "Archiver"}
                    </Button>
                    {account.canDelete ? (
                      <Button type="button" variant="ghost" size="lg" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                        Supprimer
                      </Button>
                    ) : null}
                  </span>
                )
              ) : null}
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Enregistrement…" : isNew ? "Ajouter" : "Enregistrer"}
              </Button>
            </div>
          </form>

          {account && account.group === "SAVINGS" ? (
            <div className="mt-4">
              <InterestRatesEditor account={account} />
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
