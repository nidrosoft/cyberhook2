"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle, AlertCircle, Clock, LogOut01 } from "@untitledui/icons";

import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/base/buttons/button";
import { CyberHookLogo } from "@/components/foundations/logo/cyberhook-logo";
import { setOnboardingComplete } from "@/app/actions/clerk";
import { friendlyError } from "@/lib/friendly-errors";

const isDev = process.env.NODE_ENV === "development";

function AcceptInviteInner() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token") ?? "";

    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const { user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const invitation = useQuery(api.invitations.getByToken, token ? { token } : "skip");
    const acceptInvitation = useMutation(api.invitations.acceptInvitation);

    const [status, setStatus] = useState<"idle" | "accepting" | "joined" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<"already_member" | "joined_approved" | "joined_pending" | null>(null);

    const expired = useMemo(() => {
        if (!invitation) return false;
        if (invitation.status === "expired") return true;
        return invitation.expiresAt < Date.now();
    }, [invitation]);

    const cancelled = invitation?.status === "cancelled";
    const alreadyAccepted = invitation?.status === "accepted";

    const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
    const mismatch =
        isSignedIn && invitation && clerkEmail && clerkEmail !== invitation.email.toLowerCase();

    useEffect(() => {
        if (!authLoaded) return;
        if (!token) return;
        if (invitation === undefined) return; // query still loading
        if (invitation === null) return; // invalid token; we render the error UI
        if (!isSignedIn) return;
        if (mismatch) return;
        if (expired || cancelled || alreadyAccepted) return;
        if (status !== "idle") return;

        (async () => {
            setStatus("accepting");
            try {
                const result = await acceptInvitation({ token });
                if (clerkUser?.id) {
                    try {
                        await setOnboardingComplete(clerkUser.id, result.userId, result.companyId);
                        // Refresh the Clerk session so the middleware sees the
                        // updated metadata immediately and doesn't bounce us
                        // back to /onboarding on the next navigation.
                        await clerkUser.reload?.();
                    } catch (err) {
                        if (isDev) console.error("setOnboardingComplete failed:", err);
                    }
                }
                setOutcome(result.outcome);
                setStatus("joined");
            } catch (err) {
                if (isDev) console.error("acceptInvitation failed:", err);
                setErrorMessage(friendlyError(err, "We couldn't accept this invitation."));
                setStatus("error");
            }
        })();
    }, [
        authLoaded,
        isSignedIn,
        invitation,
        token,
        expired,
        cancelled,
        alreadyAccepted,
        mismatch,
        status,
        acceptInvitation,
        clerkUser,
    ]);

    useEffect(() => {
        if (status !== "joined" || !outcome) return;
        const target = outcome === "joined_pending" ? "/pending-approval" : "/dashboard";
        const t = setTimeout(() => {
            window.location.href = target;
        }, 1800);
        return () => clearTimeout(t);
    }, [status, outcome]);

    const signInUrl = useMemo(() => {
        const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
        return `/?return_to=${encodeURIComponent(returnTo)}`;
    }, [token]);

    return (
        <section className="flex min-h-screen items-center justify-center bg-primary p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <CyberHookLogo className="h-8 w-auto" />
                </div>

                <div className="rounded-2xl border border-secondary bg-primary p-8 shadow-sm">
                    {/* Missing token */}
                    {!token && (
                        <FailureState
                            title="Invalid invitation link"
                            message="This link is missing the token needed to accept the invitation. Ask your administrator to resend the invite."
                        />
                    )}

                    {/* Invitation lookup in progress */}
                    {token && invitation === undefined && <LoadingState message="Validating your invitation…" />}

                    {/* Bad token */}
                    {token && invitation === null && (
                        <FailureState
                            title="Invitation not found"
                            message="This invitation link is invalid or has been revoked. Ask the person who invited you to send a new one."
                        />
                    )}

                    {/* Cancelled */}
                    {invitation && cancelled && (
                        <FailureState
                            title="Invitation cancelled"
                            message="This invitation was cancelled by the administrator. Ask them to send a new invite if you still need access."
                        />
                    )}

                    {/* Expired */}
                    {invitation && !cancelled && expired && (
                        <FailureState
                            title="Invitation expired"
                            message="This invitation link has expired. Ask your administrator to resend the invite from Settings → Team."
                        />
                    )}

                    {/* Already accepted */}
                    {invitation && alreadyAccepted && (
                        <SuccessState
                            title="Already accepted"
                            message="You've already accepted this invitation. Continue to your dashboard."
                            ctaLabel="Go to dashboard"
                            onClick={() => (window.location.href = "/dashboard")}
                        />
                    )}

                    {/* Not signed in */}
                    {invitation && !cancelled && !expired && !alreadyAccepted && authLoaded && !isSignedIn && (
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
                                <CheckCircle className="h-8 w-8 text-brand-600" />
                            </div>
                            <h1 className="text-display-sm font-semibold text-primary">
                                You've been invited to {invitation.companyName ?? "CyberHook AI"}
                            </h1>
                            <p className="mt-3 max-w-sm text-md text-secondary">
                                {invitation.inviterName ? `${invitation.inviterName} ` : "An administrator "}
                                invited <strong className="text-primary">{invitation.email}</strong> to join their team.
                            </p>
                            <p className="mt-4 text-sm text-tertiary">
                                Sign in or create a CyberHook AI account with <strong>{invitation.email}</strong> to accept.
                            </p>
                            <Button
                                size="lg"
                                color="primary"
                                className="mt-6 w-full"
                                onClick={() => router.push(signInUrl)}
                            >
                                Continue to sign in
                            </Button>
                        </div>
                    )}

                    {/* Signed in with the wrong account */}
                    {invitation && mismatch && (
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
                                <AlertCircle className="h-8 w-8 text-warning-600" />
                            </div>
                            <h1 className="text-display-sm font-semibold text-primary">Wrong account</h1>
                            <p className="mt-3 max-w-sm text-md text-secondary">
                                You're signed in as <strong className="text-primary">{clerkEmail}</strong>, but this invitation was sent to <strong className="text-primary">{invitation.email}</strong>.
                            </p>
                            <p className="mt-4 text-sm text-tertiary">
                                Sign out and sign back in with the invited address to continue.
                            </p>
                            <Button
                                size="lg"
                                color="secondary"
                                iconLeading={LogOut01}
                                className="mt-6 w-full"
                                onClick={async () => {
                                    await signOut();
                                    router.push(signInUrl);
                                }}
                            >
                                Switch account
                            </Button>
                        </div>
                    )}

                    {/* Accepting */}
                    {status === "accepting" && <LoadingState message="Joining your team…" />}

                    {/* Joined */}
                    {status === "joined" && outcome === "joined_approved" && (
                        <SuccessState
                            title="You're in!"
                            message="Welcome to the team. We're taking you to your dashboard."
                        />
                    )}
                    {status === "joined" && outcome === "joined_pending" && (
                        <PendingState
                            title="Account under review"
                            message="Thanks for accepting! Because your email domain is different from your inviter's, a Sales Admin needs to approve your access. You'll receive an email once approved."
                        />
                    )}
                    {status === "joined" && outcome === "already_member" && (
                        <SuccessState
                            title="Already a member"
                            message="You're already part of this team. Taking you to your dashboard."
                        />
                    )}

                    {/* Error */}
                    {status === "error" && (
                        <FailureState
                            title="Something went wrong"
                            message={errorMessage ?? "We couldn't accept this invitation. Please contact your administrator."}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}

function LoadingState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center text-center py-6">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-md text-secondary">{message}</p>
        </div>
    );
}

function SuccessState({ title, message, ctaLabel, onClick }: { title: string; message: string; ctaLabel?: string; onClick?: () => void }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
                <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            <h1 className="text-display-sm font-semibold text-primary">{title}</h1>
            <p className="mt-3 max-w-sm text-md text-secondary">{message}</p>
            {ctaLabel && onClick && (
                <Button size="lg" color="primary" className="mt-6 w-full" onClick={onClick}>
                    {ctaLabel}
                </Button>
            )}
        </div>
    );
}

function PendingState({ title, message }: { title: string; message: string }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
                <Clock className="h-8 w-8 text-warning-600" />
            </div>
            <h1 className="text-display-sm font-semibold text-primary">{title}</h1>
            <p className="mt-3 max-w-sm text-md text-secondary">{message}</p>
            <Button
                size="lg"
                color="secondary"
                className="mt-6 w-full"
                onClick={() => (window.location.href = "/pending-approval")}
            >
                Continue
            </Button>
        </div>
    );
}

function FailureState({ title, message }: { title: string; message: string }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
                <AlertCircle className="h-8 w-8 text-error-600" />
            </div>
            <h1 className="text-display-sm font-semibold text-primary">{title}</h1>
            <p className="mt-3 max-w-sm text-md text-secondary">{message}</p>
            <Button
                size="lg"
                color="secondary"
                className="mt-6 w-full"
                onClick={() => (window.location.href = "/")}
            >
                Back to sign in
            </Button>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <AcceptInviteInner />
        </Suspense>
    );
}

function LoadingFallback() {
    return (
        <section className="flex min-h-screen items-center justify-center bg-primary p-4">
            <LoadingState message="Loading…" />
        </section>
    );
}
