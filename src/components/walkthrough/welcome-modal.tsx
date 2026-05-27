"use client";

import { useState } from "react";
import { Compass03, Clock, AlertTriangle, ArrowRight, Map01, Stars02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TOTAL_SECTIONS } from "@/lib/onboarding/tour-config";

interface WelcomeModalProps {
    isOpen: boolean;
    /** Optional first-name from the current user, used to greet by name. */
    firstName?: string;
    onStart: () => void;
    onSkip: () => void;
}

/**
 * Phase 10 — opening modal a user sees the very first time they land on the
 * dashboard (or click "Start tour" later). Mirrors Protectron's gradient-header
 * layout: hero pill with brand icon, three feature highlights, time estimate,
 * primary CTA, and a destructive "Skip" link with a confirmation step.
 */
export function WelcomeModal({ isOpen, firstName, onStart, onSkip }: WelcomeModalProps) {
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    if (!isOpen) return null;

    const handleSkipClick = () => setShowSkipWarning(true);
    const handleConfirmSkip = () => {
        setShowSkipWarning(false);
        onSkip();
    };
    const handleCancelSkip = () => setShowSkipWarning(false);

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="rounded-2xl bg-primary border border-secondary shadow-2xl overflow-hidden">
                    {/* Gradient header */}
                    <div className="relative px-6 pt-9 pb-7 text-center text-white bg-gradient-to-br from-brand-600 via-brand-500 to-purple-600">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-300 via-purple-300 to-brand-300" />
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                            <Compass03 className="size-7" />
                        </div>
                        <h2 className="text-2xl font-bold mb-1">
                            Welcome to CyberHook AI{firstName ? `, ${firstName}` : ""}
                        </h2>
                        <p className="text-sm text-white/85">Let's give you a quick tour of the platform</p>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6">
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <FeatureCell icon={<Map01 className="size-5" />} top={`${TOTAL_SECTIONS}`} bottom="sections" />
                            <FeatureCell icon={<Clock className="size-5" />} top="~5" bottom="minutes" />
                            <FeatureCell icon={<Stars02 className="size-5" />} top="Resume" bottom="anytime" />
                        </div>

                        <p className="text-sm text-secondary text-center mb-6">
                            We'll spotlight every major page — Dashboard, Live Search, AI Agents, and more — so you know
                            exactly where to find the tools you need. You can pause and resume the tour at any time.
                        </p>

                        <Button color="primary" size="lg" className="w-full" iconTrailing={ArrowRight} onClick={onStart}>
                            Let's get started
                        </Button>
                        <button
                            type="button"
                            onClick={handleSkipClick}
                            className="mt-3 w-full text-center text-sm text-tertiary hover:text-secondary transition-colors"
                        >
                            Skip walkthrough (not recommended)
                        </button>
                    </div>
                </div>

                {/* Inline skip warning */}
                {showSkipWarning && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
                        <div className="mx-4 max-w-sm rounded-xl bg-primary border border-secondary p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="mb-3 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning-600">
                                    <AlertTriangle className="size-5" />
                                </span>
                                <h3 className="text-md font-semibold text-primary">Are you sure?</h3>
                            </div>
                            <p className="mb-4 text-sm text-secondary">
                                The walkthrough takes about 5 minutes and shows you everything CyberHook can do. You
                                can always restart it from the avatar menu.
                            </p>
                            <div className="flex gap-3">
                                <Button color="secondary" size="md" className="flex-1" onClick={handleConfirmSkip}>
                                    Skip anyway
                                </Button>
                                <Button color="primary" size="md" className="flex-1" onClick={handleCancelSkip}>
                                    Continue tour
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function FeatureCell({ icon, top, bottom }: { icon: React.ReactNode; top: string; bottom: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-secondary p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
            <span className="text-md font-semibold text-primary">{top}</span>
            <span className="text-xs text-tertiary">{bottom}</span>
        </div>
    );
}
