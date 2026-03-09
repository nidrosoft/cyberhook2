"use client";

import React, { useState } from "react";
import { Shield, ChevronRight, Lock, Mail, Activity, AlertTriangle } from "lucide-react";

import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { SocialButton } from "@/components/base/buttons/social-button";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="flex min-h-screen w-full bg-primary text-primary font-sans selection:bg-secondary">
            {/* Left side: Value prop / Notifications */}
            <div className="hidden lg:flex flex-col flex-1 border-r border-secondary bg-primary p-12 relative overflow-hidden">
                {/* Subtle grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(150,150,150,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(150,150,150,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] opacity-30 pointer-events-none" />

                <div className="relative z-10 flex items-center space-x-2 text-xl font-bold tracking-tight mb-20 text-primary">
                    <Shield className="w-6 h-6 text-brand-primary" />
                    <span>CyberHook</span>
                </div>

                <div className="relative z-10 max-w-lg mt-auto mb-auto">
                    <h1 className="text-4xl lg:text-5xl font-semibold tracking-tighter mb-6 text-primary">
                        Convert Threat Intelligence <br /> Into Qualified Leads.
                    </h1>
                    <p className="text-tertiary text-lg mb-12">
                        The first sales enablement platform built exclusively for MSPs and MSSPs to turn dark web exposures into immediate opportunities.
                    </p>

                    <div className="space-y-6">
                        {/* Notification items simulating product value */}
                        <div className="flex items-start space-x-4 p-4 rounded-xl border border-secondary bg-primary_alt shadow-xs backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center shrink-0 mt-1">
                                <AlertTriangle className="w-5 h-5 text-error-600" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-primary">High Severity Exposure</span>
                                    <span className="text-xs text-tertiary px-2 py-0.5 rounded-full bg-secondary border border-secondary">Just now</span>
                                </div>
                                <p className="text-sm text-tertiary mt-1">7 compromised credentials found for acmecorp.com on the dark web.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4 p-4 rounded-xl border border-secondary bg-primary_alt shadow-xs backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-1">
                                <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-primary">Ransomware Alert</span>
                                    <span className="text-xs text-tertiary px-2 py-0.5 rounded-full bg-secondary border border-secondary">2 hrs ago</span>
                                </div>
                                <p className="text-sm text-tertiary mt-1">New breach notification regarding targeting engineering sectors in NA.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4 p-4 rounded-xl border border-secondary bg-primary_alt shadow-xs backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center shrink-0 mt-1">
                                <Mail className="w-5 h-5 text-success-600" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-primary">Campaign Initiated</span>
                                    <span className="text-xs text-tertiary px-2 py-0.5 rounded-full bg-secondary border border-secondary">5 hrs ago</span>
                                </div>
                                <p className="text-sm text-tertiary mt-1">AI agent sent 45 outreach emails based on recent exposure events.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Auth Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative bg-primary">
                <div className="w-full max-w-[400px] flex flex-col">
                    {/* Logo for mobile */}
                    <div className="flex lg:hidden items-center justify-center space-x-2 text-xl font-bold tracking-tight mb-12 text-primary">
                        <Shield className="w-6 h-6 text-brand-primary" />
                        <span>CyberHook</span>
                    </div>

                    {/* Toggle */}
                    <div className="flex p-1 bg-secondary rounded-lg mb-8 mx-auto w-full max-w-[280px]">
                        <Button
                            color={isLogin ? "primary" : "tertiary"}
                            size="md"
                            onClick={() => setIsLogin(true)}
                            className="flex-1 rounded-md"
                        >
                            Sign In
                        </Button>
                        <Button
                            color={!isLogin ? "primary" : "tertiary"}
                            size="md"
                            onClick={() => setIsLogin(false)}
                            className="flex-1 rounded-md"
                        >
                            Sign Up
                        </Button>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold tracking-tight text-primary mb-2">
                            {isLogin ? "Welcome back" : "Create an account"}
                        </h2>
                        <p className="text-tertiary text-sm">
                            {isLogin
                                ? "Enter your credentials to access your workspace."
                                : "Join CyberHook to start converting threats into leads."}
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    id="firstName"
                                    type="text"
                                    label="First name"
                                    placeholder="John"
                                    size="md"
                                />
                                <Input
                                    id="lastName"
                                    type="text"
                                    label="Last name"
                                    placeholder="Doe"
                                    size="md"
                                />
                            </div>
                        )}

                        <Input
                            id="email"
                            type="email"
                            label="Email address"
                            placeholder="name@company.com"
                            icon={Mail}
                            size="md"
                        />

                        <div className="relative">
                            {isLogin && (
                                <a href="#" className="absolute right-0 top-0.5 text-xs text-tertiary hover:text-primary transition-colors z-10 block">Forgot password?</a>
                            )}
                            <Input
                                id="password"
                                type="password"
                                label="Password"
                                placeholder="••••••••••••"
                                icon={Lock}
                                size="md"
                            />
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                color="primary"
                                size="lg"
                                className="w-full! justify-center"
                                iconTrailing={ChevronRight}
                            >
                                {isLogin ? "Sign In" : "Create Account"}
                            </Button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-grow border-t border-secondary"></div>
                        <span className="px-3 text-xs text-tertiary bg-primary">OR</span>
                        <div className="flex-grow border-t border-secondary"></div>
                    </div>

                    {/* Social Auth */}
                    <SocialButton social="google" theme="brand" size="lg" className="w-full! justify-center">
                        Continue with Google
                    </SocialButton>

                    <p className="text-center text-xs text-tertiary mt-8 mt-auto lg:mt-12">
                        By clicking continue, you agree to our <br />
                        <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
