import { z } from "zod";
import { ICON_NAMES, type IconName } from "../domain/icons";

const isIconName = (value: string): value is IconName => (ICON_NAMES as readonly string[]).includes(value);

/** "Pocket" is a kind of its own in the form; in the database it is an account with a parent. */
export const ACCOUNT_KINDS = ["CHECKING", "SAVINGS", "POCKET"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/**
 * Validates an account typed by the user. No balance field: a new account starts at 0 €
 * and its balance only moves through transactions and transfers.
 */
export const accountInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nom requis").max(60, "Nom trop long"),
    kind: z.enum(ACCOUNT_KINDS),
    parentId: z
      .string()
      .trim()
      .max(64)
      .nullish()
      .transform((value) => (value ? value : null)),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
    icon: z
      .string()
      .nullish()
      .refine((value) => !value || isIconName(value), "Icône inconnue")
      .transform((value) => (value && isIconName(value) ? value : null)),
  })
  .superRefine((input, ctx) => {
    if (input.kind === "POCKET" && !input.parentId) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "Choisis le compte du pocket" });
    }
  })
  .transform(({ kind, parentId, color, ...input }) => ({
    ...input,
    color: color.toLowerCase(),
    // A pocket's type does not matter (pockets are totalled apart): stored as SAVINGS like the imported ones.
    type: kind === "CHECKING" ? ("CHECKING" as const) : ("SAVINGS" as const),
    parentId: kind === "POCKET" ? parentId : null,
  }));

export type AccountInput = z.input<typeof accountInputSchema>;
export type AccountData = z.output<typeof accountInputSchema>;
