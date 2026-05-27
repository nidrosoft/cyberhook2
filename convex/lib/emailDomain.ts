/**
 * Email-domain matching helpers.
 *
 * Used by the invite-acceptance flow to decide whether an invitee should be
 * auto-approved (same-domain as the inviter) or routed to manual review.
 *
 * Rule:
 *   - Same domain (case-insensitive, after trim) AND inviter's domain is NOT
 *     a personal/free-mail provider → auto-approve.
 *   - Different domain OR inviter's domain is in the personal denylist
 *     → manual review (status: "pending").
 *
 * Subdomains are NOT considered equal — `mail.acme.com` and `acme.com` are
 * treated as different. This is intentional; loosen here if a customer
 * explicitly requests subdomain matching.
 */

/**
 * Free/personal email providers. Inviters with these domains can never
 * auto-approve, because matching the domain is meaningless (anyone in the
 * world has `gmail.com`).
 */
export const PERSONAL_DOMAINS = new Set<string>([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "ymail.com",
    "rocketmail.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "outlook.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "pm.me",
    "tutanota.com",
    "tuta.io",
    "gmx.com",
    "gmx.net",
    "mail.com",
    "yandex.com",
    "zoho.com",
    "fastmail.com",
]);

export function emailDomain(email: string): string {
    if (!email) return "";
    const at = email.indexOf("@");
    if (at < 0) return "";
    return email.slice(at + 1).trim().toLowerCase();
}

export function isPersonalDomain(domain: string): boolean {
    return PERSONAL_DOMAINS.has(domain.toLowerCase());
}

export function isSameDomain(a: string, b: string): boolean {
    const da = emailDomain(a);
    const db = emailDomain(b);
    return da !== "" && da === db;
}

/**
 * Returns true iff an invitee can be auto-approved based on the inviter's
 * email. Both same-domain AND non-personal are required.
 */
export function shouldAutoApprove(inviterEmail: string, inviteeEmail: string): boolean {
    const inviterDomain = emailDomain(inviterEmail);
    if (!inviterDomain) return false;
    if (isPersonalDomain(inviterDomain)) return false;
    return isSameDomain(inviterEmail, inviteeEmail);
}
