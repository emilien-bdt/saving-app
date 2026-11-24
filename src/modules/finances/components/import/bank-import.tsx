"use client";

import { FileUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { ios } from "@/shared/ui/ios";
import { applyBankImport, type BankPreview, previewBankImport } from "../../actions/bank-import";
import type { BankImportResult } from "../../data/bank-import";
import type { CategorySource } from "../../import/bank/categories";
import type { PlannedOperation } from "../../import/bank/plan";
import type { AccountOption, CategoryOption } from "../../view-models";
import { formatDateFr, formatTransactionAmount } from "../format";

type Props = { accounts: AccountOption[]; categories: CategoryOption[] };
type LoadedFile = { name: string; text: string };

const SOURCE_BADGE: Record<CategorySource, { text: string; className: string } | null> = {
  history: null,
  keyword: { text: "devinée", className: ios.badgeWarning },
  default: { text: "à vérifier", className: ios.badgeWarning },
};

const shortDate = (iso: string) => formatDateFr(iso).slice(0, 5);

/** Text of the file: UTF-8 (Revolut, BoursoBank), else Windows-1252 (older exports). */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

const FORMAT_LABELS: Record<BankPreview["format"], string> = {
  revolut: "Revolut",
  "revolut-savings": "Revolut, relevé d'épargne",
  boursobank: "BoursoBank",
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

function CategorySelect({
  kind,
  value,
  categories,
  onChange,
}: {
  kind: "EXPENSE" | "INCOME";
  value: string;
  categories: CategoryOption[];
  onChange: (id: string) => void;
}) {
  const usable = categories.filter((category) => category.kind === kind);
  const groups = new Map<string, CategoryOption[]>();
  for (const category of usable) {
    const group = category.parentName ?? "";
    groups.set(group, [...(groups.get(group) ?? []), category]);
  }
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Catégorie"
      aria-invalid={value === "" || undefined}
      className="mt-1 h-8 max-w-full rounded-lg bg-muted px-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive"
    >
      {value === "" ? <option value="">Choisir une catégorie…</option> : null}
      {[...groups].map(([group, items]) =>
        group === "" ? (
          items.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))
        ) : (
          <optgroup key={group} label={group}>
            {items.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </select>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className={ios.sectionLabel}>{title}</h3>
      <ul className={ios.group}>{children}</ul>
      {hint ? <p className={`${ios.hint} px-4 pt-1.5`}>{hint}</p> : null}
    </section>
  );
}

/** Finances › Importer: bank CSV (Revolut, BoursoBank) → preview (to tick, categories to check) → import. */
export function BankImport({ accounts, categories }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [preview, setPreview] = useState<BankPreview | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [chosenCategories, setChosenCategories] = useState<Record<string, string>>({});
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BankImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const accountName = (id: string | null) => accounts.find((account) => account.id === id)?.displayName ?? "?";
  const activeAccounts = accounts.filter((account) => !account.archived);

  const loadPreview = (loaded: LoadedFile, productAccounts?: Record<string, string | null>, fromDate?: string | null) =>
    startTransition(async () => {
      const response = await previewBankImport({ csv: loaded.text, fileName: loaded.name, productAccounts, fromDate });
      if (!response.ok) {
        setError(response.error);
        setPreview(null);
        return;
      }
      setError(null);
      setPreview(response.preview);
    });

  const onFile = async (selected: File | undefined) => {
    if (!selected) return;
    const loaded = { name: selected.name, text: await readText(selected) };
    setFile(loaded);
    setResult(null);
    setSkipped(new Set());
    setChosenCategories({});
    setKept(new Set());
    loadPreview(loaded);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const operations = preview?.operations ?? [];
  const creates = operations.filter((operation) => operation.action === "create");
  const links = operations.filter((operation) => operation.action === "link");
  const clears = operations.filter((operation) => operation.action === "clear");
  const known = operations.filter((operation) => operation.action === "unchanged" || operation.action === "duplicate");
  const removals = preview?.removals ?? [];

  const categoryOf = (operation: PlannedOperation) => chosenCategories[operation.ref] ?? operation.categoryId ?? "";
  const selected = (operation: PlannedOperation) => !skipped.has(operation.ref);
  const missingCategory = creates.filter((operation) => selected(operation) && operation.type !== "TRANSFER" && categoryOf(operation) === "");
  const changeCount =
    [...creates, ...links, ...clears].filter(selected).length + removals.filter((removal) => !kept.has(removal.id)).length;

  const apply = () => {
    if (!file || !preview) return;
    startTransition(async () => {
      const response = await applyBankImport({
        csv: file.text,
        fileName: file.name,
        productAccounts: preview.productAccounts,
        fromDate: preview.fromDate,
        skippedRefs: [...skipped],
        categories: Object.fromEntries(
          creates.filter((operation) => chosenCategories[operation.ref]).map((operation) => [operation.ref, categoryOf(operation)]),
        ),
        keptRemovalIds: [...kept],
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
      reset();
      router.refresh();
    });
  };

  const operationRow = (operation: PlannedOperation, detail: ReactNode) => (
    <li key={operation.ref}>
      <label className={`${ios.row} cursor-pointer items-start`}>
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          checked={selected(operation)}
          onChange={() => setSkipped((current) => toggle(current, operation.ref))}
        />
        <span className={`min-w-0 flex-1 ${selected(operation) ? "" : "opacity-50"}`}>
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">{operation.label}</span>
            <span className={`shrink-0 tabular-nums ${operation.type === "INCOME" ? "text-positive" : ""}`}>
              {formatTransactionAmount(operation.amountCents, operation.type)}
            </span>
          </span>
          <span className={`${ios.hint} flex flex-wrap items-center gap-x-1.5`}>
            {shortDate(operation.dateIso)}
            {operation.type === "TRANSFER" ? " · virement" : ` · ${accountName(operation.accountId)}`}
            {operation.status === "PLANNED" ? <span className={`${ios.badge} ${ios.badgeMuted}`}>en attente</span> : null}
          </span>
          {detail}
        </span>
      </label>
    </li>
  );

  const createDetail = (operation: PlannedOperation) => {
    if (operation.type === "TRANSFER") return null;
    const badge = operation.categorySource && !chosenCategories[operation.ref] ? SOURCE_BADGE[operation.categorySource] : null;
    return (
      <span className="flex flex-wrap items-center gap-2">
        <CategorySelect
          kind={operation.type}
          value={categoryOf(operation)}
          categories={categories}
          onChange={(categoryId) => setChosenCategories((current) => ({ ...current, [operation.ref]: categoryId }))}
        />
        {badge ? <span className={`${ios.badge} ${badge.className} mt-1`}>{badge.text}</span> : null}
      </span>
    );
  };

  const linkDetail = (operation: PlannedOperation) =>
    operation.existing ? (
      <span className={`${ios.hint} block`}>
        = « {operation.existing.label} » saisie le {shortDate(operation.existing.dateIso)}
        {operation.existing.status === "PLANNED" ? " (prévue)" : ""}
      </span>
    ) : null;

  return (
    <div className="space-y-5">
      {result ? (
        <div className={ios.alertSuccess} role="status">
          Import terminé : {plural(result.created, "opération ajoutée", "opérations ajoutées")}
          {result.linked > 0 ? `, ${plural(result.linked, "saisie reconnue", "saisies reconnues")}` : ""}
          {result.cleared > 0 ? `, ${plural(result.cleared, "pointée", "pointées")}` : ""}
          {result.removed > 0 ? `, ${plural(result.removed, "retirée", "retirées")}` : ""}.{" "}
          <Link href="/finances/transactions" className="font-semibold underline underline-offset-2">
            Voir le Journal
          </Link>
        </div>
      ) : null}

      {!preview ? (
        <section className={`${ios.cardPad} space-y-3`}>
          <p className="text-[15px]">
            <strong>Revolut</strong> : Accueil › Comptes, choisis le compte, puis ⋯ › Relevé, format Excel (le fichier est un CSV).
          </p>
          <p className="text-[15px]">
            <strong>BoursoBank</strong> : Mes comptes › le compte › Exporter les opérations, format CSV.
          </p>
          <p className={ios.hint}>
            Rien n&apos;est enregistré avant ta validation. Les opérations déjà saisies à la main sont reconnues (même compte, même
            montant, à 3 jours près) et simplement pointées ; un fichier importé deux fois ne crée aucun doublon.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <Button type="button" size="lg" className="w-full sm:w-auto" disabled={pending} onClick={() => inputRef.current?.click()}>
            <FileUp aria-hidden />
            {pending ? "Lecture…" : "Choisir un relevé CSV"}
          </Button>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className={ios.alertError}>
          {error}
        </p>
      ) : null}

      {preview && file ? (
        <>
          <section className={`${ios.cardPad} space-y-1`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{file.name}</p>
                <p className={ios.hint}>
                  {preview.period ? `Du ${formatDateFr(preview.period.from)} au ${formatDateFr(preview.period.to)}` : "Aucune opération"}
                  {` · ${FORMAT_LABELS[preview.format]}`}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={reset} disabled={pending}>
                <RotateCcw aria-hidden />
                Autre fichier
              </Button>
            </div>
            <p className="pt-1 text-[15px]">
              {plural(creates.length, "nouvelle", "nouvelles")} · {plural(links.length, "déjà saisie", "déjà saisies")} ·{" "}
              {plural(known.length, "déjà importée", "déjà importées")}
              {clears.length > 0 ? ` · ${plural(clears.length, "à pointer", "à pointer")}` : ""}
              {removals.length > 0 ? ` · ${plural(removals.length, "à retirer", "à retirer")}` : ""}
            </p>
          </section>

          <section>
            <h3 className={ios.sectionLabel}>Comptes</h3>
            <ul className={ios.group}>
              {preview.products.map((product) => (
                <li key={product.product} className={ios.row}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{product.product}</span>
                    <span className={ios.hint}>{plural(product.rowCount, "ligne", "lignes")} dans le relevé</span>
                  </span>
                  <select
                    value={preview.productAccounts[product.product] ?? ""}
                    aria-label={`Compte pour ${product.product}`}
                    disabled={pending}
                    onChange={(event) =>
                      loadPreview(file, { ...preview.productAccounts, [product.product]: event.target.value || null }, preview.fromDate)
                    }
                    className="h-9 max-w-[55%] rounded-lg bg-muted px-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">Ignorer</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
              <li className={ios.row}>
                <label htmlFor="import-from" className="min-w-0 flex-1">
                  <span className="block">À partir du</span>
                  <span className={ios.hint}>Les opérations plus anciennes sont ignorées</span>
                </label>
                <input
                  id="import-from"
                  type="date"
                  value={preview.fromDate ?? ""}
                  min={preview.period?.from}
                  max={preview.period?.to}
                  disabled={pending}
                  onChange={(event) => loadPreview(file, preview.productAccounts, event.target.value || null)}
                  className="h-9 rounded-lg bg-muted px-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                />
              </li>
            </ul>
          </section>

          {preview.errors.length > 0 ? (
            <p className={ios.alertError}>
              {plural(preview.errors.length, "ligne illisible", "lignes illisibles")} : {preview.errors.slice(0, 3).join(" ; ")}
            </p>
          ) : null}

          {creates.length > 0 ? (
            <Section title="Nouvelles opérations" hint="« devinée » et « à vérifier » : catégorie proposée sans historique, à contrôler.">
              {creates.map((operation) => operationRow(operation, createDetail(operation)))}
            </Section>
          ) : null}

          {links.length > 0 ? (
            <Section title="Déjà saisies" hint="Elles gardent ton libellé et ta catégorie ; elles prennent la date de la banque et sont pointées.">
              {links.map((operation) => operationRow(operation, linkDetail(operation)))}
            </Section>
          ) : null}

          {clears.length > 0 ? (
            <Section title="Importées en attente, maintenant passées">
              {clears.map((operation) => operationRow(operation, null))}
            </Section>
          ) : null}

          {removals.length > 0 ? (
            <Section title="À retirer" hint="Opérations en attente importées plus tôt que la banque ne montre plus.">
              {removals.map((removal) => (
                <li key={removal.id}>
                  <label className={`${ios.row} cursor-pointer items-start`}>
                    <input
                      type="checkbox"
                      className="mt-1 size-5 shrink-0 accent-primary"
                      checked={!kept.has(removal.id)}
                      onChange={() => setKept((current) => toggle(current, removal.id))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium">{removal.label}</span>
                        <span className="shrink-0 tabular-nums">{formatTransactionAmount(removal.amountCents, removal.type)}</span>
                      </span>
                      <span className={ios.hint}>
                        {shortDate(removal.dateIso)} · {removal.reason}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </Section>
          ) : null}

          {known.length > 0 || preview.skipped.length > 0 ? (
            <details className={`${ios.cardPad} text-[15px]`}>
              <summary className="cursor-pointer text-muted-foreground">
                {plural(known.length, "déjà importée", "déjà importées")}, {plural(preview.skipped.length, "ligne ignorée", "lignes ignorées")}
              </summary>
              <ul className="mt-2 space-y-1">
                {known.map((operation) => (
                  <li key={operation.ref} className="flex gap-2">
                    <span className="w-12 shrink-0 text-muted-foreground">{shortDate(operation.dateIso)}</span>
                    <span className="min-w-0 flex-1 truncate">{operation.existing?.label ?? operation.label}</span>
                    <span className="shrink-0 tabular-nums">{formatTransactionAmount(operation.amountCents, operation.type)}</span>
                  </li>
                ))}
                {preview.skipped.map((row) => (
                  <li key={row.line} className="flex gap-2 text-muted-foreground">
                    <span className="w-12 shrink-0">{shortDate(row.dateIso)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {row.description} — {row.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 sm:bottom-4">
            {missingCategory.length > 0 ? (
              <p className={`${ios.alertError} mb-2`}>
                {plural(missingCategory.length, "opération sans catégorie", "opérations sans catégorie")} : choisis-en une ou décoche-les.
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="w-full shadow-lg"
              disabled={pending || changeCount === 0 || missingCategory.length > 0}
              onClick={apply}
            >
              {pending ? "Import…" : changeCount === 0 ? "Rien à importer" : `Importer ${plural(changeCount, "opération", "opérations")}`}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
