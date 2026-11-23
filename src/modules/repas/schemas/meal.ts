import { z } from "zod";
import { MEAL_SLOTS } from "../domain/week";

const isoDate = z.iso.date({ error: "Date invalide" }).transform((value) => new Date(`${value}T00:00:00Z`));

export const slotRefSchema = z.object({ date: isoDate, slot: z.enum(MEAL_SLOTS) });
export type SlotRefInput = z.input<typeof slotRefSchema>;

export const weekSchema = z.string().regex(/^\d{4}-W\d{2}$/, "Semaine invalide");

const note = z
  .string()
  .trim()
  .max(500, "500 caractères maximum")
  .transform((value) => value || null);

const dishName = z.string().trim().min(1, "Plat obligatoire").max(120, "120 caractères maximum");

export const mealInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("DISH"), dishName, note, validated: z.boolean() }),
  z.object({ kind: z.literal("LEFTOVER"), dishName, note, validated: z.boolean() }),
  z.object({
    kind: z.literal("OUT"),
    label: z.string().trim().min(1, "Libellé obligatoire").max(120, "120 caractères maximum"),
    note,
    validated: z.boolean(),
  }),
]);

export type MealInput = z.input<typeof mealInputSchema>;
export type ParsedMealInput = z.output<typeof mealInputSchema>;

/** First message per field (form fields are flat). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return fieldErrors;
}
