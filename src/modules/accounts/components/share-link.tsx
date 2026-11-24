"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import type { ActionResult } from "../actions/result";

type Props = {
  /** Server action creating the link (returns its secret token). */
  create: () => Promise<ActionResult<{ token: string }>>;
  label: string;
  /** Shown with the link (who it is for, how long it lasts). */
  hint: string;
  shareText: string;
};

/** Creates a single-use invitation link, then copy / share it (SMS, WhatsApp…). Shown once. */
export function ShareLink({ create, label, hint, shareText }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const result = await create();
      if (!result.ok) return setError(result.error);
      setUrl(`${window.location.origin}/invitation/${result.token}`);
      setCopied(false);
    });

  if (!url) {
    return (
      <div className="grid gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={generate} className="justify-self-start">
          <Link2 aria-hidden />
          {label}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl bg-muted p-3">
      <p className="text-[13px] text-muted-foreground">{hint}</p>
      <input readOnly value={url} onFocus={(event) => event.target.select()} aria-label="Lien d'invitation" className="h-10 w-full rounded-lg bg-card px-3 text-[15px] outline-none" />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copié" : "Copier"}
        </Button>
        {canShare ? (
          <Button type="button" size="sm" onClick={() => navigator.share({ text: shareText, url }).catch(() => undefined)}>
            <Share2 aria-hidden />
            Partager
          </Button>
        ) : null}
      </div>
    </div>
  );
}
