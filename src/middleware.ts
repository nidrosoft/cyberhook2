import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isPendingRoute = createRouteMatcher(["/pending-approval(.*)"]);
const isDeactivatedRoute = createRouteMatcher(["/deactivated(.*)"]);
const isRejectedRoute = createRouteMatcher(["/rejected(.*)"]);
const isAuthRoute = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = new URL("/", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
