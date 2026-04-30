"use client";

import { UserProfile, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/base/buttons/button";

export default function AdminAccountPage() {
    const { isLoaded, isSignedIn } = useAuth();

    return (
        <main className="min-h-screen bg-secondary_subtle px-4 py-10">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-display-sm font-semibold text-primary">Admin account settings</h1>
                        <p className="mt-1 text-sm text-tertiary">Update the super admin email address, password, security settings, and active sessions through Clerk.</p>
                    </div>
                    <Link href="/admin/pending-accounts">
                        <Button color="secondary" size="sm">Back to admin console</Button>
                    </Link>
                </div>

                {!isLoaded && <p className="text-sm text-tertiary">Loading…</p>}
                {isLoaded && !isSignedIn && (
                    <div className="rounded-xl border border-secondary bg-primary p-8 text-center shadow-sm">
                        <h2 className="text-display-xs font-semibold text-primary">Sign in required</h2>
                        <p className="mt-2 text-sm text-tertiary">Sign in to manage the super admin account.</p>
                        <Link href="/admin/login" className="mt-6 inline-block">
                            <Button>Go to admin login</Button>
                        </Link>
                    </div>
                )}
                {isLoaded && isSignedIn && (
                    <div className="flex justify-center rounded-xl border border-secondary bg-primary p-4 shadow-sm">
                        <UserProfile routing="hash" />
                    </div>
                )}
            </div>
        </main>
    );
}
