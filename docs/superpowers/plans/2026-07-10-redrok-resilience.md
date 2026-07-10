# Redrok Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Live-Leads useful and admins informed when Redrok credentials expire or Redrok is unavailable, while securely supporting company-specific Redrok credentials.

**Architecture:** Pure helpers classify Redrok failures, map stored ransomware.live incidents into explicitly labeled fallback rows, and decide alert timing. Convex actions own upstream authentication and encryption; mutations own authorization and persistence. Live-Leads consumes an extended source-aware response, while Settings exposes a Sales-Admin-only write-only credential form.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, React Aria Components, Tailwind CSS, Resend, Node AES-256-GCM, Vitest, convex-test.

## Global Constraints

- Automatic fallback must be visibly labeled: “Limited public ransomware data — not credential-exposure results.”
- Only company Sales Admins may add, test, replace, or remove Redrok credentials.
- Redrok passwords, encrypted password blobs, and cached bearer tokens must never be returned to browser clients.
- Company Sales Admins receive email and in-app unhealthy alerts no more than once per 24 hours.
- Fallback rows use `source: "ransom_hub"` when saved and never fabricate size, locality, LinkedIn, founding year, or exposure counts.
- Existing global `REDROK_EMAIL` / `REDROK_PASSWORD` remain a shared fallback for companies without dedicated credentials.
- Do not commit unless the user explicitly requests it.

---

## File structure

### New files

- `convex/lib/redrok-resilience.ts` — pure error classification, fallback transformation, domain normalization, and alert timing.
- `convex/lib/redrok-crypto.ts` — Redrok credential encryption/decryption wrappers over the existing AES-GCM format.
- `convex/redrokCredentials.ts` — safe status query plus authorized/internal credential and health-state mutations.
- `convex/redrokCredentialActions.ts` — test/save credentials and six-hour health-check orchestration.
- `convex/__tests__/redrok-resilience.test.ts` — pure resilience tests.
- `convex/__tests__/redrok-crypto.test.ts` — encryption round-trip/non-disclosure tests.
- `convex/__tests__/redrok-credentials.test.ts` — Convex authorization and safe-status tests.
- `vitest.config.ts` — test configuration.

### Modified files

- `package.json`, `package-lock.json` — add Vitest/convex-test and test scripts.
- `convex/schema.ts` — encrypted credential and health metadata fields.
- `convex/companies.ts` — replace full-document client return with safe projection.
- `convex/redrokApi.ts` — structured errors, one-token retry, credential resolution, automatic fallback, source-aware response.
- `convex/ransomHub.ts` — internal fallback query.
- `convex/notifications.ts` — Redrok health notification types.
- `convex/emails.ts` — Redrok unhealthy/recovery email action.
- `convex/crons.ts` — six-hour health cron.
- `src/lib/friendly-errors.ts` — stable Redrok error-code copy.
- `src/app/(dashboard)/live-leads/page.tsx` — fallback banner, row provenance, correct save source, credential guidance.
- `src/app/(dashboard)/settings/page.tsx` — Redrok integration card and credential modal.

---

### Task 1: Test harness and pure resilience model

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `convex/lib/redrok-resilience.ts`
- Create: `convex/__tests__/redrok-resilience.test.ts`

**Interfaces:**
- Produces:
  - `RedrokErrorCode`
  - `RedrokFailure`
  - `classifyRedrokResponse(status: number): RedrokFailure`
  - `classifyRedrokException(error: unknown): RedrokFailure`
  - `shouldRetryWithFreshToken(code: RedrokErrorCode): boolean`
  - `shouldSendHealthAlert(previousStatus, nextStatus, lastAlertAt, now): boolean`
  - `normalizeFallbackDomain(value?: string): string`
  - `mapRansomIncidentToFallbackCompany(incident): FallbackLiveLead`

- [ ] **Step 1: Install the test dependencies and add scripts**

Run:

```bash
npm install --save-dev vitest convex-test
```

Update `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["convex/__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing error-classification tests**

Create `convex/__tests__/redrok-resilience.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  classifyRedrokException,
  classifyRedrokResponse,
  shouldRetryWithFreshToken,
} from "../lib/redrok-resilience";

describe("Redrok errors", () => {
  it.each([
    [401, "REDROK_AUTH_INVALID"],
    [403, "REDROK_AUTH_INVALID"],
    [429, "REDROK_RATE_LIMITED"],
    [500, "REDROK_UNAVAILABLE"],
    [503, "REDROK_UNAVAILABLE"],
  ] as const)("maps HTTP %s to %s", (status, code) => {
    expect(classifyRedrokResponse(status).code).toBe(code);
  });

  it("maps AbortError to a timeout", () => {
    const error = new DOMException("timed out", "AbortError");
    expect(classifyRedrokException(error).code).toBe("REDROK_TIMEOUT");
  });

  it("retries only a rejected cached token", () => {
    expect(shouldRetryWithFreshToken("REDROK_TOKEN_EXPIRED")).toBe(true);
    expect(shouldRetryWithFreshToken("REDROK_AUTH_INVALID")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npm test -- convex/__tests__/redrok-resilience.test.ts
```

Expected: FAIL because `convex/lib/redrok-resilience.ts` does not exist.

- [ ] **Step 4: Implement the minimal structured error model**

Create `convex/lib/redrok-resilience.ts` with:

```typescript
export type RedrokErrorCode =
  | "REDROK_AUTH_INVALID"
  | "REDROK_CREDENTIALS_MISSING"
  | "REDROK_RATE_LIMITED"
  | "REDROK_TIMEOUT"
  | "REDROK_UNAVAILABLE"
  | "REDROK_TOKEN_EXPIRED"
  | "REDROK_UNKNOWN";

export type RedrokFailure = {
  code: RedrokErrorCode;
  retryable: boolean;
  message: string;
};

export function classifyRedrokResponse(status: number): RedrokFailure {
  if (status === 401 || status === 403) {
    return { code: "REDROK_AUTH_INVALID", retryable: false, message: "Redrok credentials were rejected." };
  }
  if (status === 429) {
    return { code: "REDROK_RATE_LIMITED", retryable: true, message: "Redrok rate limit reached." };
  }
  if (status >= 500) {
    return { code: "REDROK_UNAVAILABLE", retryable: true, message: "Redrok is temporarily unavailable." };
  }
  return { code: "REDROK_UNKNOWN", retryable: true, message: `Redrok request failed (${status}).` };
}

export function classifyRedrokException(error: unknown): RedrokFailure {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { code: "REDROK_TIMEOUT", retryable: true, message: "Redrok request timed out." };
  }
  return { code: "REDROK_UNKNOWN", retryable: true, message: "Unexpected Redrok error." };
}

export function shouldRetryWithFreshToken(code: RedrokErrorCode): boolean {
  return code === "REDROK_TOKEN_EXPIRED";
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npm test -- convex/__tests__/redrok-resilience.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add failing fallback and alert-deduplication tests**

Append:

```typescript
import {
  mapRansomIncidentToFallbackCompany,
  normalizeFallbackDomain,
  shouldSendHealthAlert,
} from "../lib/redrok-resilience";

describe("ransomware.live fallback", () => {
  it("normalizes domains and preserves honest provenance", () => {
    const row = mapRansomIncidentToFallbackCompany({
      _id: "incident_1",
      companyName: "Example Health",
      domain: "https://www.example.com/news",
      country: "US",
      attackDate: 1000,
      ransomwareGroup: "Example Group",
      sourceUrl: "https://ransomware.live/id/1",
    });

    expect(row.website).toBe("example.com");
    expect(row.source).toBe("ransomware_live_fallback");
    expect(row.size).toBe("");
    expect(row.linkedin_url).toBe("");
    expect(row.attackDate).toBe(1000);
  });

  it("does not invent invalid domains", () => {
    expect(normalizeFallbackDomain("not a domain")).toBe("");
  });
});

describe("health alert deduplication", () => {
  it("alerts on a healthy to unhealthy transition", () => {
    expect(shouldSendHealthAlert("healthy", "auth_invalid", undefined, 1000)).toBe(true);
  });

  it("suppresses repeated alerts for 24 hours", () => {
    expect(shouldSendHealthAlert("auth_invalid", "auth_invalid", 1000, 1000 + 23 * 60 * 60 * 1000)).toBe(false);
    expect(shouldSendHealthAlert("auth_invalid", "auth_invalid", 1000, 1000 + 25 * 60 * 60 * 1000)).toBe(true);
  });
});
```

- [ ] **Step 7: Verify RED, implement pure helpers, verify GREEN**

Run the test, confirm missing-export failures, then add:

```typescript
export type RedrokHealthStatus =
  | "unknown"
  | "healthy"
  | "auth_invalid"
  | "credentials_missing"
  | "rate_limited"
  | "unavailable";

export type FallbackLiveLead = {
  id: string;
  name: string;
  website: string;
  country: string;
  region: string;
  locality: string;
  industry: string;
  size: string;
  founded: null;
  linkedin_url: string;
  state_location: null;
  source: "ransomware_live_fallback";
  incidentId: string;
  attackDate: number;
  sourceUrl?: string;
  ransomwareGroup?: string;
};

export function normalizeFallbackDomain(value?: string): string {
  if (!value) return "";
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : "";
  } catch {
    return "";
  }
}

export function mapRansomIncidentToFallbackCompany(incident: {
  _id: string;
  companyName: string;
  domain?: string;
  country?: string;
  region?: string;
  industry?: string;
  attackDate: number;
  ransomwareGroup?: string;
  sourceUrl?: string;
}): FallbackLiveLead {
  return {
    id: `ransom:${incident._id}`,
    name: incident.companyName,
    website: normalizeFallbackDomain(incident.domain),
    country: incident.country ?? "",
    region: incident.region ?? "",
    locality: "",
    industry: incident.industry ?? "",
    size: "",
    founded: null,
    linkedin_url: "",
    state_location: null,
    source: "ransomware_live_fallback",
    incidentId: incident._id,
    attackDate: incident.attackDate,
    sourceUrl: incident.sourceUrl,
    ransomwareGroup: incident.ransomwareGroup,
  };
}

export function shouldSendHealthAlert(
  previous: RedrokHealthStatus,
  next: RedrokHealthStatus,
  lastAlertAt: number | undefined,
  now: number,
): boolean {
  if (next === "healthy" || next === "unknown") return false;
  if (previous !== next || lastAlertAt === undefined) return true;
  return now - lastAlertAt >= 24 * 60 * 60 * 1000;
}
```

Expected: all tests PASS.

---

### Task 2: Secure credential storage and safe company projections

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/lib/redrok-crypto.ts`
- Create: `convex/__tests__/redrok-crypto.test.ts`
- Modify: `convex/companies.ts`

**Interfaces:**
- Produces:
  - `encryptRedrokPassword(password: string): string`
  - `decryptRedrokPassword(blob: string): string`
  - health fields on `companies`
  - client-safe company projection

- [ ] **Step 1: Write failing encryption tests**

Create `convex/__tests__/redrok-crypto.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { decryptRedrokPassword, encryptRedrokPassword } from "../lib/redrok-crypto";

describe("Redrok credential encryption", () => {
  beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "11".repeat(32);
  });

  it("round trips without storing plaintext", () => {
    const encrypted = encryptRedrokPassword("correct horse battery staple");
    expect(encrypted).not.toContain("correct horse");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptRedrokPassword(encrypted)).toBe("correct horse battery staple");
  });
});
```

- [ ] **Step 2: Verify RED and implement wrappers**

Create `convex/lib/redrok-crypto.ts`:

```typescript
"use node";

import { decryptToken, encryptToken } from "./crypto";

export const encryptRedrokPassword = encryptToken;
export const decryptRedrokPassword = decryptToken;
```

Run the test and expect PASS.

- [ ] **Step 3: Extend company schema**

Add optional fields after the legacy Redrok fields:

```typescript
redrokPasswordEncrypted: v.optional(v.string()),
redrokCredentialSource: v.optional(v.union(v.literal("company"), v.literal("shared"))),
redrokHealthStatus: v.optional(v.union(
  v.literal("unknown"),
  v.literal("healthy"),
  v.literal("auth_invalid"),
  v.literal("credentials_missing"),
  v.literal("rate_limited"),
  v.literal("unavailable"),
)),
redrokLastHealthCheckAt: v.optional(v.number()),
redrokLastHealthErrorCode: v.optional(v.string()),
redrokLastHealthErrorMessage: v.optional(v.string()),
redrokLastAlertAt: v.optional(v.number()),
redrokLastRecoveryAlertAt: v.optional(v.number()),
```

- [ ] **Step 4: Add a safe projection regression test**

Use `convex-test` to insert a company with legacy/encrypted credentials and call `api.companies.getCurrentCompany`. Assert the returned object has no `redrokPassword`, `redrokPasswordEncrypted`, `redrokToken`, or `redrokTokenExpiresAt`.

- [ ] **Step 5: Verify RED and change `getCurrentCompany`**

In `convex/companies.ts`, explicitly destructure secret fields:

```typescript
const {
  redrokPassword,
  redrokPasswordEncrypted,
  redrokToken,
  redrokTokenExpiresAt,
  ...safeCompany
} = company;
return safeCompany;
```

Run the test and expect PASS.

---

### Task 3: Sales-Admin credential management

**Files:**
- Create: `convex/redrokCredentials.ts`
- Create: `convex/redrokCredentialActions.ts`
- Create: `convex/__tests__/redrok-credentials.test.ts`
- Modify: `convex/_generated/api.d.ts` via Convex generation only

**Interfaces:**
- Produces:
  - `api.redrokCredentials.getStatus`
  - `api.redrokCredentialActions.testCredentials`
  - `api.redrokCredentialActions.saveCredentials`
  - `api.redrokCredentials.removeCredentials`
  - `internal.redrokCredentials.getSecretMaterial`
  - `internal.redrokCredentials.saveEncryptedCredentials`
  - `internal.redrokCredentials.updateHealth`

- [ ] **Step 1: Write failing authorization/status tests**

Use `convex-test` to cover:

```typescript
it("returns masked status without secrets", async () => {
  const status = await asSalesAdmin.query(api.redrokCredentials.getStatus, {});
  expect(status.emailMasked).toBe("l***@example.com");
  expect(status).not.toHaveProperty("password");
  expect(status).not.toHaveProperty("token");
});

it("rejects credential removal by a sales rep", async () => {
  await expect(asSalesRep.mutation(api.redrokCredentials.removeCredentials, {}))
    .rejects.toThrow("insufficient permissions");
});
```

- [ ] **Step 2: Verify RED and implement persistence/query layer**

`convex/redrokCredentials.ts` must:

- call `requireAuth`
- call `requireRole(user.role, "sales_admin")` for remove
- scope all reads/writes to `user.companyId`
- mask email with a pure `maskEmail` helper
- never return credential/token fields
- clear both legacy and encrypted secrets on disconnect

- [ ] **Step 3: Write failing test/save action tests**

Inject a fake authenticator into a pure helper so tests prove:

- invalid credentials return `REDROK_AUTH_INVALID` and are not stored
- valid credentials are encrypted and the old token is cleared
- a successful save marks health `healthy`

- [ ] **Step 4: Implement action layer**

`convex/redrokCredentialActions.ts`:

```typescript
"use node";

export const testCredentials = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.redrokCredentials.requireSalesAdminContext, {});
    return authenticateRedrok(args.email, args.password);
  },
});

export const saveCredentials = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.redrokCredentials.requireSalesAdminContext, {});
    const auth = await authenticateRedrok(args.email, args.password);
    if (!auth.ok) return auth;
    await ctx.runMutation(internal.redrokCredentials.saveEncryptedCredentials, {
      companyId: me.companyId,
      email: args.email.trim().toLowerCase(),
      encryptedPassword: encryptRedrokPassword(args.password),
      token: auth.token,
      tokenExpiresAt: Date.now() + 55 * 60 * 1000,
    });
    return { ok: true as const };
  },
});
```

The actual implementation must use the shared classifier, a 15-second `AbortController`, and never include raw upstream response bodies.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
npm test -- convex/__tests__/redrok-credentials.test.ts
npm test
```

Expected: PASS.

---

### Task 4: Structured Live-Leads errors and automatic fallback

**Files:**
- Modify: `convex/redrokApi.ts`
- Modify: `convex/ransomHub.ts`
- Extend: `convex/__tests__/redrok-resilience.test.ts`

**Interfaces:**
- Consumes: error/fallback helpers from Task 1; credential resolution from Task 3.
- Produces `liveLeads` response:

```typescript
type LiveLeadsResponse = {
  success: boolean;
  count: number;
  companies: Array<RedrokCompany | FallbackLiveLead>;
  message: string;
  source: "redrok" | "ransomware_live_fallback" | "none";
  isFallback: boolean;
  errorCode?: RedrokErrorCode;
  retryable?: boolean;
};
```

- [ ] **Step 1: Write failing response/fallback tests**

Test:

- Redrok success returns `source: "redrok"` and `isFallback: false`.
- Invalid credentials with stored incidents returns `success: true`, fallback source, and provenance rows.
- Invalid credentials with no incidents returns `success: false`, `source: "none"`, `REDROK_AUTH_INVALID`.
- Cached-token expiry retries exactly once with fresh authentication.

- [ ] **Step 2: Verify RED and add internal fallback query**

In `convex/ransomHub.ts`, add `internalFallbackForLiveLeads`:

- source must equal `ransomware_live`
- incident type must equal `ransomware`
- `attackDate >= Date.now() - days`
- optional case-insensitive country filter
- newest first
- cap at 100

- [ ] **Step 3: Refactor Redrok request handling**

In `convex/redrokApi.ts`:

- add request timeout
- classify auth endpoint vs bearer-token errors distinctly
- resolve dedicated encrypted credentials before shared env credentials
- force one re-auth only for rejected cached token
- return structured response
- call fallback query on every unavailable category

- [ ] **Step 4: Verify focused and full tests**

Run:

```bash
npm test -- convex/__tests__/redrok-resilience.test.ts
npm test
```

Expected: PASS.

---

### Task 5: Health cron, in-app notifications, and email alerts

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/notifications.ts`
- Modify: `convex/emails.ts`
- Modify: `convex/syncLogs.ts`
- Modify: `convex/crons.ts`
- Modify: `convex/redrokCredentialActions.ts`
- Extend: `convex/__tests__/redrok-resilience.test.ts`

**Interfaces:**
- Produces:
  - `internal.redrokCredentialActions.healthCheckAll`
  - `internal.emails.sendRedrokHealthAlertInternal`
  - notification types `integration.redrok_unhealthy` and `integration.redrok_recovered`

- [ ] **Step 1: Add failing alert transition tests**

Cover:

- first unhealthy check alerts
- same failure inside 24 hours does not alert
- same failure after 24 hours alerts
- unhealthy-to-healthy sends one recovery
- healthy-to-healthy sends nothing

- [ ] **Step 2: Implement notification/email types**

Add:

```typescript
REDROK_UNHEALTHY: "integration.redrok_unhealthy",
REDROK_RECOVERED: "integration.redrok_recovered",
```

Email action arguments:

```typescript
{
  companyId: v.id("companies"),
  status: v.union(v.literal("unhealthy"), v.literal("recovered")),
  errorCode: v.optional(v.string()),
}
```

The action queries approved Sales Admins, respects `emailNotifications !== false`, and sends one branded message linking to `${SITE_URL}/settings?tab=integrations`.

- [ ] **Step 3: Implement sequential health orchestration**

`healthCheckAll`:

- query dedicated-credential companies
- test each sequentially
- test shared env credentials once
- update health state through an internal mutation
- schedule in-app and email alerts when transition/dedup logic says yes
- record one `redrok_auth` `syncLogs` row with healthy/unhealthy counts

- [ ] **Step 4: Register cron**

In `convex/crons.ts`:

```typescript
crons.interval(
  "redrok-credential-health",
  { hours: 6 },
  internal.redrokCredentialActions.healthCheckAll,
);
```

Add `redrok_auth` to `syncLogs.latestBySource`.

- [ ] **Step 5: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

---

### Task 6: Settings credential UI and source-aware Live-Leads UX

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/live-leads/page.tsx`
- Modify: `src/lib/friendly-errors.ts`

**Interfaces:**
- Consumes credential status/actions from Task 3 and source-aware `liveLeads` from Task 4.

- [ ] **Step 1: Add frontend pure-copy tests**

Add tests to the pure resilience module for:

```typescript
getRedrokUserMessage("REDROK_AUTH_INVALID", false)
// { title: "Redrok needs to be reconnected", canRetry: false, adminActionRequired: true }

getRedrokUserMessage("REDROK_UNAVAILABLE", true)
// { title: "Live exposure data is temporarily unavailable", canRetry: true, adminActionRequired: false }
```

- [ ] **Step 2: Implement Redrok Settings card**

Add a Redrok card to the Integrations grid:

- status badge from `api.redrokCredentials.getStatus`
- Sales Admin-only Connect/Test/Replace/Disconnect buttons
- modal with native CyberHook `Input` components
- password field uses `type="password"` and is cleared after every close/save attempt
- success/error feedback uses the global bottom-right Sonner configuration
- no password/token is loaded into React state from Convex

- [ ] **Step 3: Implement fallback UX**

In Live-Leads:

- store `source`, `isFallback`, `errorCode`, and `retryable`
- show the exact fallback warning banner
- render attack date/group/source-link columns for fallback
- disable size filter while fallback is active
- use `source: "ransom_hub"` when saving fallback rows
- show “Ask your Sales Admin to reconnect Redrok” for invalid/missing credentials
- hide Retry for non-retryable credential errors

- [ ] **Step 4: Run unit/type checks**

Run:

```bash
npm test
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

### Task 7: Verification and controlled rollout

**Files:**
- No production code unless verification finds a regression.

- [ ] **Step 1: Run complete automated verification**

```bash
npm test
npx tsc --noEmit --pretty false
npm run build
npx convex dev --once
```

Expected: all commands exit 0.

- [ ] **Step 2: Dev smoke test with intentionally invalid company credentials**

Verify:

1. Settings reports “Needs attention.”
2. Live-Leads shows the limited fallback banner and ransomware rows.
3. No fallback row contains fabricated size/LinkedIn/exposure data.
4. Saving a fallback row stores `source: "ransom_hub"`.
5. Sales Rep cannot see credential-management controls.
6. Sales Admin receives one in-app notification and one scheduled email, not duplicates.

- [ ] **Step 3: Dev smoke test recovery**

With valid credentials:

1. Test credentials succeeds.
2. Save stores encrypted data and clears plaintext/token remnants.
3. Live-Leads returns `source: "redrok"`.
4. Health state becomes healthy and one recovery notification is created.

- [ ] **Step 4: Review diff and secret safety**

Search:

```bash
rg -n "redrokPassword|redrokToken|REDROK_PASSWORD" src convex
```

Confirm no client query or UI path returns/logs secret material.

- [ ] **Step 5: Production deployment**

Only after dev verification:

```bash
npx convex deploy --yes
```

Then deploy/push the frontend only when the user explicitly requests it.
