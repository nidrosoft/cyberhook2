import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getByLeadId = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Not found");
    assertCompanyAccess(user.companyId, lead.companyId);

    return await ctx.db
      .query("contacts")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
      .collect();
  },
});

export const getByCompanyId = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    return await ctx.db
      .query("contacts")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// ─── Mutations (orange item 4.1 — Contacts repository) ──────────────────────

/** Create a single contact. Optionally links to a lead by id. */
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    companyName: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    const now = Date.now();
    return await ctx.db.insert("contacts", {
      companyId: args.companyId,
      createdByUserId: user._id,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email?.trim().toLowerCase() || undefined,
      phone: args.phone?.trim() || undefined,
      title: args.title?.trim() || undefined,
      companyName: args.companyName?.trim() || undefined,
      linkedinUrl: args.linkedinUrl?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      leadId: args.leadId,
      source: args.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Bulk import contacts from CSV. Dedupes within company by email. */
export const bulkImport = mutation({
  args: {
    companyId: v.id("companies"),
    rows: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        title: v.optional(v.string()),
        companyName: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    // Pull existing emails for the company so we dedupe in-place.
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    const seen = new Set(
      existing
        .map((c) => c.email?.toLowerCase().trim())
        .filter((e): e is string => Boolean(e))
    );

    const now = Date.now();
    let created = 0;
    let skipped = 0;
    for (const row of args.rows) {
      const email = row.email?.trim().toLowerCase();
      // Dedupe by email when present.
      if (email && seen.has(email)) {
        skipped++;
        continue;
      }
      if (!row.firstName.trim() && !row.lastName.trim() && !email) {
        skipped++;
        continue;
      }
      await ctx.db.insert("contacts", {
        companyId: args.companyId,
        createdByUserId: user._id,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: email || undefined,
        phone: row.phone?.trim() || undefined,
        title: row.title?.trim() || undefined,
        companyName: row.companyName?.trim() || undefined,
        linkedinUrl: row.linkedinUrl?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
        source: "csv_import",
        createdAt: now,
        updatedAt: now,
      });
      if (email) seen.add(email);
      created++;
    }
    return { created, skipped };
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    companyName: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact not found");
    assertCompanyAccess(user.companyId, contact.companyId);

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact not found");
    assertCompanyAccess(user.companyId, contact.companyId);
    await ctx.db.delete(args.id);
  },
});
