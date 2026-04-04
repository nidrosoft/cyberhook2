import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    assignedToUserId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    linkedLeadId: v.optional(v.id("leads")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Apply filters
    if (args.assignedToUserId) {
      tasks = tasks.filter((t) => t.assignedToUserId === args.assignedToUserId);
    }

    if (args.status) {
      tasks = tasks.filter((t) => t.status === args.status);
    }

    if (args.priority) {
      tasks = tasks.filter((t) => t.priority === args.priority);
    }

    if (args.linkedLeadId) {
      tasks = tasks.filter((t) => t.linkedLeadId === args.linkedLeadId);
    }

    // Sort by due date (earliest first), then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
      // Incomplete tasks first
      if (a.status !== "completed" && b.status === "completed") return -1;
      if (a.status === "completed" && b.status !== "completed") return 1;

      // Then by due date
      const aDue = a.dueDate || Infinity;
      const bDue = b.dueDate || Infinity;
      if (aDue !== bDue) return aDue - bDue;

      // Then by priority
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      return aPriority - bPriority;
    });

    // Apply limit
    if (args.limit) {
      tasks = tasks.slice(0, args.limit);
    }

    return tasks;
  },
});

export const getById = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);
    return task;
  },
});

export const getDueToday = query({
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

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to due today and not completed
    tasks = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.dueDate &&
        t.dueDate >= startOfDay &&
        t.dueDate <= endOfDay
    );

    if (args.userId) {
      tasks = tasks.filter((t) => t.assignedToUserId === args.userId);
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      return aPriority - bPriority;
    });

    return tasks;
  },
});

export const getOverdue = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to overdue and not completed
    tasks = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && t.dueDate < startOfDay
    );

    if (args.userId) {
      tasks = tasks.filter((t) => t.assignedToUserId === args.userId);
    }

    // Sort by due date (most overdue first)
    tasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

    return tasks;
  },
});

export const getUpcoming = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfDay + 24 * 60 * 60 * 1000 - 1;
    const daysAhead = args.days ?? 3;
    const endOfRange = startOfDay + (daysAhead + 1) * 24 * 60 * 60 * 1000 - 1;

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    tasks = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.dueDate &&
        t.dueDate > endOfToday &&
        t.dueDate <= endOfRange
    );

    if (args.userId) {
      tasks = tasks.filter((t) => t.assignedToUserId === args.userId);
    }

    tasks.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

    return tasks;
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

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.userId) {
      tasks = tasks.filter((t) => t.assignedToUserId === args.userId);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const dueToday = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.dueDate &&
        t.dueDate >= startOfDay &&
        t.dueDate <= endOfDay
    ).length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && t.dueDate < startOfDay
    ).length;

    return { total, completed, pending, dueToday, overdue };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    assignedToUserId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
    linkedWatchlistId: v.optional(v.id("watchlistItems")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const taskId = await ctx.db.insert("tasks", {
      companyId: user.companyId,
      createdByUserId: args.createdByUserId,
      assignedToUserId: args.assignedToUserId,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      priority: args.priority || "medium",
      linkedLeadId: args.linkedLeadId,
      linkedContactId: args.linkedContactId,
      linkedWatchlistId: args.linkedWatchlistId,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assignedToUserId: v.optional(v.id("users")),
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

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

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(v.literal("pending"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

    await ctx.db.patch(args.id, {
      status: args.status,
      completedAt: args.status === "completed" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const reopen = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

    await ctx.db.patch(args.id, {
      status: "pending",
      completedAt: undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const assignTo = mutation({
  args: {
    id: v.id("tasks"),
    assignedToUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Not found");
    assertCompanyAccess(user.companyId, task.companyId);

    await ctx.db.patch(args.id, {
      assignedToUserId: args.assignedToUserId,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
