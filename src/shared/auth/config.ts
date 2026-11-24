import { z } from "zod";

export const SESSION_COOKIE = "save_session";

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET doit faire au moins 32 caractères (npm run auth:hash en génère un)"),
  AUTH_PASSWORD_HASH: z
    .string()
    .startsWith("scrypt:", "AUTH_PASSWORD_HASH invalide : génère-le avec npm run auth:hash")
    .optional()
    .or(z.literal("")),
});

export type AuthConfig = {
  /** HMAC key for session tokens. */
  sessionSecret: string;
  /**
   * Former single password (before accounts): only used to sign in to the admin account
   * created by the migration, until it gets its own password.
   */
  legacyPasswordHash: string | null;
};

export function getAuthConfig(): AuthConfig {
  const env = authEnvSchema.parse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
  });
  return { sessionSecret: env.AUTH_SECRET, legacyPasswordHash: env.AUTH_PASSWORD_HASH || null };
}
