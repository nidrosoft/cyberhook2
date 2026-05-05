"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function setOnboardingComplete(
    clerkUserId: string,
    convexUserId: string,
    convexCompanyId: string,
) {
    const { userId } = await auth();
    if (!userId || userId !== clerkUserId) {
        throw new Error("Unauthorized");
    }

    const client = await clerkClient();

    await client.users.updateUser(clerkUserId, {
        publicMetadata: {
            onboardingComplete: true,
            convexUserId,
            convexCompanyId,
        },
    });

    return { success: true };
}

/**
 * Mark a Clerk user's onboarding as complete and tag them as a super_admin.
 * Used by the admin login bootstrap flow so super admins skip the regular
 * company-onboarding wizard and middleware lets them through any route.
 */
export async function setPlatformAdminClaims(clerkUserId: string) {
    const { userId } = await auth();
    if (!userId || userId !== clerkUserId) {
        throw new Error("Unauthorized");
    }
    const client = await clerkClient();
    await client.users.updateUser(clerkUserId, {
        publicMetadata: {
            onboardingComplete: true,
            role: "super_admin",
        },
    });
    return { success: true };
}

/**
 * Server-side platform-admin email lookup. The Convex JWT template only
 * exposes `email` when the user's primary email is verified — for newly
 * provisioned admins the verified flag may not be set yet, so we resolve
 * the canonical email here using Clerk's Backend SDK and hand it to the
 * Convex bootstrap mutation. Returns the user's profile data so callers
 * don't need to fetch it separately.
 */
const PLATFORM_ADMIN_EMAILS = ["lbenshoshan@amsysis.com", "cyriac@nidrosoft.com"];

const PLATFORM_ADMIN_EMAILS_LIST = Array.from(
    new Set([
        ...PLATFORM_ADMIN_EMAILS,
        ...(process.env.SUPER_ADMIN_EMAILS ?? "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
    ]),
);

export async function getPlatformAdminProfile() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized: not signed in");

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Resolve the user's primary email (or first available email).
    const primaryEmail =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        "";
    const email = primaryEmail.toLowerCase();
    if (!email) throw new Error("Clerk account has no email on file");

    if (!PLATFORM_ADMIN_EMAILS_LIST.includes(email)) {
        throw new Error(`Email ${email} is not authorized as a platform admin`);
    }

    return {
        email,
        firstName: user.firstName ?? "Platform",
        lastName: user.lastName ?? "Admin",
        imageUrl: user.imageUrl ?? undefined,
    };
}
