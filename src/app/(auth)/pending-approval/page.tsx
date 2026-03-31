"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Clock, LogOut01, Mail01, CheckCircle, ArrowRight } from "@untitledui/icons";

const AUTO_REDIRECT_SECONDS = 30;

export default function PendingApprovalPage() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push("/dashboard");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [router]);

    const progressPercent = ((AUTO_REDIRECT_SECONDS - secondsLeft) / AUTO_REDIRECT_SECONDS) * 100;

    return (
        <section className="flex min-h-screen items-center justify-center bg-primary p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
                        <Clock className="h-8 w-8 text-warning-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-display-sm font-semibold text-primary">
                        Account Under Review
                    </h1>

                    {/* Description */}
                    <p className="mt-3 text-md text-secondary max-w-sm">
                        Thank you for signing up, {user?.firstName || "there"}! Your account is currently being reviewed by our team.
                    </p>

                    {/* Auto-redirect timer */}
                    <div className="mt-6 w-full rounded-lg border border-brand-200 bg-brand-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-brand-700">
                                Continuing to dashboard in {secondsLeft}s
                            </p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                            >
                                Skip <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-brand-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-brand-500 transition-all duration-1000 ease-linear"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-brand-500">
                            This screen is a reminder — approval flow is pending implementation.
                        </p>
                    </div>

                    {/* Info Card */}
                    <div className="mt-6 w-full rounded-xl border border-secondary bg-secondary_subtle p-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-success-500 mt-0.5 shrink-0" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-primary">Review in Progress</p>
                                    <p className="text-sm text-tertiary">
                                        We typically complete reviews within 24-48 hours.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Mail01 className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-primary">Email Notification</p>
                                    <p className="text-sm text-tertiary">
                                        You&apos;ll receive an email at <span className="font-medium text-primary">{user?.primaryEmailAddress?.emailAddress}</span> once approved.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Why we review */}
                    <div className="mt-6 rounded-lg bg-primary border border-secondary p-4 w-full">
                        <p className="text-sm text-tertiary">
                            <span className="font-medium text-secondary">Why manual review?</span> CyberHook provides access to sensitive dark web intelligence. We verify all accounts to prevent misuse and ensure only authorized partners gain access.
                        </p>
                    </div>

                    {/* Sign Out Button */}
                    <div className="mt-8 w-full">
                        <Button
                            color="secondary"
                            size="lg"
                            iconLeading={LogOut01}
                            className="w-full"
                            onClick={() => signOut({ redirectUrl: "/" })}
                        >
                            Sign Out
                        </Button>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-sm text-tertiary">
                        Questions? Contact{" "}
                        <a href="mailto:support@cyberhook.com" className="text-brand-500 hover:text-brand-600">
                            support@cyberhook.com
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
