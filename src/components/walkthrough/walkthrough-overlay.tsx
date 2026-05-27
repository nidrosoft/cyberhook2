"use client";

import { useEffect, useState } from "react";
import { useWalkthrough, TOTAL_FLAT_STEPS } from "./walkthrough-context";
import { Spotlight } from "./spotlight";
import { WalkthroughTooltip } from "./walkthrough-tooltip";
import { WelcomeModal } from "./welcome-modal";
import { CompletionModal } from "./completion-modal";
import { ProgressIndicator } from "./progress-indicator";
import { useCurrentUser } from "@/hooks/use-current-user";

const TARGET_RETRY_INTERVAL_MS = 80;
const TARGET_RETRY_MAX_MS = 1500;

/**
 * Phase 10 — renders the live walkthrough UI based on the WalkthroughProvider
 * state machine. Mounts: welcome modal, completion modal, spotlight overlay,
 * tooltip, and the bottom progress pill.
 *
 * Includes a small "wait for the target to exist" loop so the spotlight
 * doesn't flash an empty cutout when the user moves to a new route. If a
 * target never appears (deleted element, hidden tab, etc.) we automatically
 * fall back to centred presentation so the tour never gets stuck.
 */
export function WalkthroughOverlay() {
    const {
        isActive,
        showWelcome,
        showCompletion,
        activeSection,
        activeStep,
        sectionIndex,
        stepIndex,
        flatStepNumber,
        start,
        skip,
        next,
        previous,
        dismissWelcome,
        dismissCompletion,
    } = useWalkthrough();

    const { user } = useCurrentUser();
    const firstName = user?.firstName;

    /**
     * `targetReady` ensures we wait until the highlighted element actually
     * exists in the DOM before rendering the tooltip + spotlight. This avoids
     * a flash of "tooltip points at nothing" when the user crosses a route.
     */
    const [targetReady, setTargetReady] = useState(true);
    const [missingTarget, setMissingTarget] = useState(false);

    useEffect(() => {
        if (!isActive || !activeStep) {
            setTargetReady(true);
            setMissingTarget(false);
            return;
        }
        if (!activeStep.target) {
            // Centred — no DOM lookup needed.
            setTargetReady(true);
            setMissingTarget(false);
            return;
        }

        setTargetReady(false);
        setMissingTarget(false);

        let elapsed = 0;
        const interval = window.setInterval(() => {
            const found = document.querySelector(activeStep.target!);
            if (found) {
                window.clearInterval(interval);
                setTargetReady(true);
                setMissingTarget(false);
                return;
            }
            elapsed += TARGET_RETRY_INTERVAL_MS;
            if (elapsed >= TARGET_RETRY_MAX_MS) {
                window.clearInterval(interval);
                // Element never appeared — fall back to centred presentation
                // so the tour stays useful.
                setTargetReady(true);
                setMissingTarget(true);
            }
        }, TARGET_RETRY_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [isActive, sectionIndex, stepIndex, activeStep]);

    if (showWelcome) {
        return (
            <WelcomeModal
                isOpen
                firstName={firstName}
                onStart={start}
                onSkip={() => {
                    dismissWelcome();
                    skip();
                }}
            />
        );
    }

    if (showCompletion) {
        return <CompletionModal isOpen onClose={dismissCompletion} />;
    }

    if (!isActive || !activeSection || !activeStep) return null;
    if (!targetReady) return null;

    const isFirstStep = sectionIndex === 0 && stepIndex === 0;
    const totalSteps = TOTAL_FLAT_STEPS;
    const isReallyLastStep = flatStepNumber === totalSteps;

    const effectiveTarget = missingTarget ? undefined : activeStep.target;
    const effectiveSide = missingTarget ? "center" : activeStep.side;

    return (
        <>
            <Spotlight targetSelector={effectiveTarget} isActive={isActive} />
            <WalkthroughTooltip
                icon={activeSection.icon}
                title={activeStep.title}
                description={activeStep.description}
                highlights={activeStep.highlights}
                tip={activeStep.tip}
                currentStepNumber={flatStepNumber}
                totalSteps={totalSteps}
                targetSelector={effectiveTarget}
                side={effectiveSide}
                onNext={next}
                onPrevious={previous}
                onSkip={skip}
                isFirstStep={isFirstStep}
                isLastStep={isReallyLastStep}
            />
            <ProgressIndicator
                currentStep={flatStepNumber}
                totalSteps={totalSteps}
                sectionLabel={activeSection.label}
            />
        </>
    );
}
