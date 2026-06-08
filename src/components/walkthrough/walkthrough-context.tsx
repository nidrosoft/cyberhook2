"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    TOUR_SECTIONS,
    TOTAL_SECTIONS,
    flattenCursor,
    getSection,
    getSectionIndex,
    type TourSection,
    type TourStep,
} from "@/lib/onboarding/tour-config";

type Status = "not_started" | "in_progress" | "skipped" | "completed";

interface TourProgress {
    completed: boolean;
    skipped: boolean;
    lastSection?: string;
    lastStepIndex?: number;
    completedSections: string[];
    updatedAt: number;
}

interface WalkthroughContextValue {
    /** True while waiting on the first server query. */
    isLoading: boolean;
    /** Status derived from server state. */
    status: Status;
    /** Server progress, normalised. */
    progress: TourProgress | null;
    /** Convenience accessor for completed section ids. */
    completedSections: string[];

    /** True while the tour overlay is mounted. */
    isActive: boolean;
    /** True while the welcome modal is showing. */
    showWelcome: boolean;
    /** True while the completion modal is showing. */
    showCompletion: boolean;

    /** Currently active section + step indices (only valid when isActive). */
    sectionIndex: number;
    stepIndex: number;
    activeSection: TourSection | null;
    activeStep: TourStep | null;
    /** 1-indexed flat cursor across the entire tour for the bottom bar. */
    flatStepNumber: number;

    /** Begin the tour from the very first step. */
    start: () => void;
    /** Begin the tour at a specific section id. */
    startAtSection: (sectionId: string) => void;
    /** Resume from server-saved progress, or fall back to the first step. */
    resume: () => void;
    /** Wipe progress and begin again. */
    restart: () => void;
    /** Mark the tour skipped, hide all overlay UI. */
    skip: () => void;
    /** Advance one step. Auto-rolls to next section. Triggers completion at end. */
    next: () => void;
    /** Step backwards (no-op at first step). */
    previous: () => void;
    /** Close the welcome modal without starting. */
    dismissWelcome: () => void;
    /** Close the completion modal and persist completed=true. */
    dismissCompletion: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function useWalkthrough() {
    const ctx = useContext(WalkthroughContext);
    if (!ctx) throw new Error("useWalkthrough must be used inside <WalkthroughProvider>");
    return ctx;
}

interface ProviderProps {
    children: ReactNode;
}

const ROUTE_TIMEOUT_MS = 1200;

/**
 * Phase 10 — top-level state machine for the guided walkthrough.
 *
 * Responsibilities:
 *   1. Load tour progress from Convex (`api.tour.getTourProgress`).
 *   2. Auto-prompt new users with the welcome modal on /dashboard.
 *   3. Drive section/step navigation, including pushing the user to the
 *      correct route before the spotlight tries to find a target.
 *   4. Persist progress (debounced) on every transition.
 *
 * Children render <WalkthroughOverlay /> which reads from this context to
 * show the spotlight, tooltip, modals, and progress bar.
 */
export function WalkthroughProvider({ children }: ProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const currentUser = useCurrentUser();

    // `tour.getTourProgress` calls `requireAuth`. Skip until the Convex auth
    // token is verified, otherwise it throws "Unauthorized" during the
    // post-login / refresh window and trips the global error boundary.
    const queryProgress = useQuery(
        api.tour.getTourProgress,
        currentUser.isConvexAuthenticated ? {} : "skip"
    );
    const updateProgress = useMutation(api.tour.updateTourProgress);

    const isLoading = queryProgress === undefined;
    const progress: TourProgress | null = queryProgress ?? null;

    const status: Status = useMemo(() => {
        if (!progress) return "not_started";
        if (progress.completed) return "completed";
        if (progress.skipped) return "skipped";
        if ((progress.completedSections?.length ?? 0) > 0 || progress.lastSection) return "in_progress";
        return "not_started";
    }, [progress]);

    const [isActive, setIsActive] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [stepIndex, setStepIndex] = useState(0);

    /** Track whether we've already auto-prompted in this session. */
    const autoPromptedRef = useRef(false);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Auto-prompt new users ────────────────────────────────────────────
    useEffect(() => {
        if (isLoading) return;
        if (autoPromptedRef.current) return;
        if (!pathname?.startsWith("/dashboard")) return;
        if (status === "not_started") {
            autoPromptedRef.current = true;
            setShowWelcome(true);
        }
    }, [isLoading, pathname, status]);

    // ─── Navigation helper ────────────────────────────────────────────────
    /** Push the user to the section's route and wait one tick for layout. */
    const navigateToSection = useCallback(
        async (section: TourSection) => {
            if (pathname === section.route) return;
            router.push(section.route);
            // Wait for the route + first paint so query selectors can resolve.
            await new Promise<void>((resolve) => {
                const start = Date.now();
                const interval = window.setInterval(() => {
                    if (window.location.pathname === section.route || Date.now() - start > ROUTE_TIMEOUT_MS) {
                        window.clearInterval(interval);
                        // Extra rAF to let React commit the new tree.
                        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
                    }
                }, 50);
            });
        },
        [pathname, router],
    );

    // ─── Persistence (debounced) ──────────────────────────────────────────
    const schedulePersist = useCallback(
        (args: Parameters<typeof updateProgress>[0]) => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
            persistTimerRef.current = setTimeout(() => {
                updateProgress(args).catch(() => {
                    // best-effort — silent failure is acceptable for tour state
                });
            }, 400);
        },
        [updateProgress],
    );

    // ─── Public actions ───────────────────────────────────────────────────
    const start = useCallback(() => {
        setShowWelcome(false);
        setSectionIndex(0);
        setStepIndex(0);
        setIsActive(true);
        const first = TOUR_SECTIONS[0];
        if (first) {
            void navigateToSection(first);
            schedulePersist({ section: first.id, stepIndex: 0, skipped: false });
        }
    }, [navigateToSection, schedulePersist]);

    const startAtSection = useCallback(
        (sectionId: string) => {
            const idx = getSectionIndex(sectionId);
            if (idx < 0) return;
            const section = TOUR_SECTIONS[idx];
            setShowWelcome(false);
            setSectionIndex(idx);
            setStepIndex(0);
            setIsActive(true);
            void navigateToSection(section);
            schedulePersist({ section: section.id, stepIndex: 0, skipped: false });
        },
        [navigateToSection, schedulePersist],
    );

    const resume = useCallback(() => {
        const lastSectionId = progress?.lastSection;
        const lastStepIdx = progress?.lastStepIndex ?? 0;
        const idx = lastSectionId ? getSectionIndex(lastSectionId) : 0;
        const safeIdx = Math.max(0, idx);
        const section = TOUR_SECTIONS[safeIdx];
        if (!section) return;

        const safeStep = Math.min(Math.max(0, lastStepIdx), section.steps.length - 1);
        setShowWelcome(false);
        setSectionIndex(safeIdx);
        setStepIndex(safeStep);
        setIsActive(true);
        void navigateToSection(section);
    }, [navigateToSection, progress?.lastSection, progress?.lastStepIndex]);

    const restart = useCallback(() => {
        setShowWelcome(false);
        setShowCompletion(false);
        setSectionIndex(0);
        setStepIndex(0);
        setIsActive(true);
        const first = TOUR_SECTIONS[0];
        if (first) {
            void navigateToSection(first);
        }
        schedulePersist({ reset: true });
        // After reset, immediately re-establish a fresh in-progress state.
        setTimeout(() => {
            schedulePersist({ section: first?.id, stepIndex: 0, skipped: false });
        }, 500);
    }, [navigateToSection, schedulePersist]);

    const skip = useCallback(() => {
        setIsActive(false);
        setShowWelcome(false);
        setShowCompletion(false);
        schedulePersist({ skipped: true });
    }, [schedulePersist]);

    const next = useCallback(() => {
        const section = TOUR_SECTIONS[sectionIndex];
        if (!section) return;

        const nextStep = stepIndex + 1;
        if (nextStep < section.steps.length) {
            setStepIndex(nextStep);
            schedulePersist({ section: section.id, stepIndex: nextStep });
            return;
        }

        // Finished this section — mark complete and roll forward.
        const nextSectionIdx = sectionIndex + 1;
        if (nextSectionIdx >= TOUR_SECTIONS.length) {
            // End of the entire tour.
            setIsActive(false);
            setShowCompletion(true);
            schedulePersist({
                section: section.id,
                stepIndex: section.steps.length - 1,
                markSectionComplete: section.id,
                completed: true,
            });
            return;
        }

        const nextSection = TOUR_SECTIONS[nextSectionIdx];
        setSectionIndex(nextSectionIdx);
        setStepIndex(0);
        void navigateToSection(nextSection);
        schedulePersist({
            section: nextSection.id,
            stepIndex: 0,
            markSectionComplete: section.id,
        });
    }, [navigateToSection, schedulePersist, sectionIndex, stepIndex]);

    const previous = useCallback(() => {
        if (stepIndex > 0) {
            const section = TOUR_SECTIONS[sectionIndex];
            const newStep = stepIndex - 1;
            setStepIndex(newStep);
            if (section) schedulePersist({ section: section.id, stepIndex: newStep });
            return;
        }
        if (sectionIndex > 0) {
            const prevIdx = sectionIndex - 1;
            const prevSection = TOUR_SECTIONS[prevIdx];
            const lastStep = prevSection.steps.length - 1;
            setSectionIndex(prevIdx);
            setStepIndex(lastStep);
            void navigateToSection(prevSection);
            schedulePersist({ section: prevSection.id, stepIndex: lastStep });
        }
    }, [navigateToSection, schedulePersist, sectionIndex, stepIndex]);

    const dismissWelcome = useCallback(() => {
        setShowWelcome(false);
    }, []);

    const dismissCompletion = useCallback(() => {
        setShowCompletion(false);
        schedulePersist({ completed: true });
    }, [schedulePersist]);

    const activeSection = isActive ? TOUR_SECTIONS[sectionIndex] ?? null : null;
    const activeStep = activeSection?.steps[stepIndex] ?? null;
    const flatStepNumber = isActive ? flattenCursor(sectionIndex, stepIndex) + 1 : 0;

    // Cleanup pending persistence on unmount.
    useEffect(() => {
        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        };
    }, []);

    const value: WalkthroughContextValue = {
        isLoading,
        status,
        progress,
        completedSections: progress?.completedSections ?? [],
        isActive,
        showWelcome,
        showCompletion,
        sectionIndex,
        stepIndex,
        activeSection,
        activeStep,
        flatStepNumber,
        start,
        startAtSection,
        resume,
        restart,
        skip,
        next,
        previous,
        dismissWelcome,
        dismissCompletion,
    };

    // Surface firstName for the welcome modal greeting (read-only convenience).
    void currentUser; // referenced so we can re-read on user changes

    return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

/** Total flat step count — exported so the progress bar can render dots. */
export const TOTAL_FLAT_STEPS = TOUR_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0);

/** Sanity check used by the controller. */
export function getActiveTarget(section: TourSection | null, step: TourStep | null) {
    if (!section || !step) return undefined;
    return step.target;
}

void TOTAL_SECTIONS;
void getSection;
