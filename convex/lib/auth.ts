import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/**
 * Resolves the authenticated user's Convex record from their Clerk identity.
 * Throws if the user is not authenticated or has no Convex record.
 * Use this in any query/mutation that needs tenant-scoped access.
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

  return user;
}

/**
 * Same as requireAuth but returns null instead of throwing when there's no
 * Convex user record. Useful for queries where the user might not have
 * completed onboarding yet.
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
 * Throws if the document's companyId doesn't match.
 */
export function assertCompanyAccess(
  userCompanyId: string,
  documentCompanyId: string,
) {
  if (userCompanyId !== documentCompanyId) {
    throw new Error("Forbidden: access denied");
  }
}
