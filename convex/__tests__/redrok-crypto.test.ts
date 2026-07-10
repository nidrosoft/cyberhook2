import { beforeEach, describe, expect, it } from "vitest";
import { decryptRedrokPassword, encryptRedrokPassword } from "../lib/redrok/crypto";

describe("Redrok credential encryption", () => {
  beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "11".repeat(32);
  });

  it("round trips without storing plaintext", () => {
    const encrypted = encryptRedrokPassword("correct horse battery staple");

    expect(encrypted).not.toContain("correct horse");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptRedrokPassword(encrypted)).toBe("correct horse battery staple");
  });
});
