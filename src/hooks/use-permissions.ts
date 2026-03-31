"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export type UserRole = "sales_rep" | "sales_admin" | "billing";

export interface Permissions {
    // Search & Data
    canRunSearch: boolean;
    canViewOwnMetrics: boolean;
    canViewTeamMetrics: boolean;
    canViewSearchHistory: boolean;

    // User Management
    canManageUsers: boolean;
    canApproveUsers: boolean;

    // Company & Settings
    canManageCompanyProfile: boolean;
    canManageIntegrations: boolean;
    canViewAuditLog: boolean;

    // Billing
    canViewBilling: boolean;
    canManageBilling: boolean;

    // Content
    canCreateLeads: boolean;
    canCreateCampaigns: boolean;
    canCreateWatchlistItems: boolean;
    canCreateTasks: boolean;
    canCreatePersonalContent: boolean;
    canCreateGlobalContent: boolean;
    canApproveReferences: boolean;

    // Data Scope
    dataScope: "own" | "all";
}

export function usePermissions() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

    const convexUser = useQuery(
        api.users.getByClerkId,
        isClerkLoaded && clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
    );

    const isLoading = !isClerkLoaded || convexUser === undefined;
    const role = convexUser?.role as UserRole | undefined;

    const permissions: Permissions = {
        // Search & Data
        canRunSearch: role === "sales_rep" || role === "sales_admin",
        canViewOwnMetrics: role === "sales_rep" || role === "sales_admin",
        canViewTeamMetrics: role === "sales_admin",
        canViewSearchHistory: role === "sales_admin",

        // User Management
        canManageUsers: role === "sales_admin",
        canApproveUsers: role === "sales_admin",

        // Company & Settings
        canManageCompanyProfile: role === "sales_admin",
        canManageIntegrations: role === "sales_admin",
        canViewAuditLog: role === "sales_admin",

        // Billing
        canViewBilling: role === "sales_admin" || role === "billing",
        canManageBilling: role === "sales_admin",

        // Content
        canCreateLeads: role === "sales_rep" || role === "sales_admin",
        canCreateCampaigns: role === "sales_rep" || role === "sales_admin",
        canCreateWatchlistItems: role === "sales_rep" || role === "sales_admin",
        canCreateTasks: role === "sales_rep" || role === "sales_admin",
        canCreatePersonalContent: role === "sales_rep" || role === "sales_admin",
        canCreateGlobalContent: role === "sales_admin",
        canApproveReferences: role === "sales_admin",

        // Data Scope
        dataScope: role === "sales_admin" ? "all" : "own",
    };

    return {
        role,
        permissions,
        isLoading,
        user: convexUser,
    };
}

// Route permission mapping
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
    "/": ["sales_rep", "sales_admin", "billing"],
    "/dashboard": ["sales_rep", "sales_admin", "billing"],
    "/todos": ["sales_rep", "sales_admin"],
    "/ransom-hub": ["sales_rep", "sales_admin"],
    "/live-search": ["sales_rep", "sales_admin"],
    "/live-leads": ["sales_rep", "sales_admin"],
    "/watchlist": ["sales_rep", "sales_admin"],
    "/ai-agents": ["sales_rep", "sales_admin"],
    "/knowledge-base": ["sales_rep", "sales_admin"],
    "/rfp-hub": ["sales_rep", "sales_admin"],
    "/rfp-hub/use-cases": ["sales_rep", "sales_admin"],
    "/rfp-hub/certifications": ["sales_rep", "sales_admin"],
    "/rfp-hub/tracker": ["sales_rep", "sales_admin"],
    "/events": ["sales_rep", "sales_admin"],
    "/reporting": ["sales_rep", "sales_admin"],
    "/settings": ["sales_admin"],
    "/settings/profile": ["sales_admin"],
    "/settings/users": ["sales_admin"],
    "/settings/integrations": ["sales_admin"],
    "/settings/audit-log": ["sales_admin"],
    "/billing": ["sales_admin", "billing"],
};

export function canAccessRoute(route: string, role: UserRole | undefined): boolean {
    if (!role) return false;
    const allowedRoles = ROUTE_PERMISSIONS[route];
    if (!allowedRoles) return true; // Allow access to routes not in the map
    return allowedRoles.includes(role);
}
