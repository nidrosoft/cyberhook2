import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("pending"), v.literal("success"), v.literal("failed"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let searches = await ctx.db
      .query("searches")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    if (args.userId) {
      searches = searches.filter((s) => s.userId === args.userId);
    }
    if (args.status) {
      searches = searches.filter((s) => s.status === args.status);
    }
    if (args.limit) {
      searches = searches.slice(0, args.limit);
    }

    return searches;
  },
});

export const getById = query({
  args: { id: v.id("searches") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const search = await ctx.db.get(args.id);
    if (!search) return null;
    assertCompanyAccess(currentUser.companyId, search.companyId);
    return search;
  },
});

export const getRecent = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let searches = await ctx.db
      .query("searches")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit || 10);

    if (args.userId) {
      searches = searches.filter((s) => s.userId === args.userId);
    }

    return searches;
  },
});

export const getStats = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let searches = await ctx.db
      .query("searches")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.userId) {
      searches = searches.filter((s) => s.userId === args.userId);
    }

    const total = searches.length;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = searches.filter((s) => s.createdAt > weekAgo).length;

    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30Days = searches.filter((s) => s.createdAt > monthAgo).length;

    const tokensConsumed = searches.reduce((sum, s) => sum + (s.tokensConsumed || 0), 0);

    return { total, last7Days, last30Days, tokensConsumed };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const tokensRemaining = company.tokenAllocation - company.tokensUsed;
    if (tokensRemaining < 1) {
      throw new Error("Insufficient tokens");
    }

    const searchId = await ctx.db.insert("searches", {
      companyId: args.companyId,
      userId: args.userId,
      domain: args.domain,
      status: "pending",
      tokensConsumed: 1,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.companyId, {
      tokensUsed: company.tokensUsed + 1,
    });

    return searchId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("searches"),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("failed")),
    resultGuid: v.optional(v.string()),
    totalExposures: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const { id, ...updates } = args;
    const search = await ctx.db.get(id);
    if (!search) throw new Error("Search not found");
    assertCompanyAccess(currentUser.companyId, search.companyId);

    await ctx.db.patch(id, updates);

    return id;
  },
});

// ─── Internal Mutations ──────────────────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
    tokensConsumed: v.number(),
  },
  handler: async (ctx, args) => {
    const searchId = await ctx.db.insert("searches", {
      companyId: args.companyId,
      userId: args.userId,
      domain: args.domain,
      status: "pending",
      tokensConsumed: args.tokensConsumed,
      createdAt: Date.now(),
    });

    return searchId;
  },
});

export const internalUpdateWithResults = internalMutation({
  args: {
    id: v.id("searches"),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("failed")),
    resultGuid: v.optional(v.string()),
    totalExposures: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, updates);

    return id;
  },
});
