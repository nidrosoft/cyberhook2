import {
    type RedrokFailure,
    classifyRedrokException,
    classifyRedrokResponse,
} from "./resilience";

const REDROK_AUTH_URL = "https://dash-api.redrok.io/api/authenticate";
const DEFAULT_TIMEOUT_MS = 15_000;

export type RedrokAuthenticationResult =
    | { ok: true; token: string }
    | ({ ok: false } & RedrokFailure);

export class RedrokRequestError extends Error {
    readonly code: RedrokFailure["code"];
    readonly retryable: boolean;

    constructor(failure: RedrokFailure) {
        super(failure.message);
        this.name = "RedrokRequestError";
        this.code = failure.code;
        this.retryable = failure.retryable;
    }
}

export async function authenticateRedrokRequest(
    email: string,
    password: string,
    fetcher: typeof fetch = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RedrokAuthenticationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetcher(REDROK_AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, ip: "0.0.0.0" }),
            signal: controller.signal,
        });
        if (!response.ok) {
            return { ok: false, ...classifyRedrokResponse(response.status) };
        }

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            return {
                ok: false,
                code: "REDROK_UNKNOWN",
                retryable: true,
                message: "Redrok returned an invalid authentication response.",
            };
        }

        if (typeof data !== "object" || data === null || !("token" in data) || typeof data.token !== "string" || !data.token) {
            return {
                ok: false,
                code: "REDROK_UNKNOWN",
                retryable: true,
                message: "Redrok returned an invalid authentication response.",
            };
        }

        return { ok: true, token: data.token };
    } catch (error) {
        return { ok: false, ...classifyRedrokException(error) };
    } finally {
        clearTimeout(timeout);
    }
}
