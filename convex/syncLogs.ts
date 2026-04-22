import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Sync log writer + reader (red items 11.2 / 12.4).
 *
 * Every cron-driven data fetch records exactly one row here — new-rows
 * count, skipped duplicates, duration, and (if applicable) the error
 * message. `recentLogs` exposes this stream to admins so they can tell
 * at a glance whether a given source is healthy, stale, or erroring.
 */

export const record = internalMutation({
  args: {
    source: v.string(),
    startedAt: v.number(),
    finishedAt: v.number(),
    success: v.boolean(),
    stored: v.number(),
    skipped: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLogs", {
      source: args.source,
      startedAt: args.startedAt,
      finishedAt: args.finishedAt,
      durationMs: args.finishedAt - args.startedAt,
      success: args.success,
      stored: args.stored,
      skipped: args.skipped,
      errorMessage: args.errorMessage,
    });
  },
});

/**
 * Returns the last N sync log rows across all sources, newest first.
 * Any signed-in user may read this (it contains no PII or tenant data —
 * only integration health metrics).
 */
export const recentLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    return await ctx.db
      .query("syncLogs")
      .withIndex("by_startedAt")
      .order("desc")
      .take(limit);
  },
});

/**
 * Latest run for each known data source, newest first. Used by the
 * admin "Data Sync Status" strip on Ransom Hub. Returns an empty list
 * if the caller isn't authenticated.
 */
export const latestBySource = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const sources = ["ransomware_live", "hhs_ocr", "california_ag", "privacy_rights"];
    const rows = await Promise.all(
      sources.map((s) =>
        ctx.db
          .query("syncLogs")
          .withIndex("by_source", (q) => q.eq("source", s))
          .order("desc")
          .first(),
      ),
    );
    return rows
      .map((row, i) => ({ source: sources[i], log: row }))
      .filter((r) => r.log !== null);
  },
});
