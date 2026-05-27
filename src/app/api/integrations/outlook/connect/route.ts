/**
 * GET /api/integrations/outlook/connect
 *
 * Phase 7B entrypoint for the Microsoft Outlook / Graph OAuth handshake.
 * Mirror of the HubSpot connect route — see the comments there for the
 * end-to-end flow.
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { buildOutlookAuthorizeUrl } from "@/lib/integrations/outlook/client";
import { encodeState } from "@/lib/integrations/oauth-state";
import { api } from "../../../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Sign in to connect Outlook." },
                { status: 401 },
            );
        }

        const clerkUser = await currentUser();
        if (!clerkUser) {
            return NextResponse.json({ error: "User not found." }, { status: 401 });
        }

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
            provider: "outlook_email",
        });
        const authorizeUrl = buildOutlookAuthorizeUrl({ state });
        return NextResponse.redirect(authorizeUrl);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const isConfigError = message.includes("MS_CLIENT_ID") || message.includes("OAUTH_STATE_SECRET") || message.includes("ENCRYPTION_KEY");
        return NextResponse.json(
            {
                error: isConfigError
                    ? "Outlook is not yet configured. Ask your admin to set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, INTEGRATIONS_ENCRYPTION_KEY, and INTEGRATIONS_OAUTH_STATE_SECRET."
                    : message,
            },
            { status: isConfigError ? 503 : 500 },
        );
    }
}
