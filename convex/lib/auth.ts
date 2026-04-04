import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Resolves the authenticated user's Convex record from their Clerk identity.
 * Throws if the user is not authenticated or has no Convex record.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("Unauthorized: user record not found");
  }

  if (user.status === "deactivated" || user.status === "rejected") {
    throw new Error("Forbidden: account is not active");
  }

  return user;
}

/**
 * Returns null instead of throwing when there's no Convex user record.
 * Useful for queries where the user might not have completed onboarding.
 */
export async function optionalAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();
}

/**
 * Verifies that a document belongs to the authenticated user's company.
 */
export function assertCompanyAccess(
  userCompanyId: string,
  documentCompanyId: string,
) {
  if (userCompanyId !== documentCompanyId) {
    throw new Error("Forbidden: access denied");
  }
}

/**
 * Verifies the user has one of the specified roles.
 */
export function requireRole(
  userRole: string,
  ...allowedRoles: string[]
) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

// ─── Input Validation Helpers ───────────────────────────────────────────────

const MAX_STRING_LENGTH: Record<string, number> = {
  name: 200,
  title: 200,
  description: 5000,
  domain: 253,
  email: 254,
  url: 2048,
  phone: 30,
  text: 10000,
};

export function validateStringLength(
  value: string,
  field: keyof typeof MAX_STRING_LENGTH | string,
  maxOverride?: number,
): string {
  const max = maxOverride ?? MAX_STRING_LENGTH[field] ?? 1000;
  if (value.length > max) {
    throw new Error(`Validation error: ${field} exceeds maximum length of ${max} characters`);
  }
  return value.trim();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
    throw new Error("Validation error: invalid email format");
  }
  return trimmed;
}

const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
export function validateDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed.length > 253 || !DOMAIN_REGEX.test(trimmed)) {
    throw new Error("Validation error: invalid domain format");
  }
  return trimmed;
}

export function validateUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    throw new Error("Validation error: URL exceeds maximum length");
  }
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
    throw new Error("Validation error: URL must start with https:// or http://");
  }
  return trimmed;
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return "#";
}
