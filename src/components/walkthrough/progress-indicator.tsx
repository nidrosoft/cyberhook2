"use client";

import { cx } from "@/utils/cx";

interface ProgressIndicatorProps {
    /** 1-indexed cursor across all flattened steps. */
    currentStep: number;
    /** Total number of flattened steps. */
    totalSteps: number;
    /** Optional label for the active section, shown beside the counter. */
    sectionLabel?: string;
}

/**
 * Phase 10 — slim pill at the bottom of the screen showing tour progress.
 * Dots compress for >12 steps to stay legible. Sits above the spotlight
 * overlay so it never gets dimmed.
 */
export function ProgressIndicator({ currentStep, totalSteps, sectionLabel }: ProgressIndicatorProps) {
    // Defensive: guard against non-finite values that can sneak in during HMR
    // or transient render windows (Array.from with bad length throws).
    const safeTotal = Number.isFinite(totalSteps) && totalSteps > 0 ? Math.floor(totalSteps) : 0;
    const safeCurrent = Number.isFinite(currentStep) && currentStep > 0 ? Math.floor(currentStep) : 0;
    if (safeTotal <= 0) return null;

    // For long tours (>14) collapse to a slim segmented bar instead of dots.
    const useBar = safeTotal > 14;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 rounded-full border border-secondary bg-primary px-4 py-2.5 shadow-lg">
                {useBar ? (
                    <div className="flex items-center gap-1">
                        {Array.from({ length: safeTotal }, (_, i) => {
                            const stepNum = i + 1;
                            const done = stepNum < safeCurrent;
                            const active = stepNum === safeCurrent;
                            return (
                                <span
                                    key={i}
                                    className={cx(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        done && "bg-brand-500 w-2",
                                        active && "bg-brand-500 w-6",
                                        !done && !active && "bg-tertiary w-2",
                                    )}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: safeTotal }, (_, i) => {
                            const stepNum = i + 1;
                            const done = stepNum < safeCurrent;
                            const active = stepNum === safeCurrent;
                            return (
                                <span
                                    key={i}
                                    className={cx(
                                        "h-2 rounded-full transition-all duration-300",
                                        done && "w-2 bg-brand-500",
                                        active && "w-4 bg-brand-500",
                                        !done && !active && "w-2 bg-tertiary",
                                    )}
                                />
                            );
                        })}
                    </div>
                )}

                <span className="text-xs font-medium text-tertiary">
                    Step {safeCurrent} of {safeTotal}
                    {sectionLabel && <span className="hidden sm:inline">: {sectionLabel}</span>}
                </span>
            </div>
        </div>
    );
}
