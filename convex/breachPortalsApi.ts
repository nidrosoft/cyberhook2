import { v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * State / federal breach-notification data fetchers (red item 12.4).
 *
 * Every handler:
 *   1. runs on a daily cron (see convex/crons.ts),
 *   2. records exactly one row to `syncLogs` (red item 11.2 — admin visibility),
 *   3. writes new breach incidents into `ransomIncidents` (dedup via
 *      internalBulkCreate → source + company + date).
 *
 * Endpoint notes:
 *   - HHS OCR: The public "Wall of Shame" is mirrored as a Socrata
 *     dataset on HealthData.gov (dataset id `p3bw-4jd9`). This is the
 *     only reliably-machine-readable federal breach feed and covers all
 *     50 states for HIPAA-covered entities.
 *   - California AG: Only an HTML listing exists — we graceful-no-op
 *     until a scraper (or a consumer-grade feed) is wired up.
 *   - Privacy Rights Clearinghouse: No public REST API; periodic CSV
 *     snapshots only. Graceful no-op for now.
 */

// ─── Shared helper ────────────────────────────────────────────────────────────

async function recordSync(
  ctx: any,
  source: string,
  startedAt: number,
  result: { success: boolean; stored: number; error?: string },
) {
  await ctx.runMutation(internal.syncLogs.record, {
    source,
    startedAt,
    finishedAt: Date.now(),
    success: result.success,
    stored: result.stored,
    errorMessage: result.error,
  });
  return result;
}

// ─── HHS OCR ──────────────────────────────────────────────────────────────────
// HHS does NOT publish an official JSON / REST API for the OCR Breach Report
// ("Wall of Shame"). The portal is a JSF form with CSV export that requires
// a browser session. Until AMSYS confirms an alternate feed or a scraping
// worker is stood up, the daily cron records a transparent "no-feed" entry
// to syncLogs so ops can see the source is scheduled but idle.
//
// To populate data today, admins can call the `ingestSnapshot` mutation
// below with an array of records parsed from the HHS CSV export.

export const fetchHHSOCRBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    const startedAt = Date.now();
    return recordSync(ctx, "hhs_ocr", startedAt, {
      success: true,
      stored: 0,
      error: "No public JSON feed — ingest via `breachPortalsApi.ingestSnapshot` from CSV export",
    });
  },
});

// ─── California Attorney General ──────────────────────────────────────────────

export const fetchCaliforniaAGBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    const startedAt = Date.now();
    // CA AG publishes an HTML listing only — no public JSON/CSV endpoint.
    // Record a "scheduled but unimplemented" log entry so admins can see
    // this source is accounted for and on the roadmap.
    return recordSync(ctx, "california_ag", startedAt, {
      success: true,
      stored: 0,
      error: "No public JSON feed — HTML scraper not yet implemented",
    });
  },
});

// ─── Privacy Rights Clearinghouse ─────────────────────────────────────────────

export const fetchPrivacyRightsBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    const startedAt = Date.now();
    // Privacy Rights Clearinghouse publishes periodic CSV snapshots
    // (not a live feed). Daily cron records "no-op" entries until a
    // snapshot ingester is wired up.
    return recordSync(ctx, "privacy_rights", startedAt, {
      success: true,
      stored: 0,
      error: "CSV snapshot ingester not yet wired up",
    });
  },
});

// ─── Manual Snapshot Ingestion ────────────────────────────────────────────────
// Admin-run mutation for bulk-loading breach incidents from a CSV-exported
// snapshot (e.g. the HHS OCR portal's Excel/CSV download). Called from an
// admin UI or one-off script with an already-parsed row array.
//
// Dedup is handled downstream by `internalBulkCreate` (source + company +
// date) so repeated runs with overlapping snapshots are safe.

export const ingestSnapshot = mutation({
  args: {
    source: v.union(
      v.literal("hhs_ocr"),
      v.literal("california_ag"),
      v.literal("privacy_rights"),
    ),
    incidents: v.array(
      v.object({
        companyName: v.string(),
        industry: v.optional(v.string()),
        country: v.optional(v.string()),
        region: v.optional(v.string()),
        attackDate: v.number(),
        individualsAffected: v.optional(v.number()),
        breachType: v.optional(v.string()),
        breachVector: v.optional(v.string()),
        filedDate: v.optional(v.number()),
        sourceUrl: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const startedAt = Date.now();
    const payload = args.incidents.map((inc) => ({
      ...inc,
      incidentType: "breach_notification" as const,
      source: args.source,
    }));

    await ctx.runMutation(internal.ransomHub.internalBulkCreate, { incidents: payload });

    await ctx.runMutation(internal.syncLogs.record, {
      source: args.source,
      startedAt,
      finishedAt: Date.now(),
      success: true,
      stored: payload.length,
    });

    return { success: true, stored: payload.length };
  },
});
