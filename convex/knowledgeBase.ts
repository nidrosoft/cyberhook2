import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

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
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

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
    const user = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    assertCompanyAccess(user.companyId, entry.companyId);
    return entry;
  },
});

export const search = query({
  args: {
    companyId: v.id("companies"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

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
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

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
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

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

/**
 * Seed a starter set of email templates and cadence sequences (orange item
 * 4.2). Idempotent — entries are skipped if a template with the same name
 * already exists for the company. Templates use Handlebars-style variables
 * ({{contact.firstName}}, {{contact.company}}, {{exposure.count}},
 * {{sender.firstName}}, {{sender.company}}) which are interpolated at send
 * time by the AI Email pipeline.
 */
export const seedStarterTemplates = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const existing = await ctx.db
      .query("knowledgeBaseEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    const existingNames = new Set(existing.map((e) => e.name));

    const templates = [
      {
        name: "[Cadence] Cold Outreach – Day 0",
        body: "Hi {{contact.firstName}},\n\nI noticed {{contact.company}} appears in our latest exposure scan with {{exposure.count}} compromised credentials surfaced on dark-web channels. I wanted to flag this proactively before it becomes a headline.\n\nWould a 15-minute call this week make sense to walk you through what we found?\n\n— {{sender.firstName}}\n{{sender.company}}",
      },
      {
        name: "[Cadence] Follow-up – Day 3",
        body: "Hi {{contact.firstName}},\n\nFollowing up on my note from a few days ago about the {{exposure.count}} exposed credentials we found tied to {{contact.company}}.\n\nIf this isn't the right person for IT/security, would you mind pointing me in the right direction?\n\n— {{sender.firstName}}",
      },
      {
        name: "[Cadence] Breakup – Day 7",
        body: "Hi {{contact.firstName}},\n\nI'll close the loop here. If credential exposure isn't a priority right now I completely understand — and our exposure data is always available when you'd like to take a look.\n\n— {{sender.firstName}}\n{{sender.company}}",
      },
      {
        name: "[Cadence] Post-scan – Findings Recap",
        body: "Hi {{contact.firstName}},\n\nQuick recap of what our scan surfaced for {{contact.company}}:\n\n• {{exposure.count}} compromised credentials across multiple breach sources\n• Active dark-web mentions in the last 90 days\n• Recommended next steps: credential rotation, MFA enforcement, dark-web monitoring\n\nHappy to walk through specifics — does later this week work?\n\n— {{sender.firstName}}",
      },
      {
        name: "[Cadence] Renewal Check-in",
        body: "Hi {{contact.firstName}},\n\nIt's been a while since we last connected. Wanted to check in and see how things are going at {{contact.company}}, and whether you'd find a refreshed exposure scan useful.\n\nNo agenda — just a courtesy ping.\n\n— {{sender.firstName}}",
      },
      {
        name: "[Cadence] Event Follow-up",
        body: "Hi {{contact.firstName}},\n\nGreat meeting you at the event. As promised, I ran a quick exposure scan for {{contact.company}} — happy to share the findings on a short call.\n\nWhat does your week look like?\n\n— {{sender.firstName}}\n{{sender.company}}",
      },
    ];

    let created = 0;
    let skipped = 0;
    const now = Date.now();
    for (const t of templates) {
      if (existingNames.has(t.name)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("knowledgeBaseEntries", {
        companyId: args.companyId,
        createdByUserId: user._id,
        name: t.name,
        type: "rich_text",
        scope: "global",
        richTextContent: t.body,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }
    return { created, skipped };
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
    const user = await requireAuth(ctx);
    const { id, ...updates } = args;
    const entry = await ctx.db.get(id);
    if (!entry) throw new Error("Knowledge base entry not found");
    assertCompanyAccess(user.companyId, entry.companyId);

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
    const user = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Knowledge base entry not found");
    assertCompanyAccess(user.companyId, entry.companyId);

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
    const user = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Knowledge base entry not found");
    assertCompanyAccess(user.companyId, entry.companyId);

    await ctx.db.patch(args.id, {
      crawledContent: args.crawledContent,
      crawledAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const extractFromUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; content: string; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, content: "", error: "Unauthorized" };
    }

    const url = args.url.trim();
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      return { success: false, content: "", error: "URL must use https:// or http://" };
    }

    try {
      const parsed = new URL(url);
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]"];
      if (blockedHosts.includes(parsed.hostname) || parsed.hostname.startsWith("10.") || parsed.hostname.startsWith("192.168.") || parsed.hostname.startsWith("172.")) {
        return { success: false, content: "", error: "URL targets a private/internal address" };
      }
    } catch {
      return { success: false, content: "", error: "Invalid URL" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent": "CyberHook-Bot/1.0",
            Accept: "text/html,application/xhtml+xml,text/plain",
          },
          signal: controller.signal,
          redirect: "follow",
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError" || fetchErr.message?.includes("abort")) {
          return { success: false, content: "", error: "Request timed out — the website took too long to respond (15s limit)" };
        }
        if (fetchErr.cause?.code === "ENOTFOUND" || fetchErr.message?.includes("ENOTFOUND")) {
          return { success: false, content: "", error: "Domain not found — check the URL and try again" };
        }
        if (fetchErr.message?.includes("ECONNREFUSED")) {
          return { success: false, content: "", error: "Connection refused — the server is not accepting connections" };
        }
        if (fetchErr.message?.includes("certificate") || fetchErr.message?.includes("SSL") || fetchErr.message?.includes("CERT")) {
          return { success: false, content: "", error: "SSL/TLS error — the website has an invalid or expired certificate" };
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const statusMessages: Record<number, string> = {
          403: "Access denied — the website blocked our request",
          404: "Page not found — check the URL path",
          429: "Rate limited — the website is throttling requests, try again later",
          500: "Server error — the website is experiencing issues",
          502: "Bad gateway — the website is temporarily unavailable",
          503: "Service unavailable — the website is down or under maintenance",
        };
        const friendlyMsg = statusMessages[response.status] || `Failed to fetch URL (HTTP ${response.status})`;
        return { success: false, content: "", error: friendlyMsg };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/") && !contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("json")) {
        return { success: false, content: "", error: `Cannot extract text — the URL returned non-text content (${contentType.split(";")[0]})` };
      }

      const html = await response.text();

      if (!html || html.trim().length === 0) {
        return { success: false, content: "", error: "The page returned empty content" };
      }

      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join("\n");

      const truncated = text.slice(0, 15000);

      return { success: true, content: truncated };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return { success: false, content: "", error: "Request timed out — the website took too long to respond" };
      }
      return { success: false, content: "", error: `Extraction failed: ${msg}` };
    }
  },
});
