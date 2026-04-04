import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess, requireRole } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    entityType: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    assertCompanyAccess(user.companyId, args.companyId);

    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    // Apply filters
    if (args.userId) {
      logs = logs.filter((l) => l.userId === args.userId);
    }

    if (args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }

    if (args.entityType) {
      logs = logs.filter((l) => l.entityType === args.entityType);
    }

    if (args.dateFrom) {
      logs = logs.filter((l) => l.createdAt >= args.dateFrom!);
    }

    if (args.dateTo) {
      logs = logs.filter((l) => l.createdAt <= args.dateTo!);
    }

    // Apply limit
    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }

    return logs;
  },
});

export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Not found");
    assertCompanyAccess(user.companyId, targetUser.companyId);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return logs;
  },
});

export const getRecent = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    assertCompanyAccess(user.companyId, args.companyId);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit || 20);

    return logs;
  },
});

export const getStats = query({
  args: {
    companyId: v.id("companies"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    assertCompanyAccess(user.companyId, args.companyId);

    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.dateFrom) {
      logs = logs.filter((l) => l.createdAt >= args.dateFrom!);
    }

    if (args.dateTo) {
      logs = logs.filter((l) => l.createdAt <= args.dateTo!);
    }

    const total = logs.length;

    // By action
    const byAction: Record<string, number> = {};
    logs.forEach((l) => {
      byAction[l.action] = (byAction[l.action] || 0) + 1;
    });

    // By entity type
    const byEntityType: Record<string, number> = {};
    logs.forEach((l) => {
      byEntityType[l.entityType] = (byEntityType[l.entityType] || 0) + 1;
    });

    // By user
    const byUser: Record<string, number> = {};
    logs.forEach((l) => {
      const userId = l.userId.toString();
      byUser[userId] = (byUser[userId] || 0) + 1;
    });

    // Last 24 hours
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const last24Hours = logs.filter((l) => l.createdAt > dayAgo).length;

    // Last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = logs.filter((l) => l.createdAt > weekAgo).length;

    return { total, byAction, byEntityType, byUser, last24Hours, last7Days };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    const logId = await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: Date.now(),
    });

    return logId;
  },
});

// ─── Internal Mutations ──────────────────────────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: Date.now(),
    });

    return logId;
  },
});

// Common audit actions
export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DEACTIVATED: "user.deactivated",
  USER_APPROVED: "user.approved",
  USER_REJECTED: "user.rejected",
  
  // Company
  COMPANY_UPDATED: "company.updated",
  COMPANY_SETTINGS_CHANGED: "company.settings_changed",
  
  // Leads
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  LEAD_DELETED: "lead.deleted",
  LEAD_STATUS_CHANGED: "lead.status_changed",
  
  // Searches
  SEARCH_PERFORMED: "search.performed",
  
  // Watchlist
  WATCHLIST_ITEM_ADDED: "watchlist.item_added",
  WATCHLIST_ITEM_REMOVED: "watchlist.item_removed",
  
  // Campaigns
  CAMPAIGN_CREATED: "campaign.created",
  CAMPAIGN_STARTED: "campaign.started",
  CAMPAIGN_PAUSED: "campaign.paused",
  CAMPAIGN_COMPLETED: "campaign.completed",
  
  // Integrations
  INTEGRATION_CONNECTED: "integration.connected",
  INTEGRATION_DISCONNECTED: "integration.disconnected",
  
  // Billing
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  PAYMENT_SUCCEEDED: "payment.succeeded",
  PAYMENT_FAILED: "payment.failed",
  
  // Knowledge Base
  KB_ENTRY_CREATED: "kb.entry_created",
  KB_ENTRY_UPDATED: "kb.entry_updated",
  KB_ENTRY_DELETED: "kb.entry_deleted",
  
  // RFP Hub
  RFP_CREATED: "rfp.created",
  RFP_UPDATED: "rfp.updated",
  RFP_SUBMITTED: "rfp.submitted",
  
  // Settings
  SETTINGS_UPDATED: "settings.updated",
  TOKENS_PURCHASED: "tokens.purchased",
  TOKENS_CONSUMED: "tokens.consumed",
} as const;
