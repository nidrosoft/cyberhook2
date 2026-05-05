import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";
import { getPlanLimits } from "./lib/plans";

// ============================================
// QUERIES
// ============================================

export const getById = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);
    return await ctx.db.get(args.id);
  },
});

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("companies")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();
  },
});

export const getCurrentCompany = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db.get(user.companyId);
  },
});

export const getTokenBalance = query({
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
    if (!company) return null;

    return {
      total: company.tokenAllocation,
      used: company.tokensUsed,
      remaining: company.tokenAllocation - company.tokensUsed,
      resetDate: company.tokenResetDate,
    };
  },
});

// ============================================
// INTERNAL QUERIES (for use in actions)
// ============================================

export const internalGetById = internalQuery({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getRedrokCredentials = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    return {
      redrokEmail: company.redrokEmail,
      redrokPassword: company.redrokPassword,
      redrokToken: company.redrokToken,
      redrokTokenExpiresAt: company.redrokTokenExpiresAt,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    website: v.string(),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    primaryBusinessModel: v.string(),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.string(),
    geographicCoverage: v.array(v.string()),
    targetCustomerBase: v.array(v.string()),
    totalEmployees: v.string(),
    totalSalesPeople: v.string(),
    // V2 fields
    locationId: v.optional(v.string()),
    companyType: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    salesEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    salesPhone: v.optional(v.string()),
    salesTeamSize: v.optional(v.string()),
    // Location
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Settings
    defaultTimezone: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    mrrTarget: v.optional(v.number()),
    appointmentTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Default token allocation for new companies (can be adjusted based on plan)
    const defaultTokenAllocation = 1000;
    // Token reset date is 30 days from now
    const tokenResetDate = now + 30 * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("companies", {
      ...args,
      tokenAllocation: defaultTokenAllocation,
      tokensUsed: 0,
      tokenResetDate,
      status: "pending_approval",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    primaryBusinessModel: v.optional(v.string()),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.optional(v.string()),
    geographicCoverage: v.optional(v.array(v.string())),
    targetCustomerBase: v.optional(v.array(v.string())),
    totalEmployees: v.optional(v.string()),
    totalSalesPeople: v.optional(v.string()),
    // V2 fields
    locationId: v.optional(v.string()),
    companyType: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    salesEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    salesPhone: v.optional(v.string()),
    salesTeamSize: v.optional(v.string()),
    locations: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          address: v.optional(v.string()),
          city: v.optional(v.string()),
          state: v.optional(v.string()),
          country: v.optional(v.string()),
          zipCode: v.optional(v.string()),
          isHeadquarters: v.boolean(),
        })
      )
    ),
    // Brand & service area
    brandPrimaryColor: v.optional(v.string()),
    brandSecondaryColor: v.optional(v.string()),
    serviceArea: v.optional(v.array(v.string())),
    // Service-area center + radius (orange item 3.4).
    serviceAreaRadius: v.optional(
      v.object({
        centerAddress: v.optional(v.string()),
        centerLat: v.optional(v.number()),
        centerLng: v.optional(v.number()),
        radius: v.optional(v.number()),
        unit: v.optional(v.union(v.literal("miles"), v.literal("km"))),
        noLimit: v.optional(v.boolean()),
      })
    ),
    // Associations & programs
    associations: v.optional(v.array(v.string())),
    programs: v.optional(v.array(v.string())),
    // Legacy
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Settings
    defaultTimezone: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    mrrTarget: v.optional(v.number()),
    appointmentTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);

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

export const updateStatus = mutation({
  args: {
    id: v.id("companies"),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("pending_approval")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateStripeInfo = internalMutation({
  args: {
    id: v.id("companies"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
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

export const consumeToken = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);

    const company = await ctx.db.get(args.id);
    if (!company) throw new Error("Company not found");

    const remaining = company.tokenAllocation - company.tokensUsed;
    if (remaining <= 0) {
      throw new Error("No tokens remaining");
    }

    await ctx.db.patch(args.id, {
      tokensUsed: company.tokensUsed + 1,
      updatedAt: Date.now(),
    });

    return {
      tokensUsed: company.tokensUsed + 1,
      remaining: remaining - 1,
    };
  },
});

export const resetTokens = internalMutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nextResetDate = now + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.id, {
      tokensUsed: 0,
      tokenResetDate: nextResetDate,
      searchesUsed: 0,
      reportsUsed: 0,
      usageResetDate: nextResetDate,
      updatedAt: now,
    });
  },
});

// ============================================
// PLAN-BASED USAGE
// ============================================

export const getUsageLimits = query({
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
    if (!company) return null;

    const limits = getPlanLimits(company.planId);
    const searchesUsed = company.searchesUsed ?? 0;
    const reportsUsed = company.reportsUsed ?? 0;

    // Count watchlist domains
    const watchlistItems = await ctx.db
      .query("watchlistItems")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .collect();
    const watchlistCount = watchlistItems.length;

    // Count active users
    const users = await ctx.db
      .query("users")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .collect();
    const activeUsers = users.filter((u) => u.status === "approved").length;

    return {
      planId: company.planId ?? "growth",
      searches: { used: searchesUsed, limit: limits.searchesPerMonth },
      reports: { used: reportsUsed, limit: limits.reportsPerMonth },
      watchlist: { used: watchlistCount, limit: limits.watchlistDomains },
      users: { active: activeUsers, limit: limits.maxUsers },
      aiAgents: limits.aiAgents,
      integrations: limits.integrations,
      usageResetDate: company.usageResetDate ?? company.tokenResetDate,
    };
  },
});

export const consumeSearch = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);

    const company = await ctx.db.get(args.id);
    if (!company) throw new Error("Company not found");

    const limits = getPlanLimits(company.planId);
    const searchesUsed = company.searchesUsed ?? 0;

    if (searchesUsed >= limits.searchesPerMonth) {
      throw new Error("SEARCH_LIMIT_REACHED");
    }

    await ctx.db.patch(args.id, {
      searchesUsed: searchesUsed + 1,
      tokensUsed: company.tokensUsed + 1,
      updatedAt: Date.now(),
    });

    return {
      searchesUsed: searchesUsed + 1,
      remaining: limits.searchesPerMonth - searchesUsed - 1,
    };
  },
});

export const consumeReport = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.id);

    const company = await ctx.db.get(args.id);
    if (!company) throw new Error("Company not found");

    const limits = getPlanLimits(company.planId);
    const reportsUsed = company.reportsUsed ?? 0;

    if (limits.reportsPerMonth !== -1 && reportsUsed >= limits.reportsPerMonth) {
      throw new Error("REPORT_LIMIT_REACHED");
    }

    await ctx.db.patch(args.id, {
      reportsUsed: reportsUsed + 1,
      updatedAt: Date.now(),
    });

    return {
      reportsUsed: reportsUsed + 1,
      remaining: limits.reportsPerMonth === -1 ? -1 : limits.reportsPerMonth - reportsUsed - 1,
    };
  },
});

export const setOwner = internalMutation({
  args: {
    id: v.id("companies"),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ownerId: args.ownerId,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL MUTATIONS (for webhooks/actions)
// ============================================

export const internalCreate = internalMutation({
  args: {
    name: v.string(),
    phone: v.string(),
    website: v.string(),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    primaryBusinessModel: v.string(),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.string(),
    geographicCoverage: v.array(v.string()),
    targetCustomerBase: v.array(v.string()),
    totalEmployees: v.string(),
    totalSalesPeople: v.string(),
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    defaultTimezone: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("trial"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("pending_approval")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const defaultTokenAllocation = 1000;
    const tokenResetDate = now + 30 * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("companies", {
      ...args,
      tokenAllocation: defaultTokenAllocation,
      tokensUsed: 0,
      tokenResetDate,
      status: args.status ?? "pending_approval",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const internalGetByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();
  },
});

export const internalUpdateStripeInfo = internalMutation({
  args: {
    id: v.id("companies"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("trial"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("pending_approval")
      )
    ),
    tokenAllocation: v.optional(v.number()),
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

export const updateRedrokToken = internalMutation({
  args: {
    companyId: v.id("companies"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.companyId, {
      redrokToken: args.token,
      redrokTokenExpiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const internalConsumeToken = internalMutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const remaining = company.tokenAllocation - company.tokensUsed;
    if (remaining <= 0) {
      throw new Error("No tokens remaining");
    }

    await ctx.db.patch(args.companyId, {
      tokensUsed: company.tokensUsed + 1,
      updatedAt: Date.now(),
    });

    return {
      tokensUsed: company.tokensUsed + 1,
      remaining: remaining - 1,
    };
  },
});

// ─── Admin: Upgrade a user's company by email ────────────────────────────────
export const adminUpgradePlan = internalMutation({
  args: {
    email: v.string(),
    planId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!user) throw new Error(`User not found: ${args.email}`);

    const company = await ctx.db.get(user.companyId);
    if (!company) throw new Error("Company not found");

    const limits = getPlanLimits(args.planId);

    await ctx.db.patch(company._id, {
      planId: args.planId,
      planStatus: "active",
      status: "active",
      tokenAllocation: limits.searchesPerMonth,
      searchesUsed: 0,
      reportsUsed: 0,
      usageResetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    return { companyId: company._id, companyName: company.name, planId: args.planId, userApproved: user.status === "approved" };
  },
});
