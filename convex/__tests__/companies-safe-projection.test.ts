/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("client-facing company queries", () => {
  it("never return Redrok passwords or cached tokens", async () => {
    const t = convexTest(schema, modules);
    const companyId = await t.run(async (ctx) => {
      const now = Date.now();
      const companyId = await ctx.db.insert("companies", {
        name: "Acme",
        phone: "555-0100",
        website: "https://acme.test",
        primaryBusinessModel: "MSP",
        annualRevenue: "$1M",
        geographicCoverage: ["US"],
        targetCustomerBase: ["SMB"],
        totalEmployees: "10",
        totalSalesPeople: "2",
        tokenAllocation: 100,
        tokensUsed: 0,
        tokenResetDate: now + 1000,
        stripeCustomerId: "cus_secret_projection",
        redrokEmail: "redrok@acme.test",
        redrokPassword: "legacy-password",
        redrokPasswordEncrypted: "v1:iv:ciphertext:tag",
        redrokToken: "cached-bearer-token",
        redrokTokenExpiresAt: now + 1000,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("users", {
        clerkId: "user_secret_projection",
        email: "admin@acme.test",
        firstName: "Safe",
        lastName: "Admin",
        companyId,
        role: "sales_admin",
        status: "approved",
        createdAt: now,
        updatedAt: now,
      });

      return companyId;
    });
    const asUser = t.withIdentity({ subject: "user_secret_projection" });

    const [currentCompany, companyById, companyByStripeCustomerId, currentUserWithCompany] =
      await Promise.all([
        asUser.query(api.companies.getCurrentCompany, {}),
        asUser.query(api.companies.getById, { id: companyId }),
        asUser.query(api.companies.getByStripeCustomerId, {
          stripeCustomerId: "cus_secret_projection",
        }),
        asUser.query(api.users.getCurrentUserWithCompany, {}),
      ]);
    const companies = [
      currentCompany,
      companyById,
      companyByStripeCustomerId,
      currentUserWithCompany?.company,
    ];

    for (const company of companies) {
      expect(company).not.toHaveProperty("redrokPassword");
      expect(company).not.toHaveProperty("redrokPasswordEncrypted");
      expect(company).not.toHaveProperty("redrokToken");
      expect(company).not.toHaveProperty("redrokTokenExpiresAt");
    }
  });

  it("accepts encrypted credentials and Redrok health metadata", async () => {
    const t = convexTest(schema, modules);

    const company = await t.run(async (ctx) => {
      const now = Date.now();
      const companyId = await ctx.db.insert("companies", {
        name: "Health Corp",
        phone: "555-0101",
        website: "https://health.test",
        primaryBusinessModel: "MSSP",
        annualRevenue: "$2M",
        geographicCoverage: ["US"],
        targetCustomerBase: ["Enterprise"],
        totalEmployees: "20",
        totalSalesPeople: "4",
        tokenAllocation: 200,
        tokensUsed: 0,
        tokenResetDate: now + 1000,
        redrokPasswordEncrypted: "v1:iv:ciphertext:tag",
        redrokCredentialSource: "company",
        redrokHealthStatus: "auth_invalid",
        redrokLastHealthCheckAt: now,
        redrokLastHealthErrorCode: "REDROK_AUTH_INVALID",
        redrokLastHealthErrorMessage: "Credentials rejected",
        redrokLastAlertAt: now - 1000,
        redrokLastRecoveryAlertAt: now - 2000,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      return await ctx.db.get(companyId);
    });

    expect(company?.redrokPasswordEncrypted).toBe("v1:iv:ciphertext:tag");
    expect(company?.redrokHealthStatus).toBe("auth_invalid");
  });
});
