/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { getLiveLeadSaveSource, getRedrokStatusPresentation, getRedrokUserMessage } from "../../src/lib/friendly-errors";
import { internal } from "../_generated/api";
import {
    classifyRedrokException,
    classifyRedrokResponse,
    decideHealthAlert,
    mapRansomIncidentToFallbackCompany,
    normalizeFallbackDomain,
    shouldRetryWithFreshToken,
    shouldSendHealthAlert,
} from "../lib/redrok/resilience";
import { authenticateRedrokForLiveLeads, requestRedrokLiveLeads, runLiveLeadsWithFallback } from "../redrokApi";
import { buildRedrokHealthSyncLog, runRedrokHealthChecks } from "../redrokCredentialActions";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("Redrok errors", () => {
    it.each([
        [401, "REDROK_AUTH_INVALID"],
        [403, "REDROK_AUTH_INVALID"],
        [429, "REDROK_RATE_LIMITED"],
        [500, "REDROK_UNAVAILABLE"],
        [503, "REDROK_UNAVAILABLE"],
    ] as const)("maps HTTP %s to %s", (status, code) => {
        expect(classifyRedrokResponse(status).code).toBe(code);
    });

    it("maps AbortError to a timeout", () => {
        const error = new DOMException("timed out", "AbortError");
        expect(classifyRedrokException(error).code).toBe("REDROK_TIMEOUT");
    });

    it("maps fetch network TypeError to unavailable", () => {
        expect(classifyRedrokException(new TypeError("fetch failed"))).toMatchObject({
            code: "REDROK_UNAVAILABLE",
            retryable: true,
        });
    });

    it("retries only a rejected cached token", () => {
        expect(shouldRetryWithFreshToken("REDROK_TOKEN_EXPIRED")).toBe(true);
        expect(shouldRetryWithFreshToken("REDROK_AUTH_INVALID")).toBe(false);
    });
});

describe("Redrok user guidance", () => {
    it("requires an admin reconnect for rejected credentials", () => {
        expect(getRedrokUserMessage("REDROK_AUTH_INVALID", false)).toEqual({
            title: "Redrok needs to be reconnected",
            canRetry: false,
            adminActionRequired: true,
        });
    });

    it("offers retry guidance for a temporary outage", () => {
        expect(getRedrokUserMessage("REDROK_UNAVAILABLE", true)).toEqual({
            title: "Live exposure data is temporarily unavailable",
            canRetry: true,
            adminActionRequired: false,
        });
    });

    it("requires admin action when credentials are missing", () => {
        expect(getRedrokUserMessage("REDROK_CREDENTIALS_MISSING", false)).toEqual({
            title: "Redrok needs to be connected",
            canRetry: false,
            adminActionRequired: true,
        });
    });

    it.each([
        ["REDROK_RATE_LIMITED", "Live exposure data is temporarily rate limited"],
        ["REDROK_TIMEOUT", "Live exposure data took too long to respond"],
        ["REDROK_TOKEN_EXPIRED", "Your Redrok session needs to be refreshed"],
        ["REDROK_UNKNOWN", "Live exposure data could not be loaded"],
    ] as const)("uses structured guidance for %s", (code, title) => {
        expect(getRedrokUserMessage(code, true)).toEqual({
            title,
            canRetry: true,
            adminActionRequired: false,
        });
    });

    it.each([
        ["healthy", true, { label: "Connected", color: "success" }],
        ["unknown", true, { label: "Checking", color: "gray" }],
        ["auth_invalid", true, { label: "Needs attention", color: "error" }],
        ["credentials_missing", false, { label: "Not connected", color: "gray" }],
        ["rate_limited", true, { label: "Degraded", color: "warning" }],
        ["unavailable", true, { label: "Degraded", color: "warning" }],
    ] as const)("maps %s health to its settings badge", (healthStatus, connected, expected) => {
        expect(getRedrokStatusPresentation(healthStatus, connected)).toEqual(expected);
    });

    it("saves fallback discoveries with ransomware provenance", () => {
        expect(getLiveLeadSaveSource(true)).toBe("ransom_hub");
        expect(getLiveLeadSaveSource(false)).toBe("live_leads");
    });
});

describe("ransomware.live fallback", () => {
    it("normalizes domains and preserves honest provenance", () => {
        const row = mapRansomIncidentToFallbackCompany({
            _id: "incident_1",
            companyName: "Example Health",
            domain: "https://www.example.com/news",
            country: "US",
            attackDate: 1000,
            ransomwareGroup: "Example Group",
            sourceUrl: "https://ransomware.live/id/1",
        });

        expect(row.website).toBe("example.com");
        expect(row.source).toBe("ransomware_live_fallback");
        expect(row.size).toBe("");
        expect(row.linkedin_url).toBe("");
        expect(row.attackDate).toBe(1000);
    });

    it("does not invent invalid domains", () => {
        expect(normalizeFallbackDomain("not a domain")).toBe("");
    });

    it("queries only recent ransomware.live incidents with case-insensitive country matching", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();
        await t.run(async (ctx) => {
            const common = {
                domain: "example.com",
                createdAt: now,
                updatedAt: now,
            };
            await ctx.db.insert("ransomIncidents", {
                ...common,
                companyName: "Newest US",
                attackDate: now - 1_000,
                country: "US",
                normalizedCountry: "us",
                incidentType: "ransomware",
                source: "ransomware_live",
            });
            await ctx.db.insert("ransomIncidents", {
                ...common,
                companyName: "Older US",
                attackDate: now - 2_000,
                country: "us",
                normalizedCountry: "us",
                incidentType: "ransomware",
                source: "ransomware_live",
            });
            await ctx.db.insert("ransomIncidents", {
                ...common,
                companyName: "Wrong source",
                attackDate: now - 500,
                country: "US",
                normalizedCountry: "us",
                incidentType: "ransomware",
                source: "hhs_ocr",
            });
            await ctx.db.insert("ransomIncidents", {
                ...common,
                companyName: "Wrong incident type",
                attackDate: now - 500,
                country: "US",
                normalizedCountry: "us",
                incidentType: "breach_notification",
                source: "ransomware_live",
            });
            await ctx.db.insert("ransomIncidents", {
                ...common,
                companyName: "Too old",
                attackDate: now - 31 * 24 * 60 * 60 * 1_000,
                country: "US",
                normalizedCountry: "us",
                incidentType: "ransomware",
                source: "ransomware_live",
            });
        });

        const incidents = await t.query(internal.ransomHub.internalFallbackForLiveLeads, {
            days: 30,
            country: "uS",
        });

        expect(incidents.map((incident) => incident.companyName)).toEqual(["Newest US", "Older US"]);
    });

    it("returns indexed country matches despite more than 500 newer other-country rows", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();
        await t.run(async (ctx) => {
            for (let index = 0; index < 501; index += 1) {
                await ctx.db.insert("ransomIncidents", {
                    companyName: `Newer CA ${index}`,
                    country: "CA",
                    normalizedCountry: "ca",
                    attackDate: now - index,
                    incidentType: "ransomware",
                    source: "ransomware_live",
                    createdAt: now,
                    updatedAt: now,
                });
            }
            await ctx.db.insert("ransomIncidents", {
                companyName: "Older US outside candidate bound",
                country: "US",
                normalizedCountry: "us",
                attackDate: now - 1_000,
                incidentType: "ransomware",
                source: "ransomware_live",
                createdAt: now,
                updatedAt: now,
            });
        });

        const incidents = await t.query(internal.ransomHub.internalFallbackForLiveLeads, {
            days: 30,
            country: "US",
        });

        expect(incidents.map((incident) => incident.companyName)).toEqual(["Older US outside candidate bound"]);
    });

    it("normalizes country values in single and bulk ingestion paths", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();

        const singleId = await t.mutation(internal.ransomHub.internalCreate, {
            companyName: "Single Country",
            country: "  United   STATES ",
            attackDate: now,
            incidentType: "ransomware",
            source: "ransomware_live",
        });
        const [bulkId] = await t.mutation(internal.ransomHub.internalBulkCreate, {
            incidents: [
                {
                    companyName: "Bulk Country",
                    country: "uS",
                    attackDate: now - 1,
                    incidentType: "ransomware",
                    source: "ransomware_live",
                },
            ],
        });
        const rows = await t.run(async (ctx) => ({
            single: await ctx.db.get(singleId),
            bulk: await ctx.db.get(bulkId),
        }));

        expect(rows.single?.normalizedCountry).toBe("united states");
        expect(rows.bulk?.normalizedCountry).toBe("us");
    });

    it("normalizes legacy duplicates encountered by single and bulk ingestion", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();
        const [singleId, bulkId] = await t.run(async (ctx) => [
            await ctx.db.insert("ransomIncidents", {
                companyName: "Single Legacy Duplicate",
                country: " US ",
                attackDate: now,
                incidentType: "ransomware",
                source: "ransomware_live",
                createdAt: now,
                updatedAt: now,
            }),
            await ctx.db.insert("ransomIncidents", {
                companyName: "Bulk Legacy Duplicate",
                country: " Canada ",
                attackDate: now - 1,
                incidentType: "ransomware",
                source: "ransomware_live",
                createdAt: now,
                updatedAt: now,
            }),
        ]);

        await t.mutation(internal.ransomHub.internalCreate, {
            companyName: "Single Legacy Duplicate",
            country: " US ",
            attackDate: now,
            incidentType: "ransomware",
            source: "ransomware_live",
        });
        await t.mutation(internal.ransomHub.internalBulkCreate, {
            incidents: [
                {
                    companyName: "Bulk Legacy Duplicate",
                    country: " Canada ",
                    attackDate: now - 1,
                    incidentType: "ransomware",
                    source: "ransomware_live",
                },
            ],
        });
        const rows = await t.run(async (ctx) => Promise.all([ctx.db.get(singleId), ctx.db.get(bulkId)]));

        expect(rows.map((row) => row?.normalizedCountry)).toEqual(["us", "canada"]);
    });

    it("backfills normalized countries in bounded resumable pages", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();
        const ids = await t.run(async (ctx) => [
            await ctx.db.insert("ransomIncidents", {
                companyName: "Legacy US",
                country: " US ",
                attackDate: now,
                incidentType: "ransomware",
                source: "ransomware_live",
                createdAt: now,
                updatedAt: now,
            }),
            await ctx.db.insert("ransomIncidents", {
                companyName: "Legacy CA",
                country: "Canada",
                attackDate: now - 1,
                incidentType: "ransomware",
                source: "ransomware_live",
                createdAt: now,
                updatedAt: now,
            }),
        ]);

        const result = await t.mutation((internal.ransomHub as any).backfillNormalizedCountries, {});
        const rows = await t.run(async (ctx) => Promise.all(ids.map((id) => ctx.db.get(id))));

        expect(result).toMatchObject({ processed: 2, updated: 2, isDone: true });
        expect(rows.map((row) => row?.normalizedCountry)).toEqual(["us", "canada"]);
    });
});

describe("Live Leads resilience", () => {
    it("classifies authentication rejection separately from bearer expiry", async () => {
        const response = await authenticateRedrokForLiveLeads("sales@example.com", "wrong", async () => new Response("", { status: 401 }));

        expect(response).toMatchObject({
            ok: false,
            code: "REDROK_AUTH_INVALID",
            retryable: false,
        });
    });

    it("sanitizes malformed Live-Leads authentication JSON", async () => {
        const maliciousBody = '{"token":"live-leads-secret-fragment';
        const response = await authenticateRedrokForLiveLeads("sales@example.com", "secret", async () => new Response(maliciousBody, { status: 200 }));

        expect(response).toEqual({
            ok: false,
            code: "REDROK_UNKNOWN",
            retryable: true,
            message: "Redrok returned an invalid authentication response.",
        });
        expect(JSON.stringify(response)).not.toContain("live-leads-secret-fragment");
    });

    it("times out Live-Leads requests and classifies the abort", async () => {
        const fetcher: typeof fetch = async (_input, init) =>
            await new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    reject(new DOMException("timed out", "AbortError"));
                });
            });

        const response = await requestRedrokLiveLeads("token", { days: 30, country: "", region: "" }, "fresh", fetcher, 1);

        expect(response).toMatchObject({
            ok: false,
            code: "REDROK_TIMEOUT",
            retryable: true,
        });
    });

    it("classifies a bearer 401 as cached-token expiry", async () => {
        const response = await requestRedrokLiveLeads(
            "cached-token",
            { days: 30, country: "", region: "" },
            "cached",
            async () => new Response("", { status: 401 }),
        );

        expect(response).toMatchObject({
            ok: false,
            code: "REDROK_TOKEN_EXPIRED",
            retryable: true,
        });
    });

    it("classifies a bearer 401 after fresh authentication as invalid auth", async () => {
        const response = await requestRedrokLiveLeads(
            "fresh-token",
            { days: 30, country: "", region: "" },
            "fresh",
            async () => new Response("", { status: 401 }),
        );

        expect(response).toMatchObject({
            ok: false,
            code: "REDROK_AUTH_INVALID",
            retryable: false,
        });
    });

    it("labels a successful Redrok response with its source", async () => {
        const response = await runLiveLeadsWithFallback(
            {
                days: 30,
                credentials: {
                    email: "sales@example.com",
                    password: "secret",
                },
            },
            {
                authenticate: async () => ({ ok: true, token: "fresh-token" }),
                fetchLiveLeads: async () => ({
                    ok: true,
                    data: {
                        result: true,
                        count: 1,
                        companyData: [
                            {
                                id: "redrok-1",
                                name: "Example Corp",
                                country: "US",
                                website: "example.com",
                                size: "51-200",
                                founded: 2020,
                                locality: "Austin",
                                industry: "Technology",
                                linkedin_url: "https://linkedin.com/company/example",
                                region: "Texas",
                                state_location: null,
                            },
                        ],
                        message: "OK",
                    },
                }),
                loadFallback: async () => [],
                saveToken: async () => undefined,
                now: () => 1_000,
            },
        );

        expect(response).toMatchObject({
            success: true,
            count: 1,
            source: "redrok",
            isFallback: false,
            message: "OK",
        });
        expect(response.companies[0]).toMatchObject({ id: "redrok-1", name: "Example Corp" });
    });

    it("returns provenance-rich fallback rows when Redrok rejects credentials", async () => {
        const fallbackRow = mapRansomIncidentToFallbackCompany({
            _id: "incident_1",
            companyName: "Fallback Health",
            domain: "fallback.example",
            country: "US",
            attackDate: 1_000,
            ransomwareGroup: "Example Group",
            sourceUrl: "https://ransomware.live/id/1",
        });

        const response = await runLiveLeadsWithFallback(
            {
                days: 30,
                country: "us",
                credentials: {
                    email: "sales@example.com",
                    password: "wrong",
                },
            },
            {
                authenticate: async () => ({
                    ok: false,
                    code: "REDROK_AUTH_INVALID",
                    retryable: false,
                    message: "Redrok credentials were rejected.",
                }),
                fetchLiveLeads: async () => {
                    throw new Error("must not fetch with invalid credentials");
                },
                loadFallback: async () => [fallbackRow],
                saveToken: async () => undefined,
                now: () => 1_000,
            },
        );

        expect(response).toMatchObject({
            success: true,
            count: 1,
            source: "ransomware_live_fallback",
            isFallback: true,
            errorCode: "REDROK_AUTH_INVALID",
            retryable: false,
            message: "Limited public ransomware data — not credential-exposure results.",
        });
        expect(response.companies).toEqual([fallbackRow]);
        expect(response.companies[0]).toMatchObject({
            size: "",
            locality: "",
            linkedin_url: "",
            founded: null,
            sourceUrl: "https://ransomware.live/id/1",
        });
    });

    it("classifies missing credentials before attempting authentication", async () => {
        const fallbackRow = mapRansomIncidentToFallbackCompany({
            _id: "incident_missing",
            companyName: "Public Incident",
            attackDate: 1_000,
        });
        let authenticationCalls = 0;

        const response = await runLiveLeadsWithFallback(
            {
                days: 30,
                credentials: {},
            },
            {
                authenticate: async () => {
                    authenticationCalls += 1;
                    return { ok: true, token: "unexpected" };
                },
                fetchLiveLeads: async () => {
                    throw new Error("must not fetch without credentials");
                },
                loadFallback: async () => [fallbackRow],
                saveToken: async () => undefined,
                now: () => 1_000,
            },
        );

        expect(authenticationCalls).toBe(0);
        expect(response).toMatchObject({
            success: true,
            source: "ransomware_live_fallback",
            isFallback: true,
            errorCode: "REDROK_CREDENTIALS_MISSING",
            retryable: false,
        });
    });

    it("returns the structured Redrok failure when fallback has no incidents", async () => {
        const response = await runLiveLeadsWithFallback(
            {
                days: 30,
                credentials: {
                    email: "sales@example.com",
                    password: "wrong",
                },
            },
            {
                authenticate: async () => ({
                    ok: false,
                    code: "REDROK_AUTH_INVALID",
                    retryable: false,
                    message: "Redrok credentials were rejected.",
                }),
                fetchLiveLeads: async () => {
                    throw new Error("must not fetch with invalid credentials");
                },
                loadFallback: async () => [],
                saveToken: async () => undefined,
                now: () => 1_000,
            },
        );

        expect(response).toEqual({
            success: false,
            count: 0,
            companies: [],
            message: "Redrok credentials were rejected.",
            source: "none",
            isFallback: false,
            errorCode: "REDROK_AUTH_INVALID",
            retryable: false,
            error: "Redrok credentials were rejected.",
        });
    });

    it("retries a rejected cached token exactly once after authenticating", async () => {
        let authenticationCalls = 0;
        const requestedTokens: string[] = [];
        const requestedTokenSources: string[] = [];
        const savedTokens: string[] = [];

        const response = await runLiveLeadsWithFallback(
            {
                days: 7,
                credentials: {
                    email: "sales@example.com",
                    password: "secret",
                    cachedToken: "cached-token",
                    cachedTokenExpiresAt: 2_000,
                },
            },
            {
                authenticate: async () => {
                    authenticationCalls += 1;
                    return { ok: true, token: "fresh-token" };
                },
                fetchLiveLeads: async (token, _filters, tokenSource) => {
                    requestedTokens.push(token);
                    requestedTokenSources.push(tokenSource);
                    if (token === "cached-token") {
                        return {
                            ok: false,
                            code: "REDROK_TOKEN_EXPIRED",
                            retryable: true,
                            message: "Redrok rejected the cached token.",
                        };
                    }
                    return {
                        ok: true,
                        data: {
                            result: true,
                            companyData: [],
                            message: "OK",
                        },
                    };
                },
                loadFallback: async () => [],
                saveToken: async (token) => {
                    savedTokens.push(token);
                },
                now: () => 1_000,
            },
        );

        expect(response.source).toBe("redrok");
        expect(authenticationCalls).toBe(1);
        expect(requestedTokens).toEqual(["cached-token", "fresh-token"]);
        expect(requestedTokenSources).toEqual(["cached", "fresh"]);
        expect(savedTokens).toEqual(["fresh-token"]);
    });
});

describe("health alert deduplication", () => {
    it("alerts on the first unhealthy check", () => {
        expect(decideHealthAlert("unknown", "auth_invalid", undefined, undefined, 1_000)).toBe("unhealthy");
    });

    it("alerts on a healthy to unhealthy transition", () => {
        expect(shouldSendHealthAlert("healthy", "auth_invalid", undefined, 1000)).toBe(true);
    });

    it("suppresses repeated alerts for 24 hours", () => {
        expect(decideHealthAlert("auth_invalid", "auth_invalid", 1_000, undefined, 1_000 + 23 * 60 * 60 * 1_000)).toBeNull();
        expect(shouldSendHealthAlert("auth_invalid", "auth_invalid", 1000, 1000 + 23 * 60 * 60 * 1000)).toBe(false);
        expect(shouldSendHealthAlert("auth_invalid", "auth_invalid", 1000, 1000 + 25 * 60 * 60 * 1000)).toBe(true);
    });

    it("repeats an unhealthy alert after 24 hours", () => {
        expect(decideHealthAlert("auth_invalid", "auth_invalid", 1_000, undefined, 1_000 + 25 * 60 * 60 * 1_000)).toBe("unhealthy");
    });

    it("alerts once when unhealthy health recovers", () => {
        expect(decideHealthAlert("unavailable", "healthy", 1_000, undefined, 2_000)).toBe("recovered");
        expect(decideHealthAlert("healthy", "healthy", 1_000, 2_000, 3_000)).toBeNull();
    });

    it("does nothing when health remains healthy", () => {
        expect(decideHealthAlert("healthy", "healthy", undefined, undefined, 1_000)).toBeNull();
    });

    it("suppresses a different unhealthy category within 24 hours", () => {
        expect(shouldSendHealthAlert("auth_invalid", "unavailable", 1000, 1000 + 23 * 60 * 60 * 1000)).toBe(false);
    });
});

describe("Redrok health orchestration", () => {
    it("keeps health counts out of sync-log row counters", () => {
        expect(buildRedrokHealthSyncLog({ healthy: 4, unhealthy: 0, checked: 4 })).toEqual({
            success: true,
            stored: 0,
            skipped: 0,
            errorMessage: undefined,
        });
        expect(buildRedrokHealthSyncLog({ healthy: 2, unhealthy: 2, checked: 4 })).toEqual({
            success: false,
            stored: 0,
            skipped: 0,
            errorMessage: "2 of 4 Redrok credential checks were unhealthy.",
        });
    });

    it("checks dedicated credentials sequentially and shared credentials once", async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        let sharedChecks = 0;
        const persisted: Array<{ companyId: string; status: string }> = [];

        const summary = await runRedrokHealthChecks(
            {
                dedicated: [
                    { companyId: "company_1", email: "one@example.com", password: "one" },
                    { companyId: "company_2", email: "two@example.com", password: "two" },
                ],
                sharedCompanyIds: ["company_3", "company_4"],
            },
            {
                checkCredentials: async () => {
                    inFlight += 1;
                    maxInFlight = Math.max(maxInFlight, inFlight);
                    await Promise.resolve();
                    inFlight -= 1;
                    return { status: "healthy" as const };
                },
                checkSharedCredentials: async () => {
                    sharedChecks += 1;
                    return {
                        status: "unavailable" as const,
                        errorCode: "REDROK_UNAVAILABLE",
                        errorMessage: "Redrok is temporarily unavailable.",
                    };
                },
                persistHealth: async (companyId, result) => {
                    persisted.push({ companyId, status: result.status });
                },
            },
        );

        expect(maxInFlight).toBe(1);
        expect(sharedChecks).toBe(1);
        expect(persisted).toEqual([
            { companyId: "company_1", status: "healthy" },
            { companyId: "company_2", status: "healthy" },
            { companyId: "company_3", status: "unavailable" },
            { companyId: "company_4", status: "unavailable" },
        ]);
        expect(summary).toEqual({ healthy: 2, unhealthy: 2, checked: 4 });
    });

    it("paces every auth boundary and retries rate-limited dedicated and shared checks once", async () => {
        const events: string[] = [];
        let firstChecks = 0;
        let sharedChecks = 0;
        const persisted: Array<{ companyId: string; status: string }> = [];

        await runRedrokHealthChecks(
            {
                dedicated: [
                    { companyId: "company_1", email: "one@example.com", password: "one" },
                    { companyId: "company_2", email: "two@example.com", password: "two" },
                ],
                sharedCompanyIds: ["company_3"],
            },
            {
                checkCredentials: async (email) => {
                    events.push(`check:${email}`);
                    if (email === "one@example.com" && firstChecks++ === 0) {
                        return { status: "rate_limited" as const };
                    }
                    return email === "two@example.com" ? { status: "unavailable" as const } : { status: "healthy" as const };
                },
                checkSharedCredentials: async () => {
                    sharedChecks += 1;
                    events.push("check:shared");
                    return sharedChecks === 1 ? { status: "rate_limited" as const } : { status: "healthy" as const };
                },
                persistHealth: async (companyId, result) => {
                    persisted.push({ companyId, status: result.status });
                },
                sleep: async (milliseconds) => {
                    events.push(`sleep:${milliseconds}`);
                },
            },
            { pacingMs: 250, rateLimitBackoffMs: 1_000 },
        );

        expect(events).toEqual([
            "check:one@example.com",
            "sleep:1000",
            "check:one@example.com",
            "sleep:250",
            "check:two@example.com",
            "sleep:250",
            "check:shared",
            "sleep:1000",
            "check:shared",
        ]);
        expect(sharedChecks).toBe(2);
        expect(persisted).toContainEqual({ companyId: "company_3", status: "healthy" });
        expect(persisted).not.toContainEqual({ companyId: "company_3", status: "rate_limited" });
    });
});
