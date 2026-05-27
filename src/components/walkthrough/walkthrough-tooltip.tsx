"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FC, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, XClose as CloseIcon } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type Side = "top" | "right" | "bottom" | "left" | "center";
type ArrowSide = "top" | "right" | "bottom" | "left" | "none";

interface TooltipPosition {
    top: number;
    left: number;
    arrow: ArrowSide;
    arrowOffset?: number;
}

export interface WalkthroughTooltipProps {
    /** Icon component shown in the tooltip header. */
    icon?: FC<SVGProps<SVGSVGElement>>;
    /** Heading text. */
    title: string;
    /** Body copy. */
    description: string;
    /** Optional bullet points rendered under the description. */
    highlights?: string[];
    /** Optional brand-coloured "pro tip" callout. */
    tip?: string;
    /** Step counter — shown as a pill in the header. */
    currentStepNumber: number;
    totalSteps: number;
    /** CSS selector for the highlighted target; omit for centered modal. */
    targetSelector?: string;
    /** Preferred placement relative to the target. */
    side?: Side;
    /** Step navigation handlers. */
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
}

/**
 * Phase 10 — bespoke walkthrough tooltip rendered into a portal. Uses the
 * project's native `Button` component for the Next/Back CTAs so the styling
 * stays consistent with the rest of the dashboard.
 *
 * Positioning is recomputed on scroll, resize, and any DOM mutation in case
 * the highlighted target shifts (slide-overs opening, lazy mounts, route
 * transitions, etc.). Falls back to viewport-centered when the target is
 * missing or `side === "center"`.
 */
export function WalkthroughTooltip({
    icon: Icon,
    title,
    description,
    highlights,
    tip,
    currentStepNumber,
    totalSteps,
    targetSelector,
    side = "bottom",
    onNext,
    onPrevious,
    onSkip,
    isFirstStep = false,
    isLastStep = false,
}: WalkthroughTooltipProps) {
    const [position, setPosition] = useState<TooltipPosition | null>(null);
    const [mounted, setMounted] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useLayoutEffect(() => {
        if (!mounted) return;

        // Centred modal mode — no target.
        if (!targetSelector || side === "center") {
            setPosition({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                arrow: "none",
            });
            return;
        }

        const calculate = () => {
            const target = document.querySelector(targetSelector);
            const tooltip = tooltipRef.current;
            if (!target || !tooltip) return;

            const targetRect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            const padding = 16;
            const arrowSize = 12;

            let top = 0;
            let left = 0;
            let arrow: ArrowSide = "none";

            switch (side) {
                case "top":
                    top = targetRect.top - tooltipRect.height - padding - arrowSize;
                    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                    arrow = "bottom";
                    break;
                case "bottom":
                    top = targetRect.bottom + padding + arrowSize;
                    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
                    arrow = "top";
                    break;
                case "left":
                    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                    left = targetRect.left - tooltipRect.width - padding - arrowSize;
                    arrow = "right";
                    break;
                case "right":
                default:
                    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                    left = targetRect.right + padding + arrowSize;
                    arrow = "left";
                    break;
            }

            // Clamp to viewport with a margin.
            const viewportPadding = 20;
            const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
            const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;
            if (left < viewportPadding) left = viewportPadding;
            if (left > maxLeft) left = Math.max(viewportPadding, maxLeft);
            if (top < viewportPadding) top = viewportPadding;
            if (top > maxTop) top = Math.max(viewportPadding, maxTop);

            // Compute arrow offset so it always points at the target's edge.
            let arrowOffset: number | undefined;
            if (arrow === "left" || arrow === "right") {
                const targetCenterY = targetRect.top + targetRect.height / 2;
                arrowOffset = targetCenterY - top;
            } else if (arrow === "top" || arrow === "bottom") {
                const targetCenterX = targetRect.left + targetRect.width / 2;
                arrowOffset = targetCenterX - left;
            }

            setPosition((prev) => {
                if (prev && prev.top === top && prev.left === left && prev.arrow === arrow && prev.arrowOffset === arrowOffset) {
                    return prev;
                }
                return { top, left, arrow, arrowOffset };
            });
        };

        const rafId = window.requestAnimationFrame(calculate);
        const onScroll = () => calculate();
        const onResize = () => calculate();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        // Low-frequency repositioning catches layout shifts without
        // triggering a render-loop the way MutationObserver would.
        const pollId = window.setInterval(calculate, 250);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
            window.clearInterval(pollId);
        };
    }, [mounted, targetSelector, side]);

    if (!mounted) return null;

    const isCentered = !targetSelector || side === "center";

    const content = (
        <div
            ref={tooltipRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkthrough-title"
            className={cx(
                "fixed z-[10000] w-[440px] max-w-[92vw] rounded-2xl bg-primary border border-secondary shadow-2xl",
                "animate-in fade-in zoom-in-95 duration-200",
            )}
            style={{
                top: position?.top ?? "50%",
                left: position?.left ?? "50%",
                transform: isCentered || !position ? "translate(-50%, -50%)" : undefined,
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-secondary">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {Icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                            <Icon className="size-4" />
                        </span>
                    )}
                    <h3 id="walkthrough-title" className="text-md font-semibold text-primary truncate">
                        {title}
                    </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary whitespace-nowrap">
                        Step {currentStepNumber} of {totalSteps}
                    </span>
                    <button
                        type="button"
                        onClick={onSkip}
                        aria-label="Skip walkthrough"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-tertiary hover:bg-secondary hover:text-secondary transition-colors"
                    >
                        <CloseIcon className="size-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-secondary">{description}</p>

                {highlights && highlights.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                        {highlights.map((h, i) => (
                            <li key={i} className="flex gap-2 text-sm text-secondary">
                                <span className="text-brand-600 mt-1 shrink-0">•</span>
                                <span className="text-secondary">{h}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {tip && (
                    <div className="mt-3 flex gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
                        <span aria-hidden className="text-brand-600 shrink-0">
                            💡
                        </span>
                        <p className="text-xs text-brand-700">{tip}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-secondary bg-secondary rounded-b-2xl">
                <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs font-medium text-tertiary hover:text-secondary transition-colors"
                >
                    Skip tour
                </button>
                <div className="flex items-center gap-2">
                    {!isFirstStep && (
                        <Button color="secondary" size="sm" iconLeading={ArrowLeft} onClick={onPrevious}>
                            Back
                        </Button>
                    )}
                    <Button color="primary" size="sm" iconTrailing={isLastStep ? undefined : ArrowRight} onClick={onNext}>
                        {isLastStep ? "Finish tour" : "Next"}
                    </Button>
                </div>
            </div>

            {/* Arrow indicator */}
            {!isCentered && position && position.arrow !== "none" && (
                <Arrow side={position.arrow} offset={position.arrowOffset} />
            )}
        </div>
    );

    return createPortal(content, document.body);
}

function Arrow({ side, offset }: { side: ArrowSide; offset?: number }) {
    if (side === "none") return null;
    const tooltipBg = "bg-primary";
    const borderColor = "border-secondary";

    const common = cx("absolute h-3 w-3 rotate-45", tooltipBg);

    if (side === "left") {
        return (
            <span
                aria-hidden
                className={cx(common, "border-l border-b", borderColor)}
                style={{
                    left: -6,
                    top: offset !== undefined ? `${Math.max(24, Math.min(offset, 280))}px` : "50%",
                    transform: "translateY(-50%) rotate(45deg)",
                }}
            />
        );
    }
    if (side === "right") {
        return (
            <span
                aria-hidden
                className={cx(common, "border-t border-r", borderColor)}
                style={{
                    right: -6,
                    top: offset !== undefined ? `${Math.max(24, Math.min(offset, 280))}px` : "50%",
                    transform: "translateY(-50%) rotate(45deg)",
                }}
            />
        );
    }
    if (side === "top") {
        return (
            <span
                aria-hidden
                className={cx(common, "border-t border-l -top-1.5", borderColor)}
                style={{
                    left: offset !== undefined ? `${Math.max(24, Math.min(offset, 380))}px` : "50%",
                    transform: "translateX(-50%) rotate(45deg)",
                }}
            />
        );
    }
    // bottom
    return (
        <span
            aria-hidden
            className={cx(common, "border-b border-r -bottom-1.5", borderColor)}
            style={{
                left: offset !== undefined ? `${Math.max(24, Math.min(offset, 380))}px` : "50%",
                transform: "translateX(-50%) rotate(45deg)",
            }}
        />
    );
}
