import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth, assertCompanyAccess, requireRole } from "./lib/auth";

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

    return { user, company };
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
