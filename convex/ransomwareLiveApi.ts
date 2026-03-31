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
