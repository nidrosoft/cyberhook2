import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.optional(v.id("users")),
    type: v.optional(v.union(
      v.literal("meeting"),
      v.literal("appointment"),
      v.literal("conference"),
      v.literal("webinar"),
      v.literal("call"),
      v.literal("trade_show"),
      v.literal("networking"),
      v.literal("user_group"),
      v.literal("workshop"),
      v.literal("lunch_and_learn"),
      v.literal("other")
    )),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    let events = await ctx.db
      .query("events")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Apply filters
    if (args.createdByUserId) {
      events = events.filter((e) => e.createdByUserId === args.createdByUserId);
    }

    if (args.type) {
      events = events.filter((e) => e.type === args.type);
    }

    if (args.dateFrom) {
      events = events.filter((e) => e.startDate >= args.dateFrom!);
    }

    if (args.dateTo) {
      events = events.filter((e) => e.startDate <= args.dateTo!);
    }

    // Sort by start date
    events.sort((a, b) => a.startDate - b.startDate);

    // Apply limit
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    return events;
  },
});

export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) return null;
    assertCompanyAccess(user.companyId, event.companyId);
    return event;
  },
});

export const getUpcoming = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const now = Date.now();

    let events = await ctx.db
      .query("events")
      .withIndex("by_companyId_startDate", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to upcoming events
    events = events.filter((e) => e.startDate >= now);

    if (args.userId) {
      events = events.filter(
        (e) =>
          e.createdByUserId === args.userId ||
          e.attendeeUserIds?.includes(args.userId!)
      );
    }

    // Sort by start date
    events.sort((a, b) => a.startDate - b.startDate);

    // Apply limit
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    return events;
  },
});

export const getToday = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    let events = await ctx.db
      .query("events")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to today's events
    events = events.filter(
      (e) => e.startDate >= startOfDay && e.startDate <= endOfDay
    );

    if (args.userId) {
      events = events.filter(
        (e) =>
          e.createdByUserId === args.userId ||
          e.attendeeUserIds?.includes(args.userId!)
      );
    }

    // Sort by start date
    events.sort((a, b) => a.startDate - b.startDate);

    return events;
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
    assertCompanyAccess(user.companyId, args.companyId);

    let events = await ctx.db
      .query("events")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.dateFrom) {
      events = events.filter((e) => e.startDate >= args.dateFrom!);
    }

    if (args.dateTo) {
      events = events.filter((e) => e.startDate <= args.dateTo!);
    }

    const total = events.length;
    const byType: Record<string, number> = {};
    events.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    // Upcoming
    const now = Date.now();
    const upcoming = events.filter((e) => e.startDate >= now).length;

    // This week
    const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
    const thisWeek = events.filter(
      (e) => e.startDate >= now && e.startDate <= weekEnd
    ).length;

    return { total, byType, upcoming, thisWeek };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("meeting"),
      v.literal("appointment"),
      v.literal("conference"),
      v.literal("webinar"),
      v.literal("call"),
      v.literal("trade_show"),
      v.literal("networking"),
      v.literal("user_group"),
      v.literal("workshop"),
      v.literal("lunch_and_learn"),
      v.literal("other")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    meetingUrl: v.optional(v.string()),
    organizer: v.optional(v.string()),
    host: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    ticketCost: v.optional(v.number()),
    isTicketFree: v.optional(v.boolean()),
    ticketCurrency: v.optional(v.string()),
    reminderDate: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    isSuggested: v.optional(v.boolean()),
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
    attendeeUserIds: v.optional(v.array(v.id("users"))),
    externalCalendarId: v.optional(v.string()),
    externalCalendarSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const eventId = await ctx.db.insert("events", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("meeting"),
      v.literal("appointment"),
      v.literal("conference"),
      v.literal("webinar"),
      v.literal("call"),
      v.literal("trade_show"),
      v.literal("networking"),
      v.literal("user_group"),
      v.literal("workshop"),
      v.literal("lunch_and_learn"),
      v.literal("other")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    meetingUrl: v.optional(v.string()),
    organizer: v.optional(v.string()),
    host: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    ticketCost: v.optional(v.number()),
    isTicketFree: v.optional(v.boolean()),
    ticketCurrency: v.optional(v.string()),
    reminderDate: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    isSuggested: v.optional(v.boolean()),
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
    attendeeUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { id, ...updates } = args;
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Not found");
    assertCompanyAccess(user.companyId, event.companyId);

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
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Not found");
    assertCompanyAccess(user.companyId, event.companyId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const addAttendee = mutation({
  args: {
    id: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Not found");
    assertCompanyAccess(user.companyId, event.companyId);

    const attendees = event.attendeeUserIds || [];
    if (!attendees.includes(args.userId)) {
      await ctx.db.patch(args.id, {
        attendeeUserIds: [...attendees, args.userId],
        updatedAt: Date.now(),
      });
    }

    return args.id;
  },
});

export const removeAttendee = mutation({
  args: {
    id: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Not found");
    assertCompanyAccess(user.companyId, event.companyId);

    const attendees = event.attendeeUserIds || [];
    await ctx.db.patch(args.id, {
      attendeeUserIds: attendees.filter((id) => id !== args.userId),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
