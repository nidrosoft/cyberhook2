"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { Shield01 } from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { Input } from "@/components/base/input/input";

type Mode = "signin" | "verify_email_code" | "verify_2fa" | "forgot_email" | "forgot_reset";

export default function AdminLoginPage() {
    const router = useRouter();
    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();
    const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();

    const [mode, setMode] = useState<Mode>("signin");
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resetIdentifier, setResetIdentifier] = useState<string>("");
    // Tracks whether we already evaluated the "clear stale session" rule on
    // initial mount. Without this, signing in successfully would re-trigger
    // the effect (because isSignedIn flips to true) and immediately sign the
    // user back out before the redirect to /admin/session lands.
    const initialSessionCheckDone = useRef(false);
    // Set after a successful sign-in / verification on this page so the
    // session-clear effect knows not to undo our own sign-in.
    const justAuthenticated = useRef(false);

    useEffect(() => {
        if (!authLoaded) return;
        if (initialSessionCheckDone.current) return;
        initialSessionCheckDone.current = true;

        if (isSignedIn) {
            // A pre-existing session at the moment the admin login mounted —
            // clear it so admins always re-authenticate.
            signOut({ redirectUrl: "/admin/login" });
        }
    }, [authLoaded, isSignedIn, signOut]);

    // After we successfully complete a sign-in below, route to /admin/session
    // once Clerk's auth state has propagated. Doing the redirect here (instead
    // of immediately after setActive) avoids racing with React state updates.
    useEffect(() => {
        if (justAuthenticated.current && authLoaded && isSignedIn) {
            router.replace("/admin/session");
        }
    }, [authLoaded, isSignedIn, router]);

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;
        setError(null);
        setInfo(null);

        const data = new FormData(e.currentTarget);
        const email = String(data.get("email") || "").trim();
        const password = String(data.get("password") || "");

        try {
            setIsLoading(true);
            const result = await signIn.create({ identifier: email, password });

            if (result.status === "complete") {
                justAuthenticated.current = true;
                await setActive({ session: result.createdSessionId });
                return;
            }

            // Clerk requires email verification before sign-in. Prepare the
            // first-factor email code and switch to verification UI.
            if (result.status === "needs_first_factor") {
                const emailFactor = (result.supportedFirstFactors ?? []).find(
                    (f: any) => f.strategy === "email_code",
                );
                if (emailFactor) {
                    await signIn.prepareFirstFactor({
                        strategy: "email_code",
                        emailAddressId: (emailFactor as any).emailAddressId,
                    });
                    setMode("verify_email_code");
                    setInfo(`We sent a verification code to ${email}.`);
                    return;
                }
                setError(
                    "This account requires verification we can't complete here. Check the Clerk dashboard to allow email-code verification.",
                );
                return;
            }

            // 2FA required.
            if (result.status === "needs_second_factor") {
                const factors = result.supportedSecondFactors ?? [];
                const emailFactor = factors.find((f: any) => f.strategy === "email_code");
                const totpFactor = factors.find((f: any) => f.strategy === "totp");
                if (emailFactor) {
                    await signIn.prepareSecondFactor({ strategy: "email_code" });
                    setMode("verify_2fa");
                    setInfo("Enter the 2FA code from your email.");
                    return;
                }
                if (totpFactor) {
                    setMode("verify_2fa");
                    setInfo("Enter the 6-digit code from your authenticator app.");
                    return;
                }
                setError("Two-factor authentication is required but no supported method is configured.");
                return;
            }

            setError(`Sign-in incomplete (status: ${result.status}). Please contact support.`);
        } catch (err: any) {
            setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    // Submit the email verification code that Clerk sent after first sign-in.
    const handleVerifyEmailCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;
        setError(null);
        setInfo(null);

        const data = new FormData(e.currentTarget);
        const code = String(data.get("verify_code") || "").trim();

        try {
            setIsLoading(true);
            const result = await signIn.attemptFirstFactor({ strategy: "email_code", code });
            if (result.status === "complete") {
                justAuthenticated.current = true;
                await setActive({ session: result.createdSessionId });
                return;
            }
            if (result.status === "needs_second_factor") {
                setMode("verify_2fa");
                setInfo("Enter the 2FA code to finish signing in.");
                return;
            }
            setError(`Verification incomplete (status: ${result.status}).`);
        } catch (err: any) {
            setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid verification code.");
        } finally {
            setIsLoading(false);
        }
    };

    // Submit the 2FA code (email or TOTP).
    const handleVerify2FA = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;
        setError(null);
        setInfo(null);

        const data = new FormData(e.currentTarget);
        const code = String(data.get("verify_code") || "").trim();

        try {
            setIsLoading(true);
            // Try email_code first; if not configured, fall back to TOTP.
            let result;
            try {
                result = await signIn.attemptSecondFactor({ strategy: "email_code", code });
            } catch {
                result = await signIn.attemptSecondFactor({ strategy: "totp", code });
            }
            if (result.status === "complete") {
                justAuthenticated.current = true;
                await setActive({ session: result.createdSessionId });
                return;
            }
            setError(`Verification incomplete (status: ${result.status}).`);
        } catch (err: any) {
            setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid 2FA code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendResetCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;
        setError(null);
        setInfo(null);

        const data = new FormData(e.currentTarget);
        const email = String(data.get("reset_email") || "").trim();

        try {
            setIsLoading(true);
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            });
            setResetIdentifier(email);
            setMode("forgot_reset");
            setInfo(`We sent a reset code to ${email}.`);
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || "Couldn't send reset code. Check the email and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;
        setError(null);
        setInfo(null);

        const data = new FormData(e.currentTarget);
        const code = String(data.get("code") || "").trim();
        const password = String(data.get("new_password") || "");

        try {
            setIsLoading(true);
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password,
            });
            if (result.status === "complete") {
                justAuthenticated.current = true;
                await setActive({ session: result.createdSessionId });
                return;
            }
            setError("Couldn't reset password. Try again.");
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || "Invalid code or password.");
        } finally {
            setIsLoading(false);
        }
    };

    const switchToForgot = () => {
        setMode("forgot_email");
        setError(null);
        setInfo(null);
    };

    const switchToSignIn = () => {
        setMode("signin");
        setError(null);
        setInfo(null);
    };

    const isClearingSession = !authLoaded || isSignedIn;

    return (
        <main className="min-h-screen overflow-hidden bg-secondary px-4 py-12 md:px-8 md:pt-24">
            <div className="mx-auto flex w-full flex-col gap-8 sm:max-w-110">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="relative flex size-12 items-center justify-center rounded-xl bg-brand-100 ring-1 ring-brand-200">
                        <Shield01 className="size-6 text-brand-700" />
                    </div>
                    <div className="flex flex-col gap-2 md:gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">CyberHook Internal</p>
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                            {mode === "signin" && "Super Admin Sign In"}
                            {mode === "verify_email_code" && "Verify Your Email"}
                            {mode === "verify_2fa" && "Two-Factor Authentication"}
                            {mode === "forgot_email" && "Reset Admin Password"}
                            {mode === "forgot_reset" && "Set a New Password"}
                        </h1>
                        <p className="text-md text-tertiary">
                            {mode === "signin" && "Sign in to the platform administrator console."}
                            {mode === "verify_email_code" && "Enter the verification code we sent to your inbox."}
                            {mode === "verify_2fa" && "Enter the 6-digit code from your authenticator or email."}
                            {mode === "forgot_email" && "Enter the admin email to receive a verification code."}
                            {mode === "forgot_reset" && "Enter the verification code and your new password."}
                        </p>
                    </div>
                </div>

                {isClearingSession ? (
                    <div className="relative -mx-4 rounded-2xl bg-primary px-4 py-8 text-center sm:mx-0 sm:px-10 sm:shadow-sm">
                        <p className="text-sm text-tertiary">Securing admin session…</p>
                    </div>
                ) : mode === "signin" ? (
                    <Form
                        onSubmit={handleSignIn}
                        className="relative z-10 -mx-4 flex flex-col gap-6 bg-primary px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-10 sm:shadow-sm"
                    >
                        <div className="flex flex-col gap-5">
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="Email"
                                type="email"
                                name="email"
                                placeholder="admin@example.com"
                                size="md"
                                autoComplete="email"
                            />
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="Password"
                                type="password"
                                name="password"
                                size="md"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <div className="-mt-2 flex justify-end">
                                <Button color="link-color" size="sm" onClick={switchToForgot}>
                                    Forgot password?
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                                {error}
                            </div>
                        )}

                        <Button type="submit" size="lg" isDisabled={isLoading}>
                            {isLoading ? "Signing in…" : "Sign in"}
                        </Button>
                    </Form>
                ) : mode === "verify_email_code" || mode === "verify_2fa" ? (
                    <Form
                        onSubmit={mode === "verify_email_code" ? handleVerifyEmailCode : handleVerify2FA}
                        className="relative z-10 -mx-4 flex flex-col gap-6 bg-primary px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-10 sm:shadow-sm"
                    >
                        <Input
                            isRequired
                            hideRequiredIndicator
                            label="Verification code"
                            type="text"
                            name="verify_code"
                            placeholder="6-digit code"
                            size="md"
                            autoComplete="one-time-code"
                        />

                        {error && (
                            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
                                {info}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button type="submit" size="lg" isDisabled={isLoading}>
                                {isLoading ? "Verifying…" : "Verify & sign in"}
                            </Button>
                            <Button color="secondary" size="lg" onClick={switchToSignIn}>
                                Back to sign in
                            </Button>
                        </div>
                    </Form>
                ) : mode === "forgot_email" ? (
                    <Form
                        onSubmit={handleSendResetCode}
                        className="relative z-10 -mx-4 flex flex-col gap-6 bg-primary px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-10 sm:shadow-sm"
                    >
                        <Input
                            isRequired
                            hideRequiredIndicator
                            label="Admin email"
                            type="email"
                            name="reset_email"
                            placeholder="admin@example.com"
                            size="md"
                            autoComplete="email"
                        />

                        {error && (
                            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
                                {info}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button type="submit" size="lg" isDisabled={isLoading}>
                                {isLoading ? "Sending code…" : "Send reset code"}
                            </Button>
                            <Button color="secondary" size="lg" onClick={switchToSignIn}>
                                Back to sign in
                            </Button>
                        </div>
                    </Form>
                ) : (
                    <Form
                        onSubmit={handleResetPassword}
                        className="relative z-10 -mx-4 flex flex-col gap-6 bg-primary px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-10 sm:shadow-sm"
                    >
                        <div className="flex flex-col gap-5">
                            <p className="text-sm text-tertiary">
                                Code sent to <span className="font-medium text-secondary">{resetIdentifier}</span>.
                            </p>
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="Verification code"
                                type="text"
                                name="code"
                                placeholder="6-digit code"
                                size="md"
                                autoComplete="one-time-code"
                            />
                            <Input
                                isRequired
                                hideRequiredIndicator
                                label="New password"
                                type="password"
                                name="new_password"
                                size="md"
                                placeholder="Enter a new password"
                                hint="Must be at least 8 characters."
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
                                {info}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button type="submit" size="lg" isDisabled={isLoading}>
                                {isLoading ? "Resetting…" : "Reset password & sign in"}
                            </Button>
                            <Button color="secondary" size="lg" onClick={switchToSignIn}>
                                Back to sign in
                            </Button>
                        </div>
                    </Form>
                )}
            </div>
        </main>
    );
}
