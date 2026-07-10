export type RedrokErrorCode =
    | "REDROK_AUTH_INVALID"
    | "REDROK_CREDENTIALS_MISSING"
    | "REDROK_CREDENTIALS_UNREADABLE"
    | "REDROK_RATE_LIMITED"
    | "REDROK_TIMEOUT"
    | "REDROK_UNAVAILABLE"
    | "REDROK_TOKEN_EXPIRED"
    | "REDROK_UNKNOWN";

export type RedrokFailure = {
    code: RedrokErrorCode;
    retryable: boolean;
    message: string;
};

export function classifyRedrokResponse(status: number): RedrokFailure {
    if (status === 401 || status === 403) {
        return { code: "REDROK_AUTH_INVALID", retryable: false, message: "Redrok credentials were rejected." };
    }
    if (status === 429) {
        return { code: "REDROK_RATE_LIMITED", retryable: true, message: "Redrok rate limit reached." };
    }
    if (status >= 500) {
        return { code: "REDROK_UNAVAILABLE", retryable: true, message: "Redrok is temporarily unavailable." };
    }
    return { code: "REDROK_UNKNOWN", retryable: true, message: `Redrok request failed (${status}).` };
}

export function classifyRedrokException(error: unknown): RedrokFailure {
    if (error instanceof DOMException && error.name === "AbortError") {
        return { code: "REDROK_TIMEOUT", retryable: true, message: "Redrok request timed out." };
    }
    if (error instanceof TypeError) {
        return { code: "REDROK_UNAVAILABLE", retryable: true, message: "Redrok is temporarily unavailable." };
    }
    return { code: "REDROK_UNKNOWN", retryable: true, message: "Unexpected Redrok error." };
}

export function shouldRetryWithFreshToken(code: RedrokErrorCode): boolean {
    return code === "REDROK_TOKEN_EXPIRED";
}

export type RedrokHealthStatus = "unknown" | "healthy" | "auth_invalid" | "credentials_missing" | "rate_limited" | "unavailable";

export type FallbackLiveLead = {
    id: string;
    name: string;
    website: string;
    country: string;
    region: string;
    locality: string;
    industry: string;
    size: string;
    founded: null;
    linkedin_url: string;
    state_location: null;
    source: "ransomware_live_fallback";
    incidentId: string;
    attackDate: number;
    sourceUrl?: string;
    ransomwareGroup?: string;
};

export function normalizeFallbackDomain(value?: string): string {
    if (!value) return "";
    try {
        const url = new URL(value.includes("://") ? value : `https://${value}`);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();
        return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : "";
    } catch {
        return "";
    }
}

export function mapRansomIncidentToFallbackCompany(incident: {
    _id: string;
    companyName: string;
    domain?: string;
    country?: string;
    region?: string;
    industry?: string;
    attackDate: number;
    ransomwareGroup?: string;
    sourceUrl?: string;
}): FallbackLiveLead {
    return {
        id: `ransom:${incident._id}`,
        name: incident.companyName,
        website: normalizeFallbackDomain(incident.domain),
        country: incident.country ?? "",
        region: incident.region ?? "",
        locality: "",
        industry: incident.industry ?? "",
        size: "",
        founded: null,
        linkedin_url: "",
        state_location: null,
        source: "ransomware_live_fallback",
        incidentId: incident._id,
        attackDate: incident.attackDate,
        sourceUrl: incident.sourceUrl,
        ransomwareGroup: incident.ransomwareGroup,
    };
}

export function shouldSendHealthAlert(_previous: RedrokHealthStatus, next: RedrokHealthStatus, lastAlertAt: number | undefined, now: number): boolean {
    if (next === "healthy" || next === "unknown") return false;
    if (lastAlertAt === undefined) return true;
    return now - lastAlertAt >= 24 * 60 * 60 * 1000;
}

export type RedrokHealthAlert = "unhealthy" | "recovered";

export function decideHealthAlert(
    previous: RedrokHealthStatus,
    next: RedrokHealthStatus,
    lastAlertAt: number | undefined,
    _lastRecoveryAlertAt: number | undefined,
    now: number,
): RedrokHealthAlert | null {
    if (next === "healthy") {
        return previous !== "healthy" && previous !== "unknown" ? "recovered" : null;
    }
    if (next === "unknown") return null;
    return shouldSendHealthAlert(previous, next, lastAlertAt, now) ? "unhealthy" : null;
}
