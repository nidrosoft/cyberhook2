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
