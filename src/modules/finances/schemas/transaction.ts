import { z } from "zod";
import { positiveAmountSchema } from "@/shared/lib/money";
import { normalizeLabel } from "../domain/labels";
import { checkTransactionShape } from "../domain/transaction-shape";
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from "../domain/types";

const optionalId = z
  .string()
  .trim()
  .max(64)
  .nullish()
  .transform((value) => (value ? value : null));

/** Validates a transaction typed by the user (strings in, Prisma-ready data out). */
export const transactionInputSchema = z
  .object({
    /** ISO date "AAAA-MM-JJ" (value of <input type="date">). */
    date: z.iso.date({ error: "Date invalide" }).transform((value) => new Date(`${value}T00:00:00Z`)),
    dayUnknown: z.boolean().default(false),
    amount: positiveAmountSchema,
    type: z.enum(TRANSACTION_TYPES),
    status: z.enum(TRANSACTION_STATUSES),
    label: z.string().trim().min(1, "Libellé requis").max(120, "Libellé trop long"),
    note: z
      .string()
      .trim()
      .max(500, "Note trop longue")
      .nullish()
      .transform((value) => (value ? value : null)),
    accountId: z.string().trim().min(1, "Compte requis").max(64),
    toAccountId: optionalId,
    categoryId: optionalId,
  })
  .superRefine((input, ctx) => {
    for (const issue of checkTransactionShape(input)) {
      ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message });
    }
  })
  .transform(({ amount, ...input }) => ({
    ...input,
    amountCents: amount,
    labelKey: normalizeLabel(input.label),
  }));

export type TransactionInput = z.input<typeof transactionInputSchema>;
export type TransactionData = z.output<typeof transactionInputSchema>;
