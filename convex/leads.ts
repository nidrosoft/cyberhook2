import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    industry: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    let leads = await ctx.db
      .query("leads")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.createdByUserId) {
      leads = leads.filter((l) => l.createdByUserId === args.createdByUserId);
    }
    if (args.status) {
      leads = leads.filter((l) => l.status === args.status);
    }
    if (args.industry) {
      leads = leads.filter((l) => l.industry === args.industry);
    }

    leads.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      leads = leads.slice(0, args.limit);
    }

    return leads;
  },
});

export const getById = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead) return null;
    assertCompanyAccess(currentUser.companyId, lead.companyId);
    return lead;
  },
});

export const getByDomain = query({
  args: { domain: v.string(), companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .collect();

    return leads.find((l) => l.companyId === args.companyId) ?? null;
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

    let leads = await ctx.db
      .query("leads")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.createdByUserId) {
      leads = leads.filter((l) => l.createdByUserId === args.createdByUserId);
    }

    const total = leads.length;
    const byStatus: Record<string, number> = {};
    leads.forEach((l) => {
      const status = l.status || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = leads.filter((l) => l.createdAt > weekAgo).length;

    return { total, byStatus, newThisWeek };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    domain: v.string(),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    employeeCount: v.optional(v.string()),
    revenueRange: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    exposureCount: v.optional(v.number()),
    lastExposureDate: v.optional(v.number()),
    exposureSeverity: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    status: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    assertCompanyAccess(currentUser.companyId, args.companyId);

    const leadId = await ctx.db.insert("leads", {
      companyId: args.companyId,
      createdByUserId: args.createdByUserId,
      name: args.name,
      domain: args.domain,
      industry: args.industry,
      website: args.website,
      country: args.country,
      region: args.region,
      city: args.city,
      employeeCount: args.employeeCount,
      revenueRange: args.revenueRange,
      linkedinUrl: args.linkedinUrl,
      exposureCount: args.exposureCount,
      lastExposureDate: args.lastExposureDate,
      exposureSeverity: args.exposureSeverity,
      source: args.source,
      sourceId: args.sourceId,
      status: args.status || "new",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (args.contactName || args.contactEmail || args.contactPhone) {
      const nameParts = (args.contactName || "").trim().split(/\s+/);
      await ctx.db.insert("contacts", {
        companyId: args.companyId,
        leadId,
        createdByUserId: args.createdByUserId,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: args.contactEmail,
        phone: args.contactPhone,
        source: "manual",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return leadId;
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    employeeCount: v.optional(v.string()),
    revenueRange: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const { id, ...updates } = args;
    const lead = await ctx.db.get(id);
    if (!lead) throw new Error("Lead not found");
    assertCompanyAccess(currentUser.companyId, lead.companyId);

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
    id: v.id("leads"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("Lead not found");
    assertCompanyAccess(currentUser.companyId, lead.companyId);

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("Lead not found");
    assertCompanyAccess(currentUser.companyId, lead.companyId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ─── Internal Mutations ──────────────────────────────────────────────────────

export const createFromSearch = internalMutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    searchId: v.id("searches"),
    name: v.string(),
    domain: v.string(),
    exposureCount: v.number(),
    lastExposureDate: v.optional(v.number()),
    exposureSeverity: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if lead already exists
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      // Update existing lead with new exposure data
      await ctx.db.patch(existing._id, {
        exposureCount: args.exposureCount,
        lastExposureDate: args.lastExposureDate,
        exposureSeverity: args.exposureSeverity,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new lead
    const leadId = await ctx.db.insert("leads", {
      companyId: args.companyId,
      createdByUserId: args.createdByUserId,
      name: args.name,
      domain: args.domain,
      source: "live_search",
      sourceId: args.searchId,
      exposureCount: args.exposureCount,
      lastExposureDate: args.lastExposureDate,
      exposureSeverity: args.exposureSeverity,
      status: "new",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return leadId;
  },
});
