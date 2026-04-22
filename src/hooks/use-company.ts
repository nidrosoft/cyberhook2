"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "./use-current-user";
import type { Id } from "../../convex/_generated/dataModel";

export interface Company {
    _id: Id<"companies">;
    name: string;
    phone: string;
    website?: string;
    logoUrl?: string;
    primaryBusinessModel: string;
    secondaryBusinessModel?: string;
    annualRevenue: string;
    geographicCoverage: string[];
    targetCustomerBase: string[];
    totalEmployees?: string;
    totalSalesPeople?: string;
    // V2 fields
    locationId?: string;
    companyType?: string;
    supportEmail?: string;
    salesEmail?: string;
    supportPhone?: string;
    salesPhone?: string;
    salesTeamSize?: string;
    locations?: Array<{
        id: string;
        label: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
        isHeadquarters: boolean;
    }>;
    // Brand & service area
    brandPrimaryColor?: string;
    brandSecondaryColor?: string;
    serviceArea?: string[];
    // Service-area center + radius (orange item 3.4).
    serviceAreaRadius?: {
        centerAddress?: string;
        centerLat?: number;
        centerLng?: number;
        radius?: number;
        unit?: "miles" | "km";
        noLimit?: boolean;
    };
    // Associations & programs
    associations?: string[];
    programs?: string[];
    // Targets
    mrrTarget?: number;
    appointmentTarget?: number;
    defaultTimezone?: string;
    defaultCurrency?: string;
    // Tokens
    tokenAllocation: number;
    tokensUsed: number;
    tokenResetDate: number;
    // Plan-based usage tracking
    searchesUsed?: number;
    reportsUsed?: number;
    usageResetDate?: number;
    planSelectedManually?: boolean;
    // Billing
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    planId?: string;
    planStatus?: string;
    trialEndsAt?: number;
    status: "trial" | "active" | "past_due" | "cancelled" | "pending_approval";
    // Redrok API
    redrokEmail?: string;
    redrokToken?: string;
    redrokTokenExpiresAt?: number;
    // Timestamps
    createdAt: number;
    updatedAt?: number;
}

export function useCompany() {
    const { companyId, isLoading: isUserLoading } = useCurrentUser();

    const company = useQuery(api.companies.getCurrentCompany);

    const isLoading = isUserLoading || company === undefined;

    // Token calculations
    const tokensRemaining = company ? company.tokenAllocation - company.tokensUsed : 0;
    const tokenPercentage = company ? (tokensRemaining / company.tokenAllocation) * 100 : 0;
    const tokenStatus: "healthy" | "warning" | "critical" = 
        tokenPercentage > 50 ? "healthy" : 
        tokenPercentage > 20 ? "warning" : "critical";

    // Days until token reset
    const daysUntilReset = company 
        ? Math.ceil((company.tokenResetDate - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
        company: company as Company | null,
        isLoading,
        // Token helpers
        tokensRemaining,
        tokenAllocation: company?.tokenAllocation ?? 0,
        tokensUsed: company?.tokensUsed ?? 0,
        tokenPercentage,
        tokenStatus,
        daysUntilReset,
        // Status helpers
        isTrialing: company?.status === "trial",
        isActive: company?.status === "active",
        isPastDue: company?.status === "past_due",
        isPendingApproval: company?.status === "pending_approval",
    };
}
