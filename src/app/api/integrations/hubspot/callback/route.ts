/**
 * GET /api/integrations/hubspot/callback?code=...&state=...
 *
 * Phase 7A: handles the redirect back from HubSpot after the user
 * consents (or denies). Responsibilities:
 *   1. Verify the signed `state` parameter (CSRF + expiry).
 *   2. Exchange the authorization `code` for access + refresh tokens.
 *   3. Encrypt the tokens at rest.
 *   4. Persist them to Convex via `internal.integrations.upsertConnection`.
 *   5. 302 back to Settings → Integrations with a success/error flash.
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { encryptToken } from "@/lib/integrations/crypto";
import {
    exchangeCodeForTokens,
    getTokenInfo,
} from "@/lib/integrations/hubspot/client";
import { verifyState } from "@/lib/integrations/oauth-state";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function flashRedirect(req: NextRequest, status: "ok" | "error", message?: string) {
    const url = new URL("/settings?tab=integrations", req.url);
    url.searchParams.set("integration", "hubspot");
    url.searchParams.set("status", status);
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateStr = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
        return flashRedirect(req, "error", errorParam);
    }
    if (!code || !stateStr) {
        return flashRedirect(req, "error", "Missing code or state from HubSpot.");
    }

    let state: ReturnType<typeof verifyState>;
    try {
        state = verifyState(stateStr);
    } catch (err) {
        return flashRedirect(
            req,
            "error",
            err instanceof Error ? err.message : "Invalid state",
        );
    }

    if (state.provider !== "hubspot") {
        return flashRedirect(req, "error", "State/provider mismatch.");
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const info = await getTokenInfo(tokens.access_token);

        const encryptedAccessToken = encryptToken(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
            ? encryptToken(tokens.refresh_token)
            : undefined;
        const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

        // Re-attach the user's Clerk session so the Convex mutation
        // runs with their identity. We verified the state HMAC above so
        // the userId/companyId is trustworthy; the mutation also
        // re-authorizes server-side as defense in depth.
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const sessionToken = await (await auth()).getToken({ template: "convex" });
        if (!sessionToken) {
            return flashRedirect(req, "error", "Session expired during OAuth — try Connect again.");
        }
        convex.setAuth(sessionToken);
        await convex.mutation(api.integrations.upsertConnection, {
            companyId: state.companyId as unknown as Id<"companies">,
            userId: state.userId as unknown as Id<"users">,
            provider: "hubspot",
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt,
            accountId: String(info.hub_id),
            accountEmail: info.user,
            metadata: JSON.stringify({
                hubDomain: info.hub_domain,
                hubId: info.hub_id,
            }),
        });

        return flashRedirect(req, "ok");
    } catch (err) {
        const message = err instanceof Error ? err.message : "Connect failed.";
        return flashRedirect(req, "error", message);
    }
}
