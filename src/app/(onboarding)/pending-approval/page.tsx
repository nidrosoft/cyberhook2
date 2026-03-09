"use client";

import {
    LogOut01,
    Mail01,
    ShieldTick,
    Shield01,
} from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";

export default function PendingApprovalPage() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-primary px-4">
            {/* Subtle radial gradient background accent */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(var(--color-brand-500)/0.08),transparent)]" />

            <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
                {/* Logo */}
                <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
                    <Shield01 className="h-6 w-6 text-brand-primary" />
                    <span>CyberHook</span>
                </div>

                {/* Icon */}
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-solid/10 ring-8 ring-brand-solid/5">
                    <ShieldTick className="h-10 w-10 text-brand-primary" />
                </div>

                {/* Heading */}
                <div className="flex flex-col gap-3">
                    <h1 className="text-display-xs font-semibold text-primary lg:text-display-sm">
                        Account Under Review
                    </h1>
                    <p className="text-md leading-relaxed text-tertiary">
                        We received your information. Your account is under review and will be
                        granted access within 24–48 hours if approved. We do this to prevent
                        misuse of sensitive information and ensure only verified partners gain
                        access.
                    </p>
                </div>

                {/* Email notice */}
                <div className="flex items-center gap-2.5 rounded-xl border border-secondary bg-secondary_subtle px-5 py-3.5">
                    <Mail01 className="h-5 w-5 shrink-0 text-brand-secondary" />
                    <p className="text-sm text-secondary">
                        You&apos;ll receive an email notification once your account has been reviewed.
                    </p>
                </div>

                {/* Sign Out */}
                <Button color="secondary" size="lg" iconLeading={LogOut01}>
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
