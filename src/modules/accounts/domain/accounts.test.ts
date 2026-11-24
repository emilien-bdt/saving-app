import { describe, expect, it } from "vitest";
import { invitationExpiry, invitationState, leavePlan, loginSchema, normalizeLogin, passwordSchema } from "./accounts";

const NOW = new Date("2026-11-24T12:00:00Z");

describe("comptes", () => {
  it("normalise l'identifiant (casse, espaces)", () => {
    expect(normalizeLogin("  Camille@Exemple.FR ")).toBe("camille@exemple.fr");
    expect(loginSchema.parse(" Camille@Exemple.fr")).toBe("camille@exemple.fr");
    expect(loginSchema.safeParse("pas-un-email").success).toBe(false);
  });

  it("exige 8 caractères pour un mot de passe", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("donne l'état d'une invitation", () => {
    const expiresAt = invitationExpiry("ACCOUNT", NOW);
    expect(expiresAt.toISOString()).toBe("2026-12-01T12:00:00.000Z");
    expect(invitationState({ usedAt: null, expiresAt }, NOW)).toBe("valid");
    expect(invitationState({ usedAt: NOW, expiresAt }, NOW)).toBe("used");
    expect(invitationState({ usedAt: null, expiresAt: NOW }, NOW)).toBe("expired");
    expect(invitationState(null, NOW)).toBe("unknown");
    expect(invitationExpiry("PASSWORD_RESET", NOW).toISOString()).toBe("2026-11-26T12:00:00.000Z");
  });

  it("décide de ce que devient un foyer quand on le quitte", () => {
    expect(leavePlan({ currentId: "a", soloId: "a", remainingMembers: 1, currentIsSolo: true })).toEqual({ action: "stay", reason: "already_home" });
    expect(leavePlan({ currentId: "b", soloId: "a", remainingMembers: 1, currentIsSolo: true })).toEqual({ action: "leave", deleteHousehold: false });
    expect(leavePlan({ currentId: "b", soloId: "a", remainingMembers: 0, currentIsSolo: true })).toEqual({ action: "leave", deleteHousehold: false });
    expect(leavePlan({ currentId: "b", soloId: "a", remainingMembers: 0, currentIsSolo: false })).toEqual({ action: "leave", deleteHousehold: true });
  });
});
