import { z } from "zod";

/** "2,25" (percent, 2 decimals at most) → 225 basis points. */
export const interestRateInputSchema = z.object({
  validFrom: z.iso.date({ error: "Date invalide" }).transform((value) => new Date(`${value}T00:00:00Z`)),
  rate: z
    .string()
    .trim()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Taux invalide (ex. 2,25)")
    .transform((value) => Math.round(Number(value.replace(",", ".")) * 100))
    .refine((rateBp) => rateBp <= 10_000, "Taux trop élevé"),
});

export type InterestRateInput = z.input<typeof interestRateInputSchema>;
