"use client";

import React, { useState } from "react";
import { Mail01 } from "@untitledui/icons";
import { Shield01 } from "@untitledui/icons";

import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { SocialButton } from "@/components/base/buttons/social-button";
import { Form } from "@/components/base/form/form";
import { CyberHookLogo } from "@/components/foundations/logo/cyberhook-logo";
import { CyberHookLogoMinimal } from "@/components/foundations/logo/cyberhook-logo";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <section className="grid min-h-screen grid-cols-1 bg-primary lg:grid-cols-2">
            {/* Right side: Auth Form */}
            <div className="flex flex-col bg-primary">
                <header className="hidden p-8 md:block">
                    <CyberHookLogo />
                </header>
                <div className="flex flex-1 justify-center px-4 py-12 md:items-start md:px-8 md:pt-[12vh]">
                    <div className="flex w-full flex-col gap-8 sm:max-w-90">
                        {/* Fixed header area — does not shift on toggle */}
                        <div className="flex flex-col gap-6">
                            <CyberHookLogoMinimal className="size-10 lg:hidden" />

                            <div className="flex flex-col gap-2 md:gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-md">
                                    {isLogin ? "Welcome back" : "Sign up"}
                                </h1>
                                <p className="min-h-[1.5rem] text-md text-tertiary">
                                    {isLogin
                                        ? "Enter your credentials to access your workspace."
                                        : "Start your 30-day free trial."}
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

                        {/* Form content — only this area changes */}
                        <Form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const data = Object.fromEntries(new FormData(e.currentTarget));
                                console.log("Form data:", data);
                            }}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-5">
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

                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg">
                                    {isLogin ? "Sign in" : "Get started"}
                                </Button>
                                <SocialButton social="google" theme="color">
                                    {isLogin ? "Sign in with Google" : "Sign up with Google"}
                                </SocialButton>
                            </div>
                        </Form>

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

                <footer className="hidden justify-between p-8 pt-11 lg:flex">
                    <p className="text-sm text-tertiary">© CyberHook 2026</p>
                    <a href="mailto:help@cyberhook.com" className="flex items-center gap-2 text-sm text-tertiary">
                        <Mail01 className="size-4 text-fg-quaternary" />
                        help@cyberhook.com
                    </a>
                </footer>
            </div>

            {/* Left side: Brand content panel */}
            <div className="hidden p-3 lg:block">
                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[24px] p-10 lg:p-12" style={{ background: "linear-gradient(135deg, #7F56D9 0%, #53389E 100%)" }}>

                    <div className="relative z-10 flex flex-col gap-16">
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
                    <div className="relative z-10 flex flex-col gap-4 mt-auto">
                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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

                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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

                        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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
