/**
 * HubSpot OAuth + API client.
 *
 * Phase 7A. The full OAuth flow:
 *   1. User clicks Connect → GET /api/integrations/hubspot/connect
 *   2. We build the authorize URL with scopes + signed state, redirect.
 *   3. User consents → HubSpot redirects to /callback?code=...&state=...
 *   4. /callback exchanges the code for tokens via POST /oauth/v1/token.
 *   5. Tokens get encrypted and stored via Convex `integrations.upsertConnection`.
 *
 * Required HubSpot OAuth scopes (Section 7A of CYBERHOOK_MAY_UPDATE.md):
 *   - oauth (mandatory)
 *   - crm.objects.contacts.read
 *   - crm.objects.contacts.write
 *   - crm.objects.companies.read
 *   - crm.objects.companies.write
 *
 * https://developers.hubspot.com/docs/api/oauth-quickstart-guide
 */

export const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
export const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

export const HUBSPOT_SCOPES = [
    "oauth",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.companies.read",
    "crm.objects.companies.write",
] as const;

export function getHubSpotEnv() {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "HubSpot OAuth env vars missing. Set HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI in .env.local.",
        );
    }
    return { clientId, clientSecret, redirectUri };
}

export function buildHubSpotAuthorizeUrl(params: { state: string }): string {
    const { clientId, redirectUri } = getHubSpotEnv();
    const url = new URL(HUBSPOT_AUTHORIZE_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", HUBSPOT_SCOPES.join(" "));
    url.searchParams.set("state", params.state);
    return url.toString();
}

export type HubSpotTokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
    token_type: "bearer";
};

/** Exchange an authorization code for an access + refresh token. */
export async function exchangeCodeForTokens(code: string): Promise<HubSpotTokenResponse> {
    const { clientId, clientSecret, redirectUri } = getHubSpotEnv();
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
    });
    const res = await fetch(HUBSPOT_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HubSpot token exchange failed (${res.status}): ${text}`);
    }
    return (await res.json()) as HubSpotTokenResponse;
}

/** Refresh an expired access token. */
export async function refreshAccessToken(refreshToken: string): Promise<HubSpotTokenResponse> {
    const { clientId, clientSecret } = getHubSpotEnv();
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
        throw new Error(`HubSpot token refresh failed (${res.status}): ${text}`);
    }
    return (await res.json()) as HubSpotTokenResponse;
}

/**
 * Resolve the HubSpot portal (account) identity for a token. We call
 * `/oauth/v1/access-tokens/{token}` which returns the hub id + user
 * email — useful for showing "Connected as you@example.com" in the UI.
 */
export type HubSpotTokenInfo = {
    user: string; // email
    hub_domain: string;
    hub_id: number;
    app_id: number;
    expires_in: number;
    user_id: number;
    token_type: string;
};

export async function getTokenInfo(accessToken: string): Promise<HubSpotTokenInfo> {
    const res = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HubSpot token info failed (${res.status}): ${text}`);
    }
    return (await res.json()) as HubSpotTokenInfo;
}

// ─── Push-to-CRM helpers (Phase 7C) ──────────────────────────────────────────

export type HubSpotCompanyInput = {
    name: string;
    domain?: string;
    industry?: string;
    description?: string;
};

export type HubSpotContactInput = {
    email: string;
    firstname?: string;
    lastname?: string;
    jobtitle?: string;
    phone?: string;
    companyId?: string; // HubSpot company id to associate
};

/** Create or update a company in HubSpot by domain. Returns the HubSpot id. */
export async function upsertCompany(
    accessToken: string,
    input: HubSpotCompanyInput,
): Promise<{ id: string }> {
    // If we have a domain, look for an existing company first to avoid
    // duplicates. HubSpot's idempotency story is not great for companies
    // (no native upsert by domain), so we do a search + create-or-update.
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
                        {
                            filters: [
                                { propertyName: "domain", operator: "EQ", value: input.domain },
                            ],
                        },
                    ],
                    limit: 1,
                }),
            },
        );
        if (search.ok) {
            const data = (await search.json()) as { results: Array<{ id: string }> };
            if (data.results.length > 0) {
                const id = data.results[0].id;
                await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        properties: {
                            name: input.name,
                            ...(input.industry ? { industry: input.industry } : {}),
                            ...(input.description ? { description: input.description } : {}),
                        },
                    }),
                });
                return { id };
            }
        }
    }

    const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
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
        const text = await res.text();
        throw new Error(`HubSpot company create failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
}

/** Create or update a contact in HubSpot by email. Returns the HubSpot id. */
export async function upsertContact(
    accessToken: string,
    input: HubSpotContactInput,
): Promise<{ id: string }> {
    // HubSpot supports idempotent contact upsert by email via
    // /crm/v3/objects/contacts using the `idProperty=email` query string.
    const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(input.email)}?idProperty=email`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                properties: {
                    email: input.email,
                    ...(input.firstname ? { firstname: input.firstname } : {}),
                    ...(input.lastname ? { lastname: input.lastname } : {}),
                    ...(input.jobtitle ? { jobtitle: input.jobtitle } : {}),
                    ...(input.phone ? { phone: input.phone } : {}),
                },
            }),
        },
    );

    // 404 → contact doesn't exist yet; create instead.
    if (res.status === 404) {
        const created = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                properties: {
                    email: input.email,
                    ...(input.firstname ? { firstname: input.firstname } : {}),
                    ...(input.lastname ? { lastname: input.lastname } : {}),
                    ...(input.jobtitle ? { jobtitle: input.jobtitle } : {}),
                    ...(input.phone ? { phone: input.phone } : {}),
                },
            }),
        });
        if (!created.ok) {
            const text = await created.text();
            throw new Error(`HubSpot contact create failed (${created.status}): ${text}`);
        }
        const data = (await created.json()) as { id: string };
        if (input.companyId) {
            await associateContactWithCompany(accessToken, data.id, input.companyId);
        }
        return { id: data.id };
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HubSpot contact upsert failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { id: string };
    if (input.companyId) {
        await associateContactWithCompany(accessToken, data.id, input.companyId);
    }
    return { id: data.id };
}

async function associateContactWithCompany(
    accessToken: string,
    contactId: string,
    companyId: string,
): Promise<void> {
    // Default contact-to-company association type id is 279 ("primary
    // company"). We swallow non-2xx because the association may already
    // exist — surfacing it would block the rest of the push.
    await fetch(
        `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/default/companies/${companyId}`,
        {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );
}
