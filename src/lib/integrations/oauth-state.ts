/**
 * OAuth state-parameter helpers for CSRF protection.
 *
 * When we redirect a user to a provider's authorize URL, we include a
 * signed `state` parameter that:
 *   1. Identifies which user / company started the flow (so the callback
 *      knows where to store the resulting tokens — Clerk session may have
 *      expired or rotated by the time the user returns).
 *   2. Binds the callback to the user's browser so an attacker can't
 *      trick a victim into accepting an attacker-controlled token.
 *
 * The state is a base64-encoded JSON payload + HMAC-SHA256 signature:
 *   `<base64(payload)>.<base64(sig)>`
 *
 * Signature key: `INTEGRATIONS_OAUTH_STATE_SECRET` (generate with
 * `openssl rand -hex 32`). Distinct from the token encryption key so
 * rotating one doesn't invalidate the other.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60_000; // 10 minutes — well above OAuth round-trip
const SIG_ALGO = "sha256";

export type OAuthStatePayload = {
    /** Convex user id who initiated the flow. */
    userId: string;
    /** Convex company id owning the resulting integration. */
    companyId: string;
    /** Provider this state is bound to (so it can't be replayed cross-provider). */
    provider: "hubspot" | "outlook_email";
    /** Issued-at timestamp (ms since epoch). Validated against STATE_TTL_MS. */
    iat: number;
    /** Random nonce — short string of random bytes so identical payloads still differ. */
    nonce: string;
};

function loadSecret(): Buffer {
    const hex = process.env.INTEGRATIONS_OAUTH_STATE_SECRET;
    if (!hex) {
        throw new Error(
            "INTEGRATIONS_OAUTH_STATE_SECRET is not set. Generate with `openssl rand -hex 32`.",
        );
    }
    const buf = Buffer.from(hex, "hex");
    if (buf.length < 32) {
        throw new Error("INTEGRATIONS_OAUTH_STATE_SECRET must be at least 32 bytes of hex.");
    }
    return buf;
}

function sign(payload: string): string {
    return createHmac(SIG_ALGO, loadSecret()).update(payload).digest("base64url");
}

export function encodeState(payload: Omit<OAuthStatePayload, "iat" | "nonce">): string {
    const full: OAuthStatePayload = {
        ...payload,
        iat: Date.now(),
        // 16 bytes of randomness → 22 base64url chars.
        nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url"),
    };
    const payloadB64 = Buffer.from(JSON.stringify(full)).toString("base64url");
    return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify and decode an incoming `state` parameter. Returns the payload on
 * success or throws on any failure (bad signature, expired, malformed).
 *
 * We deliberately surface a generic message to the caller — the full
 * reason is in the thrown Error for server logs.
 */
export function verifyState(stateStr: string): OAuthStatePayload {
    const parts = stateStr.split(".");
    if (parts.length !== 2) {
        throw new Error("Malformed OAuth state");
    }
    const [payloadB64, sig] = parts;
    const expectedSig = sign(payloadB64);

    // Constant-time comparison to avoid timing leaks.
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        throw new Error("OAuth state signature mismatch");
    }

    let payload: OAuthStatePayload;
    try {
        payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OAuthStatePayload;
    } catch {
        throw new Error("OAuth state payload could not be parsed");
    }

    if (Date.now() - payload.iat > STATE_TTL_MS) {
        throw new Error("OAuth state expired");
    }

    return payload;
}
