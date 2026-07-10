/**
 * Centralized user-facing error mapper.
 *
 * Backend actions (Convex / Redrok / Stripe / Anthropic / etc.) return raw
 * technical strings — "401 Unauthorized", "Redrok credentials not configured",
 * "ECONNREFUSED 127.0.0.1:443", validator stack traces, etc. None of those
 * should ever be shown to an end user. This module is the single place where
 * we translate technical errors into friendly, action-oriented copy.
 *
 * Rules of thumb:
 *   - Never name an internal vendor ("Redrok", "Stripe", "Convex", "Clerk").
 *   - Never reference an internal config screen the user can't reach.
 *   - Tell the user what happened in plain English, what they can do, or that
 *     the team has been notified if there's nothing actionable.
 *   - Keep the copy short — one or two sentences max.
 */
import type { RedrokErrorCode, RedrokHealthStatus } from "../../convex/lib/redrok/resilience";

export type RedrokUserMessage = {
    title: string;
    canRetry: boolean;
    adminActionRequired: boolean;
};

const REDROK_USER_MESSAGES: Record<RedrokErrorCode, Omit<RedrokUserMessage, "canRetry">> = {
    REDROK_AUTH_INVALID: { title: "Redrok needs to be reconnected", adminActionRequired: true },
    REDROK_CREDENTIALS_MISSING: { title: "Redrok needs to be connected", adminActionRequired: true },
    REDROK_CREDENTIALS_UNREADABLE: { title: "Redrok needs to be reconnected", adminActionRequired: true },
    REDROK_RATE_LIMITED: { title: "Live exposure data is temporarily rate limited", adminActionRequired: false },
    REDROK_TIMEOUT: { title: "Live exposure data took too long to respond", adminActionRequired: false },
    REDROK_UNAVAILABLE: { title: "Live exposure data is temporarily unavailable", adminActionRequired: false },
    REDROK_TOKEN_EXPIRED: { title: "Your Redrok session needs to be refreshed", adminActionRequired: false },
    REDROK_UNKNOWN: { title: "Live exposure data could not be loaded", adminActionRequired: false },
};

export function getRedrokUserMessage(code: RedrokErrorCode, retryable: boolean): RedrokUserMessage {
    const message = REDROK_USER_MESSAGES[code];
    return { ...message, canRetry: retryable && !message.adminActionRequired };
}

export function getRedrokStatusPresentation(
    healthStatus: RedrokHealthStatus,
    connected: boolean,
): { label: string; color: "success" | "warning" | "error" | "gray" } {
    if (!connected || healthStatus === "credentials_missing") return { label: "Not connected", color: "gray" };
    if (healthStatus === "healthy") return { label: "Connected", color: "success" };
    if (healthStatus === "auth_invalid") return { label: "Needs attention", color: "error" };
    if (healthStatus === "rate_limited" || healthStatus === "unavailable") return { label: "Degraded", color: "warning" };
    return { label: "Checking", color: "gray" };
}

export function getLiveLeadSaveSource(isFallback: boolean): "ransom_hub" | "live_leads" {
    return isFallback ? "ransom_hub" : "live_leads";
}

const PATTERNS: Array<{ test: RegExp; message: string }> = [
    // Auth / credentials — generic outage from the user's perspective.
    {
        test: /authentication failed|401|unauthorized|token.*expired|REDROK_TOKEN_EXPIRED/i,
        message:
            "We're having trouble reaching our data service right now. Please try again in a few minutes.",
    },
    {
        test: /credentials? (not )?configured|api key (not )?configured|missing.*api/i,
        message:
            "This feature is temporarily unavailable while our team finishes setting it up. Please check back shortly.",
    },
    {
        test: /payment details are required|payment method.*required|card information|required to start.*trial/i,
        message:
            "Please enter your credit card information to start your free trial.",
    },
    {
        test: /card.*declined|declined card|do_not_honor|insufficient_funds/i,
        message:
            "Your card was declined. Please try a different payment method.",
    },

    // Rate limits / quotas.
    {
        test: /rate limit|too many requests|429|quota/i,
        message:
            "You've hit the request limit for now. Please wait a moment and try again.",
    },

    // Timeouts / latency.
    {
        test: /timeout|timed out|deadline|408/i,
        message:
            "That took longer than expected. Please try again, or narrow your search and retry.",
    },

    // Network connectivity.
    {
        test: /network|fetch failed|econnrefused|enotfound|getaddrinfo|dns/i,
        message:
            "We couldn't reach our servers. Please check your internet connection and try again.",
    },

    // Server / upstream errors.
    {
        test: /5\d\d|server error|internal error|bad gateway|service unavailable|gateway timeout/i,
        message:
            "Our service is having a hiccup. Please try again in a few minutes — we're on it.",
    },

    // Tokens / billing on the user's side.
    {
        test: /insufficient.*tokens?|out of tokens?|no credits/i,
        message:
            "You've used all your tokens for this billing period. Upgrade your plan or wait for the next reset.",
    },

    // Phase 9C — per-user search quota set by the company admin. Distinct
    // from the company-wide cap so the message tells them exactly where to
    // get more (their admin, not Stripe).
    {
        test: /USER_SEARCH_QUOTA_EXCEEDED/i,
        message:
            "You've hit your monthly search quota. Contact your admin to increase it.",
    },

    // Validation noise that occasionally bubbles up from Convex.
    {
        test: /argumentvalidationerror|validator|missing the required field|object is missing/i,
        message:
            "Something didn't look right with that request. Please refresh the page and try again.",
    },

    // Redrok-specific phrasing — strip the vendor name from anything we surface.
    {
        test: /redrok/i,
        message:
            "Our data service is temporarily unavailable. Please try again in a few minutes.",
    },
];

/**
 * Map any raw error string to a friendly message. Falls back to a generic
 * "something went wrong" rather than echoing the raw error.
 */
export function friendlyError(raw: unknown, fallback?: string): string {
    const text =
        typeof raw === "string"
            ? raw
            : raw instanceof Error
              ? raw.message
              : raw && typeof raw === "object" && "message" in raw
                ? String((raw as { message?: unknown }).message ?? "")
                : "";

    if (!text) {
        return fallback ?? "Something went wrong. Please try again.";
    }

    for (const { test, message } of PATTERNS) {
        if (test.test(text)) return message;
    }

    // No pattern matched — only echo the message back if it looks human-friendly
    // (no error codes, no stack traces, reasonable length). Otherwise show a
    // generic fallback so the user never sees raw technical output.
    const looksFriendly =
        text.length <= 140 &&
        !/\bat\s|\.ts:|\.js:|\bstack\b|\bError:/i.test(text) &&
        !/[<>{}[\]]/.test(text);

    return looksFriendly ? text : fallback ?? "Something went wrong. Please try again.";
}
