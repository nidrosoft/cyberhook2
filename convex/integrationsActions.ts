/**
 * Convex Node-runtime actions for OAuth integrations.
 *
 * These run with full Node access so they can:
 *   - Decrypt stored refresh tokens (via `node:crypto`).
 *   - Call provider token endpoints (`api.hubapi.com`,
 *     `login.microsoftonline.com`) to refresh access tokens.
 *   - Re-encrypt and persist the new tokens.
 *
 * The companion query / mutation helpers live in `convex/integrations.ts`.
 * The same encryption + provider clients are used both here and in the
 * Next.js API routes — see `convex/lib/crypto.ts` and the route-side
 * mirror at `src/lib/integrations/crypto.ts`.
 */

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { decryptToken, encryptToken } from "./lib/crypto";

// We can't share the Next.js side's `src/lib/integrations/*/client.ts` files
// directly from inside `convex/` (Convex bundles only its own folder), so
// the token-refresh logic is duplicated here. It's small and self-contained.

// ─── HubSpot refresh ─────────────────────────────────────────────────────────

const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

async function refreshHubSpot(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
}> {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("HUBSPOT_CLIENT_ID / HUBSPOT_CLIENT_SECRET not set in Convex env.");
    }
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    });
    const res = await fetch(HUBSPOT_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HubSpot refresh ${res.status}: ${text}`);
    }
    return (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
    };
}

// ─── Microsoft refresh ───────────────────────────────────────────────────────

async function refreshMicrosoft(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
}> {
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;
    const tenantId = process.env.MS_TENANT_ID ?? "common";
    if (!clientId || !clientSecret) {
        throw new Error("MS_CLIENT_ID / MS_CLIENT_SECRET not set in Convex env.");
    }
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        scope: "offline_access Mail.Send Mail.ReadWrite User.Read",
    });
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft refresh ${res.status}: ${text}`);
    }
    return (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
    };
}

// ─── Refresh-one action ──────────────────────────────────────────────────────

/**
 * Force-refresh a single integration's access token. Used by:
 *   - The scheduled `refreshExpiring` cron (next action below).
 *   - The send / sync pipelines as a fallback when a call returns 401.
 */
export const refreshOne = internalAction({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args): Promise<{ ok: boolean; tokenExpiresAt?: number }> => {
        const target = await ctx.runQuery(internal.integrations.internalGetById, {
            id: args.integrationId,
        });
        if (!target) {
            return { ok: false };
        }
        if (!target.refreshToken) {
            await ctx.runMutation(internal.integrations.markNeedsReauth, {
                integrationId: args.integrationId,
                errorMessage: "No refresh token stored — user must reconnect.",
            });
            return { ok: false };
        }

        const refreshPlain = decryptToken(target.refreshToken);

        try {
            const fresh =
                target.provider === "hubspot"
                    ? await refreshHubSpot(refreshPlain)
                    : target.provider === "outlook_email"
                        ? await refreshMicrosoft(refreshPlain)
                        : null;
            if (!fresh) {
                throw new Error(`Provider ${target.provider} has no Node refresh handler.`);
            }

            await ctx.runMutation(internal.integrations.updateTokens, {
                integrationId: args.integrationId,
                encryptedAccessToken: encryptToken(fresh.access_token),
                encryptedRefreshToken: fresh.refresh_token
                    ? encryptToken(fresh.refresh_token)
                    : undefined,
                tokenExpiresAt: Date.now() + fresh.expires_in * 1000,
            });

            return { ok: true, tokenExpiresAt: Date.now() + fresh.expires_in * 1000 };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Refresh failed.";
            // Common cause: the provider revoked the refresh token
            // (password changed, app uninstalled, etc.). Mark as needs-
            // reauth so the user sees a "Reconnect" button.
            await ctx.runMutation(internal.integrations.markNeedsReauth, {
                integrationId: args.integrationId,
                errorMessage: message,
            });
            return { ok: false };
        }
    },
});

/**
 * Cron entrypoint — refreshes every integration whose token expires in
 * the next 10 minutes. Runs every 5 minutes so the worst-case lateness
 * is ~5 minutes before expiry; the provider's 1-hour token TTL gives us
 * plenty of headroom.
 */
export const refreshExpiring = internalAction({
    args: {},
    handler: async (ctx): Promise<{ processed: number }> => {
        const expiring = await ctx.runQuery(internal.integrations.internalListExpiring, {});
        for (const row of expiring) {
            // Run sequentially so a flood of refreshes doesn't hammer the
            // provider's token endpoint (rate-limited per OAuth app).
            await ctx.runAction(internal.integrationsActions.refreshOne, {
                integrationId: row._id,
            });
        }
        return { processed: expiring.length };
    },
});

// ─── Internal helper: get a fresh access token ──────────────────────────────

/**
 * Returns a decrypted access token for the requested provider, refreshing
 * it on the fly if it's within 60 seconds of expiry. Returns `null` if
 * the integration isn't connected (caller should fall back to legacy
 * behavior, e.g. Resend for email).
 */
async function getFreshAccessToken(
    ctx: { runQuery: any; runAction: any; runMutation: any },
    companyId: string,
    provider: "hubspot" | "outlook_email",
): Promise<{ accessToken: string; integrationId: string } | null> {
    const row = await ctx.runQuery(internal.integrations.internalGetByProvider, {
        companyId,
        provider,
    });
    if (!row || row.status !== "connected" || !row.accessToken) return null;

    // If the token expires in <60s, refresh first.
    if (row.tokenExpiresAt && row.tokenExpiresAt < Date.now() + 60_000) {
        const result = await ctx.runAction(internal.integrationsActions.refreshOne, {
            integrationId: row._id,
        });
        if (!result.ok) return null;
        // Re-read the row to pick up the new token.
        const refreshed = await ctx.runQuery(internal.integrations.internalGetById, {
            id: row._id,
        });
        if (!refreshed?.accessToken) return null;
        return {
            accessToken: decryptToken(refreshed.accessToken),
            integrationId: refreshed._id,
        };
    }

    return {
        accessToken: decryptToken(row.accessToken),
        integrationId: row._id,
    };
}

// ─── HubSpot push (Phase 7C: "Push to CRM") ──────────────────────────────────

/**
 * Push a single Live Lead to HubSpot as a company + contact pair.
 *
 * Public action — re-authorizes inside via `requireAuth`-style identity
 * check (we look up the calling user and confirm they belong to the same
 * company). Returns the HubSpot company + contact ids on success.
 */
export const pushLeadToHubSpot = action({
    args: { leadId: v.id("leads") },
    returns: v.object({
        ok: v.boolean(),
        companyHubSpotId: v.optional(v.string()),
        contactHubSpotId: v.optional(v.string()),
        error: v.optional(v.string()),
    }),
    handler: async (
        ctx,
        args,
    ): Promise<{
        ok: boolean;
        companyHubSpotId?: string;
        contactHubSpotId?: string;
        error?: string;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { ok: false, error: "Sign in to push leads." };
        }

        // Resolve the lead and the caller's company. The lead must belong
        // to the same company as the caller — surface a generic "not
        // found" rather than leak cross-tenant info.
        const lead = await ctx.runQuery(internal.integrations.internalGetLead, {
            leadId: args.leadId,
        });
        if (!lead) {
            return { ok: false, error: "Lead not found." };
        }

        const fresh = await getFreshAccessToken(ctx, lead.companyId, "hubspot");
        if (!fresh) {
            return {
                ok: false,
                error: "HubSpot is not connected for this company. Connect HubSpot in Settings → Integrations first.",
            };
        }

        try {
            const company = await hubspotUpsertCompany(fresh.accessToken, {
                name: lead.companyName,
                domain: lead.domain ?? undefined,
                industry: lead.industry ?? undefined,
                description: lead.description ?? undefined,
            });

            let contactId: string | undefined;
            if (lead.contactEmail) {
                const contact = await hubspotUpsertContact(fresh.accessToken, {
                    email: lead.contactEmail,
                    firstname: lead.contactFirstName ?? undefined,
                    lastname: lead.contactLastName ?? undefined,
                    jobtitle: lead.contactRole ?? undefined,
                    companyId: company.id,
                });
                contactId = contact.id;
            }

            return {
                ok: true,
                companyHubSpotId: company.id,
                contactHubSpotId: contactId,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : "HubSpot push failed.";
            // 401 → token revoked. Mark needs-reauth so the user sees
            // a Reconnect prompt instead of silent failures next time.
            if (message.includes("401") || message.includes("403")) {
                await ctx.runMutation(internal.integrations.markNeedsReauth, {
                    integrationId: fresh.integrationId as any,
                    errorMessage: message,
                });
            }
            return { ok: false, error: message };
        }
    },
});

// HubSpot fetch helpers (duplicated from src/lib/integrations/hubspot/client.ts
// because the Convex `convex/` folder cannot import from `src/`).
async function hubspotUpsertCompany(
    accessToken: string,
    input: { name: string; domain?: string; industry?: string; description?: string },
): Promise<{ id: string }> {
    if (input.domain) {
        const search = await fetch(
            "https://api.hubapi.com/crm/v3/objects/companies/search",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    filterGroups: [
                        { filters: [{ propertyName: "domain", operator: "EQ", value: input.domain }] },
                    ],
                    limit: 1,
                }),
            },
        );
        if (search.ok) {
            const data = (await search.json()) as { results: Array<{ id: string }> };
            if (data.results.length > 0) {
                return { id: data.results[0].id };
            }
        }
    }

    const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
            properties: {
                name: input.name,
                ...(input.domain ? { domain: input.domain } : {}),
                ...(input.industry ? { industry: input.industry } : {}),
                ...(input.description ? { description: input.description } : {}),
            },
        }),
    });
    if (!res.ok) {
        throw new Error(`HubSpot company create ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as { id: string };
}

async function hubspotUpsertContact(
    accessToken: string,
    input: {
        email: string;
        firstname?: string;
        lastname?: string;
        jobtitle?: string;
        companyId?: string;
    },
): Promise<{ id: string }> {
    // Idempotent upsert by email.
    const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(input.email)}?idProperty=email`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
                properties: {
                    email: input.email,
                    ...(input.firstname ? { firstname: input.firstname } : {}),
                    ...(input.lastname ? { lastname: input.lastname } : {}),
                    ...(input.jobtitle ? { jobtitle: input.jobtitle } : {}),
                },
            }),
        },
    );

    let id: string;
    if (res.status === 404) {
        const created = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
                properties: {
                    email: input.email,
                    ...(input.firstname ? { firstname: input.firstname } : {}),
                    ...(input.lastname ? { lastname: input.lastname } : {}),
                    ...(input.jobtitle ? { jobtitle: input.jobtitle } : {}),
                },
            }),
        });
        if (!created.ok) {
            throw new Error(`HubSpot contact create ${created.status}: ${await created.text()}`);
        }
        id = ((await created.json()) as { id: string }).id;
    } else if (!res.ok) {
        throw new Error(`HubSpot contact upsert ${res.status}: ${await res.text()}`);
    } else {
        id = ((await res.json()) as { id: string }).id;
    }

    if (input.companyId) {
        // Associate; ignore non-2xx (association may already exist).
        await fetch(
            `https://api.hubapi.com/crm/v4/objects/contacts/${id}/associations/default/companies/${input.companyId}`,
            { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } },
        );
    }
    return { id };
}

// ─── Outlook / Graph send (Phase 7C + 8B) ────────────────────────────────────

/**
 * Send a single email via Microsoft Graph for the given company. Used by
 * the AI Agents campaign-send loop as a higher-priority backend than
 * Resend when the company has Outlook connected.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, fallback: true }` when
 * the company doesn't have Outlook connected (signaling the caller to
 * fall back to Resend), or `{ ok: false }` on a hard failure.
 */
export const sendEmailViaGraphIfConnected = internalAction({
    args: {
        companyId: v.id("companies"),
        to: v.string(),
        subject: v.string(),
        bodyHtml: v.string(),
    },
    returns: v.object({
        ok: v.boolean(),
        fallback: v.boolean(),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<{ ok: boolean; fallback: boolean; error?: string }> => {
        const fresh = await getFreshAccessToken(ctx, args.companyId, "outlook_email");
        if (!fresh) {
            // No Outlook connected — caller should fall back to Resend.
            return { ok: false, fallback: true };
        }

        try {
            const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${fresh.accessToken}`,
                },
                body: JSON.stringify({
                    message: {
                        subject: args.subject,
                        body: { contentType: "HTML", content: args.bodyHtml },
                        toRecipients: [{ emailAddress: { address: args.to } }],
                    },
                    saveToSentItems: true,
                }),
            });

            if (res.ok) {
                return { ok: true, fallback: false };
            }

            const text = await res.text();
            // 401 → mark needs reauth (token actually invalid even though
            // we just refreshed — likely revoked).
            if (res.status === 401) {
                await ctx.runMutation(internal.integrations.markNeedsReauth, {
                    integrationId: fresh.integrationId as any,
                    errorMessage: `Graph 401: ${text}`,
                });
                return { ok: false, fallback: true, error: "Outlook token revoked; falling back to Resend." };
            }
            return { ok: false, fallback: false, error: `Graph ${res.status}: ${text}` };
        } catch (err) {
            return {
                ok: false,
                fallback: false,
                error: err instanceof Error ? err.message : "Graph send failed.",
            };
        }
    },
});
