import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const REDROK_BASE_URL = "https://dash-api.redrok.io";
const TOKEN_EXPIRY_MS = 55 * 60 * 1000; // refresh 5 min before 1-hour expiry

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RedrokSearchResult {
  index: string;
  docId: string;
  source: string;
  timestamp: string;
  username: string;
  password: string;
  url: string;
  content: string;
  infectedFileLocation: string;
  infectedAt: string;
  domain: string;
  country: string;
  location: string;
  zipCode: string;
  currentLanguage: string;
  timeZone: string;
  application: string;
  ip: string;
  hwid: string;
  screenSize: string;
  operatingSystem: string;
  uac: string;
  processElevation: string;
  localUser: string;
  computerRAM: string;
  computerCores: string;
  computerName: string;
  directory_ID: string;
  empDomain: string;
  industry: string;
  stealer: string;
  computerDomainName: string;
  breachName: string;
  computerCPU: string;
  computerGPU: string;
  computerAV: string;
  severity: number;
  companyGuid: string;
  companyName: string;
  name: string;
  severityType: string;
  statusId: number;
}

export interface RedrokCompany {
  country: string;
  website: string;
  size: string;
  name: string;
  founded: number | null;
  locality: string;
  industry: string;
  id: string;
  linkedin_url: string;
  region: string;
  state_location: { lon: number; lat: number } | null;
}

export interface RedrokHistoryRecord {
  id: number;
  guid: string;
  username: string;
  keyword: string;
  createdAt: string;
  dataCount: number;
  timestamp: number;
  isExport: number;
}

// ─── Internal: Token Management ──────────────────────────────────────────────

export const updateRedrokToken = internalMutation({
  args: {
    companyId: v.id("companies"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.companyId, {
      redrokToken: args.token,
      redrokTokenExpiresAt: args.expiresAt,
    });
  },
});

export const getCompanyCredentials = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;
    return {
      redrokEmail: company.redrokEmail,
      redrokPassword: company.redrokPassword,
      redrokToken: company.redrokToken,
      redrokTokenExpiresAt: company.redrokTokenExpiresAt,
    };
  },
});

async function getOrRefreshToken(
  ctx: any,
  companyId: string,
  email: string,
  password: string,
  cachedToken?: string,
  cachedExpiry?: number
): Promise<string> {
  if (cachedToken && cachedExpiry && Date.now() < cachedExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${REDROK_BASE_URL}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ip: "0.0.0.0" }),
  });

  if (!response.ok) {
    throw new Error(`Redrok authentication failed: ${response.status}`);
  }

  const data = await response.json();
  const token = data.token;
  if (!token) throw new Error("No token returned from Redrok API");

  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;

  await ctx.runMutation(internal.redrokApi.updateRedrokToken, {
    companyId: companyId as any,
    token,
    expiresAt,
  });

  return token;
}

async function redrokFetch(
  token: string,
  endpoint: string,
  body: Record<string, any> = {},
  queryParams?: Record<string, string>
) {
  let url = `${REDROK_BASE_URL}${endpoint}`;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    url += `?${qs}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error("REDROK_TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redrok API error ${response.status}: ${text}`);
  }

  return response.json();
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export const liveSearch = action({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
    searchId: v.id("searches"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    data: RedrokSearchResult[];
    message: string;
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: "Company not found",
      });
      return { success: false, count: 0, data: [], message: "Company not found", error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: "Redrok API credentials not configured",
      });
      return { success: false, count: 0, data: [], message: "Redrok credentials not configured", error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/LiveSearch", {
        domain: args.domain,
      });

      const data: RedrokSearchResult[] = result.data || [];
      const count = result.count || data.length;

      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "success",
        totalExposures: count,
        resultGuid: result.guid || undefined,
      });

      return {
        success: result.result !== false,
        count,
        data,
        message: result.message || "OK",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      if (errorMsg === "REDROK_TOKEN_EXPIRED") {
        try {
          const freshToken = await getOrRefreshToken(ctx, args.companyId, email, password);
          const result = await redrokFetch(freshToken, "/search/LiveSearch", {
            domain: args.domain,
          });

          const data: RedrokSearchResult[] = result.data || [];
          const count = result.count || data.length;

          await ctx.runMutation(internal.searches.internalUpdateWithResults, {
            id: args.searchId,
            status: "success",
            totalExposures: count,
          });

          return { success: true, count, data, message: result.message || "OK" };
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : "Retry failed";
          await ctx.runMutation(internal.searches.internalUpdateWithResults, {
            id: args.searchId,
            status: "failed",
            errorMessage: retryMsg,
          });
          return { success: false, count: 0, data: [], message: retryMsg, error: retryMsg };
        }
      }

      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: errorMsg,
      });
      return { success: false, count: 0, data: [], message: errorMsg, error: errorMsg };
    }
  },
});

export const liveLeads = action({
  args: {
    companyId: v.id("companies"),
    days: v.number(),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    count: number;
    companies: RedrokCompany[];
    message: string;
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, count: 0, companies: [], message: "Company not found", error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, count: 0, companies: [], message: "Redrok credentials not configured", error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/LiveLeads", {
        days: args.days,
        country: args.country || "",
        region: args.region || "",
        city: args.city || "",
      });

      const companies: RedrokCompany[] = result.companyData || [];
      return {
        success: result.result !== false,
        count: result.count || companies.length,
        companies,
        message: result.message || "OK",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, count: 0, companies: [], message: errorMsg, error: errorMsg };
    }
  },
});

export const getCountries = action({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    countries: Array<{ val: string; regions: boolean }>;
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, countries: [], error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, countries: [], error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/countries");
      return {
        success: true,
        countries: result.countries || [],
      };
    } catch (error) {
      return { success: false, countries: [], error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const getRegions = action({
  args: {
    companyId: v.id("companies"),
    country: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    regions: string[];
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, regions: [], error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, regions: [], error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/regions", {}, { country: args.country });
      return {
        success: true,
        regions: result.countryRegions || [],
      };
    } catch (error) {
      return { success: false, regions: [], error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const getSearchHistory = action({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    history: RedrokHistoryRecord[];
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, history: [], error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, history: [], error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/GetSearchHistory");
      return {
        success: true,
        history: result.data || [],
      };
    } catch (error) {
      return { success: false, history: [], error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const getPrevSearchResults = action({
  args: {
    companyId: v.id("companies"),
    guid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    data: RedrokSearchResult[];
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, data: [], error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, data: [], error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/GetPrevLiveSearchResults", {
        guid: args.guid,
        limit: args.limit || 100,
      });

      return {
        success: result.result !== false,
        data: result.data || [],
      };
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const getCredits = action({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    credits: any;
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, credits: null, error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, credits: null, error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      const result = await redrokFetch(token, "/search/GetLiveSearchCredit");
      return {
        success: true,
        credits: result.data || null,
      };
    } catch (error) {
      return { success: false, credits: null, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const generateReport = action({
  args: {
    companyId: v.id("companies"),
    domain: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const company = await ctx.runQuery(internal.redrokApi.getCompanyCredentials, {
      companyId: args.companyId,
    });

    if (!company) {
      return { success: false, error: "Company not found" };
    }

    const email = company.redrokEmail || process.env.REDROK_EMAIL;
    const password = company.redrokPassword || process.env.REDROK_PASSWORD;

    if (!email || !password) {
      return { success: false, error: "Redrok credentials not configured" };
    }

    try {
      const token = await getOrRefreshToken(
        ctx, args.companyId, email, password,
        company.redrokToken, company.redrokTokenExpiresAt
      );

      await redrokFetch(token, "/search/Reports", { domain: args.domain });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
