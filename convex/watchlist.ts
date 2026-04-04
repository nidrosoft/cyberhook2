import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    alertsOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    let items = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Apply filters
    if (args.userId) {
      items = items.filter((w) => w.userId === args.userId);
    }

    if (args.alertsOnly) {
      items = items.filter((w) => w.hasNewExposures === true);
    }

    // Sort by most recent
    items.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      items = items.slice(0, args.limit);
    }

    return items;
  },
});

export const getById = query({
  args: { id: v.id("watchlistItems") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return null;
    assertCompanyAccess(user.companyId, item.companyId);
    return item;
  },
});

export const getByDomain = query({
  args: {
    companyId: v.id("companies"),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const items = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    return items.find((item) => item.domain === args.domain) || null;
  },
});

export const getStats = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    let items = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.userId) {
      items = items.filter((w) => w.userId === args.userId);
    }

    const total = items.length;
    const withAlerts = items.filter((w) => w.hasNewExposures === true).length;
    const paused = items.filter((w) => w.isPaused === true).length;
    const active = total - paused;

    return { total, withAlerts, paused, active };
  },
});

export const getAlerts = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    let items = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to only items with new exposures
    items = items.filter((w) => w.hasNewExposures === true);

    if (args.userId) {
      items = items.filter((w) => w.userId === args.userId);
    }

    // Sort by last check date (most recent first)
    items.sort((a, b) => (b.lastCheckedAt || 0) - (a.lastCheckedAt || 0));

    if (args.limit) {
      items = items.slice(0, args.limit);
    }

    return items;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const add = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
    companyName: v.optional(v.string()),
    notifyByEmail: v.optional(v.boolean()),
    monitoringWindow: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    // Check if already in watchlist
    const existing = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    const alreadyExists = existing.find((item) => item.domain === args.domain);
    if (alreadyExists) {
      throw new Error("Domain already in watchlist");
    }

    const watchlistId = await ctx.db.insert("watchlistItems", {
      companyId: args.companyId,
      userId: args.userId,
      domain: args.domain,
      companyName: args.companyName,
      notifyByEmail: args.notifyByEmail ?? true,
      monitoringWindow: args.monitoringWindow ?? 30,
      hasNewExposures: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return watchlistId;
  },
});

export const update = mutation({
  args: {
    id: v.id("watchlistItems"),
    companyName: v.optional(v.string()),
    notifyByEmail: v.optional(v.boolean()),
    monitoringWindow: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { id, ...updates } = args;
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Watchlist item not found");
    assertCompanyAccess(user.companyId, item.companyId);

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("watchlistItems") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Watchlist item not found");
    assertCompanyAccess(user.companyId, item.companyId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const clearAlert = mutation({
  args: { id: v.id("watchlistItems") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Watchlist item not found");
    assertCompanyAccess(user.companyId, item.companyId);

    await ctx.db.patch(args.id, { 
      hasNewExposures: false,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const pause = mutation({
  args: { id: v.id("watchlistItems") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Watchlist item not found");
    assertCompanyAccess(user.companyId, item.companyId);

    await ctx.db.patch(args.id, { 
      isPaused: true,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const resume = mutation({
  args: { id: v.id("watchlistItems") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Watchlist item not found");
    assertCompanyAccess(user.companyId, item.companyId);

    await ctx.db.patch(args.id, { 
      isPaused: false,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// ─── Internal Mutations ──────────────────────────────────────────────────────

export const updateFromCheck = internalMutation({
  args: {
    id: v.id("watchlistItems"),
    exposureCount: v.number(),
    lastExposureDate: v.optional(v.number()),
    hasNewExposures: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      lastCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
});
