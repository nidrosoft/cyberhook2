import { v } from "convex/values";
import { mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Complete onboarding - creates company and user records
export const completeOnboarding = mutation({
  args: {
    // Clerk user info
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.optional(v.string()),
    // Company info (Step 1)
    companyName: v.string(),
    phone: v.string(),
    website: v.string(),
    // Business details (Step 2)
    primaryBusinessModel: v.string(),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.string(),
    geographicCoverage: v.array(v.string()),
    targetCustomerBase: v.array(v.string()),
    totalEmployees: v.string(),
    totalSalesPeople: v.string(),
    // Optional fields
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Team & Branding (Step 3)
    logoUrl: v.optional(v.string()),
    teamEmails: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }
    if (identity.subject !== args.clerkId) {
      throw new Error("Unauthorized: identity mismatch");
    }

    const now = Date.now();
    const defaultTokenAllocation = 1000;
    const tokenResetDate = now + 30 * 24 * 60 * 60 * 1000;

    // Check if user already exists (idempotent — safe to re-call)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return {
        success: true,
        userId: existingUser._id,
        companyId: existingUser.companyId,
        message: "User already exists",
      };
    }

    const locationId = "LOC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create company
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      phone: args.phone,
      website: args.website,
      logoUrl: args.logoUrl,
      primaryBusinessModel: args.primaryBusinessModel,
      secondaryBusinessModel: args.secondaryBusinessModel,
      annualRevenue: args.annualRevenue,
      geographicCoverage: args.geographicCoverage,
      targetCustomerBase: args.targetCustomerBase,
      totalEmployees: args.totalEmployees,
      totalSalesPeople: args.totalSalesPeople,
      country: args.country,
      streetAddress: args.streetAddress,
      notes: args.notes,
      locationId,
      // Create initial location if address provided
      locations: args.streetAddress
        ? [
            {
              id: crypto.randomUUID(),
              label: "Headquarters",
              address: args.streetAddress,
              city: args.city,
              state: args.state,
              country: args.country,
              zipCode: args.zipCode,
              isHeadquarters: true,
            },
          ]
        : undefined,
      tokenAllocation: defaultTokenAllocation,
      tokensUsed: 0,
      tokenResetDate,
      status: "trial",
      createdAt: now,
      updatedAt: now,
    });

    // Create user as sales_admin (first user / company owner is always admin + auto-approved)
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      companyId,
      role: "sales_admin",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    });

    // Set company owner
    await ctx.db.patch(companyId, {
      ownerId: userId,
    });

    // Create invitations for team members (if any)
    if (args.teamEmails && args.teamEmails.length > 0) {
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const email of args.teamEmails) {
        if (email && email.trim() && email !== args.email) {
          await ctx.db.insert("invitations", {
            companyId,
            email: email.trim().toLowerCase(),
            role: "sales_rep",
            status: "pending",
            invitedByUserId: userId,
            expiresAt,
            createdAt: now,
          });
        }
      }
    }

    return {
      success: true,
      userId,
      companyId,
      message: "Onboarding completed successfully",
    };
  },
});

// Check if user has completed onboarding
export const checkOnboardingStatus = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }
    if (identity.subject !== args.clerkId) {
      throw new Error("Unauthorized: identity mismatch");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return {
        hasCompletedOnboarding: false,
        status: null,
        user: null,
        company: null,
      };
    }

    const company = await ctx.db.get(user.companyId);

    return {
      hasCompletedOnboarding: true,
      status: user.status,
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      company: company
        ? {
            id: company._id,
            name: company.name,
            status: company.status,
          }
        : null,
    };
  },
});

// Update onboarding data (for editing during onboarding flow)
export const updateOnboardingData = mutation({
  args: {
    companyId: v.id("companies"),
    // Company info
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    // Business details
    primaryBusinessModel: v.optional(v.string()),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.optional(v.string()),
    geographicCoverage: v.optional(v.array(v.string())),
    targetCustomerBase: v.optional(v.array(v.string())),
    totalEmployees: v.optional(v.string()),
    totalSalesPeople: v.optional(v.string()),
    // Location
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }

    const callingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!callingUser || callingUser.companyId !== args.companyId) {
      throw new Error("Forbidden: access denied");
    }

    const { companyId, companyName, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = {};
    
    if (companyName !== undefined) {
      filteredUpdates.name = companyName;
    }
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(companyId, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
