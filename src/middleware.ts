import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/admin/login(.*)",
  "/admin/session(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/stripe/webhook(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // CVE-2025-29927: Block middleware bypass attempts
  const subrequest = req.headers.get("x-middleware-subrequest");
  if (subrequest) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (req.nextUrl.pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL(isAdminRoute(req) ? "/admin/login" : "/", req.url));
  }

  // Clerk session token must include: { "metadata": "{{user.public_metadata}}" }
  // Configure this in Clerk Dashboard > Sessions > Edit session token
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const onboardingComplete = metadata?.onboardingComplete === true;

  if (!onboardingComplete && !isAdminRoute(req) && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (onboardingComplete && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
