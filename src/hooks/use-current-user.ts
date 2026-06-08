"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../convex/_generated/dataModel";

export interface CurrentUser {
    _id: Id<"users">;
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    imageUrl?: string;
    companyId: Id<"companies">;
    role: "sales_rep" | "sales_admin" | "billing";
    status: "pending" | "approved" | "rejected" | "deactivated";
    timezone?: string;
    emailNotifications?: boolean;
    inAppNotifications?: boolean;
    slackNotifications?: boolean;
    teamsNotifications?: boolean;
    notificationFrequency?: string;
    criticalAlertsOnly?: boolean;
    guidedTourCompleted?: boolean;
    guidedTourCompletedAt?: number;
    tourProgress?: {
        completed: boolean;
        skipped: boolean;
        lastSection?: string;
        lastStepIndex?: number;
        completedSections?: string[];
        updatedAt: number;
    };
    createdAt: number;
    updatedAt: number;
    lastAccessedAt?: number;
}

export function useCurrentUser() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

    // Convex-side auth state. This is only `true` once the Convex client has
    // a *verified* auth token attached — which can lag behind Clerk being
    // "loaded" (e.g. right after sign-in, on refresh, or after a token
    // expiry/refresh). `getByClerkId` itself doesn't require auth, so
    // `companyId` can resolve before the token is ready; any query that calls
    // `requireAuth` (e.g. tasks.getStats) must therefore gate on
    // `isConvexAuthenticated` to avoid a transient "Unauthorized" throw that
    // trips the global error boundary.
    const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();

    const convexUser = useQuery(
        api.users.getByClerkId,
        isClerkLoaded && clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
    );

    const isLoading = !isClerkLoaded || convexUser === undefined;
    const isAuthenticated = isClerkLoaded && !!clerkUser;
    const hasConvexUser = !!convexUser;

    return {
        user: convexUser as CurrentUser | null,
        clerkUser,
        isLoading,
        isAuthenticated,
        // True only when the Convex auth token is attached + verified. Use
        // this to gate `useQuery`/`useMutation` calls that hit `requireAuth`.
        isConvexAuthenticated,
        isConvexAuthLoading,
        hasConvexUser,
        // Convenience getters
        userId: convexUser?._id,
        companyId: convexUser?.companyId,
        role: convexUser?.role,
        status: convexUser?.status,
        fullName: convexUser ? `${convexUser.firstName} ${convexUser.lastName}` : undefined,
    };
}
