"use server";

import { clerkClient } from "@clerk/nextjs/server";

export async function setOnboardingComplete(
    clerkUserId: string,
    convexUserId: string,
    convexCompanyId: string,
) {
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
