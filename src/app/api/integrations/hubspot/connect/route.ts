/**
 * GET /api/integrations/hubspot/connect
 *
 * Phase 7A entrypoint for the HubSpot OAuth handshake. We:
 *   1. Auth the user via Clerk; refuse anonymous callers.
 *   2. Resolve the user's Convex `_id` + `companyId` so the callback
 *      knows where to persist the resulting tokens.
 *   3. Sign + encode a state parameter that binds the callback to this
 *      user + this company.
 *   4. 302 to HubSpot's authorize URL.
 *
 * If the env vars aren't configured yet (Phase 7 scaffolding), we return
 * a friendly 503 with installation instructions instead of crashing.
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { buildHubSpotAuthorizeUrl } from "@/lib/integrations/hubspot/client";
import { encodeState } from "@/lib/integrations/oauth-state";
import { api } from "../../../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Sign in to connect HubSpot." },
                { status: 401 },
            );
        }

        const clerkUser = await currentUser();
        if (!clerkUser) {
            return NextResponse.json({ error: "User not found." }, { status: 401 });
        }

        // Resolve the Convex user record so we can scope tokens to the
        // company. We use ConvexHttpClient with the Clerk JWT so the
        // Convex auth check inside the query still applies.
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const sessionToken = await (await auth()).getToken({ template: "convex" });
        if (sessionToken) {
            convex.setAuth(sessionToken);
        }
        const me = await convex.query(api.users.getCurrentUser);
        if (!me || !me.companyId) {
            return NextResponse.json(
                { error: "Finish onboarding before connecting integrations." },
                { status: 400 },
            );
        }

        const state = encodeState({
            userId: me._id,
            companyId: me.companyId,
            provider: "hubspot",
        });
        const authorizeUrl = buildHubSpotAuthorizeUrl({ state });
        return NextResponse.redirect(authorizeUrl);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        // The most common path here is "env var missing" — surface it as
        // a 503 so the user sees something useful instead of a Next error
        // page. Other failures (Convex unreachable, etc.) also land here.
        const isConfigError = message.includes("HUBSPOT_CLIENT_ID") || message.includes("OAUTH_STATE_SECRET") || message.includes("ENCRYPTION_KEY");
        return NextResponse.json(
            {
                error: isConfigError
                    ? "HubSpot is not yet configured. Ask your admin to set HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI, INTEGRATIONS_ENCRYPTION_KEY, and INTEGRATIONS_OAUTH_STATE_SECRET."
                    : message,
            },
            { status: isConfigError ? 503 : 500 },
        );
    }
}
