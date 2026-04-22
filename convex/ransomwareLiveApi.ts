import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const API_BASE = "https://api-pro.ransomware.live";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RansomwareLiveVictim {
  post_title: string;
  group_name: string;
  discovered: string;
  description: string;
  website: string;
  published: string;
  post_url: string;
  country: string;
  activity: string;
  screenshot: string;
  infostealer: any;
  press: any;
  id: string;
  permalink: string;
}

export interface SearchResponse {
  client: string;
  query: string;
  count: number;
  victims: RansomwareLiveVictim[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export const searchVictims = action({
  args: {
    query: v.string(),
    searchId: v.id("searches"),
    companyId: v.id("companies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    victims: RansomwareLiveVictim[];
    error?: string;
  }> => {
    const apiKey = process.env.RANSOMWARE_LIVE_API_KEY;
    if (!apiKey) {
      // Update search status to failed
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: "API key not configured",
      });
      return { success: false, count: 0, victims: [], error: "API key not configured" };
    }

    try {
      const url = `${API_BASE}/victims/search?q=${encodeURIComponent(args.query)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `API returned ${response.status}: ${errorText}`;
        await ctx.runMutation(internal.searches.internalUpdateWithResults, {
          id: args.searchId,
          status: "failed",
          errorMessage: errorMsg,
        });
        return { success: false, count: 0, victims: [], error: errorMsg };
      }

      const data = (await response.json()) as SearchResponse;
      const victims = data.victims || [];

      // Update search record with results
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "success",
        totalExposures: victims.length,
      });

      // Also store incidents in ransomIncidents table for Ransom Hub
      for (const victim of victims) {
        const attackDate = victim.published
          ? new Date(victim.published).getTime()
          : Date.now();

        await ctx.runMutation(internal.ransomHub.internalCreate, {
          companyName: victim.post_title,
          domain: victim.website || undefined,
          industry: victim.activity !== "Not Found" ? victim.activity : undefined,
          country: victim.country || undefined,
          attackDate: isNaN(attackDate) ? Date.now() : attackDate,
          ransomwareGroup: victim.group_name,
          incidentType: "ransomware" as const,
          source: "ransomware_live" as const,
          sourceUrl: victim.permalink || undefined,
          description: victim.description !== "N/A" ? victim.description : undefined,
        });
      }

      return { success: true, count: victims.length, victims };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: errorMsg,
      });
      return { success: false, count: 0, victims: [], error: errorMsg };
    }
  },
});

export const getRecentVictims = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (_, args): Promise<{
    success: boolean;
    victims: RansomwareLiveVictim[];
    error?: string;
  }> => {
    const apiKey = process.env.RANSOMWARE_LIVE_API_KEY;
    if (!apiKey) {
      return { success: false, victims: [], error: "API key not configured" };
    }

    try {
      const response = await fetch(`${API_BASE}/victims/recent`, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, victims: [], error: `API returned ${response.status}` };
      }

      const data = await response.json();
      const victims: RansomwareLiveVictim[] = data.victims || data || [];
      const limited = args.limit ? victims.slice(0, args.limit) : victims;

      return { success: true, victims: limited };
    } catch (error) {
      return {
        success: false,
        victims: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const getApiStats = action({
  args: {},
  handler: async (): Promise<{
    success: boolean;
    stats?: any;
    error?: string;
  }> => {
    const apiKey = process.env.RANSOMWARE_LIVE_API_KEY;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      const response = await fetch(`${API_BASE}/stats`, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API returned ${response.status}` };
      }

      const stats = await response.json();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ─── Internal Action: Daily fetch for cron ────────────────────────────────────

export const fetchRecentAndStore = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    // Record every run to syncLogs (red item 11.2 — "Log every sync run").
    const startedAt = Date.now();
    const logResult = async (result: { success: boolean; stored: number; error?: string }) => {
      await ctx.runMutation(internal.syncLogs.record, {
        source: "ransomware_live",
        startedAt,
        finishedAt: Date.now(),
        success: result.success,
        stored: result.stored,
        errorMessage: result.error,
      });
      return result;
    };

    const apiKey = process.env.RANSOMWARE_LIVE_API_KEY;
    if (!apiKey) {
      return logResult({ success: false, stored: 0, error: "API key not configured" });
    }

    try {
      const response = await fetch(`${API_BASE}/victims/recent`, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return logResult({ success: false, stored: 0, error: `API returned ${response.status}` });
      }

      const data = await response.json();
      const victims: RansomwareLiveVictim[] = data.victims || data || [];

      if (victims.length === 0) {
        return logResult({ success: true, stored: 0 });
      }

      // Batch insert — Convex has a limit per mutation so chunk into groups of 50
      const chunkSize = 50;
      let stored = 0;
      for (let i = 0; i < victims.length; i += chunkSize) {
        const chunk = victims.slice(i, i + chunkSize);
        // Defensive filter: ransomware.live occasionally returns rows
        // with missing post_title or group_name. Those rows don't meet
        // our required-field schema and would fail the whole chunk, so
        // drop them here and continue with the rest.
        const incidents = chunk
          .filter((v) => v.post_title && v.group_name)
          .map((victim) => {
            const attackDate = victim.published
              ? new Date(victim.published).getTime()
              : Date.now();
            return {
              companyName: victim.post_title,
              domain: victim.website || undefined,
              industry: victim.activity !== "Not Found" ? victim.activity : undefined,
              country: victim.country || undefined,
              attackDate: isNaN(attackDate) ? Date.now() : attackDate,
              ransomwareGroup: victim.group_name,
              incidentType: "ransomware" as const,
              source: "ransomware_live" as const,
              sourceUrl: victim.permalink || undefined,
              description: victim.description !== "N/A" ? victim.description : undefined,
            };
          });
        if (incidents.length > 0) {
          await ctx.runMutation(internal.ransomHub.internalBulkCreate, { incidents });
          stored += incidents.length;
        }
      }

      return logResult({ success: true, stored });
    } catch (error) {
      return logResult({
        success: false,
        stored: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
