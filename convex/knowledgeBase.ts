import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.optional(v.id("users")),
    type: v.optional(v.union(
      v.literal("web_crawler"),
      v.literal("faq"),
      v.literal("rich_text"),
      v.literal("file_upload")
    )),
    scope: v.optional(v.union(v.literal("global"), v.literal("personal"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db
      .query("knowledgeBaseEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Apply filters
    if (args.createdByUserId) {
      entries = entries.filter((e) => e.createdByUserId === args.createdByUserId);
    }

    if (args.type) {
      entries = entries.filter((e) => e.type === args.type);
    }

    if (args.scope) {
      entries = entries.filter((e) => e.scope === args.scope);
    }

    // Sort by most recent
    entries.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      entries = entries.slice(0, args.limit);
    }

    return entries;
  },
});

export const getById = query({
  args: { id: v.id("knowledgeBaseEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const search = query({
  args: {
    companyId: v.id("companies"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use search index
    const results = await ctx.db
      .query("knowledgeBaseEntries")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(args.limit || 20);

    // Filter by company
    return results.filter((e) => e.companyId === args.companyId);
  },
});

export const getStats = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("knowledgeBaseEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    const total = entries.length;
    const byType = {
      web_crawler: entries.filter((e) => e.type === "web_crawler").length,
      faq: entries.filter((e) => e.type === "faq").length,
      rich_text: entries.filter((e) => e.type === "rich_text").length,
      file_upload: entries.filter((e) => e.type === "file_upload").length,
    };
    const byScope = {
      global: entries.filter((e) => e.scope === "global").length,
      personal: entries.filter((e) => e.scope === "personal").length,
    };

    return { total, byType, byScope };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    type: v.union(
      v.literal("web_crawler"),
      v.literal("faq"),
      v.literal("rich_text"),
      v.literal("file_upload")
    ),
    scope: v.union(v.literal("global"), v.literal("personal")),
    // Web Crawler fields
    url: v.optional(v.string()),
    crawledContent: v.optional(v.string()),
    // FAQ fields
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    // Rich Text fields
    richTextContent: v.optional(v.string()),
    // File Upload fields
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileMimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert("knowledgeBaseEntries", {
      companyId: args.companyId,
      createdByUserId: args.createdByUserId,
      name: args.name,
      type: args.type,
      scope: args.scope,
      url: args.url,
      crawledContent: args.crawledContent,
      question: args.question,
      answer: args.answer,
      richTextContent: args.richTextContent,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileMimeType: args.fileMimeType,
      crawledAt: args.type === "web_crawler" ? Date.now() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return entryId;
  },
});

export const update = mutation({
  args: {
    id: v.id("knowledgeBaseEntries"),
    name: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("global"), v.literal("personal"))),
    // Web Crawler fields
    url: v.optional(v.string()),
    crawledContent: v.optional(v.string()),
    // FAQ fields
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    // Rich Text fields
    richTextContent: v.optional(v.string()),
    // File Upload fields
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileMimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const entry = await ctx.db.get(id);
    if (!entry) throw new Error("Knowledge base entry not found");

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
  args: { id: v.id("knowledgeBaseEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Knowledge base entry not found");

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const updateCrawledContent = mutation({
  args: {
    id: v.id("knowledgeBaseEntries"),
    crawledContent: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Knowledge base entry not found");

    await ctx.db.patch(args.id, {
      crawledContent: args.crawledContent,
      crawledAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
