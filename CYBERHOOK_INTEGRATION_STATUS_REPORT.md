# CyberHook Integration Status Report & Implementation-Ready Guide

> **Date:** March 7, 2026
> **Status:** READY TO BUILD (with known gaps documented)
> **Purpose:** Everything Cursor needs to build the Convex ↔ Redrok proxy layer and connect existing UI to real data

---

## EXECUTIVE SUMMARY

### What We Know (Confirmed)
- ✅ Full list of ~60 Redrok API endpoints (from Postman collection)
- ✅ All request body schemas (from Postman collection)
- ✅ Auth is **per-user**, Bearer token, **expires in 1 hour**
- ✅ Production URL: `https://dash-api.redrok.io`
- ✅ Staging URL: `https://dash-api-stg.redrok.io` (currently down)
- ✅ Live Leads response fields (confirmed from screenshot of AMSYS's own UI)
- ✅ CyberHook uses Clerk for frontend auth, Convex for database
- ✅ All Redrok calls must proxy through Convex HTTP actions (never call from browser)

### What We Don't Have (Gaps)
- ❌ Test credentials (shared by someone named "Shay" — Cyriac needs to obtain these)
- ❌ Official response schemas (only Postman collection + Help page exists)
- ❌ Ransom Hub data source — AMSYS doesn't provide this, need ransomware.live or similar
- ❌ Contact enrichment (C-suite emails/phones) — no endpoint exists, need third-party
- ❌ News feed — no endpoint exists, need third-party cyber news API

### What We're Doing About the Gaps
We're building with **inferred TypeScript types** based on: the screenshot of AMSYS's existing UI, the request body patterns, the PRD field requirements, and common API conventions. Every inferred type is marked with `// INFERRED` comments. Once Cyriac gets test credentials and sees real responses, field names get adjusted — but the architecture, proxy layer, and UI wiring will already be in place.

---

## PART 1: CONFIRMED INFORMATION

### 1.1 Authentication Details

| Property | Value | Source |
|---|---|---|
| Auth type | Bearer token | Postman collection |
| Token scope | Per-user | AMSYS email response |
| Token lifetime | 1 hour | AMSYS email response |
| Auth endpoint | `POST /api/authenticate` | Postman collection |
| Request body | `{ email, password, ip }` | Postman collection |
| Production URL | `https://dash-api.redrok.io` | AMSYS Help page URL |
| Staging URL | `https://dash-api-stg.redrok.io` | AMSYS email (currently unavailable) |

### 1.2 Live Leads Response (Confirmed from Screenshot)

The screenshot of AMSYS's existing Redrok platform shows these exact columns in the Live Leads table:

| Column | Example Values | Notes |
|---|---|---|
| Name | "The Criterion Collection", "Discourse", "Optum" | Company name |
| Industry | "Motion Pictures And Fi...", "Internet", "Hospital & Health Care" | Industry classification |
| Website | "criterion.com", "discourse.org", "optum.com" | Domain |
| Country | "United States" | Country name string |
| Region | "New York", "Minnesota", "N/A" | State/region, can be N/A |
| Employees | "51-200", "1-10", "10001+", "1001-5000", "11-50" | Employee range as string |

Additional confirmed UI elements:
- Pagination: "Showing 1 to 20 of 47 entries" with page numbers
- Rows per page selector (default 20)
- Search bar at top
- Filter sidebar: time range dropdown ("Last 24 Hours"), Country, Region, Industry, Size
- "Generate Report" button per row
- Three-dot menu per row

### 1.3 Request Bodies (Confirmed from Postman)

**Live Search:**
```json
{ "domain": "bata.com" }
```

**Live Leads:**
```json
{
  "size": 1,
  "days": 1,
  "country": "united states",
  "region": "California",
  "city": ""
}
```

**Reports:**
```json
{ "domain": "google.com" }
```

**Previous Search Results:**
```json
{
  "limit": 2,
  "guid": "2c47ded0-2c17-11f0-9d61-02f1953e5fe5"
}
```

**Findings (detailed):**
```json
{
  "filterDomainUser": true,
  "filterUserInOtherDomain": false,
  "filterInfectedComputer": false,
  "filterConsumer": false,
  "filterUrl": false,
  "filterPassword": false,
  "filterUsername": false,
  "searchCompanyGuid": "",
  "searchVal": "",
  "dateFrom": "1970-01-01",
  "dateTo": "1970-01-01",
  "severityId": 0,
  "sortMode": 1,
  "sortId": 0,
  "page": 1,
  "limit": 100
}
```

**Credits:** No request body (auth token only)

**Search History:** No request body (auth token only)

**Countries:** No request body (auth token only)

**Regions:** Query parameter: `?country=california`

---

## PART 2: INFERRED TYPESCRIPT TYPES

These types are our best-guess response schemas based on the screenshot, request patterns, PRD requirements, and common API conventions. Every type is buildable and adjustable.

### 2.1 Authentication

```typescript
// ── REQUEST ──
interface RedrokAuthRequest {
  email: string;
  password: string;
  ip: string;
}

// ── RESPONSE (INFERRED) ──
// Standard JWT/session auth patterns
interface RedrokAuthResponse {
  token: string;                    // Bearer token for subsequent calls
  expiresIn?: number;               // Seconds until expiry (likely 3600 = 1hr)
  user?: {
    id: string;
    email: string;
    fullName: string;
    role?: string;                  // INFERRED: user permission level
    customerGuid?: string;          // INFERRED: company/customer identifier
  };
}
```

### 2.2 Live Search

```typescript
// ── REQUEST ──
interface RedrokLiveSearchRequest {
  domain: string;                   // e.g. "targetcompany.com"
}

// ── RESPONSE (INFERRED from PRD requirements + common patterns) ──
// The PRD states results include: exposure count, date range,
// types of exposed data, individual exposure entries
interface RedrokLiveSearchResponse {
  guid: string;                     // INFERRED: result identifier for GetPrevLiveSearchResults
  domain: string;                   // The searched domain
  totalExposures: number;           // INFERRED: total count of exposures found
  summary: {
    totalRecords: number;           // INFERRED
    dateRange: {
      earliest: string;            // INFERRED: ISO date of oldest exposure
      latest: string;              // INFERRED: ISO date of newest exposure
    };
    exposureTypes: string[];        // INFERRED: e.g. ["credentials", "emails", "passwords"]
  };
  findings: RedrokFinding[];        // INFERRED: individual exposure entries
}

interface RedrokFinding {
  id: number;                       // INFERRED
  date: string;                     // INFERRED: when exposure was discovered/posted
  sourceType: string;               // INFERRED: e.g. "dark_web", "paste", "breach"
  severity: string;                 // INFERRED: maps to Critical/High/Med/Low/Info
  email?: string;                   // INFERRED: exposed email (masked)
  username?: string;                // INFERRED: exposed username (masked)
  password?: string;                // INFERRED: exposed password (masked)
  url?: string;                     // INFERRED: related URL
  computerName?: string;            // INFERRED: infected computer name
}
```

### 2.3 Live Leads (CONFIRMED from screenshot + request body)

```typescript
// ── REQUEST ──
interface RedrokLiveLeadsRequest {
  size: number;       // Employee size filter
                      // INFERRED mapping:
                      // 0 = All sizes
                      // 1 = 1-10
                      // 2 = 11-50
                      // 3 = 51-200
                      // 4 = 201-500
                      // 5 = 501-1000
                      // 6 = 1001-5000
                      // 7 = 5001-10000
                      // 8 = 10001+
  days: number;       // Time range filter
                      // INFERRED mapping:
                      // 1 = Last 24 hours
                      // 7 = Last 7 days
                      // 30 = Last 30 days
                      // 90 = Last 90 days
  country: string;    // Country name (lowercase), e.g. "united states"
  region: string;     // Region/state name, e.g. "California", or "" for all
  city: string;       // City name, or "" for all
}

// ── RESPONSE (CONFIRMED fields from screenshot, structure INFERRED) ──
interface RedrokLiveLeadsResponse {
  totalRecords: number;             // CONFIRMED: "47 entries" shown in pagination
  page: number;                     // INFERRED: current page
  limit: number;                    // INFERRED: items per page (20 in screenshot)
  data: RedrokLiveLead[];
}

interface RedrokLiveLead {
  name: string;                     // CONFIRMED: "The Criterion Collection", "Discourse", etc.
  industry: string;                 // CONFIRMED: "Motion Pictures And Fi...", "Internet", etc.
  website: string;                  // CONFIRMED: "criterion.com", "discourse.org", etc.
  country: string;                  // CONFIRMED: "United States"
  region: string;                   // CONFIRMED: "New York", "Minnesota", "N/A"
  employees: string;                // CONFIRMED: "51-200", "1-10", "10001+", "1001-5000"
  // Below fields INFERRED — likely exist but not shown in screenshot columns:
  domain?: string;                  // INFERRED: may be same as website or separate
  id?: string;                      // INFERRED: unique record identifier
  city?: string;                    // INFERRED: city if available
  exposureCount?: number;           // INFERRED: number of exposures (for sorting/filtering)
  lastExposureDate?: string;        // INFERRED: most recent exposure date
}
```

### 2.4 Reports

```typescript
// ── REQUEST ──
interface RedrokReportsRequest {
  domain: string;                   // e.g. "google.com"
}

// ── RESPONSE (INFERRED from PRD "Export PDF/CSV report" requirement) ──
interface RedrokReportsResponse {
  domain: string;
  companyName?: string;             // INFERRED
  generatedAt: string;              // INFERRED: timestamp
  summary: {
    totalExposures: number;         // INFERRED
    criticalCount: number;          // INFERRED
    highCount: number;              // INFERRED
    mediumCount: number;            // INFERRED
    lowCount: number;               // INFERRED
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
  findings: RedrokFinding[];        // INFERRED: same finding type as Live Search
  // CyberHook renders this data into a branded PDF with MSP logo
}
```

### 2.5 Search Credits / Tokens

```typescript
// ── REQUEST ──
// No body — uses Bearer token only

// ── RESPONSE (INFERRED from PRD "59 / 1000 searches left" display) ──
interface RedrokSearchCreditResponse {
  totalCredits: number;             // INFERRED: e.g. 1000
  usedCredits: number;              // INFERRED: e.g. 941
  remainingCredits: number;         // INFERRED: e.g. 59
  // Alternatively could be a single field:
  // credits: number;               // Just the remaining count
  // plan?: string;                 // INFERRED: plan name
}
```

### 2.6 Search History

```typescript
// ── REQUEST ──
// No body — uses Bearer token only

// ── RESPONSE (INFERRED from PRD requirements) ──
interface RedrokSearchHistoryResponse {
  searches: RedrokSearchHistoryEntry[];
}

interface RedrokSearchHistoryEntry {
  guid: string;                     // CONFIRMED: used by GetPrevLiveSearchResults
  domain: string;                   // INFERRED: the searched domain
  date: string;                     // INFERRED: when search was performed
  status: string;                   // INFERRED: "success" / "failure"
  // user?: string;                 // INFERRED: who performed it (admin view)
}
```

### 2.7 Countries & Regions

```typescript
// ── Countries Response (INFERRED) ──
// Could be a simple string array or objects
type RedrokCountriesResponse =
  | string[]                                    // ["United States", "Canada", ...]
  | { name: string; code?: string }[];          // [{name: "United States", code: "US"}, ...]

// ── Regions Response (INFERRED) ──
// Query: /search/regions?country=united+states
type RedrokRegionsResponse =
  | string[]                                    // ["California", "New York", ...]
  | { name: string; code?: string }[];
```

### 2.8 Findings (Detailed)

```typescript
// ── REQUEST ──
interface RedrokFindingsRequest {
  filterDomainUser: boolean;
  filterUserInOtherDomain: boolean;
  filterInfectedComputer: boolean;
  filterConsumer: boolean;
  filterUrl: boolean;
  filterPassword: boolean;
  filterUsername: boolean;
  searchCompanyGuid: string;
  searchVal: string;
  dateFrom: string;                 // "YYYY-MM-DD"
  dateTo: string;                   // "YYYY-MM-DD"
  severityId: number;               // 0 = all
  sortMode: number;
  sortId: number;
  page: number;
  limit: number;
}

// ── RESPONSE (INFERRED) ──
interface RedrokFindingsResponse {
  totalRecords: number;
  page: number;
  limit: number;
  findings: RedrokDetailedFinding[];
}

interface RedrokDetailedFinding {
  id: number;                       // INFERRED
  severity: string;                 // INFERRED: "Critical" | "High" | "Medium" | "Low" | "Info"
  severityId: number;               // INFERRED: numeric severity
  date: string;                     // INFERRED
  source: string;                   // INFERRED: source of the finding
  email?: string;                   // INFERRED: affected email
  username?: string;                // INFERRED: affected username
  password?: string;                // INFERRED: masked/revealed password
  url?: string;                     // INFERRED: affected URL
  computerName?: string;            // INFERRED: infected computer
  domain: string;                   // INFERRED: related domain
  status?: string;                  // INFERRED: finding status (from findingsUpdateStatus endpoint)
}
```

### 2.9 Dashboard Endpoints

```typescript
// ── GetCustomerScore ──
interface RedrokCustomerScoreResponse {
  score: number;                    // INFERRED: 0-100 risk/security score
  grade?: string;                   // INFERRED: "A" through "F"
  lastUpdated?: string;             // INFERRED
}

// ── GetAlertsCountOverTime ──
interface RedrokAlertsOverTimeResponse {
  data: {
    date: string;                   // INFERRED
    count: number;                  // INFERRED
  }[];
}

// ── GetRecentThreats ──
interface RedrokRecentThreatsResponse {
  threats: {
    id: string;                     // INFERRED
    name: string;                   // INFERRED: threat/company name
    date: string;                   // INFERRED
    type: string;                   // INFERRED: threat type
    severity?: string;              // INFERRED
  }[];
}
```

### 2.10 User Profile

```typescript
// ── REQUEST ──
// No body — uses Bearer token only

// ── RESPONSE (INFERRED) ──
interface RedrokUserProfileResponse {
  email: string;                    // INFERRED
  fullName: string;                 // INFERRED
  userPerm: number;                 // INFERRED: from CreateUser body pattern
  userType: number;                 // INFERRED: from CreateUser body pattern
  phoneNumber?: string;             // INFERRED
  customerGuid?: string;            // INFERRED: company identifier
}
```

---

## PART 3: WHAT CURSOR SHOULD BUILD (Implementation Instructions)

### 3.1 Build Order

**Phase A — Proxy Foundation (Build First)**
1. `convex/redrok/auth.ts` — Token management (authenticate, store, refresh)
2. `convex/redrok/client.ts` — Shared HTTP client helper with auto-refresh
3. Environment variable setup

**Phase B — Core Data Endpoints (Build Second)**
4. `convex/redrok/liveSearch.ts` — Live Search proxy + token deduction
5. `convex/redrok/liveLeads.ts` — Live Leads proxy with filters
6. `convex/redrok/credits.ts` — Token/credit balance
7. `convex/redrok/filters.ts` — Countries and regions for dropdowns

**Phase C — Supporting Endpoints (Build Third)**
8. `convex/redrok/reports.ts` — Report generation
9. `convex/redrok/searchHistory.ts` — Search history for admin audit
10. `convex/redrok/findings.ts` — Detailed findings with filters
11. `convex/redrok/dashboard.ts` — Dashboard data (score, alerts, threats)

**Phase D — Connect UI to Real Data (Build Fourth)**
12. Replace mock data in existing Live Search page with Convex actions
13. Replace mock data in existing Live-Leads page with Convex actions
14. Wire up token display in header to credits endpoint
15. Wire up filter dropdowns to countries/regions endpoints
16. Wire up "Generate Report" button to reports endpoint

### 3.2 Convex File Structure

```
convex/
├── redrok/
│   ├── client.ts              # Shared Redrok HTTP client
│   ├── auth.ts                # Token management
│   ├── liveSearch.ts          # Live Search actions
│   ├── liveLeads.ts           # Live Leads actions
│   ├── credits.ts             # Credit/token balance
│   ├── filters.ts             # Countries, regions
│   ├── reports.ts             # Report generation
│   ├── searchHistory.ts       # Search history
│   ├── findings.ts            # Detailed findings
│   ├── dashboard.ts           # Dashboard data
│   └── types.ts               # All TypeScript types from Part 2
```

### 3.3 Core Implementation: Shared Redrok Client

```typescript
// convex/redrok/client.ts
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const REDROK_BASE_URL = process.env.REDROK_API_BASE_URL || "https://dash-api.redrok.io";
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes (refresh 5 min before 1hr expiry)

/**
 * Makes an authenticated request to the Redrok API.
 * Handles token refresh automatically.
 */
export async function redrokFetch(
  ctx: any,
  companyId: string,
  endpoint: string,
  body?: any,
  queryParams?: Record<string, string>
): Promise<any> {
  // 1. Get or refresh the Redrok token
  const token = await ensureValidToken(ctx, companyId);

  // 2. Build URL
  let url = `${REDROK_BASE_URL}${endpoint}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  // 3. Make the request
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    // If 401, token may have expired early — force refresh and retry once
    if (response.status === 401) {
      const freshToken = await forceTokenRefresh(ctx, companyId);
      options.headers = {
        ...options.headers as any,
        "Authorization": `Bearer ${freshToken}`,
      };
      const retryResponse = await fetch(url, options);
      if (!retryResponse.ok) {
        throw new Error(`Redrok API error: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      return await retryResponse.json();
    }
    throw new Error(`Redrok API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function ensureValidToken(ctx: any, companyId: string): Promise<string> {
  const company = await ctx.runQuery(internal.companies.getRedrokCredentials, { companyId });

  if (!company.redrokToken || !company.redrokTokenExpiresAt ||
      company.redrokTokenExpiresAt < Date.now()) {
    return await forceTokenRefresh(ctx, companyId);
  }

  return company.redrokToken;
}

async function forceTokenRefresh(ctx: any, companyId: string): Promise<string> {
  const company = await ctx.runQuery(internal.companies.getRedrokCredentials, { companyId });

  const response = await fetch(`${REDROK_BASE_URL}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: company.redrokEmail,
      password: company.redrokPassword,
      ip: "0.0.0.0",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Redrok API");
  }

  const authData = await response.json();

  // ADJUST THESE FIELD NAMES once you see the real auth response:
  const token = authData.token || authData.accessToken || authData.jwt;

  await ctx.runMutation(internal.companies.updateRedrokToken, {
    companyId,
    token,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  });

  return token;
}
```

### 3.4 Core Implementation: Live Search Action

```typescript
// convex/redrok/liveSearch.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { redrokFetch } from "./client";

export const runLiveSearch = action({
  args: {
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get current user and company
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    // 2. Check role (Billing Users cannot search)
    if (user.role === "billing") {
      throw new Error("Billing users cannot perform searches");
    }

    // 3. Check credit balance
    const credits = await redrokFetch(ctx, user.companyId, "/search/GetLiveSearchCredit");
    // ADJUST: check the actual field name for remaining credits
    const remaining = credits.remainingCredits ?? credits.credits ?? credits.remaining;
    if (remaining < 1) {
      throw new Error("Insufficient search tokens");
    }

    // 4. Execute the search
    const results = await redrokFetch(ctx, user.companyId, "/search/livesearch", {
      domain: args.domain,
    });

    // 5. Log the search in our Convex database
    await ctx.runMutation(internal.searches.logSearch, {
      userId: user._id,
      companyId: user.companyId,
      domain: args.domain,
      status: "success",
      tokensConsumed: 1,
      // ADJUST: store whatever ID Redrok returns for later retrieval
      resultGuid: results.guid || results.id || results.searchId,
      createdAt: Date.now(),
    });

    return results;
  },
});

export const getPreviousResults = action({
  args: {
    guid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    return await redrokFetch(ctx, user.companyId, "/search/GetPrevLiveSearchResults", {
      guid: args.guid,
      limit: args.limit || 10,
    });
  },
});
```

### 3.5 Core Implementation: Live Leads Action

```typescript
// convex/redrok/liveLeads.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { redrokFetch } from "./client";

export const getLiveLeads = action({
  args: {
    size: v.number(),
    days: v.number(),
    country: v.string(),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    if (user.role === "billing") {
      throw new Error("Billing users cannot access Live Leads");
    }

    return await redrokFetch(ctx, user.companyId, "/search/liveleads", {
      size: args.size,
      days: args.days,
      country: args.country.toLowerCase(),
      region: args.region || "",
      city: args.city || "",
    });
  },
});
```

### 3.6 Core Implementation: Credits, Filters, Reports

```typescript
// convex/redrok/credits.ts
export const getCredits = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    return await redrokFetch(ctx, user.companyId, "/search/GetLiveSearchCredit");
  },
});

// convex/redrok/filters.ts
export const getCountries = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    return await redrokFetch(ctx, user.companyId, "/search/countries");
  },
});

export const getRegions = action({
  args: { country: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    return await redrokFetch(
      ctx,
      user.companyId,
      "/search/regions",
      undefined,
      { country: args.country }
    );
  },
});

// convex/redrok/reports.ts
export const generateReport = action({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    return await redrokFetch(ctx, user.companyId, "/search/reports", {
      domain: args.domain,
    });
  },
});
```

### 3.7 Convex Schema Additions

Add these to your existing Convex schema for Redrok integration:

```typescript
// In your schema.ts, add/update:

// Companies table — add Redrok credential fields
companies: defineTable({
  // ... existing fields ...
  redrokEmail: v.optional(v.string()),
  redrokPassword: v.optional(v.string()),     // TODO: encrypt at rest
  redrokToken: v.optional(v.string()),
  redrokTokenExpiresAt: v.optional(v.number()),
}),

// Searches table — log every search for audit trail
searches: defineTable({
  userId: v.id("users"),
  companyId: v.id("companies"),
  domain: v.string(),
  status: v.string(),                         // "success" | "failure"
  tokensConsumed: v.number(),
  resultGuid: v.optional(v.string()),         // Redrok's result ID
  createdAt: v.number(),
}).index("by_company", ["companyId"])
  .index("by_user", ["userId"])
  .index("by_created", ["createdAt"]),

// Internal queries for the proxy layer
// convex/companies.ts — add these internal functions:
// internal.companies.getRedrokCredentials({ companyId }) → returns redrok fields
// internal.companies.updateRedrokToken({ companyId, token, expiresAt })
```

### 3.8 Environment Variables

```env
# Add to .env.local
REDROK_API_BASE_URL=https://dash-api.redrok.io
```

---

## PART 4: HANDLING THE RESPONSE SHAPE UNCERTAINTY

### The Adapter Pattern

Since we don't have confirmed response shapes, build a **thin adapter layer** between the raw Redrok response and your UI components. This way, when field names turn out to be different, you only change one file:

```typescript
// convex/redrok/adapters.ts

/**
 * Transforms raw Redrok Live Leads response into CyberHook's expected format.
 * UPDATE THIS when you see real response data.
 */
export function adaptLiveLeads(raw: any): CyberHookLiveLead[] {
  // The response might be:
  // - raw.data (array in a wrapper)
  // - raw.results
  // - raw.leads
  // - raw directly (if it's already an array)
  const items = raw.data || raw.results || raw.leads || raw;

  if (!Array.isArray(items)) {
    console.error("Unexpected Live Leads response shape:", raw);
    return [];
  }

  return items.map((item: any) => ({
    // Map whatever field names Redrok uses to what our UI expects
    name: item.name || item.companyName || item.Name || "",
    industry: item.industry || item.Industry || "N/A",
    website: item.website || item.domain || item.Website || "",
    country: item.country || item.Country || "",
    region: item.region || item.Region || item.state || "N/A",
    employees: item.employees || item.Employees || item.employeeRange || "N/A",
    // Additional fields our UI might need
    id: item.id || item.guid || item.Id || undefined,
    exposureCount: item.exposureCount || item.totalExposures || 0,
  }));
}

/**
 * Transforms raw Redrok Live Search response.
 * UPDATE THIS when you see real response data.
 */
export function adaptLiveSearchResults(raw: any): CyberHookSearchResult {
  return {
    guid: raw.guid || raw.id || raw.searchId || "",
    domain: raw.domain || "",
    totalExposures: raw.totalExposures || raw.total || raw.count || 0,
    findings: adaptFindings(raw.findings || raw.results || raw.data || []),
    summary: {
      dateRange: {
        earliest: raw.summary?.dateRange?.earliest || raw.dateFrom || "",
        latest: raw.summary?.dateRange?.latest || raw.dateTo || "",
      },
      exposureTypes: raw.summary?.exposureTypes || [],
    },
  };
}

/**
 * Transforms raw credit/token response.
 * UPDATE THIS when you see real response data.
 */
export function adaptCredits(raw: any): { total: number; used: number; remaining: number } {
  return {
    total: raw.totalCredits || raw.total || raw.limit || 1000,
    used: raw.usedCredits || raw.used || 0,
    remaining: raw.remainingCredits || raw.remaining || raw.credits || raw.balance || 0,
  };
}

function adaptFindings(items: any[]): CyberHookFinding[] {
  if (!Array.isArray(items)) return [];
  return items.map((item: any) => ({
    id: item.id || item.Id || 0,
    date: item.date || item.Date || item.createdAt || "",
    severity: item.severity || item.Severity || "Info",
    sourceType: item.sourceType || item.source || item.Source || "",
    email: item.email || item.Email || undefined,
    username: item.username || item.Username || undefined,
    password: item.password || item.Password || undefined,
    url: item.url || item.Url || undefined,
  }));
}
```

### Why This Works

When you eventually get test credentials and see the real responses, you update ONLY the adapter functions. The Convex actions, the UI components, and the schema all stay the same. This is the safest approach given the documentation gap.

---

## PART 5: WHAT YOU BUILD YOURSELF (Not from Redrok)

These features use your OWN Convex database, NOT Redrok:

| Feature | Data Source | Status |
|---|---|---|
| To-Do List | Convex `tasks` table | UI done, needs Convex mutations |
| Watchlist | Convex `watchlist` table | UI done, needs Convex mutations + Redrok cron for monitoring |
| AI Agents / Campaigns | Convex `campaigns` table + OpenAI/Anthropic API | UI done, needs campaign engine |
| Knowledge Base | Convex `knowledgeBase` table | UI done, needs Convex CRUD |
| RFP Hub | Convex `rfpHub` table | UI done, needs Convex CRUD |
| Events & Conferences | Convex `events` table | UI done, needs Convex CRUD |
| Reporting | Convex queries (aggregating searches, tasks, events) | UI done, needs queries |
| Audit Log | Convex `auditLog` table | Needs Convex mutations on key actions |
| User Management | Clerk + Convex `users` table | Partially done via Clerk |
| Billing | Stripe + Convex | Needs Stripe integration |

### Missing Third-Party Integrations (Not in Redrok)

**1. Ransom Hub Data → ransomware.live API**
- Free public API: `https://api.ransomware.live/v2/recentvictims`
- Returns: victim company name, date, ransomware group, website
- No auth needed for public endpoints
- Build: `convex/external/ransomwareLive.ts`

**2. News Feed → Suggest: NewsAPI.org or TheNewsAPI**
- Cyber/IT security news filtered by geography
- Requires API key
- Build: `convex/external/newsFeed.ts`

**3. Contact Enrichment → Suggest: Apollo.io, Hunter.io, or RocketReach**
- C-suite names, emails, phone numbers
- Per-lookup pricing
- Build: `convex/external/contactEnrichment.ts`
- Wire into Live-Leads detail page "Contacts" tab

---

## PART 6: IMMEDIATE NEXT STEPS

### For Cyriac (You)

1. **Get the Redrok credentials from "Shay"** — Srikanth said credentials were shared by someone named Shay. Ask your AMSYS contact Liron directly: "Can you share or re-share the Redrok test credentials that Shay had?"

2. **Once you have credentials:** Open Postman, import the collection, hit `/api/authenticate`, then test `/search/livesearch` with a domain like "test.com". Copy the response JSON and bring it back here — I'll update the adapter types immediately.

3. **In parallel:** Give Cursor the three documents together:
   - `CYBERHOOK_ARCHITECTURE.md` (existing)
   - `CYBERHOOK_IMPLEMENTATION_BLUEPRINT.md` (existing)
   - `CYBERHOOK_REDROK_API_GUIDE.md` (new — from previous session)
   - Plus this document for the TypeScript types and Convex implementation code

4. **Cursor prompt:** "Build the Convex Redrok proxy layer following the file structure and code in the Integration Status Report. Start with Phase A (auth + client), then Phase B (core endpoints). Use the adapter pattern so response field names can be adjusted later. Wire the existing UI components to use these new Convex actions instead of mock data."

### What Can Be Built Right Now (Without Credentials)

Even before getting test access, Cursor can build:
- The entire Convex proxy layer structure (all files, all actions)
- The adapter layer with fallback field name handling
- The Convex schema additions
- All the "build yourself" features (To-Do, Watchlist CRUD, Knowledge Base, RFP Hub, Events, Audit Log)
- The ransomware.live integration (public API, no auth needed)
- The token display component wired to the credits action

### What's Blocked Until Credentials

- Verifying actual response field names (adapter adjustments)
- Testing the full Live Search → Save as Lead → Add to Watchlist flow end-to-end
- Confirming the `size` enum mapping for Live Leads filters
- Confirming how the Report endpoint returns data (for PDF rendering)

---

## APPENDIX: EMAIL TO SEND TO GET CREDENTIALS

```
Hi Liron,

Thanks for Srikanth's responses — very helpful.

One quick thing: Srikanth mentioned that Redrok credentials were
shared by Shay previously. Could you re-share those credentials
(email + password) so I can test the key endpoints in Postman?

I need to hit /api/authenticate and then test livesearch and
liveleads to see the response formats.

Thanks!
```
