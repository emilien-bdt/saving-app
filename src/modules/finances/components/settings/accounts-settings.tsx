"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { moveAccount } from "../../actions/accounts";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_GROUPS } from "../../domain/accounts";
import type { AccountKind } from "../../schemas/account";
import type { AccountSettingsItem } from "../../view-models";
import { CategoryIcon } from "../category-icon";
import { AccountEditor } from "./account-editor";

type EditorState = { account: AccountSettingsItem | null; initial?: { kind: AccountKind; parentId: string | null }; key: number };

function AccountBadge({ account }: { account: AccountSettingsItem }) {
  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: account.color }}
    >
      <CategoryIcon icon={account.icon} className="size-3.5" />
    </span>
  );
}

/** Paramètres › Comptes: accounts and pockets, add / edit / archive / reorder. */
export function AccountsSettings({ accounts }: { accounts: AccountSettingsItem[] }) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = (account: AccountSettingsItem | null, initial?: EditorState["initial"]) =>
    setEditor((current) => ({ account, initial, key: (current?.key ?? 0) + 1 }));

  const move = (id: string, direction: -1 | 1) =>
    startTransition(async () => {
      const result = await moveAccount(id, direction);
      setError(result.ok ? null : result.error);
    });

  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);
  const multipleParents = new Set(active.filter((account) => account.parentId).map((account) => account.parentId)).size > 1;

  const row = (account: AccountSettingsItem, siblings: AccountSettingsItem[] | null) => {
    const index = siblings?.indexOf(account) ?? -1;
    return (
      <li key={account.id} className="flex items-center gap-2 py-1.5">
        <button type="button" onClick={() => open(account)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left hover:bg-muted/60">
          <AccountBadge account={account} />
          <span className="truncate">{account.name}</span>
          {account.parentName && (multipleParents || account.archived) ? (
            <span className="truncate text-sm text-muted-foreground">· {account.parentName}</span>
          ) : null}
          {account.archived ? <span className="text-sm text-muted-foreground">· {ACCOUNT_GROUP_LABELS[account.group].toLowerCase()}</span> : null}
        </button>
        {siblings && siblings.length > 1 ? (
          <span className="flex">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Monter ${account.name}`} disabled={pending || index === 0} onClick={() => move(account.id, -1)}>
              <ChevronUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Descendre ${account.name}`}
              disabled={pending || index === siblings.length - 1}
              onClick={() => move(account.id, 1)}
            >
              <ChevronDown aria-hidden />
            </Button>
          </span>
        ) : null}
      </li>
    );
  };

  const pocketParents = active.filter((parent) => !parent.parentId && active.some((account) => account.parentId === parent.id));

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Comptes</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => open(null)}>
          <Plus aria-hidden />
          Ajouter
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {ACCOUNT_GROUPS.map((group) => {
          if (group === "POCKETS") {
            return (
              <div key={group}>
                <h3 className="text-sm font-medium text-muted-foreground">{ACCOUNT_GROUP_LABELS[group]}</h3>
                {pocketParents.map((parent) => {
                  const pockets = active.filter((account) => account.parentId === parent.id);
                  return (
                    <div key={parent.id}>
                      {multipleParents ? (
                        <p className="mt-1 text-xs text-muted-foreground">{parent.name}</p>
                      ) : null}
                      <ul className="divide-y">{pockets.map((pocket) => row(pocket, pockets))}</ul>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-muted-foreground"
                  onClick={() => open(null, { kind: "POCKET", parentId: null })}
                >
                  <Plus aria-hidden />
                  Ajouter un pocket
                </Button>
              </div>
            );
          }
          const list = active.filter((account) => !account.parentId && account.group === group);
          return (
            <div key={group}>
              <h3 className="text-sm font-medium text-muted-foreground">{ACCOUNT_GROUP_LABELS[group]}</h3>
              {list.length > 0 ? (
                <ul className="divide-y">{list.map((account) => row(account, list))}</ul>
              ) : (
                <p className="py-1.5 text-sm text-muted-foreground">Aucun compte.</p>
              )}
            </div>
          );
        })}

        {archived.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">Archivés ({archived.length})</summary>
            <ul className="divide-y opacity-70">{archived.map((account) => row(account, null))}</ul>
          </details>
        ) : null}
      </div>

      {editor ? (
        <AccountEditor key={editor.key} account={editor.account} initial={editor.initial} accounts={accounts} onClose={() => setEditor(null)} />
      ) : null}
    </section>
  );
}
