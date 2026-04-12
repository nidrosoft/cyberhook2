"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/base/buttons/button";
import { XCircle, LogOut01, Mail01 } from "@untitledui/icons";

export default function RejectedPage() {
    const { signOut } = useClerk();

    return (
        <section className="flex min-h-screen items-center justify-center bg-primary p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
                        <XCircle className="h-8 w-8 text-error-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-display-sm font-semibold text-primary">
                        Application Not Approved
                    </h1>

                    {/* Description */}
                    <p className="mt-3 text-md text-secondary max-w-sm">
                        Unfortunately, your application to join CyberHook was not approved at this time.
                    </p>

                    {/* Info Card */}
                    <div className="mt-8 w-full rounded-xl border border-secondary bg-secondary_subtle p-6">
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-tertiary text-left">
                                This may be due to one of the following reasons:
                            </p>
                            <ul className="text-sm text-tertiary text-left list-disc list-inside space-y-2">
                                <li>Unable to verify your business information</li>
                                <li>Your business type is not currently supported</li>
                                <li>Incomplete or inaccurate application details</li>
                            </ul>
                        </div>
                    </div>

                    {/* Appeal Section */}
                    <div className="mt-6 rounded-lg bg-primary border border-secondary p-4 w-full">
                        <div className="flex items-start gap-3">
                            <Mail01 className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-primary">Appeal this decision</p>
                                <p className="text-sm text-tertiary">
                                    If you believe this was a mistake, please contact us at{" "}
                                    <a href="mailto:support@cyberhook.ai" className="text-brand-500 hover:text-brand-600">
                                        support@cyberhook.ai
                                    </a>{" "}
                                    with additional information about your business.
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
