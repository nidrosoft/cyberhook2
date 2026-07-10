/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import { decryptRedrokPassword } from "../lib/redrok/crypto";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "33".repeat(32);
});

describe("Redrok runtime boundary", () => {
    it("keeps Node-only crypto out of the default-runtime API and delegates both migrations", () => {
        const source = readFileSync(new URL("../redrokApi.ts", import.meta.url), "utf8");

        expect(source).not.toMatch(/from\s+["'][^"']*lib\/redrok\/crypto["']/);
        expect(source).not.toContain("encryptRedrokPassword");
        expect(source.match(/runAction\(internal\.redrokCredentialActions\.migrateLegacyPassword/g)).toHaveLength(2);
    });

    it("encrypts and persists a legacy plaintext password in the Node-runtime action", async () => {
        const t = convexTest(schema, modules);
        const companyId = await t.run(async (ctx) => {
            const now = Date.now();
            return await ctx.db.insert("companies", {
                name: "Legacy Credential Corp",
                phone: "555-0199",
                website: "https://legacy-credential.test",
                primaryBusinessModel: "MSP",
                annualRevenue: "$1M",
                geographicCoverage: ["US"],
                targetCustomerBase: ["SMB"],
                totalEmployees: "10",
                totalSalesPeople: "2",
                tokenAllocation: 100,
                tokensUsed: 0,
                tokenResetDate: now + 1_000,
                redrokEmail: "legacy@example.com",
                redrokPassword: "legacy-plaintext-secret",
                status: "active",
                createdAt: now,
                updatedAt: now,
            });
        });

        const result = await t.action((internal.redrokCredentialActions as any).migrateLegacyPassword, {
            companyId,
            password: "legacy-plaintext-secret",
        });
        const company = await t.run((ctx) => ctx.db.get(companyId));

        expect(result).toEqual({ migrated: true });
        expect(company?.redrokPassword).toBeUndefined();
        expect(company?.redrokPasswordEncrypted).toMatch(/^v1:/);
        expect(company?.redrokPasswordEncrypted).not.toContain("legacy-plaintext-secret");
        expect(decryptRedrokPassword(company?.redrokPasswordEncrypted ?? "")).toBe("legacy-plaintext-secret");
    });
});
