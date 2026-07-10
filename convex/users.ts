import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAuth, assertCompanyAccess, requireRole, requireAdminAccess } from "./lib/auth";
import { getPlanLimits } from "./lib/plans";
import { toClientSafeCompany } from "./lib/company/projection";

// ============================================
// QUERIES
// ============================================

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) return null;
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);
    return targetUser;
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!targetUser) return null;
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);
    return targetUser;
  },
});

export const getByCompanyId = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    return await ctx.db
      .query("users")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

export const getCurrentUserWithCompany = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const company = await ctx.db.get(user.companyId);

    return {
      user,
      company: company ? toClientSafeCompany(company) : null,
    };
  },
});

export const getPendingUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireAuth(ctx);
    requireRole(currentUser.role, "sales_admin");

    const pendingUsers = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return pendingUsers.filter(
      (u) => u.companyId === currentUser.companyId
    );
  },
});

// ============================================
// INTERNAL QUERIES (for use in actions)
// ============================================

export const internalGetByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// ============================================
// MUTATIONS
// ============================================

export const create = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.optional(v.string()),
    companyId: v.id("companies"),
    role: v.union(
      v.literal("sales_rep"),
      v.literal("sales_admin"),
      v.literal("billing")
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("deactivated")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      companyId: args.companyId,
      role: args.role,
      status: args.status ?? "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("sales_rep"),
        v.literal("sales_admin"),
        v.literal("billing")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("deactivated")
      )
    ),
    timezone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    inAppNotifications: v.optional(v.boolean()),
    slackNotifications: v.optional(v.boolean()),
    teamsNotifications: v.optional(v.boolean()),
    notificationFrequency: v.optional(v.string()),
    criticalAlertsOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);

    const isSelf = currentUser._id === args.id;
    if (!isSelf) {
      requireRole(currentUser.role, "sales_admin");
      const targetUser = await ctx.db.get(args.id);
      if (!targetUser) throw new Error("User not found");
      assertCompanyAccess(currentUser.companyId, targetUser.companyId);
    }

    const oldUser = await ctx.db.get(args.id);
    if (!oldUser) throw new Error("User not found");

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    // Notify user if role has changed
    if (updates.role && oldUser.role !== updates.role && oldUser.email) {
      const company = await ctx.db.get(oldUser.companyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendRoleUpdateEmailInternal, {
        email: oldUser.email,
        firstName: oldUser.firstName,
        companyName: company?.name ?? "CyberHook AI",
        newRole: updates.role,
      });
    }

    // Notify user if account is deactivated
    if (updates.status === "deactivated" && oldUser.status !== "deactivated" && oldUser.email) {
      const company = await ctx.db.get(oldUser.companyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendUserDeactivatedEmailInternal, {
        email: oldUser.email,
        firstName: oldUser.firstName,
        companyName: company?.name ?? "CyberHook AI",
      });
    }
  },
});

export const updateLastAccessed = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    if (currentUser._id !== args.id) {
      throw new Error("Forbidden: can only update your own last accessed time");
    }
    await ctx.db.patch(args.id, {
      lastAccessedAt: Date.now(),
    });
  },
});

export const approveUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    requireRole(currentUser.role, "sales_admin");
    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) throw new Error("User not found");
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);

    await ctx.db.patch(args.id, {
      status: "approved",
      updatedAt: Date.now(),
    });

    // Send approval email and notify other team admins that they joined
    if (targetUser.email) {
      const company = await ctx.db.get(targetUser.companyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalEmail, {
        email: targetUser.email,
        firstName: targetUser.firstName,
        companyName: company?.name ?? "CyberHook AI",
      });
      await ctx.scheduler.runAfter(0, internal.emails.sendTeamMemberJoinedEmailInternal, {
        companyId: targetUser.companyId,
        newUserId: args.id,
      });
    }
  },
});

export const rejectUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    requireRole(currentUser.role, "sales_admin");
    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) throw new Error("User not found");
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);

    await ctx.db.patch(args.id, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    // Send rejection email
    if (targetUser.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendRejectionEmail, {
        email: targetUser.email,
        firstName: targetUser.firstName,
      });
    }
  },
});

export const deactivateUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    requireRole(currentUser.role, "sales_admin");
    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) throw new Error("User not found");
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);

    await ctx.db.patch(args.id, {
      status: "deactivated",
      updatedAt: Date.now(),
    });

    if (targetUser.email) {
      const company = await ctx.db.get(targetUser.companyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendUserDeactivatedEmailInternal, {
        email: targetUser.email,
        firstName: targetUser.firstName,
        companyName: company?.name ?? "CyberHook AI",
      });
    }
  },
});

export const completeGuidedTour = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    if (currentUser._id !== args.id) {
      throw new Error("Forbidden: can only complete your own guided tour");
    }
    await ctx.db.patch(args.id, {
      guidedTourCompleted: true,
      guidedTourCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// PHASE 9C — Per-user search quota (admin override)
// ============================================
//
// Behaviour:
// - `searchQuotaMonthly === undefined`  → user inherits the company plan cap.
//   Searches are only blocked when the company-wide allocation is exhausted.
// - `searchQuotaMonthly !== undefined`  → user is also blocked once their
//   personal `searchQuotaUsed >= searchQuotaMonthly`, even if the company has
//   capacity left.
//
// The counter resets monthly. We piggy-back on the company's
// `usageResetDate` (already used to roll over `searchesUsed`) and lazily reset
// `searchQuotaUsed` on the next consumption attempt that lands after the
// reset boundary — see `searches.create`.

export const getQuota = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;
    // Members can view their own quota; admins can view anyone in their company.
    if (currentUser._id !== args.userId) {
      requireAdminAccess(currentUser.role);
      assertCompanyAccess(currentUser.companyId, targetUser.companyId);
    }

    const company = await ctx.db.get(targetUser.companyId);
    const planLimit = company ? getPlanLimits(company.planId).searchesPerMonth : 0;
    const isInherited = targetUser.searchQuotaMonthly === undefined;
    const allocation = isInherited ? planLimit : (targetUser.searchQuotaMonthly ?? 0);
    const used = targetUser.searchQuotaUsed ?? 0;
    const remaining = Math.max(0, allocation - used);

    return {
      allocation,
      used,
      remaining,
      isInherited,
      planLimit,
      resetDate: targetUser.searchQuotaResetDate ?? company?.usageResetDate ?? null,
    };
  },
});

export const setSearchQuota = mutation({
  args: {
    userId: v.id("users"),
    // `null` clears the override and reverts the user back to the company plan.
    monthlyAllocation: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    requireAdminAccess(currentUser.role);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");
    assertCompanyAccess(currentUser.companyId, targetUser.companyId);

    if (args.monthlyAllocation !== null) {
      if (!Number.isFinite(args.monthlyAllocation) || args.monthlyAllocation < 0) {
        throw new Error("Allocation must be a non-negative number");
      }
      if (args.monthlyAllocation > 1_000_000) {
        throw new Error("Allocation is too large");
      }
    }

    await ctx.db.patch(args.userId, {
      searchQuotaMonthly:
        args.monthlyAllocation === null ? undefined : Math.floor(args.monthlyAllocation),
      // Initialize used/reset counters the first time a quota is set so the
      // deduction path always has a clean baseline to compare against.
      searchQuotaUsed: targetUser.searchQuotaUsed ?? 0,
      searchQuotaResetDate: targetUser.searchQuotaResetDate ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL MUTATIONS (for webhooks/actions)
// ============================================

export const internalCreate = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.optional(v.string()),
    companyId: v.id("companies"),
    role: v.union(
      v.literal("sales_rep"),
      v.literal("sales_admin"),
      v.literal("billing")
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("deactivated")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      companyId: args.companyId,
      role: args.role,
      status: args.status ?? "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const internalUpdate = internalMutation({
  args: {
    id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

export const internalDelete = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const internalGetById = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
