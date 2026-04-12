import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    incidentType: v.optional(v.union(v.literal("ransomware"), v.literal("breach_notification"))),
    source: v.optional(v.string()),
    country: v.optional(v.string()),
    industry: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let incidents = await ctx.db
      .query("ransomIncidents")
      .order("desc")
      .collect();

    if (args.incidentType) {
      incidents = incidents.filter((i) => i.incidentType === args.incidentType);
    }

    if (args.source) {
      incidents = incidents.filter((i) => i.source === args.source);
    }

    if (args.country) {
      incidents = incidents.filter((i) => i.country === args.country);
    }

    if (args.industry) {
      incidents = incidents.filter((i) => i.industry === args.industry);
    }

    if (args.dateFrom) {
      incidents = incidents.filter((i) => i.attackDate >= args.dateFrom!);
    }

    if (args.dateTo) {
      incidents = incidents.filter((i) => i.attackDate <= args.dateTo!);
    }

    incidents.sort((a, b) => b.attackDate - a.attackDate);

    if (args.limit) {
      incidents = incidents.slice(0, args.limit);
    }

    return incidents;
  },
});

export const getById = query({
  args: { id: v.id("ransomIncidents") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    incidentType: v.optional(v.union(v.literal("ransomware"), v.literal("breach_notification"))),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let incidents = await ctx.db
      .query("ransomIncidents")
      .withIndex("by_attackDate")
      .order("desc")
      .take(args.limit || 20);

    if (args.incidentType) {
      incidents = incidents.filter((i) => i.incidentType === args.incidentType);
    }

    return incidents;
  },
});

export const getStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let incidents = await ctx.db
      .query("ransomIncidents")
      .collect();

    // Apply date filters
    if (args.dateFrom) {
      incidents = incidents.filter((i) => i.attackDate >= args.dateFrom!);
    }

    if (args.dateTo) {
      incidents = incidents.filter((i) => i.attackDate <= args.dateTo!);
    }

    const total = incidents.length;
    const ransomware = incidents.filter((i) => i.incidentType === "ransomware").length;
    const breachNotifications = incidents.filter((i) => i.incidentType === "breach_notification").length;

    // By country
    const byCountry: Record<string, number> = {};
    incidents.forEach((i) => {
      const country = i.country || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
    });

    // By industry
    const byIndustry: Record<string, number> = {};
    incidents.forEach((i) => {
      const industry = i.industry || "Unknown";
      byIndustry[industry] = (byIndustry[industry] || 0) + 1;
    });

    // By source
    const bySource: Record<string, number> = {};
    incidents.forEach((i) => {
      bySource[i.source] = (bySource[i.source] || 0) + 1;
    });

    // Last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = incidents.filter((i) => i.attackDate > weekAgo).length;

    // Last 30 days
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30Days = incidents.filter((i) => i.attackDate > monthAgo).length;

    return {
      total,
      ransomware,
      breachNotifications,
      byCountry,
      byIndustry,
      bySource,
      last7Days,
      last30Days,
    };
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const searchTerm = args.query.toLowerCase();
    
    let incidents = await ctx.db
      .query("ransomIncidents")
      .collect();

    // Filter by search term
    incidents = incidents.filter((i) => 
      i.companyName.toLowerCase().includes(searchTerm) ||
      i.domain?.toLowerCase().includes(searchTerm) ||
      i.ransomwareGroup?.toLowerCase().includes(searchTerm) ||
      i.industry?.toLowerCase().includes(searchTerm)
    );

    // Sort by attack date
    incidents.sort((a, b) => b.attackDate - a.attackDate);

    // Apply limit
    if (args.limit) {
      incidents = incidents.slice(0, args.limit);
    }

    return incidents;
  },
});

// ─── Internal Mutations (for data ingestion) ─────────────────────────────────

export const internalCreate = internalMutation({
  args: {
    companyName: v.string(),
    domain: v.optional(v.string()),
    industry: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    attackDate: v.number(),
    ransomwareGroup: v.optional(v.string()),
    incidentType: v.union(v.literal("ransomware"), v.literal("breach_notification")),
    source: v.union(
      v.literal("ransomware_live"),
      v.literal("hhs_ocr"),
      v.literal("privacy_rights"),
      v.literal("california_ag"),
      v.literal("other")
    ),
    individualsAffected: v.optional(v.number()),
    breachType: v.optional(v.string()),
    breachVector: v.optional(v.string()),
    filedDate: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Deduplicate: skip if an incident with the same company, source, and date already exists
    const existing = await ctx.db
      .query("ransomIncidents")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .filter((q) =>
        q.and(
          q.eq(q.field("companyName"), args.companyName),
          q.eq(q.field("attackDate"), args.attackDate)
        )
      )
      .first();

    if (existing) return existing._id;

    const incidentId = await ctx.db.insert("ransomIncidents", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return incidentId;
  },
});

export const internalBulkCreate = internalMutation({
  args: {
    incidents: v.array(v.object({
      companyName: v.string(),
      domain: v.optional(v.string()),
      industry: v.optional(v.string()),
      country: v.optional(v.string()),
      region: v.optional(v.string()),
      attackDate: v.number(),
      ransomwareGroup: v.optional(v.string()),
      incidentType: v.union(v.literal("ransomware"), v.literal("breach_notification")),
      source: v.union(
        v.literal("ransomware_live"),
        v.literal("hhs_ocr"),
        v.literal("privacy_rights"),
        v.literal("california_ag"),
        v.literal("other")
      ),
      individualsAffected: v.optional(v.number()),
      breachType: v.optional(v.string()),
      breachVector: v.optional(v.string()),
      filedDate: v.optional(v.number()),
      sourceUrl: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const incident of args.incidents) {
      // Deduplicate: skip if an incident with the same company, source, and date already exists
      const existing = await ctx.db
        .query("ransomIncidents")
        .withIndex("by_source", (q) => q.eq("source", incident.source))
        .filter((q) =>
          q.and(
            q.eq(q.field("companyName"), incident.companyName),
            q.eq(q.field("attackDate"), incident.attackDate)
          )
        )
        .first();

      if (existing) continue;

      const id = await ctx.db.insert("ransomIncidents", {
        ...incident,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
