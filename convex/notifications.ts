import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    userId: v.id("users"),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    if (args.limit) {
      notifications = notifications.slice(0, args.limit);
    }

    return notifications;
  },
});

export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return notifications.filter((n) => !n.isRead).length;
  },
});

export const getRecent = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 10);

    return notifications;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const markAsRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Notification not found");
    assertCompanyAccess(user.companyId, notification.companyId);
    if (user._id !== notification.userId) throw new Error("Forbidden: access denied");

    await ctx.db.patch(args.id, { isRead: true });
    return args.id;
  },
});

export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const unread = notifications.filter((n) => !n.isRead);
    
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});

export const remove = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Notification not found");
    assertCompanyAccess(user.companyId, notification.companyId);
    if (user._id !== notification.userId) throw new Error("Forbidden: access denied");

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const clearAll = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user._id !== args.userId) throw new Error("Forbidden: access denied");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return notifications.length;
  },
});

// ─── Internal Mutations ──────────────────────────────────────────────────────

export const create = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      companyId: args.companyId,
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
      actionUrl: args.actionUrl,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

export const createBulk = internalMutation({
  args: {
    notifications: v.array(v.object({
      companyId: v.id("companies"),
      userId: v.id("users"),
      type: v.string(),
      title: v.string(),
      message: v.string(),
      relatedEntityType: v.optional(v.string()),
      relatedEntityId: v.optional(v.string()),
      actionUrl: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const notification of args.notifications) {
      const id = await ctx.db.insert("notifications", {
        ...notification,
        isRead: false,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

// Notification types
export const NOTIFICATION_TYPES = {
  // Watchlist
  WATCHLIST_NEW_EXPOSURE: "watchlist.new_exposure",
  WATCHLIST_ALERT: "watchlist.alert",
  
  // Tasks
  TASK_ASSIGNED: "task.assigned",
  TASK_DUE_SOON: "task.due_soon",
  TASK_OVERDUE: "task.overdue",
  TASK_COMPLETED: "task.completed",
  
  // Leads
  LEAD_NEW: "lead.new",
  LEAD_STATUS_CHANGED: "lead.status_changed",
  
  // Campaigns
  CAMPAIGN_STARTED: "campaign.started",
  CAMPAIGN_COMPLETED: "campaign.completed",
  CAMPAIGN_ERROR: "campaign.error",
  
  // Team
  TEAM_MEMBER_JOINED: "team.member_joined",
  TEAM_MEMBER_LEFT: "team.member_left",
  
  // Billing
  TOKENS_LOW: "billing.tokens_low",
  SUBSCRIPTION_EXPIRING: "billing.subscription_expiring",
  PAYMENT_FAILED: "billing.payment_failed",
  
  // System
  SYSTEM_ANNOUNCEMENT: "system.announcement",
  SYSTEM_MAINTENANCE: "system.maintenance",
} as const;
