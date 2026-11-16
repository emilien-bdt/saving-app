import { describe, expect, it } from "vitest";
import { hashPassword as hashWithCli } from "../../../scripts/hash-password.mjs";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("accepts hashes produced by scripts/hash-password.mjs", async () => {
    const stored: string = await hashWithCli("from the cli script");
    expect(await verifyPassword("from the cli script", stored)).toBe(true);
  });

  it.each(["", "plain", "bcrypt:1:2:3:abc:def", "scrypt:0:8:1:abc:def", "scrypt:16384:8:1::def", "scrypt:x:8:1:abc:def"])(
    "returns false for malformed hash %j",
    async (stored) => {
      expect(await verifyPassword("anything", stored)).toBe(false);
    },
  );
});
