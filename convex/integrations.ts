import { v } from "convex/values";
import {
    internalMutation,
    internalQuery,
    mutation,
    query,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Phase 7: third-party OAuth integrations.
 *
 * Tokens are stored encrypted (AES-256-GCM) at the application layer
 * before they reach Convex — see `src/lib/integrations/crypto.ts` and the
 * mirror at `convex/lib/crypto.ts`. The encrypted blob is opaque to
 * Convex; only Convex Node actions (which can load the encryption key
 * from env) can decrypt it.
 *
 * The client-visible shape (`SafeIntegration` below) deliberately omits
 * the encrypted token fields so a stolen Convex read token can't be used
 * to exfiltrate refresh tokens for downstream replay.
 */

type Provider =
    | "stripe"
    | "outlook_email"
    | "gmail"
    | "outlook_calendar"
    | "google_calendar"
    | "hubspot"
    | "ghl"
    | "teams"
    | "slack"
    | "linkedin"
    | "connectwise";

const PROVIDER = v.union(
    v.literal("stripe"),
    v.literal("outlook_email"),
    v.literal("gmail"),
    v.literal("outlook_calendar"),
    v.literal("google_calendar"),
    v.literal("hubspot"),
    v.literal("ghl"),
    v.literal("teams"),
    v.literal("slack"),
    v.literal("linkedin"),
    v.literal("connectwise"),
);

// ─── Queries (client-visible) ────────────────────────────────────────────────

/**
 * Lists every integration record for a company. Token fields are stripped
 * before the data leaves the server — callers only see status/identity
 * metadata, never the encrypted blobs.
 */
export const listByCompany = query({
    args: { companyId: v.id("companies") },
    handler: async (ctx, args) => {
        const me = await requireAuth(ctx);
        if (me.companyId !== args.companyId) {
            throw new Error("Forbidden: cannot read another company's integrations");
        }

        const rows = await ctx.db
            .query("integrations")
            .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
            .collect();

        return rows.map((r) => ({
            _id: r._id,
            provider: r.provider,
            status: r.status,
            accountEmail: r.accountEmail,
            accountId: r.accountId,
            metadata: r.metadata,
            connectedByUserId: r.connectedByUserId,
            connectedAt: r.connectedAt,
            updatedAt: r.updatedAt,
            tokenExpiresAt: r.tokenExpiresAt,
        }));
    },
});

/** Lookup a single integration by company + provider. Tokens stripped. */
export const getByProvider = query({
    args: {
        companyId: v.id("companies"),
        provider: PROVIDER,
    },
    handler: async (ctx, args) => {
        const me = await requireAuth(ctx);
        if (me.companyId !== args.companyId) {
            throw new Error("Forbidden");
        }
        const row = await ctx.db
            .query("integrations")
            .withIndex("by_companyId_provider", (q) =>
                q.eq("companyId", args.companyId).eq("provider", args.provider),
            )
            .first();
        if (!row) return null;
        return {
            _id: row._id,
            provider: row.provider,
            status: row.status,
            accountEmail: row.accountEmail,
            accountId: row.accountId,
            metadata: row.metadata,
            tokenExpiresAt: row.tokenExpiresAt,
            connectedAt: row.connectedAt,
            updatedAt: row.updatedAt,
        };
    },
});

// ─── Mutations (client-callable) ─────────────────────────────────────────────

/**
 * Disconnect an integration. The encrypted token fields are cleared so a
 * stolen DB snapshot can't be used to replay sessions. The row itself
 * stays so we keep audit history of who connected/disconnected.
 */
export const disconnect = mutation({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args) => {
        const me = await requireAuth(ctx);
        const row = await ctx.db.get(args.integrationId);
        if (!row) throw new Error("Integration not found");
        if (row.companyId !== me.companyId) {
            throw new Error("Forbidden");
        }

        await ctx.db.patch(args.integrationId, {
            status: "disconnected",
            accessToken: undefined,
            refreshToken: undefined,
            tokenExpiresAt: undefined,
            updatedAt: Date.now(),
        });

        return { ok: true };
    },
});

// ─── Internal mutations (server-only, used by API routes + Node actions) ─────

/**
 * Upsert an integration after a successful OAuth handshake. Tokens are
 * already encrypted by the caller (Next.js API route or Convex Node
 * action) — see `src/lib/integrations/crypto.ts`. Convex sees opaque
 * strings.
 *
 * Exposed as a public mutation because the OAuth callback route runs
 * with the user's Clerk session in-cookie — `ConvexHttpClient.mutation`
 * cannot reach `internalMutation`. We re-authorize here: the caller must
 * (a) be signed in, (b) match the user id encoded in the signed state,
 * and (c) belong to the company the integration will scope to. The
 * signed state itself is verified by the route handler before this is
 * called.
 */
export const upsertConnection = mutation({
    args: {
        companyId: v.id("companies"),
        userId: v.id("users"),
        provider: PROVIDER,
        encryptedAccessToken: v.string(),
        encryptedRefreshToken: v.optional(v.string()),
        tokenExpiresAt: v.optional(v.number()),
        accountId: v.optional(v.string()),
        accountEmail: v.optional(v.string()),
        metadata: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const me = await requireAuth(ctx);
        if (me._id !== args.userId) {
            throw new Error("Forbidden: state user mismatch");
        }
        if (me.companyId !== args.companyId) {
            throw new Error("Forbidden: state company mismatch");
        }

        const now = Date.now();
        const existing = await ctx.db
            .query("integrations")
            .withIndex("by_companyId_provider", (q) =>
                q.eq("companyId", args.companyId).eq("provider", args.provider),
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: "connected",
                accessToken: args.encryptedAccessToken,
                refreshToken: args.encryptedRefreshToken,
                tokenExpiresAt: args.tokenExpiresAt,
                accountId: args.accountId,
                accountEmail: args.accountEmail,
                metadata: args.metadata,
                connectedByUserId: args.userId,
                updatedAt: now,
            });
            return existing._id;
        }

        return await ctx.db.insert("integrations", {
            companyId: args.companyId,
            provider: args.provider,
            status: "connected",
            accessToken: args.encryptedAccessToken,
            refreshToken: args.encryptedRefreshToken,
            tokenExpiresAt: args.tokenExpiresAt,
            accountId: args.accountId,
            accountEmail: args.accountEmail,
            metadata: args.metadata,
            connectedByUserId: args.userId,
            connectedAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update tokens after a successful refresh. Status moves back to
 * "connected" if it was previously in an error state.
 */
export const updateTokens = internalMutation({
    args: {
        integrationId: v.id("integrations"),
        encryptedAccessToken: v.string(),
        encryptedRefreshToken: v.optional(v.string()),
        tokenExpiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.integrationId, {
            status: "connected",
            accessToken: args.encryptedAccessToken,
            refreshToken: args.encryptedRefreshToken,
            tokenExpiresAt: args.tokenExpiresAt,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Mark an integration as needing re-auth (e.g. refresh token revoked).
 * The user will see a "Needs Re-auth" badge in Settings → Integrations
 * and the Connect button surfaces as "Reconnect".
 */
export const markNeedsReauth = internalMutation({
    args: {
        integrationId: v.id("integrations"),
        errorMessage: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.integrationId);
        if (!existing) return;
        // Preserve any pre-existing metadata while overlaying the error.
        let metadata: Record<string, unknown> = {};
        if (existing.metadata) {
            try {
                metadata = JSON.parse(existing.metadata) as Record<string, unknown>;
            } catch {
                metadata = {};
            }
        }
        metadata.lastError = args.errorMessage;
        metadata.lastErrorAt = Date.now();

        await ctx.db.patch(args.integrationId, {
            status: "error",
            metadata: JSON.stringify(metadata),
            updatedAt: Date.now(),
        });
    },
});

// ─── Internal queries (server-only) ──────────────────────────────────────────

/**
 * Server-side fetch that includes the encrypted token blobs. Used by
 * Convex Node actions when they need to call HubSpot / Microsoft Graph
 * on behalf of the company. Never expose this to the client.
 */
export const internalGetByProvider = internalQuery({
    args: {
        companyId: v.id("companies"),
        provider: PROVIDER,
    },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("integrations")
            .withIndex("by_companyId_provider", (q) =>
                q.eq("companyId", args.companyId).eq("provider", args.provider),
            )
            .first();
        return row;
    },
});

/** By-id lookup used by `integrationsActions.refreshOne`. */
export const internalGetById = internalQuery({
    args: { id: v.id("integrations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Server-side lead lookup used by `integrationsActions.pushLeadToHubSpot`.
 * Bundles the primary contact (if any) so the push action makes a single
 * round-trip to Convex.
 */
export const internalGetLead = internalQuery({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const lead = await ctx.db.get(args.leadId);
        if (!lead) return null;

        // Find the first linked contact (most leads will have just one
        // primary contact in the contacts table). Prefer ones with email.
        const contacts = await ctx.db
            .query("contacts")
            .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
            .collect();
        const primary = contacts.find((c) => c.email) ?? contacts[0];

        return {
            _id: lead._id,
            companyId: lead.companyId,
            companyName: lead.name,
            domain: lead.domain,
            industry: lead.industry,
            description: lead.enrichmentData?.description,
            contactEmail: primary?.email ?? null,
            contactFirstName: primary?.firstName ?? null,
            contactLastName: primary?.lastName ?? null,
            contactRole: primary?.title ?? null,
        };
    },
});

/** List every integration whose access token is near expiry. Used by the
 *  scheduled token-refresh cron. We refresh anything expiring in the next
 *  10 minutes so a slow refresh path doesn't catch us at zero.
 */
export const internalListExpiring = internalQuery({
    args: {},
    handler: async (ctx) => {
        const horizon = Date.now() + 10 * 60_000;
        const rows = await ctx.db.query("integrations").collect();
        return rows.filter(
            (r) =>
                r.status === "connected" &&
                r.refreshToken !== undefined &&
                r.tokenExpiresAt !== undefined &&
                r.tokenExpiresAt < horizon,
        );
    },
});

// Provider type re-exported for use elsewhere.
export type { Provider };
