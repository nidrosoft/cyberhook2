import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.optional(v.id("users")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    if (args.createdByUserId) {
      campaigns = campaigns.filter(
        (c) => c.createdByUserId === args.createdByUserId
      );
    }

    if (args.status) {
      campaigns = campaigns.filter((c) => c.status === args.status);
    }

    if (args.limit) {
      campaigns = campaigns.slice(0, args.limit);
    }

    return campaigns;
  },
});

export const getById = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;
    assertCompanyAccess(currentUser.companyId, campaign.companyId);
    return campaign;
  },
});

export const getStats = query({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.createdByUserId) {
      campaigns = campaigns.filter(
        (c) => c.createdByUserId === args.createdByUserId
      );
    }

    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "active").length;
    const draft = campaigns.filter((c) => c.status === "draft").length;
    const paused = campaigns.filter((c) => c.status === "paused").length;
    const completed = campaigns.filter((c) => c.status === "completed").length;
    const totalEmailsSent = campaigns.reduce(
      (sum, c) => sum + (c.emailsSent || 0),
      0
    );
    const totalRecipients = campaigns.reduce(
      (sum, c) => sum + (c.totalRecipients || 0),
      0
    );

    return {
      total,
      active,
      draft,
      paused,
      completed,
      totalEmailsSent,
      totalRecipients,
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
    cadencePattern: v.optional(v.string()),
    sendingWindowStart: v.optional(v.string()),
    sendingWindowEnd: v.optional(v.string()),
    sendingDays: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    maxEmailsPerDay: v.optional(v.number()),
    minDelayBetweenSends: v.optional(v.number()),
    knowledgeBaseEntryId: v.optional(v.id("knowledgeBaseEntries")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    const now = Date.now();
    return await ctx.db.insert("campaigns", {
      ...args,
      status: args.status ?? "draft",
      totalRecipients: 0,
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
    cadencePattern: v.optional(v.string()),
    sendingWindowStart: v.optional(v.string()),
    sendingWindowEnd: v.optional(v.string()),
    sendingDays: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    maxEmailsPerDay: v.optional(v.number()),
    minDelayBetweenSends: v.optional(v.number()),
    totalRecipients: v.optional(v.number()),
    emailsSent: v.optional(v.number()),
    emailsOpened: v.optional(v.number()),
    emailsClicked: v.optional(v.number()),
    knowledgeBaseEntryId: v.optional(v.id("knowledgeBaseEntries")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const { id, ...updates } = args;
    const campaign = await ctx.db.get(id);
    if (!campaign) throw new Error("Campaign not found");
    assertCompanyAccess(currentUser.companyId, campaign.companyId);

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
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new Error("Campaign not found");
    assertCompanyAccess(currentUser.companyId, campaign.companyId);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("campaigns"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new Error("Campaign not found");
    assertCompanyAccess(currentUser.companyId, campaign.companyId);

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
