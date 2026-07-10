/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { decryptRedrokPassword, encryptRedrokPassword } from "../lib/redrok/crypto";
import { redrokFetch } from "../redrokApi";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "22".repeat(32);
});

afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.REDROK_EMAIL;
    delete process.env.REDROK_PASSWORD;
});

async function seedCredentialUsers() {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
        const now = Date.now();
        const companyId = await ctx.db.insert("companies", {
            name: "Credential Corp",
            phone: "555-0102",
            website: "https://credential.test",
            primaryBusinessModel: "MSSP",
            annualRevenue: "$3M",
            geographicCoverage: ["US"],
            targetCustomerBase: ["Enterprise"],
            totalEmployees: "30",
            totalSalesPeople: "5",
            tokenAllocation: 300,
            tokensUsed: 0,
            tokenResetDate: now + 1000,
            redrokEmail: "legacy@example.com",
            redrokPassword: "legacy-password",
            redrokPasswordEncrypted: "v1:old:encrypted:value",
            redrokToken: "old-bearer-token",
            redrokTokenExpiresAt: now + 60_000,
            redrokCredentialSource: "company",
            redrokHealthStatus: "auth_invalid",
            status: "active",
            createdAt: now,
            updatedAt: now,
        });
        const otherCompanyId = await ctx.db.insert("companies", {
            name: "Other Corp",
            phone: "555-0103",
            website: "https://other.test",
            primaryBusinessModel: "MSP",
            annualRevenue: "$4M",
            geographicCoverage: ["US"],
            targetCustomerBase: ["SMB"],
            totalEmployees: "40",
            totalSalesPeople: "6",
            tokenAllocation: 400,
            tokensUsed: 0,
            tokenResetDate: now + 1000,
            redrokEmail: "other@example.com",
            redrokPasswordEncrypted: "v1:other:encrypted:value",
            redrokToken: "other-token",
            redrokTokenExpiresAt: now + 60_000,
            redrokCredentialSource: "company",
            redrokHealthStatus: "healthy",
            status: "active",
            createdAt: now,
            updatedAt: now,
        });

        const [adminUserId, salesRepUserId, otherAdminUserId, pendingAdminUserId] = await Promise.all([
            ctx.db.insert("users", {
                clerkId: "credential_admin",
                email: "admin@credential.test",
                firstName: "Sales",
                lastName: "Admin",
                companyId,
                role: "sales_admin",
                status: "approved",
                createdAt: now,
                updatedAt: now,
            }),
            ctx.db.insert("users", {
                clerkId: "credential_rep",
                email: "rep@credential.test",
                firstName: "Sales",
                lastName: "Rep",
                companyId,
                role: "sales_rep",
                status: "approved",
                createdAt: now,
                updatedAt: now,
            }),
            ctx.db.insert("users", {
                clerkId: "other_admin",
                email: "admin@other.test",
                firstName: "Other",
                lastName: "Admin",
                companyId: otherCompanyId,
                role: "sales_admin",
                status: "approved",
                createdAt: now,
                updatedAt: now,
            }),
            ctx.db.insert("users", {
                clerkId: "pending_credential_admin",
                email: "pending-admin@credential.test",
                firstName: "Pending",
                lastName: "Admin",
                companyId,
                role: "sales_admin",
                status: "pending",
                createdAt: now,
                updatedAt: now,
            }),
        ]);

        const searchId = await ctx.db.insert("searches", {
            companyId,
            userId: adminUserId,
            domain: "credential.test",
            status: "pending",
            tokensConsumed: 0,
            createdAt: now,
        });
        const otherSearchId = await ctx.db.insert("searches", {
            companyId: otherCompanyId,
            userId: otherAdminUserId,
            domain: "other.test",
            status: "pending",
            tokensConsumed: 0,
            createdAt: now,
        });
        const watchlistItemId = await ctx.db.insert("watchlistItems", {
            companyId,
            userId: adminUserId,
            domain: "credential.test",
            notifyByEmail: true,
            monitoringWindow: 30,
            hasNewExposures: false,
            createdAt: now,
            updatedAt: now,
        });
        const otherWatchlistItemId = await ctx.db.insert("watchlistItems", {
            companyId: otherCompanyId,
            userId: otherAdminUserId,
            domain: "other.test",
            notifyByEmail: true,
            monitoringWindow: 30,
            hasNewExposures: false,
            createdAt: now,
            updatedAt: now,
        });

        return {
            companyId,
            otherCompanyId,
            adminUserId,
            salesRepUserId,
            otherAdminUserId,
            pendingAdminUserId,
            searchId,
            otherSearchId,
            watchlistItemId,
            otherWatchlistItemId,
        };
    });

    return {
        t,
        ids,
        asSalesAdmin: t.withIdentity({ subject: "credential_admin" }),
        asSalesRep: t.withIdentity({ subject: "credential_rep" }),
        asOtherAdmin: t.withIdentity({ subject: "other_admin" }),
        asPendingSalesAdmin: t.withIdentity({ subject: "pending_credential_admin" }),
    };
}

describe("Redrok credential persistence", () => {
    it("returns masked company status without secrets", async () => {
        const { asSalesAdmin } = await seedCredentialUsers();

        const status = await asSalesAdmin.query(api.redrokCredentials.getStatus, {});

        expect(status).toEqual({
            connected: true,
            credentialSource: "company",
            emailMasked: "l***@example.com",
            healthStatus: "auth_invalid",
            lastHealthCheckAt: null,
            lastErrorCode: null,
        });
        expect(status).not.toHaveProperty("password");
        expect(status).not.toHaveProperty("passwordEncrypted");
        expect(status).not.toHaveProperty("token");
        expect(JSON.stringify(status)).not.toContain("legacy-password");
        expect(JSON.stringify(status)).not.toContain("old-bearer-token");
    });

    it("scopes status to the authenticated user's company", async () => {
        const { asOtherAdmin } = await seedCredentialUsers();

        const status = await asOtherAdmin.query(api.redrokCredentials.getStatus, {});

        expect(status.emailMasked).toBe("o***@example.com");
    });

    it("reports configured shared credentials without exposing their email", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        process.env.REDROK_EMAIL = "shared-secret@example.com";
        process.env.REDROK_PASSWORD = "shared-secret-password";
        await t.run((ctx) =>
            ctx.db.patch(ids.companyId, {
                redrokEmail: undefined,
                redrokPassword: undefined,
                redrokPasswordEncrypted: undefined,
                redrokCredentialSource: undefined,
                redrokHealthStatus: "unknown",
            }),
        );

        await t.mutation((internal.redrokCredentials as any).applyHealthCheck, {
            companyId: ids.companyId,
            status: "healthy",
            credentialSource: "shared",
            checkedAt: 20_000,
        });
        const status = await asSalesAdmin.query(api.redrokCredentials.getStatus, {});

        expect(status).toEqual({
            connected: true,
            credentialSource: "shared",
            emailMasked: null,
            healthStatus: "healthy",
            lastHealthCheckAt: 20_000,
            lastErrorCode: null,
        });
        expect(JSON.stringify(status)).not.toContain("shared-secret");
    });

    it("rejects credential removal by a sales rep", async () => {
        const { asSalesRep } = await seedCredentialUsers();

        await expect(asSalesRep.mutation(api.redrokCredentials.removeCredentials, {})).rejects.toThrow("insufficient permissions");
    });

    it("rejects credential removal by a pending sales admin", async () => {
        const { asPendingSalesAdmin } = await seedCredentialUsers();

        await expect(asPendingSalesAdmin.mutation(api.redrokCredentials.removeCredentials, {})).rejects.toThrow("account is not approved");
    });

    it("removes every company credential and cached token", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();

        const result = await asSalesAdmin.mutation(api.redrokCredentials.removeCredentials, {});
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result).toEqual({ ok: true });
        expect(company?.redrokEmail).toBeUndefined();
        expect(company?.redrokPassword).toBeUndefined();
        expect(company?.redrokPasswordEncrypted).toBeUndefined();
        expect(company?.redrokToken).toBeUndefined();
        expect(company?.redrokTokenExpiresAt).toBeUndefined();
        expect(company?.redrokCredentialSource).toBeUndefined();
        expect(company?.redrokHealthStatus).toBe("credentials_missing");
    });

    it("persists an unhealthy transition and notifies only opted-in approved Sales Admins", async () => {
        const { t, ids } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            const now = Date.now();
            await ctx.db.patch(ids.adminUserId, { inAppNotifications: true });
            await ctx.db.insert("users", {
                clerkId: "opted_out_admin",
                email: "opted-out@credential.test",
                firstName: "Opted",
                lastName: "Out",
                companyId: ids.companyId,
                role: "sales_admin",
                status: "approved",
                inAppNotifications: false,
                createdAt: now,
                updatedAt: now,
            });
            await ctx.db.patch(ids.companyId, {
                redrokHealthStatus: "healthy",
                redrokLastAlertAt: undefined,
            });
        });

        const result = await t.mutation((internal.redrokCredentials as any).applyHealthCheck, {
            companyId: ids.companyId,
            status: "auth_invalid",
            errorCode: "REDROK_AUTH_INVALID",
            errorMessage: "Redrok credentials were rejected.",
            checkedAt: 10_000,
        });
        const state = await t.run(async (ctx) => {
            const company = await ctx.db.get(ids.companyId);
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_companyId", (q) => q.eq("companyId", ids.companyId))
                .collect();
            return { company, notifications };
        });

        expect(result).toEqual({ alert: "unhealthy" });
        expect(state.company).toMatchObject({
            redrokHealthStatus: "auth_invalid",
            redrokLastHealthCheckAt: 10_000,
            redrokLastHealthErrorCode: "REDROK_AUTH_INVALID",
            redrokLastAlertAt: 10_000,
        });
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0]).toMatchObject({
            userId: ids.adminUserId,
            type: "integration.redrok_unhealthy",
            actionUrl: "/settings?tab=integrations",
        });
    });

    it("clears unhealthy alert dedup on recovery so a new outage alerts immediately", async () => {
        const { t, ids } = await seedCredentialUsers();
        await t.run((ctx) =>
            ctx.db.patch(ids.companyId, {
                redrokHealthStatus: "auth_invalid",
                redrokLastAlertAt: 10_000,
            }),
        );

        await t.mutation((internal.redrokCredentials as any).applyHealthCheck, {
            companyId: ids.companyId,
            status: "healthy",
            checkedAt: 11_000,
        });
        const secondOutage = await t.mutation((internal.redrokCredentials as any).applyHealthCheck, {
            companyId: ids.companyId,
            status: "unavailable",
            errorCode: "REDROK_UNAVAILABLE",
            errorMessage: "Redrok is temporarily unavailable.",
            checkedAt: 12_000,
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(secondOutage).toEqual({ alert: "unhealthy" });
        expect(company?.redrokLastAlertAt).toBe(12_000);
    });

    it("selects only opted-in approved Sales Admin email recipients", async () => {
        const { t, ids } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            const now = Date.now();
            await ctx.db.patch(ids.adminUserId, { emailNotifications: true });
            await ctx.db.insert("users", {
                clerkId: "email_opted_out_admin",
                email: "email-opted-out@credential.test",
                firstName: "Email",
                lastName: "Out",
                companyId: ids.companyId,
                role: "sales_admin",
                status: "approved",
                emailNotifications: false,
                createdAt: now,
                updatedAt: now,
            });
        });

        const recipients = await t.query((internal.emails as any).getRedrokHealthAlertRecipients, {
            companyId: ids.companyId,
        });

        expect(recipients).toEqual({
            companyName: "Credential Corp",
            recipients: [{ email: "admin@credential.test", firstName: "Sales" }],
        });
    });

    it("separates dedicated credential companies from shared fallback companies", async () => {
        const { t, ids } = await seedCredentialUsers();
        const sharedCompanyId = await t.run(async (ctx) => {
            const now = Date.now();
            return await ctx.db.insert("companies", {
                name: "Shared Corp",
                phone: "555-0104",
                website: "https://shared.test",
                primaryBusinessModel: "MSP",
                annualRevenue: "$2M",
                geographicCoverage: ["US"],
                targetCustomerBase: ["SMB"],
                totalEmployees: "20",
                totalSalesPeople: "3",
                tokenAllocation: 200,
                tokensUsed: 0,
                tokenResetDate: now + 1_000,
                status: "active",
                createdAt: now,
                updatedAt: now,
            });
        });

        const targets = await t.query((internal.redrokCredentials as any).getHealthCheckTargets, {});

        expect(targets.dedicated.map((target: { companyId: string }) => target.companyId)).toEqual(
            expect.arrayContaining([ids.companyId, ids.otherCompanyId]),
        );
        expect(targets.sharedCompanyIds).toContain(sharedCompanyId);
        expect(JSON.stringify(targets)).not.toContain("old-bearer-token");
    });
});

describe("Redrok credential actions", () => {
    it("sanitizes malformed successful authentication JSON", async () => {
        const { asSalesAdmin } = await seedCredentialUsers();
        const maliciousBody = '{"token":"secret-body-fragment';
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(maliciousBody, {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const result = await asSalesAdmin.action(api.redrokCredentialActions.testCredentials, {
            email: "admin@example.com",
            password: "candidate-secret",
        });

        expect(result).toEqual({
            ok: false,
            code: "REDROK_UNKNOWN",
            retryable: true,
            message: "Redrok returned an invalid authentication response.",
        });
        expect(JSON.stringify(result)).not.toContain("secret-body-fragment");
    });

    it("never returns or stores raw Redrok error bodies", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        const rawBody = "upstream-secret-body password=do-not-propagate";
        await t.run((ctx) => ctx.db.patch(ids.companyId, { redrokPasswordEncrypted: undefined }));
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(rawBody, { status: 503 })),
        );

        const result = await asSalesAdmin.action(api.redrokApi.liveSearch, {
            companyId: ids.companyId,
            userId: ids.adminUserId,
            searchId: ids.searchId,
            domain: "credential.test",
        });
        const search = await t.run((ctx) => ctx.db.get(ids.searchId));

        expect(result).toMatchObject({
            success: false,
            errorCode: "REDROK_UNAVAILABLE",
            message: "Redrok is temporarily unavailable.",
            error: "Redrok is temporarily unavailable.",
        });
        expect(JSON.stringify(result)).not.toContain(rawBody);
        expect(search?.errorMessage).toBe("Redrok is temporarily unavailable.");
        expect(JSON.stringify(search)).not.toContain(rawBody);
    });

    it("returns stable classified failures for every public and internal Redrok operation", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run((ctx) => ctx.db.patch(ids.companyId, { redrokPasswordEncrypted: undefined }));
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("socket ECONNREFUSED internal-host:443")));

        const operations = [
            () =>
                asSalesAdmin.action(api.redrokApi.liveSearch, {
                    companyId: ids.companyId,
                    userId: ids.adminUserId,
                    searchId: ids.searchId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.getCountries, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getRegions, { companyId: ids.companyId, country: "us" }),
            () => asSalesAdmin.action(api.redrokApi.getSearchHistory, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getPrevSearchResults, { companyId: ids.companyId, guid: "guid-1" }),
            () => asSalesAdmin.action(api.redrokApi.getCredits, { companyId: ids.companyId }),
            () =>
                asSalesAdmin.action(api.redrokApi.rescanDomain, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.generateReport, { companyId: ids.companyId, domain: "credential.test" }),
            () =>
                t.action(internal.redrokApi.rescanDomainInternal, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
        ];

        for (const runOperation of operations) {
            const result = await runOperation();
            expect(result).toMatchObject({
                success: false,
                error: "Redrok is temporarily unavailable.",
                errorCode: "REDROK_UNAVAILABLE",
                retryable: true,
            });
            expect(JSON.stringify(result)).not.toContain("internal-host");
        }
    });

    it("retries every Redrok operation exactly once after a cached-token 401", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run((ctx) => ctx.db.patch(ids.companyId, { redrokPasswordEncrypted: undefined }));
        const fetchMock = vi.fn().mockImplementation(async (input, init) => {
            const url = String(input);
            if (url.includes("/api/authenticate")) {
                return Response.json({ token: "fresh-token" });
            }
            const authorization = new Headers(init?.headers).get("Authorization");
            if (authorization === "Bearer old-bearer-token") {
                return new Response("", { status: 401 });
            }
            return Response.json({
                result: true,
                data: [],
                companyData: [],
                countries: [],
                countryRegions: [],
                message: "OK",
            });
        });
        vi.stubGlobal("fetch", fetchMock);
        const operations = [
            () =>
                asSalesAdmin.action(api.redrokApi.liveSearch, {
                    companyId: ids.companyId,
                    userId: ids.adminUserId,
                    searchId: ids.searchId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.liveLeads, { companyId: ids.companyId, days: 30 }),
            () => asSalesAdmin.action(api.redrokApi.getCountries, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getRegions, { companyId: ids.companyId, country: "us" }),
            () => asSalesAdmin.action(api.redrokApi.getSearchHistory, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getPrevSearchResults, { companyId: ids.companyId, guid: "guid-1" }),
            () => asSalesAdmin.action(api.redrokApi.getCredits, { companyId: ids.companyId }),
            () =>
                asSalesAdmin.action(api.redrokApi.rescanDomain, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.generateReport, { companyId: ids.companyId, domain: "credential.test" }),
            () =>
                t.action(internal.redrokApi.rescanDomainInternal, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
        ];

        for (const runOperation of operations) {
            await t.run(async (ctx) => {
                await ctx.db.patch(ids.companyId, {
                    redrokToken: "old-bearer-token",
                    redrokTokenExpiresAt: Date.now() + 60_000,
                });
                await ctx.db.patch(ids.searchId, { status: "pending" });
            });
            fetchMock.mockClear();

            const result = await runOperation();

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/api/authenticate");
        }
    });

    it("never retries any Redrok operation when fresh authentication is rejected", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run((ctx) =>
            ctx.db.patch(ids.companyId, {
                redrokPasswordEncrypted: undefined,
                redrokToken: undefined,
                redrokTokenExpiresAt: undefined,
            }),
        );
        const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);
        const operations = [
            () =>
                asSalesAdmin.action(api.redrokApi.liveSearch, {
                    companyId: ids.companyId,
                    userId: ids.adminUserId,
                    searchId: ids.searchId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.liveLeads, { companyId: ids.companyId, days: 30 }),
            () => asSalesAdmin.action(api.redrokApi.getCountries, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getRegions, { companyId: ids.companyId, country: "us" }),
            () => asSalesAdmin.action(api.redrokApi.getSearchHistory, { companyId: ids.companyId }),
            () => asSalesAdmin.action(api.redrokApi.getPrevSearchResults, { companyId: ids.companyId, guid: "guid-1" }),
            () => asSalesAdmin.action(api.redrokApi.getCredits, { companyId: ids.companyId }),
            () =>
                asSalesAdmin.action(api.redrokApi.rescanDomain, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
            () => asSalesAdmin.action(api.redrokApi.generateReport, { companyId: ids.companyId, domain: "credential.test" }),
            () =>
                t.action(internal.redrokApi.rescanDomainInternal, {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                }),
        ];

        for (const runOperation of operations) {
            fetchMock.mockClear();
            const result = await runOperation();
            expect(result).toMatchObject({
                success: false,
                errorCode: "REDROK_AUTH_INVALID",
                retryable: false,
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        }
    });

    it("applies a timeout to non-Live-Leads Redrok requests", async () => {
        const fetcher: typeof fetch = async (_input, init) =>
            await new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")));
            });

        await expect(
            redrokFetch({ token: "cached-token", source: "cached" }, "/search/countries", {}, undefined, fetcher, 1),
        ).rejects.toMatchObject({
            code: "REDROK_TIMEOUT",
            retryable: true,
        });
    });

    it("checks dedicated companies sequentially, checks shared credentials once, and records one summary", async () => {
        const { t, ids } = await seedCredentialUsers();
        const sharedCompanyId = await t.run(async (ctx) => {
            const now = Date.now();
            await ctx.db.patch(ids.companyId, {
                redrokPassword: undefined,
                redrokPasswordEncrypted: encryptRedrokPassword("dedicated-one"),
            });
            await ctx.db.patch(ids.otherCompanyId, {
                redrokPasswordEncrypted: encryptRedrokPassword("dedicated-two"),
            });
            await ctx.db.patch(ids.adminUserId, { emailNotifications: false });
            await ctx.db.patch(ids.otherAdminUserId, { emailNotifications: false });
            return await ctx.db.insert("companies", {
                name: "Shared Health Corp",
                phone: "555-0105",
                website: "https://shared-health.test",
                primaryBusinessModel: "MSP",
                annualRevenue: "$2M",
                geographicCoverage: ["US"],
                targetCustomerBase: ["SMB"],
                totalEmployees: "20",
                totalSalesPeople: "3",
                tokenAllocation: 200,
                tokensUsed: 0,
                tokenResetDate: now + 1_000,
                status: "active",
                createdAt: now,
                updatedAt: now,
            });
        });
        process.env.REDROK_EMAIL = "shared@example.com";
        process.env.REDROK_PASSWORD = "shared-secret";
        const fetchMock = vi.fn().mockImplementation(async () => Response.json({ token: "health-token" }));
        vi.stubGlobal("fetch", fetchMock);

        const summary = await t.action((internal.redrokCredentialActions as any).healthCheckAll, {});
        const state = await t.run(async (ctx) => ({
            sharedCompany: await ctx.db.get(sharedCompanyId),
            logs: await ctx.db
                .query("syncLogs")
                .withIndex("by_source", (q) => q.eq("source", "redrok_auth"))
                .collect(),
        }));

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(summary).toEqual({ healthy: 3, unhealthy: 0, checked: 3 });
        expect(state.sharedCompany?.redrokHealthStatus).toBe("healthy");
        expect(state.sharedCompany?.redrokCredentialSource).toBe("shared");
        expect(state.logs).toHaveLength(1);
        expect(state.logs[0]).toMatchObject({
            source: "redrok_auth",
            success: true,
            stored: 0,
            skipped: 0,
        });
    });

    it("limits each health action to a fixed batch and defers finalization", async () => {
        const { t } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            const now = Date.now();
            for (let index = 0; index < 10; index += 1) {
                await ctx.db.insert("companies", {
                    name: `Batch Corp ${index}`,
                    phone: `555-02${index.toString().padStart(2, "0")}`,
                    website: `https://batch-${index}.test`,
                    primaryBusinessModel: "MSP",
                    annualRevenue: "$2M",
                    geographicCoverage: ["US"],
                    targetCustomerBase: ["SMB"],
                    totalEmployees: "20",
                    totalSalesPeople: "3",
                    tokenAllocation: 200,
                    tokensUsed: 0,
                    tokenResetDate: now + 1_000,
                    redrokEmail: `batch-${index}@example.com`,
                    redrokPasswordEncrypted: encryptRedrokPassword(`secret-${index}`),
                    status: "active",
                    createdAt: now + index,
                    updatedAt: now + index,
                });
            }
        });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ token: "health-token" })));

        const firstPage = await t.query((internal.redrokCredentials as any).getHealthCheckTargets, {});
        const logsBeforeFinalBatch = await t.run((ctx) =>
            ctx.db
                .query("syncLogs")
                .withIndex("by_source", (q) => q.eq("source", "redrok_auth"))
                .collect(),
        );

        expect(firstPage.dedicated).toHaveLength(10);
        expect(firstPage.isDone).toBe(false);
        expect(logsBeforeFinalBatch).toHaveLength(0);

        const finalSummary = await t.action((internal.redrokCredentialActions as any).healthCheckBatch, {
            cursor: firstPage.continueCursor,
            startedAt: 1_000,
            healthy: 10,
            unhealthy: 0,
            checked: 10,
        });
        const logsAfterFinalBatch = await t.run((ctx) =>
            ctx.db
                .query("syncLogs")
                .withIndex("by_source", (q) => q.eq("source", "redrok_auth"))
                .collect(),
        );

        expect(finalSummary.checked).toBe(12);
        expect(logsAfterFinalBatch).toHaveLength(1);
        expect(logsAfterFinalBatch[0]).toMatchObject({ stored: 0, skipped: 0 });
        expect(logsAfterFinalBatch[0].success).toBe(finalSummary.unhealthy === 0);
    }, 10_000);

    it("rejects credential testing by a sales rep before calling Redrok", async () => {
        const { asSalesRep } = await seedCredentialUsers();
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesRep.action(api.redrokCredentialActions.testCredentials, {
                email: "rep@example.com",
                password: "not-authorized",
            }),
        ).rejects.toThrow("insufficient permissions");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects credential testing by a pending sales admin before calling Redrok", async () => {
        const { asPendingSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asPendingSalesAdmin.action(api.redrokCredentialActions.testCredentials, {
                email: "pending@example.com",
                password: "not-approved",
            }),
        ).rejects.toThrow("account is not approved");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns a sanitized auth failure and does not store invalid credentials", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response('{"password":"leaked-upstream-secret"}', {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const result = await asSalesAdmin.action(api.redrokCredentialActions.saveCredentials, {
            email: "invalid@example.com",
            password: "invalid-password",
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result).toEqual({
            ok: false,
            code: "REDROK_AUTH_INVALID",
            retryable: false,
            message: "Redrok credentials were rejected.",
        });
        expect(JSON.stringify(result)).not.toContain("leaked-upstream-secret");
        expect(company?.redrokEmail).toBe("legacy@example.com");
        expect(company?.redrokPassword).toBe("legacy-password");
        expect(company?.redrokToken).toBe("old-bearer-token");
    });

    it("tests valid credentials without returning or storing the token", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ token: "test-only-token", ignored: "upstream-data" })));

        const result = await asSalesAdmin.action(api.redrokCredentialActions.testCredentials, {
            email: "valid@example.com",
            password: "valid-password",
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result).toEqual({ ok: true });
        expect(result).not.toHaveProperty("token");
        expect(company?.redrokToken).toBe("old-bearer-token");
        expect(company?.redrokEmail).toBe("legacy@example.com");
    });

    it("encrypts valid credentials, replaces the old token, and marks health healthy", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ token: "fresh-bearer-token" })));

        const result = await asSalesAdmin.action(api.redrokCredentialActions.saveCredentials, {
            email: "  Valid@Example.COM ",
            password: "new-secret-password",
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result).toEqual({ ok: true });
        expect(result).not.toHaveProperty("token");
        expect(company?.redrokEmail).toBe("valid@example.com");
        expect(company?.redrokPassword).toBeUndefined();
        expect(company?.redrokPasswordEncrypted).not.toContain("new-secret-password");
        expect(decryptRedrokPassword(company?.redrokPasswordEncrypted ?? "")).toBe("new-secret-password");
        expect(company?.redrokToken).toBe("fresh-bearer-token");
        expect(company?.redrokToken).not.toBe("old-bearer-token");
        expect(company?.redrokHealthStatus).toBe("healthy");
        expect(company?.redrokLastHealthErrorCode).toBeUndefined();
    });

    it("sends one recovery alert when a manual credential save restores health", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            await ctx.db.patch(ids.adminUserId, {
                inAppNotifications: true,
                emailNotifications: false,
            });
            await ctx.db.patch(ids.companyId, {
                redrokHealthStatus: "auth_invalid",
                redrokLastRecoveryAlertAt: undefined,
            });
        });
        vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ token: "recovery-token" })));

        await asSalesAdmin.action(api.redrokCredentialActions.saveCredentials, {
            email: "restored@example.com",
            password: "restored-secret",
        });
        await asSalesAdmin.action(api.redrokCredentialActions.saveCredentials, {
            email: "restored@example.com",
            password: "restored-secret",
        });
        const state = await t.run(async (ctx) => ({
            company: await ctx.db.get(ids.companyId),
            notifications: await ctx.db
                .query("notifications")
                .withIndex("by_companyId", (q) => q.eq("companyId", ids.companyId))
                .collect(),
        }));

        expect(state.company?.redrokHealthStatus).toBe("healthy");
        expect(state.company?.redrokLastRecoveryAlertAt).toEqual(expect.any(Number));
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0]).toMatchObject({
            userId: ids.adminUserId,
            type: "integration.redrok_recovered",
        });
    });
});

describe("Redrok encrypted credential consumption", () => {
    it.each(["missing key", "corrupt ciphertext"] as const)(
        "returns a sanitized Live-Leads fallback for %s",
        async (failureMode) => {
            const { t, ids, asSalesAdmin } = await seedCredentialUsers();
            const encryptedPassword =
                failureMode === "missing key"
                    ? encryptRedrokPassword("dedicated-secret")
                    : "v1:not-valid-ciphertext";
            await t.run(async (ctx) => {
                await ctx.db.patch(ids.companyId, {
                    redrokPassword: undefined,
                    redrokPasswordEncrypted: encryptedPassword,
                    redrokToken: undefined,
                    redrokTokenExpiresAt: undefined,
                });
                const now = Date.now();
                await ctx.db.insert("ransomIncidents", {
                    companyName: "Fallback Company",
                    domain: "fallback.example",
                    country: "US",
                    attackDate: now - 1_000,
                    incidentType: "ransomware",
                    source: "ransomware_live",
                    createdAt: now,
                    updatedAt: now,
                });
            });
            if (failureMode === "missing key") {
                delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
            }

            const result = await asSalesAdmin.action(api.redrokApi.liveLeads, {
                companyId: ids.companyId,
                days: 30,
            });

            expect(result).toMatchObject({
                success: true,
                source: "ransomware_live_fallback",
                isFallback: true,
                errorCode: "REDROK_CREDENTIALS_UNREADABLE",
                retryable: false,
            });
            expect(JSON.stringify(result)).not.toContain(encryptedPassword);
        },
    );

    it("migrates a legacy plaintext password after successful authentication", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run((ctx) =>
            ctx.db.patch(ids.companyId, {
                redrokPasswordEncrypted: undefined,
                redrokToken: undefined,
                redrokTokenExpiresAt: undefined,
            }),
        );
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(Response.json({ token: "migrated-token" }))
                .mockResolvedValueOnce(Response.json({ countries: [] })),
        );

        const result = await asSalesAdmin.action(api.redrokApi.getCountries, {
            companyId: ids.companyId,
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result.success).toBe(true);
        expect(company?.redrokPassword).toBeUndefined();
        expect(company?.redrokPasswordEncrypted).toEqual(expect.stringMatching(/^v1:/));
        expect(decryptRedrokPassword(company?.redrokPasswordEncrypted ?? "")).toBe("legacy-password");
    });

    it("sanitizes malformed auth JSON while refreshing an expired legacy token", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            await ctx.db.patch(ids.companyId, {
                redrokEmail: "dedicated@example.com",
                redrokPassword: undefined,
                redrokPasswordEncrypted: encryptRedrokPassword("dedicated-secret"),
                redrokToken: "expired-company-token",
                redrokTokenExpiresAt: Date.now() - 1,
            });
        });
        const maliciousBody = '{"token":"legacy-upstream-secret-fragment';
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(maliciousBody, { status: 200 })));

        const result = await asSalesAdmin.action(api.redrokApi.getCountries, {
            companyId: ids.companyId,
        });
        const company = await t.run((ctx) => ctx.db.get(ids.companyId));

        expect(result).toEqual({
            success: false,
            countries: [],
            error: "Redrok returned an invalid authentication response.",
            message: "Redrok returned an invalid authentication response.",
            errorCode: "REDROK_UNKNOWN",
            retryable: true,
        });
        expect(JSON.stringify(result)).not.toContain("legacy-upstream-secret-fragment");
        expect(company?.redrokToken).toBe("expired-company-token");
    });

    it("re-authenticates an expired token with the decrypted company password", async () => {
        const { t, ids, asSalesAdmin } = await seedCredentialUsers();
        await t.run(async (ctx) => {
            await ctx.db.patch(ids.companyId, {
                redrokEmail: "dedicated@example.com",
                redrokPassword: undefined,
                redrokPasswordEncrypted: encryptRedrokPassword("dedicated-secret"),
                redrokToken: "expired-company-token",
                redrokTokenExpiresAt: Date.now() - 1,
            });
        });
        process.env.REDROK_EMAIL = "shared@example.com";
        process.env.REDROK_PASSWORD = "shared-secret";
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ token: "refreshed-company-token" }))
            .mockResolvedValueOnce(Response.json({ countries: [{ val: "us", regions: true }] }));
        vi.stubGlobal("fetch", fetchMock);

        const result = await asSalesAdmin.action(api.redrokApi.getCountries, {
            companyId: ids.companyId,
        });

        expect(result).toEqual({
            success: true,
            countries: [{ val: "us", regions: true }],
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const authRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
        expect(JSON.parse(String(authRequest.body))).toEqual({
            email: "dedicated@example.com",
            password: "dedicated-secret",
            ip: "0.0.0.0",
        });
        expect(String(authRequest.body)).not.toContain("shared-secret");
    });
});

describe("Redrok public action tenant boundaries", () => {
    it("rejects unauthenticated callers before resolving credentials", async () => {
        const { t, ids } = await seedCredentialUsers();
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            t.action(api.redrokApi.getCountries, {
                companyId: ids.companyId,
            }),
        ).rejects.toThrow("not authenticated");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects cross-tenant access across every public Redrok action before upstream calls", async () => {
        const { ids, asOtherAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [], companyData: [], countries: [], countryRegions: [] }));
        vi.stubGlobal("fetch", fetchMock);
        const attempts = [
            [
                api.redrokApi.liveSearch,
                {
                    companyId: ids.companyId,
                    userId: ids.adminUserId,
                    searchId: ids.searchId,
                    domain: "credential.test",
                },
            ],
            [api.redrokApi.liveLeads, { companyId: ids.companyId, days: 30 }],
            [api.redrokApi.getCountries, { companyId: ids.companyId }],
            [api.redrokApi.getRegions, { companyId: ids.companyId, country: "us" }],
            [api.redrokApi.getSearchHistory, { companyId: ids.companyId }],
            [api.redrokApi.getPrevSearchResults, { companyId: ids.companyId, guid: "guid-1" }],
            [api.redrokApi.getCredits, { companyId: ids.companyId }],
            [
                api.redrokApi.rescanDomain,
                {
                    companyId: ids.companyId,
                    watchlistItemId: ids.watchlistItemId,
                    domain: "credential.test",
                },
            ],
            [api.redrokApi.generateReport, { companyId: ids.companyId, domain: "credential.test" }],
        ] as const;

        for (const [redrokAction, args] of attempts) {
            await expect((asOtherAdmin.action as any)(redrokAction, args)).rejects.toThrow("access denied");
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects pending users before resolving credentials", async () => {
        const { ids, asPendingSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asPendingSalesAdmin.action(api.redrokApi.getCountries, {
                companyId: ids.companyId,
            }),
        ).rejects.toThrow("account is not approved");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a Live Search userId belonging to another user", async () => {
        const { ids, asSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesAdmin.action(api.redrokApi.liveSearch, {
                companyId: ids.companyId,
                userId: ids.salesRepUserId,
                searchId: ids.searchId,
                domain: "credential.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a Live Search searchId belonging to another company", async () => {
        const { ids, asSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesAdmin.action(api.redrokApi.liveSearch, {
                companyId: ids.companyId,
                userId: ids.adminUserId,
                searchId: ids.otherSearchId,
                domain: "credential.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a Live Search domain that does not match its search", async () => {
        const { ids, asSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesAdmin.action(api.redrokApi.liveSearch, {
                companyId: ids.companyId,
                userId: ids.adminUserId,
                searchId: ids.searchId,
                domain: "different.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a rescan watchlistItemId belonging to another company", async () => {
        const { ids, asSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesAdmin.action(api.redrokApi.rescanDomain, {
                companyId: ids.companyId,
                watchlistItemId: ids.otherWatchlistItemId,
                domain: "credential.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a public rescan domain that does not match its watchlist item", async () => {
        const { ids, asSalesAdmin } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            asSalesAdmin.action(api.redrokApi.rescanDomain, {
                companyId: ids.companyId,
                watchlistItemId: ids.watchlistItemId,
                domain: "different.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("Redrok internal scheduled scans", () => {
    it("keeps the internal scan path available without a user identity", async () => {
        const { t, ids } = await seedCredentialUsers();
        await t.run((ctx) =>
            ctx.db.patch(ids.companyId, {
                redrokPasswordEncrypted: undefined,
            }),
        );
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        const result = await t.action(internal.redrokApi.rescanDomainInternal, {
            companyId: ids.companyId,
            watchlistItemId: ids.watchlistItemId,
            domain: "  CREDENTIAL.TEST  ",
        });

        expect(result).toEqual({ success: true, exposureCount: 0 });
        const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
        expect(JSON.parse(String(request.body))).toEqual({ domain: "credential.test" });
    });

    it("rejects a scheduled rescan domain that does not match its watchlist item", async () => {
        const { t, ids } = await seedCredentialUsers();
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            t.action(internal.redrokApi.rescanDomainInternal, {
                companyId: ids.companyId,
                watchlistItemId: ids.watchlistItemId,
                domain: "different.test",
            }),
        ).rejects.toThrow("access denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
