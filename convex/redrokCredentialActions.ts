"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import {
    type RedrokAuthenticationResult,
    authenticateRedrokRequest,
} from "./lib/redrok/auth";
import { decryptRedrokPassword, encryptRedrokPassword } from "./lib/redrok/crypto";
import {
    type RedrokFailure,
    type RedrokHealthStatus,
} from "./lib/redrok/resilience";

const TOKEN_EXPIRY_MS = 55 * 60 * 1000;
const HEALTH_CHECK_PACING_MS = 250;
const RATE_LIMIT_BACKOFF_MS = 1_000;
const healthResultValidator = v.object({
    status: v.union(
        v.literal("healthy"),
        v.literal("auth_invalid"),
        v.literal("credentials_missing"),
        v.literal("rate_limited"),
        v.literal("unavailable"),
    ),
    credentialSource: v.optional(v.union(v.literal("company"), v.literal("shared"))),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
});

type AuthenticationResult = RedrokAuthenticationResult;

type StoredCredentialMaterial = {
    email?: string;
    encryptedPassword?: string;
    legacyPassword?: string;
    token?: string;
    tokenExpiresAt?: number;
};

type ResolvedCredentials = {
    redrokEmail?: string;
    redrokPassword?: string;
    redrokToken?: string;
    redrokTokenExpiresAt?: number;
    source: "company" | "shared";
    usesLegacyPassword?: boolean;
    failure?: RedrokFailure;
};

export type RedrokHealthResult = {
    status: Exclude<RedrokHealthStatus, "unknown">;
    credentialSource?: "company" | "shared";
    errorCode?: string;
    errorMessage?: string;
};

export function buildRedrokHealthSyncLog(summary: {
    healthy: number;
    unhealthy: number;
    checked: number;
}): {
    success: boolean;
    stored: number;
    skipped: number;
    errorMessage: string | undefined;
} {
    return {
        success: summary.unhealthy === 0,
        stored: 0,
        skipped: 0,
        errorMessage:
            summary.unhealthy > 0
                ? `${summary.unhealthy} of ${summary.checked} Redrok credential checks were unhealthy.`
                : undefined,
    };
}

export async function runRedrokHealthChecks<TCompanyId>(
    targets: {
        dedicated: Array<{ companyId: TCompanyId; email: string; password: string }>;
        sharedCompanyIds: TCompanyId[];
    },
    dependencies: {
        checkCredentials: (email: string, password: string, companyId: TCompanyId) => Promise<RedrokHealthResult>;
        checkSharedCredentials: () => Promise<RedrokHealthResult>;
        persistHealth: (companyId: TCompanyId, result: RedrokHealthResult) => Promise<void>;
        sleep?: (milliseconds: number) => Promise<void>;
    },
    options: { pacingMs?: number; rateLimitBackoffMs?: number } = {},
): Promise<{ healthy: number; unhealthy: number; checked: number }> {
    let healthy = 0;
    let unhealthy = 0;
    const sleep = dependencies.sleep ?? (async () => undefined);
    const pacingMs = options.pacingMs ?? 0;
    const rateLimitBackoffMs = options.rateLimitBackoffMs ?? 0;

    const persist = async (companyId: TCompanyId, result: RedrokHealthResult) => {
        await dependencies.persistHealth(companyId, result);
        if (result.status === "healthy") healthy += 1;
        else unhealthy += 1;
    };

    for (const [index, target] of targets.dedicated.entries()) {
        let result = await dependencies.checkCredentials(target.email, target.password, target.companyId);
        if (result.status === "rate_limited") {
            await sleep(rateLimitBackoffMs);
            result = await dependencies.checkCredentials(target.email, target.password, target.companyId);
        }
        await persist(target.companyId, result);
        if (index < targets.dedicated.length - 1) {
            await sleep(pacingMs);
        }
    }

    if (targets.sharedCompanyIds.length > 0) {
        if (targets.dedicated.length > 0) {
            await sleep(pacingMs);
        }
        let sharedResult = await dependencies.checkSharedCredentials();
        if (sharedResult.status === "rate_limited") {
            await sleep(rateLimitBackoffMs);
            sharedResult = await dependencies.checkSharedCredentials();
        }
        for (const companyId of targets.sharedCompanyIds) {
            await persist(companyId, sharedResult);
        }
    }

    return { healthy, unhealthy, checked: healthy + unhealthy };
}

function authenticationToHealth(result: AuthenticationResult): RedrokHealthResult {
    if (result.ok) return { status: "healthy" };
    if (result.code === "REDROK_AUTH_INVALID") {
        return { status: "auth_invalid", errorCode: result.code, errorMessage: result.message };
    }
    if (result.code === "REDROK_CREDENTIALS_MISSING") {
        return { status: "credentials_missing", errorCode: result.code, errorMessage: result.message };
    }
    if (result.code === "REDROK_RATE_LIMITED") {
        return { status: "rate_limited", errorCode: result.code, errorMessage: result.message };
    }
    return { status: "unavailable", errorCode: result.code, errorMessage: result.message };
}

function missingCredentialsHealth(): RedrokHealthResult {
    return {
        status: "credentials_missing",
        errorCode: "REDROK_CREDENTIALS_MISSING",
        errorMessage: "Redrok credentials are not configured.",
    };
}

export async function authenticateRedrok(email: string, password: string, fetcher: typeof fetch = fetch): Promise<AuthenticationResult> {
    return await authenticateRedrokRequest(email, password, fetcher);
}

function sanitizeAuthenticationResult(result: AuthenticationResult) {
    if (result.ok) return { ok: true as const };
    return {
        ok: false as const,
        code: result.code,
        retryable: result.retryable,
        message: result.message,
    };
}

export const resolveCredentials = internalAction({
    args: { companyId: v.id("companies") },
    handler: async (ctx, { companyId }): Promise<ResolvedCredentials | null> => {
        const stored: StoredCredentialMaterial | null = await ctx.runQuery(internal.redrokCredentials.getSecretMaterial, { companyId });
        if (!stored) {
            return null;
        }

        if (stored.email && stored.encryptedPassword) {
            let password: string;
            try {
                password = decryptRedrokPassword(stored.encryptedPassword);
            } catch {
                return {
                    redrokEmail: stored.email,
                    source: "company" as const,
                    failure: {
                        code: "REDROK_CREDENTIALS_UNREADABLE",
                        retryable: false,
                        message: "Stored Redrok credentials could not be read. Reconnect the integration.",
                    },
                };
            }
            return {
                redrokEmail: stored.email,
                redrokPassword: password,
                redrokToken: stored.token,
                redrokTokenExpiresAt: stored.tokenExpiresAt,
                source: "company" as const,
            };
        }

        if (stored.email && stored.legacyPassword) {
            return {
                redrokEmail: stored.email,
                redrokPassword: stored.legacyPassword,
                redrokToken: stored.token,
                redrokTokenExpiresAt: stored.tokenExpiresAt,
                source: "company" as const,
                usesLegacyPassword: true,
            };
        }

        const email = process.env.REDROK_EMAIL;
        const password = process.env.REDROK_PASSWORD;
        return {
            redrokEmail: email,
            redrokPassword: password,
            redrokToken: stored.token,
            redrokTokenExpiresAt: stored.tokenExpiresAt,
            source: "shared" as const,
        };
    },
});

export const migrateLegacyPassword = internalAction({
    args: {
        companyId: v.id("companies"),
        password: v.string(),
    },
    handler: async (ctx, args): Promise<{ migrated: boolean }> => {
        return await ctx.runMutation(internal.redrokCredentials.migrateLegacyPassword, {
            companyId: args.companyId,
            encryptedPassword: encryptRedrokPassword(args.password),
        });
    },
});

export const testCredentials = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        await ctx.runQuery(internal.redrokCredentials.requireSalesAdminContext, {});
        const result = await authenticateRedrok(args.email.trim().toLowerCase(), args.password);
        return sanitizeAuthenticationResult(result);
    },
});

export const saveCredentials = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.redrokCredentials.requireSalesAdminContext, {});
        const email = args.email.trim().toLowerCase();
        const result = await authenticateRedrok(email, args.password);
        if (!result.ok) return sanitizeAuthenticationResult(result);

        const transition: { alert: "unhealthy" | "recovered" | null } = await ctx.runMutation(
            internal.redrokCredentials.saveEncryptedCredentials,
            {
                companyId: user.companyId,
                email,
                encryptedPassword: encryptRedrokPassword(args.password),
                token: result.token,
                tokenExpiresAt: Date.now() + TOKEN_EXPIRY_MS,
            },
        );
        if (transition.alert === "recovered") {
            await ctx.scheduler.runAfter(0, internal.emails.sendRedrokHealthAlertInternal, {
                companyId: user.companyId,
                status: "recovered",
            });
        }

        return { ok: true as const };
    },
});

type HealthBatchState = {
    cursor?: string;
    startedAt: number;
    healthy: number;
    unhealthy: number;
    checked: number;
    sharedResult?: RedrokHealthResult;
};

async function processHealthCheckBatch(
    ctx: any,
    state: HealthBatchState,
): Promise<{ healthy: number; unhealthy: number; checked: number }> {
        const targets: {
            dedicated: Array<{
                companyId: Id<"companies">;
                email: string;
                encryptedPassword?: string;
                legacyPassword?: string;
            }>;
            sharedCompanyIds: Array<Id<"companies">>;
            continueCursor: string;
            isDone: boolean;
        } = await ctx.runQuery(internal.redrokCredentials.getHealthCheckTargets, {
            cursor: state.cursor,
        });
        const legacyCompanyIds = new Set(
            targets.dedicated
                .filter((target) => !target.encryptedPassword && target.legacyPassword)
                .map((target) => String(target.companyId)),
        );
        const unreadableCompanyIds = new Set<string>();

        const summary = await runRedrokHealthChecks(
            {
                dedicated: targets.dedicated.map((target) => {
                    let password = target.legacyPassword ?? "";
                    if (target.encryptedPassword) {
                        try {
                            password = decryptRedrokPassword(target.encryptedPassword);
                        } catch {
                            unreadableCompanyIds.add(String(target.companyId));
                            password = "";
                        }
                    }
                    return { companyId: target.companyId, email: target.email, password };
                }),
                sharedCompanyIds: targets.sharedCompanyIds,
            },
            {
                checkCredentials: async (email, password, companyId) => {
                    if (unreadableCompanyIds.has(String(companyId))) {
                        return {
                            status: "auth_invalid" as const,
                            credentialSource: "company" as const,
                            errorCode: "REDROK_CREDENTIALS_UNREADABLE",
                            errorMessage: "Stored Redrok credentials could not be read. Reconnect the integration.",
                        };
                    }
                    const authentication = password ? await authenticateRedrok(email, password) : null;
                    if (authentication?.ok && legacyCompanyIds.has(String(companyId))) {
                        try {
                            await ctx.runMutation(internal.redrokCredentials.migrateLegacyPassword, {
                                companyId,
                                encryptedPassword: encryptRedrokPassword(password),
                            });
                        } catch {
                            // Migration is opportunistic; a successful health check remains valid.
                        }
                    }
                    return {
                        ...(authentication ? authenticationToHealth(authentication) : missingCredentialsHealth()),
                        credentialSource: "company" as const,
                    };
                },
                checkSharedCredentials: async () => {
                    if (state.sharedResult) return state.sharedResult;
                    const email = process.env.REDROK_EMAIL?.trim().toLowerCase();
                    const password = process.env.REDROK_PASSWORD;
                    const result = {
                        ...(!email || !password
                            ? missingCredentialsHealth()
                            : authenticationToHealth(await authenticateRedrok(email, password))),
                        credentialSource: "shared" as const,
                    };
                    state.sharedResult = result;
                    return result;
                },
                persistHealth: async (companyId, result) => {
                    const checkedAt = Date.now();
                    const transition: { alert: "unhealthy" | "recovered" | null } = await ctx.runMutation(
                        internal.redrokCredentials.applyHealthCheck,
                        {
                            companyId,
                            status: result.status,
                            credentialSource: result.credentialSource,
                            errorCode: result.errorCode,
                            errorMessage: result.errorMessage,
                            checkedAt,
                        },
                    );
                    if (transition.alert) {
                        await ctx.scheduler.runAfter(0, internal.emails.sendRedrokHealthAlertInternal, {
                            companyId,
                            status: transition.alert,
                            errorCode: transition.alert === "unhealthy" ? result.errorCode : undefined,
                        });
                    }
                },
                sleep: async (milliseconds) => {
                    await new Promise((resolve) => setTimeout(resolve, milliseconds));
                },
            },
            {
                pacingMs: HEALTH_CHECK_PACING_MS,
                rateLimitBackoffMs: RATE_LIMIT_BACKOFF_MS,
            },
        );

        const accumulated = {
            healthy: state.healthy + summary.healthy,
            unhealthy: state.unhealthy + summary.unhealthy,
            checked: state.checked + summary.checked,
        };
        if (!targets.isDone) {
            await ctx.scheduler.runAfter(0, internal.redrokCredentialActions.healthCheckBatch, {
                cursor: targets.continueCursor,
                startedAt: state.startedAt,
                ...accumulated,
                sharedResult: state.sharedResult,
            });
            return summary;
        }

        const finishedAt = Date.now();
        await ctx.runMutation(internal.syncLogs.record, {
            source: "redrok_auth",
            startedAt: state.startedAt,
            finishedAt,
            ...buildRedrokHealthSyncLog(accumulated),
        });
        return accumulated;
}

export const healthCheckAll = internalAction({
    args: {},
    handler: async (ctx): Promise<{ healthy: number; unhealthy: number; checked: number }> => {
        return await processHealthCheckBatch(ctx, {
            startedAt: Date.now(),
            healthy: 0,
            unhealthy: 0,
            checked: 0,
        });
    },
});

export const healthCheckBatch = internalAction({
    args: {
        cursor: v.string(),
        startedAt: v.number(),
        healthy: v.number(),
        unhealthy: v.number(),
        checked: v.number(),
        sharedResult: v.optional(healthResultValidator),
    },
    handler: async (ctx, args): Promise<{ healthy: number; unhealthy: number; checked: number }> => {
        return await processHealthCheckBatch(ctx, args);
    },
});
