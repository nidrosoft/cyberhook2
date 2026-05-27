"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SpotlightProps {
    /** CSS selector of the element to highlight. Empty/missing = full-screen dim only. */
    targetSelector?: string;
    /** Whether the spotlight is currently active. */
    isActive: boolean;
    /** Padding around the highlighted element (px). */
    padding?: number;
    /** Border radius for the cutout (px). */
    borderRadius?: number;
    /** Optional click-outside handler. */
    onClickOutside?: () => void;
}

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const TARGET_POLL_MS = 250;

function rectsEqual(a: TargetRect | null, b: TargetRect | null) {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/**
 * Phase 10 — full-screen dim overlay with a rectangular cutout that highlights
 * a target element. Uses a `clip-path: polygon(...)` to punch a rounded hole
 * in the dark layer so the actual element behind keeps its hover/focus styles.
 *
 * A pulsing brand-coloured border is drawn on top of the target as a visual
 * affordance.
 *
 * Position is recomputed on scroll, resize, and via a low-frequency interval
 * as a safety net for layout shifts. We deliberately avoid `MutationObserver`
 * because adding/removing classes inside the observer causes a feedback loop.
 */
export function Spotlight({ targetSelector, isActive, padding = 12, borderRadius = 12, onClickOutside }: SpotlightProps) {
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [mounted, setMounted] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const lastRectRef = useRef<TargetRect | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isActive || !targetSelector) {
            lastRectRef.current = null;
            setTargetRect(null);
            return;
        }

        const updatePosition = () => {
            const element = document.querySelector(targetSelector);
            if (!element) {
                if (lastRectRef.current !== null) {
                    lastRectRef.current = null;
                    setTargetRect(null);
                }
                return;
            }
            const rect = element.getBoundingClientRect();
            const next: TargetRect = {
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
            };
            if (!rectsEqual(lastRectRef.current, next)) {
                lastRectRef.current = next;
                setTargetRect(next);
            }
        };

        // Initial measurement after layout settles.
        const rafId = window.requestAnimationFrame(updatePosition);

        const onScroll = () => updatePosition();
        const onResize = () => updatePosition();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);

        // Low-frequency polling so that layout shifts (slide-overs, popovers,
        // lazy mounts) eventually self-correct without a feedback loop.
        const pollId = window.setInterval(updatePosition, TARGET_POLL_MS);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
            window.clearInterval(pollId);
        };
    }, [isActive, targetSelector, padding]);

    if (!mounted || !isActive) return null;

    /** Build a clip-path that cuts a rounded rectangle out of the full screen. */
    const getClipPath = () => {
        if (!targetRect) return "none";
        const { top, left, width, height } = targetRect;
        const right = left + width;
        const bottom = top + height;
        const r = Math.min(borderRadius, width / 2, height / 2);

        return `polygon(
            0 0,
            0 100%,
            ${left}px 100%,
            ${left}px ${bottom - r}px,
            ${left + r}px ${bottom}px,
            ${right - r}px ${bottom}px,
            ${right}px ${bottom - r}px,
            ${right}px ${top + r}px,
            ${right - r}px ${top}px,
            ${left + r}px ${top}px,
            ${left}px ${top + r}px,
            ${left}px 100%,
            100% 100%,
            100% 0
        )`;
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current && onClickOutside) onClickOutside();
    };

    const overlay = (
        <>
            <div
                ref={overlayRef}
                className="fixed inset-0 z-[9998] bg-black/70 transition-opacity duration-300"
                onClick={handleOverlayClick}
                style={{ clipPath: targetRect ? getClipPath() : "none" }}
            />
            {targetRect && (
                <div
                    className="fixed z-[9999] pointer-events-none border-2 border-brand-500"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius,
                        boxShadow:
                            "0 0 0 3px rgba(127, 86, 217, 0.55), 0 0 18px rgba(127, 86, 217, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.15)",
                        animation: "walkthrough-spotlight-pulse 2s ease-in-out infinite",
                    }}
                />
            )}
            <style jsx global>{`
                @keyframes walkthrough-spotlight-pulse {
                    0%,
                    100% {
                        box-shadow: 0 0 0 3px rgba(127, 86, 217, 0.55), 0 0 18px rgba(127, 86, 217, 0.45),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.15);
                    }
                    50% {
                        box-shadow: 0 0 0 6px rgba(127, 86, 217, 0.35), 0 0 28px rgba(127, 86, 217, 0.55),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.25);
                    }
                }
            `}</style>
        </>
    );

    return createPortal(overlay, document.body);
}
