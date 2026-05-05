import { v } from "convex/values";
import { mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getPlanLimits, getTokenAllocationForPlan, DEFAULT_PLAN } from "./lib/plans";
import type { PlanTier } from "./lib/plans";

function requireText(value: string, message: string) {
  if (!value || !value.trim()) {
    throw new Error(message);
  }
}

function requireNonEmptyArray(value: string[], message: string) {
  if (!value || value.length === 0 || value.every((item) => !item.trim())) {
    throw new Error(message);
  }
}

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
    logoStorageId: v.optional(v.id("_storage")),
    teamEmails: v.optional(v.array(v.string())),
    // Plan selection (Step 4)
    selectedPlanId: v.optional(v.string()),
    planSelectedManually: v.optional(v.boolean()),
    // Payment method presence (client-verified card fields).
    // When Stripe Elements is wired server-side, replace with paymentMethodId.
    paymentMethodProvided: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }
    if (identity.subject !== args.clerkId) {
      throw new Error("Unauthorized: identity mismatch");
    }

    // Server-side enforcement of signup requirements (see 1.3):
    // - a plan must have been explicitly selected on step 4
    // - a payment method must have been provided
    // These flags are set by the client after validation; we reject blank submits
    // to prevent callers from bypassing the UI.
    if (!args.planSelectedManually) {
      throw new Error("Please select a plan before starting your trial.");
    }
    if (!args.paymentMethodProvided) {
      throw new Error("Payment details are required to start your trial.");
    }
    requireText(args.companyName, "Company name is required.");
    requireText(args.phone, "Phone number is required.");
    requireText(args.website, "Website is required.");
    requireText(args.primaryBusinessModel, "Primary business model is required.");
    requireText(args.annualRevenue, "Annual revenue is required.");
    requireNonEmptyArray(args.geographicCoverage, "Select at least one geographic coverage area.");
    requireNonEmptyArray(args.targetCustomerBase, "Select at least one target customer segment.");
    requireText(args.totalEmployees, "Total employees is required.");
    requireText(args.totalSalesPeople, "Total sales people is required.");

    const now = Date.now();
    const planId = (args.selectedPlanId === "solo" || args.selectedPlanId === "growth" || args.selectedPlanId === "scale")
      ? args.selectedPlanId as PlanTier
      : DEFAULT_PLAN;
    const limits = getPlanLimits(planId);
    const tokenAllocation = getTokenAllocationForPlan(planId);
    const tokenResetDate = now + 7 * 24 * 60 * 60 * 1000;
    const usageResetDate = now + 30 * 24 * 60 * 60 * 1000;

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
      logoStorageId: args.logoStorageId,
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
      tokenAllocation,
      tokensUsed: 0,
      tokenResetDate,
      searchesUsed: 0,
      reportsUsed: 0,
      usageResetDate,
      planId,
      planSelectedManually: args.planSelectedManually ?? false,
      status: "trial",
      createdAt: now,
      updatedAt: now,
    });

    // Create user as sales_admin (first user / company owner waits for platform approval)
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      companyId,
      role: "sales_admin",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Set company owner
    await ctx.db.patch(companyId, {
      ownerId: userId,
    });

    // Send welcome email to the new user
    await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
      email: args.email,
      firstName: args.firstName,
      companyName: args.companyName,
    });

    // Create invitations for team members (if any)
    if (args.teamEmails && args.teamEmails.length > 0) {
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days
      const inviterName = `${args.firstName} ${args.lastName}`;

      for (const email of args.teamEmails) {
        if (email && email.trim() && email !== args.email) {
          const invitationId = await ctx.db.insert("invitations", {
            companyId,
            email: email.trim().toLowerCase(),
            role: "sales_rep",
            status: "pending",
            invitedByUserId: userId,
            expiresAt,
            createdAt: now,
            emailDeliveryStatus: "pending",
          });

          // Send invite email to each team member
          await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmailInternal, {
            invitationId,
            inviterName,
            companyName: args.companyName,
            inviteeEmail: email.trim().toLowerCase(),
            role: "sales_rep",
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
