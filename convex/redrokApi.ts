import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  RedrokRequestError,
  authenticateRedrokRequest,
} from "./lib/redrok/auth";
import {
  type FallbackLiveLead,
  type RedrokErrorCode,
  type RedrokFailure,
  classifyRedrokException,
  classifyRedrokResponse,
  mapRansomIncidentToFallbackCompany,
  shouldRetryWithFreshToken,
} from "./lib/redrok/resilience";

const REDROK_BASE_URL = "https://dash-api.redrok.io";
const REQUEST_TIMEOUT_MS = 15_000;
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

export type LiveLeadsResponse = {
  success: boolean;
  count: number;
  companies: Array<RedrokCompany | FallbackLiveLead>;
  message: string;
  source: "redrok" | "ransomware_live_fallback" | "none";
  isFallback: boolean;
  errorCode?: RedrokErrorCode;
  retryable?: boolean;
  error?: string;
};

type RedrokExecutionCredentials = {
  email?: string;
  password?: string;
  cachedToken?: string;
  cachedTokenExpiresAt?: number;
  failure?: RedrokFailure;
};

type LiveLeadsUpstreamData = {
  result?: boolean;
  count?: number;
  companyData?: RedrokCompany[];
  message?: string;
};

type LiveLeadsOperationResult<T> = { ok: true; data: T } | ({ ok: false } & RedrokFailure);
type RedrokTokenSource = "cached" | "fresh";
type RedrokTokenContext = { token: string; source: RedrokTokenSource };

function sanitizedRedrokFailure(error: unknown): RedrokFailure {
  if (error instanceof RedrokRequestError) {
    return { code: error.code, retryable: error.retryable, message: error.message };
  }
  return classifyRedrokException(error);
}

function redrokFailureFields(failure: RedrokFailure) {
  return {
    message: failure.message,
    error: failure.message,
    errorCode: failure.code,
    retryable: failure.retryable,
  };
}

function resolvedCredentialFailure(company: any): RedrokFailure | null {
  if (!company) {
    return { code: "REDROK_UNKNOWN", retryable: false, message: "Company not found" };
  }
  if (company.failure) return company.failure;
  if (!company.redrokEmail || !company.redrokPassword) {
    return {
      code: "REDROK_CREDENTIALS_MISSING",
      retryable: false,
      message: "Redrok credentials not configured",
    };
  }
  return null;
}

type RedrokExecutionDependencies<T> = {
  authenticate: (email: string, password: string) => Promise<{ ok: true; token: string } | ({ ok: false } & RedrokFailure)>;
  request: (
    token: string,
    tokenSource: RedrokTokenSource,
  ) => Promise<LiveLeadsOperationResult<T>>;
  saveToken: (token: string, expiresAt: number) => Promise<void>;
  now: () => number;
};

type LiveLeadsDependencies = Omit<RedrokExecutionDependencies<LiveLeadsUpstreamData>, "request"> & {
  fetchLiveLeads: (
    token: string,
    filters: { days: number; country: string; region: string },
    tokenSource: RedrokTokenSource,
  ) => Promise<LiveLeadsOperationResult<LiveLeadsUpstreamData>>;
  loadFallback: (filters: { days: number; country?: string }) => Promise<FallbackLiveLead[]>;
};

export async function executeRedrokEndpoint<T>(
  credentials: RedrokExecutionCredentials,
  dependencies: RedrokExecutionDependencies<T>,
): Promise<LiveLeadsOperationResult<T>> {
  const { email = "", password = "", cachedToken, cachedTokenExpiresAt, failure } = credentials;
  if (failure) return { ok: false, ...failure };
  if (!email || !password) {
    return {
      ok: false,
      code: "REDROK_CREDENTIALS_MISSING",
      retryable: false,
      message: "Redrok credentials are not configured.",
    };
  }

  const useCachedToken = Boolean(cachedToken && cachedTokenExpiresAt && dependencies.now() < cachedTokenExpiresAt);
  let token = useCachedToken ? cachedToken! : undefined;
  let source: RedrokTokenSource = useCachedToken ? "cached" : "fresh";

  if (!token) {
    const authentication = await dependencies.authenticate(email, password);
    if (!authentication.ok) return authentication;
    token = authentication.token;
    await dependencies.saveToken(token, dependencies.now() + TOKEN_EXPIRY_MS);
  }

  let result = await dependencies.request(token, source);
  if (!result.ok && source === "cached" && shouldRetryWithFreshToken(result.code)) {
    const authentication = await dependencies.authenticate(email, password);
    if (!authentication.ok) return authentication;
    await dependencies.saveToken(authentication.token, dependencies.now() + TOKEN_EXPIRY_MS);
    source = "fresh";
    result = await dependencies.request(authentication.token, source);
  }
  return result;
}

export async function authenticateRedrokForLiveLeads(
  email: string,
  password: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<{ ok: true; token: string } | ({ ok: false } & RedrokFailure)> {
  return await authenticateRedrokRequest(email, password, fetcher, timeoutMs);
}

export async function requestRedrokLiveLeads(
  token: string,
  filters: { days: number; country: string; region: string },
  tokenSource: RedrokTokenSource,
  fetcher: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<LiveLeadsOperationResult<LiveLeadsUpstreamData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${REDROK_BASE_URL}/search/LiveLeads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        days: filters.days,
        size: 0,
        country: filters.country,
        region: filters.region,
        city: "",
      }),
      signal: controller.signal,
    });

    if (response.status === 401 && tokenSource === "cached") {
      return {
        ok: false,
        code: "REDROK_TOKEN_EXPIRED",
        retryable: true,
        message: "Redrok rejected the cached token.",
      };
    }
    if (!response.ok) {
      return { ok: false, ...classifyRedrokResponse(response.status) };
    }

    const data = (await response.json()) as LiveLeadsUpstreamData;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...classifyRedrokException(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runLiveLeadsWithFallback(
  input: {
    days: number;
    country?: string;
    region?: string;
    credentials: RedrokExecutionCredentials;
  },
  dependencies: LiveLeadsDependencies,
): Promise<LiveLeadsResponse> {
  const fallbackOrFailure = async (failure: RedrokFailure): Promise<LiveLeadsResponse> => {
    const companies = await dependencies.loadFallback({
      days: input.days,
      country: input.country,
    });
    if (companies.length > 0) {
      return {
        success: true,
        count: companies.length,
        companies,
        message: "Limited public ransomware data — not credential-exposure results.",
        source: "ransomware_live_fallback",
        isFallback: true,
        errorCode: failure.code,
        retryable: failure.retryable,
      };
    }

    return {
      success: false,
      count: 0,
      companies: [],
      message: failure.message,
      source: "none",
      isFallback: false,
      errorCode: failure.code,
      retryable: failure.retryable,
      error: failure.message,
    };
  };

  const result = await executeRedrokEndpoint(input.credentials, {
    authenticate: dependencies.authenticate,
    request: (token, tokenSource) =>
      dependencies.fetchLiveLeads(
        token,
        {
          days: input.days,
          country: (input.country || "").trim().toLowerCase(),
          region: (input.region || "").trim().toLowerCase(),
        },
        tokenSource,
      ),
    saveToken: dependencies.saveToken,
    now: dependencies.now,
  });
  if (!result.ok) {
    return fallbackOrFailure(result);
  }

  const companies = result.data.companyData || [];
  return {
    success: result.data.result !== false,
    count: result.data.count || companies.length,
    companies,
    message: result.data.message || "OK",
    source: "redrok",
    isFallback: false,
  };
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

/**
 * Restrict Redrok search results to rows whose domain (or empDomain /
 * computerDomainName fallback) is either an exact match for the queried
 * domain or a subdomain of it (orange item 8.2). Prevents leaking results
 * from unrelated companies (e.g. `acmecorp.net` when querying `acme.com`).
 */
function filterToQueriedDomain(
  rows: RedrokSearchResult[],
  queryDomain: string,
): RedrokSearchResult[] {
  const target = queryDomain.toLowerCase().trim();
  if (!target) return rows;
  return rows.filter((r) => {
    const candidates = [r.domain, r.empDomain, r.computerDomainName, r.url]
      .map((d) => (d || "").toLowerCase().trim())
      .filter(Boolean);
    if (candidates.length === 0) return true; // keep when Redrok didn't supply a domain
    return candidates.some((d) => d === target || d.endsWith(`.${target}`));
  });
}

export async function redrokFetch(
  tokenContext: RedrokTokenContext,
  endpoint: string,
  body: Record<string, any> = {},
  queryParams?: Record<string, string>,
  fetcher: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  let url = `${REDROK_BASE_URL}${endpoint}`;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    url += `?${qs}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenContext.token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 401 && tokenContext.source === "cached") {
      throw new RedrokRequestError({
        code: "REDROK_TOKEN_EXPIRED",
        retryable: true,
        message: "Redrok rejected the cached token.",
      });
    }

    if (!response.ok) {
      throw new RedrokRequestError(classifyRedrokResponse(response.status));
    }

    try {
      return await response.json();
    } catch {
      throw new RedrokRequestError({
        code: "REDROK_UNKNOWN",
        retryable: true,
        message: "Redrok returned an invalid response.",
      });
    }
  } catch (error) {
    if (error instanceof RedrokRequestError) throw error;
    throw new RedrokRequestError(classifyRedrokException(error));
  } finally {
    clearTimeout(timeout);
  }
}

async function executeCompanyRedrokEndpoint<T>(
  ctx: any,
  companyId: string,
  company: any,
  request: (tokenContext: RedrokTokenContext) => Promise<T>,
): Promise<LiveLeadsOperationResult<T>> {
  const credentialFailure = resolvedCredentialFailure(company);
  return await executeRedrokEndpoint(
    {
      email: company?.redrokEmail,
      password: company?.redrokPassword,
      cachedToken: company?.redrokToken,
      cachedTokenExpiresAt: company?.redrokTokenExpiresAt,
      failure: credentialFailure ?? undefined,
    },
    {
      authenticate: async (email, password) => {
        const result = await authenticateRedrokRequest(email, password);
        if (result.ok && company?.usesLegacyPassword) {
          try {
            await ctx.runAction(internal.redrokCredentialActions.migrateLegacyPassword, {
              companyId: companyId as any,
              password,
            });
          } catch {
            // Authentication succeeded; migration can retry on a later request.
          }
        }
        return result;
      },
      request: async (token, source) => {
        try {
          return { ok: true as const, data: await request({ token, source }) };
        } catch (error) {
          return { ok: false as const, ...sanitizedRedrokFailure(error) };
        }
      },
      saveToken: async (token, expiresAt) => {
        await ctx.runMutation(internal.redrokApi.updateRedrokToken, {
          companyId: companyId as any,
          token,
          expiresAt,
        });
      },
      now: Date.now,
    },
  );
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
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    const authorization = await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
      userId: args.userId,
      searchId: args.searchId,
      domain: args.domain,
    });
    const domain = authorization.domain ?? args.domain;
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(
      ctx,
      args.companyId,
      company,
      (token) => redrokFetch(token, "/search/LiveSearch", { domain }),
    );
    if (!execution.ok) {
      await ctx.runMutation(internal.searches.internalUpdateWithResults, {
        id: args.searchId,
        status: "failed",
        errorMessage: execution.message,
      });
      return { success: false, count: 0, data: [], ...redrokFailureFields(execution) };
    }
    const result = execution.data;
    const data: RedrokSearchResult[] = filterToQueriedDomain(result.data || [], domain);
    const count = data.length;
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
  },
});

/**
 * Live Leads adapter.
 *
 * Redrok's `/search/LiveLeads` contract (empirically verified — see
 * `CYBERHOOK_INTEGRATION_STATUS_REPORT.md`):
 *   - `days`    (int)    — honored server-side
 *   - `country` (string) — honored server-side; expects lowercase name, e.g. "united states"
 *   - `region`  (string) — honored server-side; expects lowercase state, e.g. "minnesota"
 *   - `size`    (int 0-8) — accepted but SILENTLY IGNORED (verified via `size=6` returning all sizes)
 *   - `city`    (string)  — accepted but SILENTLY IGNORED
 *
 * Industry is not part of the request shape at all. Industry / size / city
 * filters are therefore applied client-side in the UI against the response
 * fields `industry`, `size`, and `locality`.
 */
export const liveLeads = action({
  args: {
    companyId: v.id("companies"),
    days: v.number(),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<LiveLeadsResponse> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    return runLiveLeadsWithFallback(
      {
        days: args.days,
        country: args.country,
        region: args.region,
        credentials: {
          email: company?.redrokEmail,
          password: company?.redrokPassword,
          cachedToken: company?.redrokToken,
          cachedTokenExpiresAt: company?.redrokTokenExpiresAt,
          failure: company?.failure,
        },
      },
      {
        authenticate: async (email, password) => {
          const result = await authenticateRedrokForLiveLeads(email, password);
          if (result.ok && company?.usesLegacyPassword) {
            try {
              await ctx.runAction(internal.redrokCredentialActions.migrateLegacyPassword, {
                companyId: args.companyId,
                password,
              });
            } catch {
              // Authentication succeeded; migration can retry on a later request.
            }
          }
          return result;
        },
        fetchLiveLeads: requestRedrokLiveLeads,
        loadFallback: async ({ days, country }) => {
          const incidents = await ctx.runQuery(internal.ransomHub.internalFallbackForLiveLeads, {
            days,
            country,
          });
          return incidents.map(mapRansomIncidentToFallbackCompany);
        },
        saveToken: async (token, expiresAt) => {
          await ctx.runMutation(internal.redrokApi.updateRedrokToken, {
            companyId: args.companyId,
            token,
            expiresAt,
          });
        },
        now: Date.now,
      },
    );
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/countries"),
    );
    if (!execution.ok) return { success: false, countries: [], ...redrokFailureFields(execution) };
    return { success: true, countries: execution.data.countries || [] };
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/regions", {}, { country: args.country }),
    );
    if (!execution.ok) return { success: false, regions: [], ...redrokFailureFields(execution) };
    return { success: true, regions: execution.data.countryRegions || [] };
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/GetSearchHistory"),
    );
    if (!execution.ok) return { success: false, history: [], ...redrokFailureFields(execution) };
    return { success: true, history: execution.data.data || [] };
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/GetPrevLiveSearchResults", {
        guid: args.guid,
        limit: args.limit || 100,
      }),
    );
    if (!execution.ok) return { success: false, data: [], ...redrokFailureFields(execution) };
    return { success: execution.data.result !== false, data: execution.data.data || [] };
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/GetLiveSearchCredit"),
    );
    if (!execution.ok) return { success: false, credits: null, ...redrokFailureFields(execution) };
    return { success: true, credits: execution.data.data || null };
  },
});

export const rescanDomain = action({
  args: {
    companyId: v.id("companies"),
    watchlistItemId: v.id("watchlistItems"),
    domain: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    exposureCount: number;
    error?: string;
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    const authorization = await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
      watchlistItemId: args.watchlistItemId,
      domain: args.domain,
    });
    const domain = authorization.domain ?? args.domain;
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/LiveSearch", { domain }),
    );
    if (!execution.ok) return { success: false, exposureCount: 0, ...redrokFailureFields(execution) };
    const filtered = filterToQueriedDomain(execution.data.data || [], domain);
    const count = filtered.length;
    await ctx.runMutation(internal.watchlist.updateFromCheck, {
      id: args.watchlistItemId,
      exposureCount: count,
      hasNewExposures: count > 0,
    });
    return { success: true, exposureCount: count };
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
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    await ctx.runQuery(internal.redrokCredentials.authorizePublicAction, {
      companyId: args.companyId,
    });
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });

    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/Reports", { domain: args.domain }),
    );
    if (!execution.ok) return { success: false, ...redrokFailureFields(execution) };
    return { success: true };
  },
});

/**
 * Internal-action shim around `rescanDomain` so mutations (which can't call
 * actions directly) can schedule it. Used by `watchlist.add` to trigger an
 * immediate scan on the freshly-added row (orange items 10.1 / 10.2).
 */
export const rescanDomainInternal = internalAction({
  args: {
    companyId: v.id("companies"),
    watchlistItemId: v.id("watchlistItems"),
    domain: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    exposureCount: number;
    error?: string;
    message?: string;
    errorCode?: RedrokErrorCode;
    retryable?: boolean;
  }> => {
    const authorization = await ctx.runQuery(internal.redrokCredentials.validateScheduledScanContext, {
      companyId: args.companyId,
      watchlistItemId: args.watchlistItemId,
      domain: args.domain,
    });
    const domain = authorization.domain;
    const company = await ctx.runAction(internal.redrokCredentialActions.resolveCredentials, {
      companyId: args.companyId,
    });
    const execution = await executeCompanyRedrokEndpoint(ctx, args.companyId, company, (token) =>
      redrokFetch(token, "/search/LiveSearch", { domain }),
    );
    if (!execution.ok) return { success: false, exposureCount: 0, ...redrokFailureFields(execution) };
    const filtered = filterToQueriedDomain(execution.data.data || [], domain);
    const count = filtered.length;
    await ctx.runMutation(internal.watchlist.updateFromCheck, {
      id: args.watchlistItemId,
      exposureCount: count,
      hasNewExposures: count > 0,
    });
    return { success: true, exposureCount: count };
  },
});
