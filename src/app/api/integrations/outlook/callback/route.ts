/**
 * GET /api/integrations/outlook/callback?code=...&state=...
 *
 * Phase 7B: mirror of the HubSpot callback. Exchanges the Microsoft
 * authorization code for tokens, fetches the user identity, encrypts
 * tokens, and persists via the Convex internal mutation.
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { encryptToken } from "@/lib/integrations/crypto";
import {
    exchangeCodeForTokens,
    getMe,
} from "@/lib/integrations/outlook/client";
import { verifyState } from "@/lib/integrations/oauth-state";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function flashRedirect(req: NextRequest, status: "ok" | "error", message?: string) {
    const url = new URL("/settings?tab=integrations", req.url);
    url.searchParams.set("integration", "outlook");
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
        return flashRedirect(req, "error", "Missing code or state from Microsoft.");
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

    if (state.provider !== "outlook_email") {
        return flashRedirect(req, "error", "State/provider mismatch.");
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const me = await getMe(tokens.access_token);

        const encryptedAccessToken = encryptToken(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
            ? encryptToken(tokens.refresh_token)
            : undefined;
        const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

        // Re-attach the user's Clerk session — see the HubSpot callback
        // for the rationale.
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const sessionToken = await (await auth()).getToken({ template: "convex" });
        if (!sessionToken) {
            return flashRedirect(req, "error", "Session expired during OAuth — try Connect again.");
        }
        convex.setAuth(sessionToken);
        await convex.mutation(api.integrations.upsertConnection, {
            companyId: state.companyId as unknown as Id<"companies">,
            userId: state.userId as unknown as Id<"users">,
            provider: "outlook_email",
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt,
            accountId: me.id,
            accountEmail: me.mail ?? me.userPrincipalName,
            metadata: JSON.stringify({
                displayName: me.displayName,
                scope: tokens.scope,
            }),
        });

        return flashRedirect(req, "ok");
    } catch (err) {
        const message = err instanceof Error ? err.message : "Connect failed.";
        return flashRedirect(req, "error", message);
    }
}
