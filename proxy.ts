// IMPORTANT: For sessionClaims.metadata to work, configure your Clerk Dashboard:
// Sessions → Customize session token → add: { "metadata": "{{user.public_metadata}}" }
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isStatusRoute = createRouteMatcher([
    "/pending-approval",
    "/rejected",
    "/deactivated",
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth();

    // If user is not signed in and trying to access a protected route, redirect to sign-in
    if (!userId && !isPublicRoute(req)) {
        const signInUrl = new URL("/", req.url);
        return Response.redirect(signInUrl);
    }

    // If user is signed in
    if (userId) {
        // Check if onboarding is complete (stored in public metadata via session claims)
        const onboardingComplete = (sessionClaims?.metadata as { onboardingComplete?: boolean })?.onboardingComplete;

        // If onboarding is not complete and user is not on onboarding/status page, redirect to onboarding
        if (!onboardingComplete && !isOnboardingRoute(req) && !isPublicRoute(req) && !isStatusRoute(req)) {
            const onboardingUrl = new URL("/onboarding", req.url);
            return Response.redirect(onboardingUrl);
        }

        // If onboarding is complete and user is on auth page, redirect to dashboard
        // The RouteGuard component will handle further status checks (pending/rejected)
        if (onboardingComplete && isPublicRoute(req) && req.nextUrl.pathname === "/") {
            const dashboardUrl = new URL("/dashboard", req.url);
            return Response.redirect(dashboardUrl);
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
