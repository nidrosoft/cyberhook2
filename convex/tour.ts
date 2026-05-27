/**
 * Phase 10 — Guided Onboarding Tour backend.
 *
 * Lives separately from `convex/onboarding.ts` (which handles the signup
 * wizard) to avoid namespace collisions. Stores per-user progress so the
 * tour can be resumed across sessions and reflected on the News-page
 * onboarding checklist tile.
 *
 * The legacy `guidedTourCompleted` boolean on `users` is left intact for
 * backwards compatibility, but `tourProgress` is the source of truth.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const EMPTY_PROGRESS = {
  completed: false,
  skipped: false,
  lastSection: undefined as string | undefined,
  lastStepIndex: undefined as number | undefined,
  completedSections: [] as string[],
  updatedAt: 0,
};

/**
 * Returns the current user's tour progress. Lightweight — runs on every
 * dashboard mount via the TourProvider, so we keep it index-only.
 */
export const getTourProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    if (!user.tourProgress) {
      // Honour the legacy boolean: if the user previously dismissed the V2
      // tour, surface that as `completed` so we don't re-prompt them.
      if (user.guidedTourCompleted) {
        return {
          ...EMPTY_PROGRESS,
          completed: true,
          updatedAt: user.guidedTourCompletedAt ?? user.updatedAt,
        };
      }
      return EMPTY_PROGRESS;
    }
    return {
      completed: user.tourProgress.completed,
      skipped: user.tourProgress.skipped,
      lastSection: user.tourProgress.lastSection,
      lastStepIndex: user.tourProgress.lastStepIndex,
      completedSections: user.tourProgress.completedSections ?? [],
      updatedAt: user.tourProgress.updatedAt,
    };
  },
});

/**
 * Persists a single transition in the tour. Called by the client controller
 * (debounced ~600ms) when the user advances, skips, completes, or restarts.
 *
 * Behaviour:
 *   - `section` + `stepIndex` updates the resume pointer.
 *   - `markSectionComplete` adds the section to `completedSections` (deduped).
 *   - `completed: true` flips the legacy boolean as well so older code paths
 *     stay consistent.
 *   - `reset: true` wipes progress (used by "Restart Tour" from Help menu).
 */
export const updateTourProgress = mutation({
  args: {
    section: v.optional(v.string()),
    stepIndex: v.optional(v.number()),
    markSectionComplete: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    skipped: v.optional(v.boolean()),
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (args.reset) {
      await ctx.db.patch(user._id, {
        tourProgress: {
          completed: false,
          skipped: false,
          lastSection: undefined,
          lastStepIndex: undefined,
          completedSections: [],
          updatedAt: Date.now(),
        },
        guidedTourCompleted: false,
        updatedAt: Date.now(),
      });
      return;
    }

    const prev = user.tourProgress ?? {
      completed: !!user.guidedTourCompleted,
      skipped: false,
      lastSection: undefined as string | undefined,
      lastStepIndex: undefined as number | undefined,
      completedSections: [] as string[],
      updatedAt: 0,
    };

    const completedSections = new Set<string>(prev.completedSections ?? []);
    if (args.markSectionComplete) {
      completedSections.add(args.markSectionComplete);
    }

    const nextCompleted = args.completed ?? prev.completed;

    await ctx.db.patch(user._id, {
      tourProgress: {
        completed: nextCompleted,
        skipped: args.skipped ?? prev.skipped,
        lastSection: args.section ?? prev.lastSection,
        lastStepIndex:
          args.stepIndex !== undefined ? args.stepIndex : prev.lastStepIndex,
        completedSections: Array.from(completedSections),
        updatedAt: Date.now(),
      },
      // Mirror the completed flag onto the legacy boolean so older code paths
      // (e.g. analytics dashboards) see the same state.
      ...(args.completed !== undefined
        ? {
            guidedTourCompleted: args.completed,
            guidedTourCompletedAt: args.completed ? Date.now() : undefined,
          }
        : {}),
      updatedAt: Date.now(),
    });
  },
});
