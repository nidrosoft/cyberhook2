"use client";

import React, { useState, useEffect } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Mail01 } from "@untitledui/icons";
import { Shield01 } from "@untitledui/icons";

import { Input } from "@/components/base/input/input";

const isDev = process.env.NODE_ENV === "development";
function logError(label: string, detail: unknown) {
    if (isDev) console.error(label, detail);
}
import { Button } from "@/components/base/buttons/button";
import { SocialButton } from "@/components/base/buttons/social-button";
import { Form } from "@/components/base/form/form";
import { CyberHookLogo } from "@/components/foundations/logo/cyberhook-logo";
import { CyberHookLogoMinimal } from "@/components/foundations/logo/cyberhook-logo";
import ShaderBackground from "@/components/ui/shader-background";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    
    const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoaded && isSignedIn) {
            router.replace("/dashboard");
        }
    }, [authLoaded, isSignedIn, router]);

    const handleOAuthSignIn = async (strategy: "oauth_google" | "oauth_microsoft" | "oauth_linkedin_oidc") => {
        if (!signInLoaded || !signIn) return;
        
        try {
            setIsLoading(true);
            setError(null);
            await signIn.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/dashboard",
            });
        } catch (err: any) {
            logError("OAuth error:", err);
            setError(err.errors?.[0]?.message || "An error occurred during sign in");
            setIsLoading(false);
        }
    };

    const handleOAuthSignUp = async (strategy: "oauth_google" | "oauth_microsoft" | "oauth_linkedin_oidc") => {
        if (!signUpLoaded || !signUp) return;
        
        try {
            setIsLoading(true);
            setError(null);
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/onboarding",
            });
        } catch (err: any) {
            logError("OAuth error:", err);
            setError(err.errors?.[0]?.message || "An error occurred during sign up");
            setIsLoading(false);
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            setIsLoading(true);
            setError(null);
            
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/dashboard");
            } else if (result.status === "needs_second_factor") {
                const secondFactors = result.supportedSecondFactors;
                const emailFactor = secondFactors?.find(
                    (f: any) => f.strategy === "email_code"
                );
                if (emailFactor) {
                    await signIn.prepareSecondFactor({
                        strategy: "email_code",
                    });
                    setPendingSecondFactor(true);
                } else {
                    setError("Unsupported second factor method. Please contact support.");
                }
            } else if (result.status === "needs_first_factor") {
                setError("Please complete additional verification");
            } else {
                logError("Sign-in incomplete:", result?.status);
            }
        } catch (err: any) {
            logError("Sign-in error:", err);
            setError(err.errors?.[0]?.message || "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signUpLoaded || !signUp) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            setIsLoading(true);
            setError(null);
            
            await signUp.create({
                firstName: name.split(" ")[0],
                lastName: name.split(" ").slice(1).join(" ") || undefined,
                emailAddress: email,
                password,
            });

            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPendingVerification(true);
        } catch (err: any) {
            logError("Sign-up error:", err);
            setError(err.errors?.[0]?.message || "An error occurred during sign up");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSecondFactor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signInLoaded || !signIn) return;

        try {
            setIsLoading(true);
            setError(null);

            const result = await signIn.attemptSecondFactor({
                strategy: "email_code",
                code: verificationCode,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/dashboard");
            } else {
                logError("Second factor incomplete:", result?.status);
                setError("Verification incomplete. Please try again.");
            }
        } catch (err: any) {
            logError("Second factor error:", err);
            setError(err.errors?.[0]?.message || "Invalid verification code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerification = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!signUpLoaded || !signUp) return;

        try {
            setIsLoading(true);
            setError(null);
            
            const result = await signUp.attemptEmailAddressVerification({
                code: verificationCode,
            });

            if (result.status === "complete") {
                await setSignUpActive({ session: result.createdSessionId });
                router.push("/onboarding");
            } else {
                logError("Verification incomplete:", result?.status);
                setError("Verification incomplete. Please try again.");
            }
        } catch (err: any) {
            logError("Verification error:", err);
            setError(err.errors?.[0]?.message || "Invalid verification code");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="grid h-screen grid-cols-1 overflow-hidden bg-primary lg:grid-cols-[2fr_3fr]">
            {/* Left side: Auth Form */}
            <div className="flex h-screen flex-col bg-primary">
                <header className="hidden px-8 pt-6 pb-2 md:block">
                    <CyberHookLogo />
                </header>
                <div className="flex flex-1 justify-center overflow-y-auto px-4 py-6 md:items-start md:px-8 md:pt-[4vh]">
                    <div className="flex w-full flex-col gap-5 sm:max-w-90">
                        {/* Fixed header area — does not shift on toggle */}
                        <div className="flex flex-col gap-4">
                            <CyberHookLogoMinimal className="size-10 lg:hidden" />

                            <div className="flex flex-col gap-1">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    {isLogin ? "Welcome back" : "Sign up"}
                                </h1>
                                <p className="min-h-[1.25rem] text-sm text-tertiary">
                                    {isLogin
                                        ? "Enter your credentials to access your workspace."
                                        : "Start your 7-day free trial."}
                                </p>
                            </div>
                        </div>

                        {/* Toggle — always in same position */}
                        <div className="flex rounded-lg bg-secondary p-1">
                            <button
                                type="button"
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                                    isLogin
                                        ? "bg-primary text-primary shadow-sm"
                                        : "text-tertiary hover:text-secondary"
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                                    !isLogin
                                        ? "bg-primary text-primary shadow-sm"
                                        : "text-tertiary hover:text-secondary"
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="rounded-lg bg-error-50 border border-error-200 p-3 text-sm text-error-700">
                                {error}
                            </div>
                        )}

                        {/* Second factor verification form (2FA on sign-in) */}
                        {pendingSecondFactor ? (
                            <Form onSubmit={handleSecondFactor} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-tertiary">
                                        A verification code has been sent to your email. Please enter it below to complete sign-in.
                                    </p>
                                    <Input
                                        isRequired
                                        hideRequiredIndicator
                                        label="Verification Code"
                                        name="code"
                                        placeholder="Enter 6-digit code"
                                        size="md"
                                        value={verificationCode}
                                        onChange={(value) => setVerificationCode(value)}
                                    />
                                </div>
                                <Button type="submit" size="lg" disabled={isLoading}>
                                    {isLoading ? "Verifying..." : "Verify & Sign In"}
                                </Button>
                                <Button
                                    type="button"
                                    color="secondary"
                                    size="md"
                                    onClick={() => {
                                        setPendingSecondFactor(false);
                                        setVerificationCode("");
                                    }}
                                >
                                    Back to sign in
                                </Button>
                            </Form>
                        ) : pendingVerification ? (
                            <Form onSubmit={handleVerification} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-tertiary">
                                        We sent a verification code to your email. Please enter it below.
                                    </p>
                                    <Input
                                        isRequired
                                        hideRequiredIndicator
                                        label="Verification Code"
                                        name="code"
                                        placeholder="Enter 6-digit code"
                                        size="md"
                                        value={verificationCode}
                                        onChange={(value) => setVerificationCode(value)}
                                    />
                                </div>
                                <Button type="submit" size="lg" disabled={isLoading}>
                                    {isLoading ? "Verifying..." : "Verify Email"}
                                </Button>
                                <Button
                                    type="button"
                                    color="secondary"
                                    size="md"
                                    onClick={() => {
                                        setPendingVerification(false);
                                        setVerificationCode("");
                                    }}
                                >
                                    Back to sign up
                                </Button>
                            </Form>
                        ) : (
                            /* Form content — only this area changes */
                            <Form
                                onSubmit={isLogin ? handleEmailSignIn : handleEmailSignUp}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex flex-col gap-4">
                                    {!isLogin && (
                                        <Input
                                            isRequired
                                            hideRequiredIndicator
                                            label="Name"
                                            name="name"
                                            placeholder="Enter your name"
                                            size="md"
                                        />
                                    )}
                                    <Input
                                        isRequired
                                        hideRequiredIndicator
                                        label="Email"
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        size="md"
                                    />
                                    <div className="relative">
                                        {isLogin && (
                                            <a
                                                href="#"
                                                className="absolute right-0 top-0.5 z-10 text-sm font-semibold text-brand-secondary hover:text-brand-primary transition-colors"
                                            >
                                                Forgot password?
                                            </a>
                                        )}
                                        <Input
                                            isRequired
                                            hideRequiredIndicator
                                            label="Password"
                                            type="password"
                                            name="password"
                                            size="md"
                                            placeholder={isLogin ? "••••••••••••" : "Create a password"}
                                            hint={!isLogin ? "Must be at least 8 characters." : undefined}
                                            minLength={8}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <Button type="submit" size="md" disabled={isLoading}>
                                        {isLoading ? (isLogin ? "Signing in..." : "Creating account...") : (isLogin ? "Sign in" : "Get started")}
                                    </Button>

                                    <div className="relative flex items-center gap-3 py-1.5">
                                        <div className="h-px flex-1 bg-border-secondary" />
                                        <span className="text-xs text-tertiary">or continue with</span>
                                        <div className="h-px flex-1 bg-border-secondary" />
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        <SocialButton 
                                            social="google" 
                                            theme="color"
                                            onClick={() => isLogin ? handleOAuthSignIn("oauth_google") : handleOAuthSignUp("oauth_google")}
                                            disabled={isLoading}
                                        >
                                            {isLogin ? "Sign in with Google" : "Sign up with Google"}
                                        </SocialButton>
                                        <SocialButton 
                                            social="microsoft" 
                                            theme="color"
                                            onClick={() => isLogin ? handleOAuthSignIn("oauth_microsoft") : handleOAuthSignUp("oauth_microsoft")}
                                            disabled={isLoading}
                                        >
                                            {isLogin ? "Sign in with Microsoft" : "Sign up with Microsoft"}
                                        </SocialButton>
                                        <SocialButton 
                                            social="linkedin" 
                                            theme="color"
                                            onClick={() => isLogin ? handleOAuthSignIn("oauth_linkedin_oidc") : handleOAuthSignUp("oauth_linkedin_oidc")}
                                            disabled={isLoading}
                                        >
                                            {isLogin ? "Sign in with LinkedIn" : "Sign up with LinkedIn"}
                                        </SocialButton>
                                    </div>
                                </div>
                            </Form>
                        )}

                        <div className="flex justify-center gap-1 text-center">
                            <span className="text-sm text-tertiary">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                            </span>
                            <Button
                                color="link-color"
                                size="md"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? "Sign up" : "Log in"}
                            </Button>
                        </div>
                    </div>
                </div>

                <footer className="hidden justify-between px-8 py-4 md:flex">
                    <p className="text-sm text-tertiary">© CyberHook 2026</p>
                    <a href="mailto:help@cyberhook.ai" className="flex items-center gap-2 text-sm text-tertiary">
                        <Mail01 className="size-4 text-fg-quaternary" />
                        help@cyberhook.ai
                    </a>
                </footer>
            </div>

            {/* Right side: Brand content panel */}
            <div className="hidden p-3 lg:block">
                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[24px] p-8 lg:p-10">
                    {/* Shader Animation Background */}
                    <div className="absolute inset-0 z-0">
                        <ShaderBackground className="h-full w-full" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-8">
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary_on-brand">
                            <Shield01 className="h-6 w-6" />
                            <span>CyberHook</span>
                        </div>

                        <div className="max-w-lg">
                            <h2 className="text-display-sm font-semibold tracking-tight text-primary_on-brand lg:text-display-md">
                                Convert Threat Intelligence Into Qualified Leads.
                            </h2>
                            <p className="mt-4 text-lg font-medium text-tertiary_on-brand">
                                The first sales enablement platform built exclusively for MSPs and MSSPs to turn dark web exposures into immediate opportunities.
                            </p>
                        </div>
                    </div>

                    {/* Notification cards */}
                    <div className="relative z-10 flex flex-col gap-3 mt-auto">
                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-500/20">
                                <svg className="size-5 text-error-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary_on-brand">High Severity Exposure</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-tertiary_on-brand">Just now</span>
                                </div>
                                <p className="mt-1 text-sm text-tertiary_on-brand">7 compromised credentials found for acmecorp.com on the dark web.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                                <svg className="size-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary_on-brand">Ransomware Alert</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-tertiary_on-brand">2 hrs ago</span>
                                </div>
                                <p className="mt-1 text-sm text-tertiary_on-brand">New breach notification regarding targeting engineering sectors in NA.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-500/20">
                                <svg className="size-5 text-success-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary_on-brand">Campaign Initiated</span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-tertiary_on-brand">5 hrs ago</span>
                                </div>
                                <p className="mt-1 text-sm text-tertiary_on-brand">AI agent sent 45 outreach emails based on recent exposure events.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
