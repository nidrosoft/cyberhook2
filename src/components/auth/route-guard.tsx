"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermissions, canAccessRoute } from "@/hooks/use-permissions";

interface RouteGuardProps {
    children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading, isAuthenticated, hasConvexUser } = useCurrentUser();
    const { role } = usePermissions();

    useEffect(() => {
        if (isLoading) return;

        // Not authenticated - middleware handles this
        if (!isAuthenticated) return;

        // User is authenticated but has no Convex record - needs onboarding
        // This is handled by middleware checking onboardingComplete metadata
        if (!hasConvexUser) return;

        // Check user status
        if (user) {
            const status = user.status;

            // Pending approval — during testing, allow access after the
            // reminder screen.  Remove this bypass once the admin approval
            // flow is implemented and the client confirms the gate.
            if (status === "pending") {
                return;
            }

            // Rejected - redirect to rejection page (or sign out)
            if (status === "rejected") {
                if (pathname !== "/rejected") {
                    router.replace("/rejected");
                }
                return;
            }

            // Deactivated - redirect to deactivated page
            if (status === "deactivated") {
                if (pathname !== "/deactivated") {
                    router.replace("/deactivated");
                }
                return;
            }

            // User is approved - check route permissions
            if (status === "approved") {
                // If on pending-approval page but approved, redirect to dashboard
                if (pathname === "/pending-approval") {
                    router.replace("/dashboard");
                    return;
                }

                // Check if user has permission to access this route
                if (!canAccessRoute(pathname, role)) {
                    router.replace("/dashboard");
                    return;
                }
            }
        }
    }, [isLoading, isAuthenticated, hasConvexUser, user, role, pathname, router]);

    // Show nothing while loading to prevent flash
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                    <p className="text-sm text-tertiary">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
