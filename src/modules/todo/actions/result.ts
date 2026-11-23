export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors: Record<string, string> };

export const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({
  ok: false,
  error,
  fieldErrors,
});
