/** Keeps post-login redirects on this site (blocks "//evil.com", "/\\evil.com", absolute URLs). */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/login" || next.startsWith("/login?")) return "/";
  return next;
}
