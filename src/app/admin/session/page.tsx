"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { getPlatformAdminProfile, setPlatformAdminClaims } from "@/app/actions/clerk";

/**
 * Post-sign-in handoff: ensures the Clerk-authed super admin has a Convex
 * user record (provisioned on the fly) and that their Clerk publicMetadata
 * marks them as `onboardingComplete: true` so the middleware never tries
 * to send them through the regular onboarding wizard. Then routes to the
 * super admin console.
 */
export default function AdminSessionPage() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();
    const bootstrapSelf = useMutation(api.superAdmin.bootstrapSelf);
    const [error, setError] = useState<string | null>(null);
    const ranRef = useRef(false);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn || !userId) {
            router.replace("/admin/login");
            return;
        }
        if (ranRef.current) return;
        ranRef.current = true;

        (async () => {
            try {
                // Resolve the verified email + names server-side using Clerk
                // Backend SDK (works for unverified primary emails too).
                const profile = await getPlatformAdminProfile();
                await bootstrapSelf({
                    email: profile.email,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    imageUrl: profile.imageUrl,
                });
                // Mark Clerk metadata so middleware lets the admin through
                // any route without onboarding redirects.
                await setPlatformAdminClaims(userId);
                router.replace("/admin/pending-accounts");
            } catch (err) {
                ranRef.current = false;
                setError(err instanceof Error ? err.message : "Bootstrap failed.");
            }
        })();
    }, [isLoaded, isSignedIn, userId, bootstrapSelf, router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-secondary_subtle p-4">
            <div className="rounded-xl border border-secondary bg-primary p-8 text-center shadow-sm max-w-md">
                <h1 className="text-display-xs font-semibold text-primary">Preparing admin console…</h1>
                <p className="mt-2 text-sm text-tertiary">
                    Provisioning your platform admin profile.
                </p>
                {error && (
                    <p className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                        {error}
                    </p>
                )}
            </div>
        </main>
    );
}
