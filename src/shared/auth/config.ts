import { z } from "zod";

export const SESSION_COOKIE = "save_session";

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET doit faire au moins 32 caractères (npm run auth:hash en génère un)"),
  AUTH_PASSWORD_HASH: z
    .string()
    .startsWith("scrypt:", "AUTH_PASSWORD_HASH invalide : génère-le avec npm run auth:hash"),
});

export type AuthConfig = {
  /** HMAC key for session tokens. Includes the password hash so changing the password logs out every device. */
  sessionSecret: string;
  passwordHash: string;
};

export function getAuthConfig(): AuthConfig {
  const env = authEnvSchema.parse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
  });
  return {
    sessionSecret: `${env.AUTH_SECRET}:${env.AUTH_PASSWORD_HASH}`,
    passwordHash: env.AUTH_PASSWORD_HASH,
  };
}
