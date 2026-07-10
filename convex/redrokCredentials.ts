import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertCompanyAccess, requireAuth, requireRole } from "./lib/auth";
import { decideHealthAlert } from "./lib/redrok/resilience";

const healthStatus = v.union(
    v.literal("unknown"),
    v.literal("healthy"),
    v.literal("auth_invalid"),
    v.literal("credentials_missing"),
    v.literal("rate_limited"),
    v.literal("unavailable"),
);

export function maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return "";
    return `${localPart[0]}***@${domain}`;
}

export function normalizeResourceDomain(domain: string): string {
    return domain.trim().toLowerCase();
}

export const getStatus = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);
        const company = await ctx.db.get(user.companyId);
        if (!company) {
            throw new Error("Company not found");
        }

        const dedicatedConnected = Boolean(company.redrokEmail && (company.redrokPasswordEncrypted || company.redrokPassword));
        const sharedConfigured = Boolean(process.env.REDROK_EMAIL && process.env.REDROK_PASSWORD);
        const connected = dedicatedConnected || sharedConfigured;
        const credentialSource = dedicatedConnected ? (company.redrokCredentialSource ?? "company") : sharedConfigured ? "shared" : null;
        const healthStatus = !connected
            ? "credentials_missing"
            : dedicatedConnected || company.redrokCredentialSource === "shared"
              ? (company.redrokHealthStatus ?? "unknown")
              : "unknown";

        return {
            connected,
            credentialSource,
            emailMasked: dedicatedConnected && company.redrokEmail ? maskEmail(company.redrokEmail) : null,
            healthStatus,
            lastHealthCheckAt: company.redrokLastHealthCheckAt ?? null,
            lastErrorCode: company.redrokLastHealthErrorCode ?? null,
        };
    },
});

export const removeCredentials = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);
        requireRole(user.role, "sales_admin");
        if (user.status !== "approved") {
            throw new Error("Forbidden: account is not approved");
        }

        await ctx.db.patch(user.companyId, {
            redrokEmail: undefined,
            redrokPassword: undefined,
            redrokPasswordEncrypted: undefined,
            redrokToken: undefined,
            redrokTokenExpiresAt: undefined,
            redrokCredentialSource: undefined,
            redrokHealthStatus: "credentials_missing",
            redrokLastHealthCheckAt: Date.now(),
            redrokLastHealthErrorCode: "REDROK_CREDENTIALS_MISSING",
            redrokLastHealthErrorMessage: "Company Redrok credentials are not configured.",
            updatedAt: Date.now(),
        });

        return { ok: true as const };
    },
});

export const requireSalesAdminContext = internalQuery({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);
        requireRole(user.role, "sales_admin");
        if (user.status !== "approved") {
            throw new Error("Forbidden: account is not approved");
        }
        return { companyId: user.companyId };
    },
});

export const authorizePublicAction = internalQuery({
    args: {
        companyId: v.id("companies"),
        userId: v.optional(v.id("users")),
        searchId: v.optional(v.id("searches")),
        watchlistItemId: v.optional(v.id("watchlistItems")),
        domain: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        if (user.status !== "approved") {
            throw new Error("Forbidden: account is not approved");
        }
        assertCompanyAccess(user.companyId, args.companyId);

        if (args.userId && args.userId !== user._id) {
            throw new Error("Forbidden: access denied");
        }

        if (args.searchId) {
            const search = await ctx.db.get(args.searchId);
            if (
                !search ||
                search.companyId !== args.companyId ||
                search.userId !== user._id ||
                (args.userId && search.userId !== args.userId) ||
                !args.domain ||
                normalizeResourceDomain(search.domain) !== normalizeResourceDomain(args.domain)
            ) {
                throw new Error("Forbidden: access denied");
            }
        }

        if (args.watchlistItemId) {
            const item = await ctx.db.get(args.watchlistItemId);
            if (
                !item ||
                item.companyId !== args.companyId ||
                !args.domain ||
                normalizeResourceDomain(item.domain) !== normalizeResourceDomain(args.domain)
            ) {
                throw new Error("Forbidden: access denied");
            }
        }

        return {
            userId: user._id,
            companyId: user.companyId,
            domain: args.domain ? normalizeResourceDomain(args.domain) : undefined,
        };
    },
});

export const validateScheduledScanContext = internalQuery({
    args: {
        companyId: v.id("companies"),
        watchlistItemId: v.id("watchlistItems"),
        domain: v.string(),
    },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.watchlistItemId);
        if (
            !item ||
            item.companyId !== args.companyId ||
            normalizeResourceDomain(item.domain) !== normalizeResourceDomain(args.domain)
        ) {
            throw new Error("Forbidden: access denied");
        }
        return {
            companyId: args.companyId,
            domain: normalizeResourceDomain(args.domain),
        };
    },
});

export const getSecretMaterial = internalQuery({
    args: { companyId: v.id("companies") },
    handler: async (ctx, { companyId }) => {
        const company = await ctx.db.get(companyId);
        if (!company) return null;

        return {
            email: company.redrokEmail,
            encryptedPassword: company.redrokPasswordEncrypted,
            legacyPassword: company.redrokPassword,
            token: company.redrokToken,
            tokenExpiresAt: company.redrokTokenExpiresAt,
            credentialSource: company.redrokCredentialSource,
        };
    },
});

export const getHealthCheckTargets = internalQuery({
    args: { cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const result = await ctx.db.query("companies").paginate({
            cursor: args.cursor ?? null,
            numItems: 10,
        });
        const dedicated: Array<{
            companyId: (typeof result.page)[number]["_id"];
            email: string;
            encryptedPassword?: string;
            legacyPassword?: string;
        }> = [];
        const sharedCompanyIds: Array<(typeof result.page)[number]["_id"]> = [];

        for (const company of result.page) {
            if (company.redrokEmail && (company.redrokPasswordEncrypted || company.redrokPassword)) {
                dedicated.push({
                    companyId: company._id,
                    email: company.redrokEmail,
                    encryptedPassword: company.redrokPasswordEncrypted,
                    legacyPassword: company.redrokPassword,
                });
            } else {
                sharedCompanyIds.push(company._id);
            }
        }

        return {
            dedicated,
            sharedCompanyIds,
            continueCursor: result.continueCursor,
            isDone: result.isDone,
        };
    },
});

export const saveEncryptedCredentials = internalMutation({
    args: {
        companyId: v.id("companies"),
        email: v.string(),
        encryptedPassword: v.string(),
        token: v.string(),
        tokenExpiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const company = await ctx.db.get(args.companyId);
        if (!company) throw new Error("Company not found");
        const alert = decideHealthAlert(
            company.redrokHealthStatus ?? "unknown",
            "healthy",
            company.redrokLastAlertAt,
            company.redrokLastRecoveryAlertAt,
            now,
        );
        await ctx.db.patch(args.companyId, {
            redrokEmail: args.email,
            redrokPassword: undefined,
            redrokPasswordEncrypted: args.encryptedPassword,
            redrokToken: args.token,
            redrokTokenExpiresAt: args.tokenExpiresAt,
            redrokCredentialSource: "company",
            redrokHealthStatus: "healthy",
            redrokLastHealthCheckAt: now,
            redrokLastHealthErrorCode: undefined,
            redrokLastHealthErrorMessage: undefined,
            ...(alert === "recovered" ? { redrokLastAlertAt: undefined } : {}),
            ...(alert === "recovered" ? { redrokLastRecoveryAlertAt: now } : {}),
            updatedAt: now,
        });

        if (alert === "recovered") {
            const users = await ctx.db
                .query("users")
                .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
                .collect();
            for (const user of users) {
                if (user.role !== "sales_admin" || user.status !== "approved" || user.inAppNotifications === false) continue;
                await ctx.db.insert("notifications", {
                    companyId: args.companyId,
                    userId: user._id,
                    type: "integration.redrok_recovered",
                    title: "Redrok integration recovered",
                    message: "CyberHook can connect to Redrok again.",
                    isRead: false,
                    relatedEntityType: "integration",
                    relatedEntityId: "redrok",
                    actionUrl: "/settings?tab=integrations",
                    createdAt: now,
                });
            }
        }

        return { alert };
    },
});

export const migrateLegacyPassword = internalMutation({
    args: {
        companyId: v.id("companies"),
        encryptedPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const company = await ctx.db.get(args.companyId);
        if (!company?.redrokPassword || company.redrokPasswordEncrypted) {
            return { migrated: false as const };
        }

        await ctx.db.patch(args.companyId, {
            redrokPassword: undefined,
            redrokPasswordEncrypted: args.encryptedPassword,
            redrokCredentialSource: "company",
            updatedAt: Date.now(),
        });
        return { migrated: true as const };
    },
});

export const updateHealth = internalMutation({
    args: {
        companyId: v.id("companies"),
        status: healthStatus,
        credentialSource: v.optional(v.union(v.literal("company"), v.literal("shared"))),
        errorCode: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        checkedAt: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.companyId, {
            redrokHealthStatus: args.status,
            ...(args.credentialSource ? { redrokCredentialSource: args.credentialSource } : {}),
            redrokLastHealthCheckAt: args.checkedAt,
            redrokLastHealthErrorCode: args.errorCode,
            redrokLastHealthErrorMessage: args.errorMessage,
            updatedAt: args.checkedAt,
        });
    },
});

export const applyHealthCheck = internalMutation({
    args: {
        companyId: v.id("companies"),
        status: healthStatus,
        credentialSource: v.optional(v.union(v.literal("company"), v.literal("shared"))),
        errorCode: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        checkedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const company = await ctx.db.get(args.companyId);
        if (!company) return { alert: null };

        const previousStatus = company.redrokHealthStatus ?? "unknown";
        const alert = decideHealthAlert(
            previousStatus,
            args.status,
            company.redrokLastAlertAt,
            company.redrokLastRecoveryAlertAt,
            args.checkedAt,
        );

        await ctx.db.patch(args.companyId, {
            redrokHealthStatus: args.status,
            ...(args.credentialSource ? { redrokCredentialSource: args.credentialSource } : {}),
            redrokLastHealthCheckAt: args.checkedAt,
            redrokLastHealthErrorCode: args.errorCode,
            redrokLastHealthErrorMessage: args.errorMessage,
            ...(alert === "unhealthy" ? { redrokLastAlertAt: args.checkedAt } : {}),
            ...(alert === "recovered"
                ? {
                      redrokLastAlertAt: undefined,
                      redrokLastRecoveryAlertAt: args.checkedAt,
                  }
                : {}),
            updatedAt: args.checkedAt,
        });

        if (alert) {
            const admins = await ctx.db
                .query("users")
                .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
                .collect();
            const recipients = admins.filter(
                (user) =>
                    user.role === "sales_admin" &&
                    user.status === "approved" &&
                    user.inAppNotifications !== false,
            );
            const recovered = alert === "recovered";
            for (const recipient of recipients) {
                await ctx.db.insert("notifications", {
                    companyId: args.companyId,
                    userId: recipient._id,
                    type: recovered ? "integration.redrok_recovered" : "integration.redrok_unhealthy",
                    title: recovered ? "Redrok integration recovered" : "Redrok integration needs attention",
                    message: recovered
                        ? "CyberHook can connect to Redrok again."
                        : "CyberHook could not verify the Redrok integration. Review the integration settings.",
                    isRead: false,
                    relatedEntityType: "integration",
                    relatedEntityId: "redrok",
                    actionUrl: "/settings?tab=integrations",
                    createdAt: args.checkedAt,
                });
            }
        }

        return { alert };
    },
});
