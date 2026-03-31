"use client";

import { useQuery } from "convex/react";
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
    guidedTourCompleted?: boolean;
    createdAt: number;
    updatedAt: number;
    lastAccessedAt?: number;
}

export function useCurrentUser() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

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
        hasConvexUser,
        // Convenience getters
        userId: convexUser?._id,
        companyId: convexUser?.companyId,
        role: convexUser?.role,
        status: convexUser?.status,
        fullName: convexUser ? `${convexUser.firstName} ${convexUser.lastName}` : undefined,
    };
}
