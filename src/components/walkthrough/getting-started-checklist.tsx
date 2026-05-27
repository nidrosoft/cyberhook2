"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Compass03, PlayCircle, Rocket01, ArrowRight, CheckCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { useWalkthrough } from "./walkthrough-context";
import { TOUR_SECTIONS, TOTAL_SECTIONS } from "@/lib/onboarding/tour-config";

/**
 * Phase 10 — Getting Started checklist tile rendered on the dashboard.
 * Replaces the previous flat row with a collapsible card that mirrors the
 * Protectron-style onboarding affordance: gradient header, progress ring,
 * per-section task rows that mark themselves off as the user completes
 * sections, plus prominent CTA buttons to start, resume, or restart.
 *
 * Self-hides when the tour is fully completed and at least 24h have passed.
 */
export function GettingStartedChecklist({ className }: { className?: string }) {
    const { progress, isLoading, completedSections, status, start, resume, restart, startAtSection } = useWalkthrough();

    const [isCollapsed, setIsCollapsed] = useState(false);

    if (isLoading) return null;

    const completedCount = completedSections.length;
    const percentage = Math.round((completedCount / TOTAL_SECTIONS) * 100);

    // Hide when fully completed (no use cluttering the dashboard forever).
    if (status === "completed" && percentage === 100) {
        return null;
    }

    const isInProgress = status === "in_progress" && progress?.lastSection;
    const lastSectionLabel = isInProgress ? TOUR_SECTIONS.find((s) => s.id === progress?.lastSection)?.label : undefined;

    const headerSubtitle = (() => {
        if (status === "completed") return "Welcome back — restart any time";
        if (isInProgress) return `Pick up where you left off${lastSectionLabel ? ` — ${lastSectionLabel}` : ""}`;
        if (status === "skipped") return "You skipped the tour. Want a refresher?";
        return "Get the lay of the land in about 5 minutes";
    })();

    return (
        <section
            className={cx(
                "rounded-xl border border-secondary bg-primary overflow-hidden",
                className,
            )}
            data-tour="getting-started-checklist"
        >
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsCollapsed((v) => !v)}
                className={cx(
                    "flex w-full items-center justify-between gap-4 px-5 py-4 text-left",
                    "bg-gradient-to-r from-brand-50 via-brand-50 to-purple-50",
                    "hover:from-brand-100 hover:via-brand-50 hover:to-purple-100 transition-colors",
                )}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-brand-700 shadow-sm">
                        <Rocket01 className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-md font-semibold text-primary">Getting Started</h3>
                        <p className="text-xs text-secondary truncate">
                            {completedCount} of {TOTAL_SECTIONS} sections · {headerSubtitle}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <ProgressRing percentage={percentage} />
                    {isCollapsed ? (
                        <ChevronDown className="size-5 text-tertiary" />
                    ) : (
                        <ChevronUp className="size-5 text-tertiary" />
                    )}
                </div>
            </button>

            {/* Body */}
            {!isCollapsed && (
                <div className="px-5 pt-4 pb-5">
                    {/* Top CTAs */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {isInProgress ? (
                            <Button color="primary" size="md" iconLeading={PlayCircle} onClick={() => resume()}>
                                Resume tour
                            </Button>
                        ) : status === "completed" ? (
                            <Button color="primary" size="md" iconLeading={PlayCircle} onClick={() => restart()}>
                                Restart tour
                            </Button>
                        ) : (
                            <Button color="primary" size="md" iconLeading={Compass03} onClick={() => start()}>
                                Start tour
                            </Button>
                        )}
                        {(status === "in_progress" || status === "completed") && (
                            <Button color="secondary" size="md" onClick={() => restart()}>
                                Restart from start
                            </Button>
                        )}
                    </div>

                    {/* Section tasks */}
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TOUR_SECTIONS.map((section) => {
                            const Icon = section.icon;
                            const isDone = completedSections.includes(section.id);
                            return (
                                <li key={section.id}>
                                    <button
                                        type="button"
                                        onClick={() => !isDone && startAtSection(section.id)}
                                        disabled={isDone}
                                        className={cx(
                                            "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                            isDone
                                                ? "border-success-200 bg-success-50 cursor-default"
                                                : "border-secondary bg-primary hover:bg-secondary cursor-pointer",
                                        )}
                                    >
                                        <span
                                            className={cx(
                                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                                isDone
                                                    ? "border-success-500 bg-success-500 text-white"
                                                    : "border-tertiary bg-primary text-transparent",
                                            )}
                                        >
                                            <CheckCircle className="size-3.5" />
                                        </span>
                                        <span
                                            className={cx(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-brand-700",
                                                isDone ? "bg-success-100" : "bg-brand-50",
                                            )}
                                        >
                                            <Icon className="size-3.5" />
                                        </span>
                                        <span
                                            className={cx(
                                                "flex-1 min-w-0 text-sm font-medium truncate",
                                                isDone ? "text-success-700 line-through" : "text-primary",
                                            )}
                                        >
                                            {section.label}
                                        </span>
                                        {!isDone && (
                                            <ArrowRight className="size-4 text-tertiary group-hover:text-brand-700 transition-colors shrink-0" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}

function ProgressRing({ percentage }: { percentage: number }) {
    const clamped = Math.max(0, Math.min(100, percentage));
    return (
        <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-tertiary opacity-30" />
                <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={`${clamped} 100`}
                    strokeLinecap="round"
                    pathLength={100}
                    className="stroke-brand-500 transition-all duration-500"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-700">
                {clamped}%
            </span>
        </div>
    );
}
