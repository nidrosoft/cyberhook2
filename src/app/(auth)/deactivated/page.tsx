"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/base/buttons/button";
import { AlertCircle, LogOut01, Mail01 } from "@untitledui/icons";

export default function DeactivatedPage() {
    const { signOut } = useClerk();

    return (
        <section className="flex min-h-screen items-center justify-center bg-primary p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <AlertCircle className="h-8 w-8 text-gray-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-display-sm font-semibold text-primary">
                        Account Deactivated
                    </h1>

                    {/* Description */}
                    <p className="mt-3 text-md text-secondary max-w-sm">
                        Your CyberHook account has been deactivated. This may be due to subscription cancellation or an administrative action.
                    </p>

                    {/* Info Card */}
                    <div className="mt-8 w-full rounded-xl border border-secondary bg-secondary_subtle p-6">
                        <div className="flex items-start gap-3">
                            <Mail01 className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-primary">Need to reactivate?</p>
                                <p className="text-sm text-tertiary">
                                    Contact your account administrator or reach out to us at{" "}
                                    <a href="mailto:support@cyberhook.com" className="text-brand-500 hover:text-brand-600">
                                        support@cyberhook.com
                                    </a>{" "}
                                    to discuss reactivation options.
                                </p>
                            </div>
                        </div>
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
                </div>
            </div>
        </section>
    );
}
