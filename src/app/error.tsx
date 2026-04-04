"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        if (process.env.NODE_ENV === "production") {
            // In production, only log the digest (safe identifier), not the full error
            console.error("Application error:", error.digest ?? "unknown");
        } else {
            console.error("Application error:", error);
        }
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-xl border border-secondary bg-primary p-8 shadow-xs text-center max-w-md">
                <h2 className="text-lg font-semibold text-primary mb-2">
                    Something went wrong
                </h2>
                <p className="text-sm text-tertiary mb-6">
                    An unexpected error occurred. Please try again or contact support if the issue persists.
                </p>
                <button
                    onClick={reset}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
