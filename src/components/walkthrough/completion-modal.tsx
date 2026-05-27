"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Mail01, SearchLg, Trophy01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TOTAL_SECTIONS } from "@/lib/onboarding/tour-config";

interface CompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ACCOMPLISHMENTS = [
    "Toured every section of the platform",
    "Met the AI campaign agent and Live Search",
    "Saw how Live-Leads and the Watchlist sync",
] as const;

const NEXT_STEPS: Array<{ title: string; description: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
    {
        title: "Run your first Live Search",
        description: "Scan a domain and see real exposure data",
        href: "/live-search",
        icon: SearchLg,
    },
    {
        title: "Launch a campaign",
        description: "Send your first AI-drafted outreach",
        href: "/ai-agents",
        icon: Mail01,
    },
    {
        title: "Generate a report",
        description: "Export an executive PDF for stakeholders",
        href: "/reporting",
        icon: Trophy01,
    },
];

/**
 * Phase 10 — celebration screen shown after the user completes the tour.
 * Confetti, accomplishments checklist, and three suggested next steps each
 * deep-linking into the platform. Replaces driver.js' tiny "you're done" state.
 */
export function CompletionModal({ isOpen, onClose }: CompletionModalProps) {
    const router = useRouter();
    if (!isOpen) return null;

    const goTo = (href: string) => {
        onClose();
        router.push(href);
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Confetti */}
            <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 60 }).map((_, i) => (
                    <span
                        key={i}
                        className="absolute animate-walkthrough-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: "-10%",
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`,
                        }}
                    >
                        <span
                            className="block h-2 w-2 rounded-sm"
                            style={{
                                backgroundColor: ["#7F56D9", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#9333EA"][Math.floor(Math.random() * 6)],
                                transform: `rotate(${Math.random() * 360}deg)`,
                            }}
                        />
                    </span>
                ))}
            </div>

            <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="rounded-2xl bg-primary border border-secondary shadow-2xl overflow-hidden">
                    {/* Hero */}
                    <div className="relative px-6 pt-9 pb-7 text-center text-white bg-gradient-to-br from-success-600 via-success-500 to-emerald-600">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                            <Trophy01 className="size-7" />
                        </div>
                        <h2 className="text-2xl font-bold mb-1">You're all set</h2>
                        <p className="text-sm text-white/85">
                            You toured all {TOTAL_SECTIONS} sections of CyberHook
                        </p>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6">
                        {/* Accomplishments */}
                        <div className="mb-5">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-tertiary">
                                Here's what you saw
                            </p>
                            <ul className="space-y-2">
                                {ACCOMPLISHMENTS.map((a) => (
                                    <li
                                        key={a}
                                        className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 p-3"
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
                                            <CheckCircle className="size-3.5" />
                                        </span>
                                        <span className="text-sm font-medium text-success-700">{a}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Next steps */}
                        <div className="mb-5">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-tertiary">
                                Recommended next steps
                            </p>
                            <div className="space-y-2">
                                {NEXT_STEPS.map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                        <button
                                            key={s.href}
                                            type="button"
                                            onClick={() => goTo(s.href)}
                                            className="group flex w-full items-center gap-3 rounded-lg border border-secondary bg-primary p-3 text-left transition-colors hover:bg-secondary"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-semibold text-primary">
                                                    {i + 1}. {s.title}
                                                </span>
                                                <span className="block text-xs text-tertiary truncate">
                                                    {s.description}
                                                </span>
                                            </span>
                                            <ArrowRight className="size-4 text-tertiary group-hover:text-brand-700 transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <Button color="primary" size="lg" className="w-full" iconTrailing={ArrowRight} onClick={onClose}>
                            Start using CyberHook
                        </Button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes walkthrough-confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(110vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-walkthrough-confetti {
                    animation: walkthrough-confetti linear forwards;
                }
            `}</style>
        </div>
    );
}
