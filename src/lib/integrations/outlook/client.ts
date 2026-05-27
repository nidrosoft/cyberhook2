/**
 * Microsoft Outlook / Graph OAuth + API client.
 *
 * Phase 7B. The flow mirrors HubSpot:
 *   1. User clicks Connect → GET /api/integrations/outlook/connect
 *   2. We build the Microsoft Identity Platform authorize URL with
 *      scopes + signed state, redirect.
 *   3. User consents → MS redirects to /callback?code=...&state=...
 *   4. /callback exchanges the code at the token endpoint.
 *   5. Tokens get encrypted and stored.
 *
 * Required Microsoft Graph scopes (Section 7B of CYBERHOOK_MAY_UPDATE.md):
 *   - offline_access   (refresh tokens)
 *   - Mail.Send
 *   - Mail.ReadWrite
 *   - User.Read
 *
 * Tenant defaults to `common` (multi-tenant work + personal MSA accounts);
 * override via MS_TENANT_ID for single-tenant deployments.
 *
 * https://learn.microsoft.com/en-us/graph/auth-v2-user
 */

export const MS_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export const OUTLOOK_SCOPES = [
    "offline_access",
    "Mail.Send",
    "Mail.ReadWrite",
    "User.Read",
] as const;

export function getOutlookEnv() {
    const clientId = process.env.MS_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET;
    const redirectUri = process.env.MS_REDIRECT_URI;
    const tenantId = process.env.MS_TENANT_ID ?? "common";
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "Microsoft OAuth env vars missing. Set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI (and optionally MS_TENANT_ID) in .env.local.",
        );
    }
    return { clientId, clientSecret, redirectUri, tenantId };
}

export function authorizeUrl(tenantId: string): string {
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

export function tokenUrl(tenantId: string): string {
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function buildOutlookAuthorizeUrl(params: { state: string }): string {
    const { clientId, redirectUri, tenantId } = getOutlookEnv();
    const url = new URL(authorizeUrl(tenantId));
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", OUTLOOK_SCOPES.join(" "));
    url.searchParams.set("state", params.state);
    // Force the consent screen the first time so the user can pick the
    // right account when they have multiple Microsoft identities.
    url.searchParams.set("prompt", "select_account");
    return url.toString();
}

export type OutlookTokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
    token_type: string; // "Bearer"
    scope: string;
};

export async function exchangeCodeForTokens(code: string): Promise<OutlookTokenResponse> {
    const { clientId, clientSecret, redirectUri, tenantId } = getOutlookEnv();
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        scope: OUTLOOK_SCOPES.join(" "),
    });
    const res = await fetch(tokenUrl(tenantId), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft token exchange failed (${res.status}): ${text}`);
    }
    return (await res.json()) as OutlookTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<OutlookTokenResponse> {
    const { clientId, clientSecret, tenantId } = getOutlookEnv();
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        scope: OUTLOOK_SCOPES.join(" "),
    });
    const res = await fetch(tokenUrl(tenantId), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft token refresh failed (${res.status}): ${text}`);
    }
    return (await res.json()) as OutlookTokenResponse;
}

export type GraphUserInfo = {
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
};

export async function getMe(accessToken: string): Promise<GraphUserInfo> {
    const res = await fetch(`${MS_GRAPH_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft /me failed (${res.status}): ${text}`);
    }
    return (await res.json()) as GraphUserInfo;
}

// ─── Email send (Phase 7C + 8B) ──────────────────────────────────────────────

export type GraphSendMailInput = {
    accessToken: string;
    to: string;
    subject: string;
    /** HTML body. We always send `contentType: "HTML"`. */
    bodyHtml: string;
    /** Optional CC list (one or more email addresses). */
    cc?: string[];
    /** Microsoft Graph requires the authenticated user as `from` — do not override. */
};

/**
 * Send a single email via Microsoft Graph (`POST /me/sendMail`).
 *
 * Returns nothing on success; throws on any non-2xx. Caller is responsible
 * for logging the result to `email_logs` per the Phase 8B spec.
 *
 * Microsoft Graph does not accept arbitrary `from` addresses — the email
 * always comes from the authenticated user. This matches the spec
 * intentionally ("from address mismatch → do not override").
 */
export async function sendMail(input: GraphSendMailInput): Promise<void> {
    const res = await fetch(`${MS_GRAPH_BASE}/me/sendMail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.accessToken}`,
        },
        body: JSON.stringify({
            message: {
                subject: input.subject,
                body: { contentType: "HTML", content: input.bodyHtml },
                toRecipients: [{ emailAddress: { address: input.to } }],
                ...(input.cc && input.cc.length > 0
                    ? {
                          ccRecipients: input.cc.map((address) => ({
                              emailAddress: { address },
                          })),
                      }
                    : {}),
            },
            saveToSentItems: true,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Microsoft sendMail failed (${res.status}): ${text}`);
    }
}
