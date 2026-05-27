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

/**
 * Phase 8A: per-recipient send history for a single campaign.
 *
 * Powers the "View Logs" panel inside the AI Agents slide-over. Returns
 * one row per `campaignMessages` document, joined with the recipient's
 * email/name, sorted with most recent activity first so a user can
 * immediately see what just happened.
 *
 * Access is gated by the caller's company — the same pattern the rest
 * of this module uses — so users can never inspect another tenant's
 * email logs.
 */
export const getLogs = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return [];
    assertCompanyAccess(currentUser.companyId, campaign.companyId);

    const messages = await ctx.db
      .query("campaignMessages")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const logs = await Promise.all(
      messages.map(async (m) => {
        const recipient = await ctx.db.get(m.recipientId);
        return {
          messageId: m._id,
          recipientId: m.recipientId,
          recipientEmail: recipient?.email ?? "(deleted)",
          recipientName: recipient?.name ?? "",
          subject: m.subject,
          status: m.status as "draft" | "scheduled" | "sent" | "failed",
          sentAt: m.sentAt,
          createdAt: m.createdAt,
          errorMessage: m.errorMessage,
        };
      })
    );

    return logs.sort((a, b) => {
      const aTs = a.sentAt ?? a.createdAt;
      const bTs = b.sentAt ?? b.createdAt;
      return bTs - aTs;
    });
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

// Duplicate a campaign: insert a new draft with the same configuration
// (orange item 4.3). Counters are reset so the copy starts fresh.
export const duplicate = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const source = await ctx.db.get(args.id);
    if (!source) throw new Error("Campaign not found");
    assertCompanyAccess(currentUser.companyId, source.companyId);

    const now = Date.now();
    const newId = await ctx.db.insert("campaigns", {
      companyId: source.companyId,
      createdByUserId: currentUser._id,
      name: `${source.name} (Copy)`,
      description: source.description,
      status: "draft",
      cadencePattern: source.cadencePattern,
      sendingWindowStart: source.sendingWindowStart,
      sendingWindowEnd: source.sendingWindowEnd,
      sendingDays: source.sendingDays,
      timezone: source.timezone,
      maxEmailsPerDay: source.maxEmailsPerDay,
      minDelayBetweenSends: source.minDelayBetweenSends,
      knowledgeBaseEntryId: source.knowledgeBaseEntryId,
      totalRecipients: 0,
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      createdAt: now,
      updatedAt: now,
    });
    return newId;
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
