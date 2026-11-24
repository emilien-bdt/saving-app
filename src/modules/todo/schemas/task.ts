import { z } from "zod";

const idOrEmpty = z.string().max(64).transform((value) => value || null);

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Titre obligatoire").max(200, "200 caractères maximum"),
  note: z
    .string()
    .trim()
    .max(2000, "2 000 caractères maximum")
    .transform((value) => value || null),
  /** "" = no due date. */
  dueDate: z
    .union([z.literal(""), z.iso.date({ error: "Date invalide" })])
    .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null)),
  priority: z.enum(["NORMAL", "HIGH"]),
  /** "" = no list. */
  listId: idOrEmpty,
});

export type TaskInput = z.input<typeof taskInputSchema>;
export type ParsedTaskInput = z.output<typeof taskInputSchema>;

export const listInputSchema = z.object({
  name: z.string().trim().min(1, "Nom obligatoire").max(60, "60 caractères maximum"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
  /** Shared with the household (every member sees its tasks). */
  shared: z.boolean().default(false),
});

export type ListInput = z.input<typeof listInputSchema>;

export const idSchema = z.string().min(1).max(64);

/** First message per field (form fields are flat). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return fieldErrors;
}
