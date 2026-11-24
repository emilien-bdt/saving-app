export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const failure = (error: string): { ok: false; error: string } => ({ ok: false, error });
