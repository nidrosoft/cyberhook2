import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════════════
// USE CASES
// ═══════════════════════════════════════════════════════════════════════════

export const listUseCases = query({
  args: {
    companyId: v.id("companies"),
    isApprovedReference: v.optional(v.boolean()),
    industry: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let useCases = await ctx.db
      .query("useCases")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.isApprovedReference !== undefined) {
      useCases = useCases.filter((u) => u.isApprovedReference === args.isApprovedReference);
    }

    if (args.industry) {
      useCases = useCases.filter((u) => u.industry === args.industry);
    }

    useCases.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      useCases = useCases.slice(0, args.limit);
    }

    return useCases;
  },
});

export const getUseCaseById = query({
  args: { id: v.id("useCases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createUseCase = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    industry: v.optional(v.string()),
    headcount: v.optional(v.string()),
    revenue: v.optional(v.string()),
    problemStatement: v.optional(v.string()),
    scopeOfWork: v.optional(v.string()),
    howWeHelp: v.optional(v.string()),
    comparisonTable: v.optional(v.string()),
    valueAdds: v.optional(v.array(v.string())),
    isApprovedReference: v.optional(v.boolean()),
    referenceCompanyName: v.optional(v.string()),
    referenceContactName: v.optional(v.string()),
    referenceContactEmail: v.optional(v.string()),
    referenceContactPhone: v.optional(v.string()),
    referenceIndustry: v.optional(v.string()),
    referenceWebsite: v.optional(v.string()),
    referenceProjectsSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const useCaseId = await ctx.db.insert("useCases", {
      ...args,
      isApprovedReference: args.isApprovedReference ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return useCaseId;
  },
});

export const updateUseCase = mutation({
  args: {
    id: v.id("useCases"),
    title: v.optional(v.string()),
    industry: v.optional(v.string()),
    headcount: v.optional(v.string()),
    revenue: v.optional(v.string()),
    problemStatement: v.optional(v.string()),
    scopeOfWork: v.optional(v.string()),
    howWeHelp: v.optional(v.string()),
    comparisonTable: v.optional(v.string()),
    valueAdds: v.optional(v.array(v.string())),
    isApprovedReference: v.optional(v.boolean()),
    referenceCompanyName: v.optional(v.string()),
    referenceContactName: v.optional(v.string()),
    referenceContactEmail: v.optional(v.string()),
    referenceContactPhone: v.optional(v.string()),
    referenceIndustry: v.optional(v.string()),
    referenceWebsite: v.optional(v.string()),
    referenceProjectsSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const useCase = await ctx.db.get(id);
    if (!useCase) throw new Error("Use case not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return id;
  },
});

export const removeUseCase = mutation({
  args: { id: v.id("useCases") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const listCertifications = query({
  args: {
    companyId: v.id("companies"),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let certs = await ctx.db
      .query("certifications")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.category) {
      certs = certs.filter((c) => c.category === args.category);
    }

    if (args.status) {
      certs = certs.filter((c) => c.status === args.status);
    }

    certs.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      certs = certs.slice(0, args.limit);
    }

    return certs;
  },
});

export const getCertificationById = query({
  args: { id: v.id("certifications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getExpiringCertifications = query({
  args: {
    companyId: v.id("companies"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.daysAhead || 30;
    const futureDate = Date.now() + daysAhead * 24 * 60 * 60 * 1000;

    const certs = await ctx.db
      .query("certifications")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    return certs.filter(
      (c) => c.expiryDate && c.expiryDate <= futureDate && c.status !== "expired"
    );
  },
});

export const createCertification = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    category: v.union(
      v.literal("certification"),
      v.literal("insurance"),
      v.literal("award"),
      v.literal("accreditation"),
      v.literal("compliance"),
      v.literal("other")
    ),
    issuingAuthority: v.optional(v.string()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("pending"),
      v.literal("renewal_required")
    ),
    description: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
    documentFileId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const certId = await ctx.db.insert("certifications", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return certId;
  },
});

export const updateCertification = mutation({
  args: {
    id: v.id("certifications"),
    name: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("certification"),
      v.literal("insurance"),
      v.literal("award"),
      v.literal("accreditation"),
      v.literal("compliance"),
      v.literal("other")
    )),
    issuingAuthority: v.optional(v.string()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("pending"),
      v.literal("renewal_required")
    )),
    description: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
    documentFileId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cert = await ctx.db.get(id);
    if (!cert) throw new Error("Certification not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return id;
  },
});

export const removeCertification = mutation({
  args: { id: v.id("certifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// RFP TRACKER
// ═══════════════════════════════════════════════════════════════════════════

export const listRfpEntries = query({
  args: {
    companyId: v.id("companies"),
    status: v.optional(v.string()),
    assignedToUserId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db
      .query("rfpEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.status) {
      entries = entries.filter((e) => e.status === args.status);
    }

    if (args.assignedToUserId) {
      entries = entries.filter((e) => e.assignedToUserId === args.assignedToUserId);
    }

    // Sort by submission deadline
    entries.sort((a, b) => a.submissionDeadline - b.submissionDeadline);

    if (args.limit) {
      entries = entries.slice(0, args.limit);
    }

    return entries;
  },
});

export const getRfpEntryById = query({
  args: { id: v.id("rfpEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUpcomingDeadlines = query({
  args: {
    companyId: v.id("companies"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.daysAhead || 14;
    const futureDate = Date.now() + daysAhead * 24 * 60 * 60 * 1000;

    const entries = await ctx.db
      .query("rfpEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    return entries.filter(
      (e) =>
        e.submissionDeadline <= futureDate &&
        e.submissionDeadline >= Date.now() &&
        !["submitted", "won", "lost", "no_bid"].includes(e.status)
    );
  },
});

export const createRfpEntry = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    clientProspect: v.string(),
    submissionDeadline: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("no_bid")
    ),
    assignedToUserId: v.optional(v.id("users")),
    estimatedValue: v.optional(v.number()),
    notes: v.optional(v.string()),
    linkedUseCaseId: v.optional(v.id("useCases")),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert("rfpEntries", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return entryId;
  },
});

export const updateRfpEntry = mutation({
  args: {
    id: v.id("rfpEntries"),
    title: v.optional(v.string()),
    clientProspect: v.optional(v.string()),
    submissionDeadline: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("no_bid")
    )),
    assignedToUserId: v.optional(v.id("users")),
    estimatedValue: v.optional(v.number()),
    notes: v.optional(v.string()),
    linkedUseCaseId: v.optional(v.id("useCases")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const entry = await ctx.db.get(id);
    if (!entry) throw new Error("RFP entry not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return id;
  },
});

export const removeRfpEntry = mutation({
  args: { id: v.id("rfpEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// RFP ANSWER BANK
// ═══════════════════════════════════════════════════════════════════════════

export const listRfpAnswers = query({
  args: {
    companyId: v.id("companies"),
    questionCategory: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let answers = await ctx.db
      .query("rfpAnswers")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.questionCategory) {
      answers = answers.filter((a) => a.questionCategory === args.questionCategory);
    }

    answers.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      answers = answers.slice(0, args.limit);
    }

    return answers;
  },
});

export const createRfpAnswer = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    questionCategory: v.string(),
    answer: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const answerId = await ctx.db.insert("rfpAnswers", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return answerId;
  },
});

export const updateRfpAnswer = mutation({
  args: {
    id: v.id("rfpAnswers"),
    questionCategory: v.optional(v.string()),
    answer: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const answer = await ctx.db.get(id);
    if (!answer) throw new Error("RFP answer not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return id;
  },
});

export const removeRfpAnswer = mutation({
  args: { id: v.id("rfpAnswers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// RFP QUICK DOWNLOADS
// ═══════════════════════════════════════════════════════════════════════════

export const listRfpDownloads = query({
  args: {
    companyId: v.id("companies"),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let downloads = await ctx.db
      .query("rfpDownloads")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.category) {
      downloads = downloads.filter((d) => d.category === args.category);
    }

    downloads.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      downloads = downloads.slice(0, args.limit);
    }

    return downloads;
  },
});

export const createRfpDownload = mutation({
  args: {
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.optional(v.number()),
    fileMimeType: v.optional(v.string()),
    category: v.union(
      v.literal("capabilities_deck"),
      v.literal("security_whitepaper"),
      v.literal("compliance_evidence"),
      v.literal("insurance_certificate"),
      v.literal("case_studies"),
      v.literal("partner_overview"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    const downloadId = await ctx.db.insert("rfpDownloads", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return downloadId;
  },
});

export const removeRfpDownload = mutation({
  args: { id: v.id("rfpDownloads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
