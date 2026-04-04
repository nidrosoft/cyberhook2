# SaaS Security Hardening & Best Practices — Universal Implementation Guide

> **Purpose:** A reusable, project-agnostic security checklist and implementation guide for Cursor AI (or any AI coding agent) to audit, harden, and secure any SaaS application. Covers authentication, authorization, data isolation, API security, input validation, session management, secrets management, rate limiting, error handling, logging, and every attack vector a hacker might exploit.
>
> **Primary Stack:** Next.js 14+ (App Router), Convex, Clerk, Stripe, Tailwind/shadcn — but principles apply universally.
>
> **Sources:** OWASP Top 10 (2021), OWASP Node.js Security Cheat Sheet, Next.js Official Security Guide, skills.sh security-best-practices, skills.sh harden skill, skills.sh api-design-principles, CVE-2025-29927 analysis, and battle-tested SaaS security patterns.

---

## Table of Contents

1. [OWASP Top 10 Checklist](#1-owasp-top-10-checklist)
2. [Authentication & Identity Security](#2-authentication--identity-security)
3. [Authorization & Role-Based Access Control (RBAC)](#3-authorization--role-based-access-control-rbac)
4. [Multi-Tenant Data Isolation](#4-multi-tenant-data-isolation)
5. [API Route & Server Action Security](#5-api-route--server-action-security)
6. [Input Validation & Sanitization](#6-input-validation--sanitization)
7. [Injection Attack Prevention](#7-injection-attack-prevention)
8. [Cross-Site Scripting (XSS) Prevention](#8-cross-site-scripting-xss-prevention)
9. [Cross-Site Request Forgery (CSRF) Prevention](#9-cross-site-request-forgery-csrf-prevention)
10. [Session Management & Cookie Security](#10-session-management--cookie-security)
11. [Rate Limiting & Brute Force Protection](#11-rate-limiting--brute-force-protection)
12. [Secrets & Environment Variable Management](#12-secrets--environment-variable-management)
13. [Security Headers](#13-security-headers)
14. [HTTPS & Transport Security](#14-https--transport-security)
15. [File Upload Security](#15-file-upload-security)
16. [Database Security](#16-database-security)
17. [Dependency & Supply Chain Security](#17-dependency--supply-chain-security)
18. [Error Handling & Information Leakage](#18-error-handling--information-leakage)
19. [Logging, Monitoring & Audit Trails](#19-logging-monitoring--audit-trails)
20. [Billing & Payment Security (Stripe)](#20-billing--payment-security-stripe)
21. [Email Security (Outbound)](#21-email-security-outbound)
22. [Third-Party API & Webhook Security](#22-third-party-api--webhook-security)
23. [Next.js Specific Security (Middleware, Server Components, Server Actions)](#23-nextjs-specific-security)
24. [Client-Side Security](#24-client-side-security)
25. [Denial of Service (DoS) & Resource Exhaustion](#25-denial-of-service-dos--resource-exhaustion)
26. [Deployment & Infrastructure Security](#26-deployment--infrastructure-security)
27. [Data Privacy & Compliance (GDPR, SOC2)](#27-data-privacy--compliance)
28. [Edge Cases & Hardening Checklist](#28-edge-cases--hardening-checklist)
29. [Security Testing Automation](#29-security-testing-automation)

---

## 1. OWASP Top 10 Checklist

Every item in this document maps to one or more OWASP Top 10 risks. Here is the master checklist:

```
- [ ] A01: Broken Access Control — Every Convex query/mutation verifies user identity AND authorization. No client-only gating.
- [ ] A02: Cryptographic Failures — All sensitive data encrypted at rest and in transit. No plaintext secrets in code or logs.
- [ ] A03: Injection — All user inputs validated and parameterized. No string concatenation in queries.
- [ ] A04: Insecure Design — Security modeled into architecture from the start (Data Access Layer, Zero Trust).
- [ ] A05: Security Misconfiguration — All security headers set. No default credentials. Clerk/Convex/Stripe configured with least privilege.
- [ ] A06: Vulnerable and Outdated Components — npm audit clean. Dependabot/Renovate enabled. No known CVEs.
- [ ] A07: Identification and Authentication Failures — Strong passwords, MFA available, session expiry enforced, token rotation.
- [ ] A08: Software and Data Integrity Failures — Webhook signatures verified. No unsigned data from external sources trusted blindly.
- [ ] A09: Security Logging and Monitoring Failures — All auth events, admin actions, and data access logged with timestamps and user IDs.
- [ ] A10: Server-Side Request Forgery (SSRF) — All outbound URLs validated. No user-controlled URLs fetched without allowlist.
```

---

## 2. Authentication & Identity Security

### 2.1 — Clerk Configuration Hardening

```
ACTION: Audit Clerk configuration for the following settings.

- [ ] Email verification is REQUIRED before account activation.
- [ ] Password policy enforces: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character.
- [ ] Breached password detection is ENABLED (Clerk checks against known leaked password databases).
- [ ] Session lifetime is configured: idle timeout = 30 minutes, absolute timeout = 24 hours.
- [ ] Multi-factor authentication (MFA) is available and encouraged (TOTP/SMS).
- [ ] Social login providers (if enabled) are locked to specific OAuth apps with verified redirect URIs.
- [ ] Clerk webhook secret is stored as an environment variable, never hardcoded.
- [ ] The Clerk publishable key used client-side (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) is the ONLY Clerk key exposed to the browser. The secret key (`CLERK_SECRET_KEY`) is NEVER in `NEXT_PUBLIC_*`.
```

### 2.2 — Authentication Flow Security

```
ACTION: Verify these patterns exist in the codebase.

- [ ] After signup, users go through email verification → questionnaire → payment → manual approval. No step can be skipped.
- [ ] The manual approval flag (`status: "pending" | "approved" | "rejected"`) is stored server-side (Convex) and checked on EVERY request, not just at login.
- [ ] Trial users have a different permission set than approved users. Trial status is checked server-side before returning sensitive data.
- [ ] Failed login attempts are tracked. After 5 consecutive failures from the same IP or email, introduce progressive delays (1s, 2s, 4s, 8s...) or temporary lockout.
- [ ] Password reset tokens are single-use, expire within 1 hour, and are invalidated upon successful password change.
- [ ] Logout invalidates the session server-side (Clerk session revocation), not just client-side cookie deletion.
```

### 2.3 — Account Enumeration Prevention

```
ACTION: Ensure these behaviors exist.

- [ ] Login form responds with the same generic message for both "user not found" and "wrong password": "Invalid email or password."
- [ ] Signup form does NOT reveal whether an email is already registered. Use: "If this email is registered, you will receive a confirmation link."
- [ ] Password reset form does NOT reveal whether an email exists: "If an account with this email exists, a reset link has been sent."
- [ ] Response times for valid vs. invalid emails are roughly equal (no timing attacks).
```

---

## 3. Authorization & Role-Based Access Control (RBAC)

### 3.1 — Server-Side Authorization in Every Convex Mutation/Query

```
CRITICAL RULE: Authorization is NEVER enforced only on the client side.
Every Convex query and mutation must independently verify:
  1. The user is authenticated (has a valid session).
  2. The user's role allows the requested action.
  3. The user belongs to the correct company/tenant (data isolation).
  4. The user owns or has access to the specific resource being accessed.

PATTERN — Create a reusable authorization helper:

// convex/lib/auth.ts
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new ConvexError("User not found");
  if (user.status !== "active") throw new ConvexError("Account not active");

  return user;
}

export function requireRole(user: User, ...roles: string[]) {
  if (!roles.includes(user.role)) {
    throw new ConvexError("Insufficient permissions");
  }
}

export function requireSameCompany(user: User, resourceCompanyId: Id<"companies">) {
  if (user.companyId !== resourceCompanyId) {
    throw new ConvexError("Access denied");
  }
}
```

### 3.2 — Role Enforcement Matrix

```
ACTION: For every Convex mutation and query, verify the role check matches this matrix.

| Operation                  | Sales Rep | Sales Admin | Billing User |
|----------------------------|-----------|-------------|--------------|
| Read own data              | ✓         | ✓           | ✓ (billing only) |
| Read team data             | ✗         | ✓           | ✗            |
| Write own tasks/leads      | ✓         | ✓           | ✗            |
| Write team tasks/leads     | ✗         | ✓           | ✗            |
| Manage users               | ✗         | ✓           | ✗            |
| Manage integrations        | ✗         | ✓           | ✗            |
| View billing               | ✗         | ✓           | ✓ (read only)|
| Manage billing             | ✗         | ✓           | ✗            |
| Run Live Search            | ✓         | ✓           | ✗            |
| View audit log             | ✗         | ✓           | ✗            |
| Export data                | ✓         | ✓           | ✗            |

- [ ] Every Convex query/mutation includes a role check using `requireRole()`.
- [ ] No query/mutation relies solely on the client to hide unauthorized UI — the server rejects unauthorized requests.
```

### 3.3 — Insecure Direct Object Reference (IDOR) Prevention

```
ACTION: Audit every Convex query/mutation that accepts a resource ID as input.

- [ ] When a user requests a resource by ID (e.g., a lead, task, or watchlist item), the server verifies the resource's `companyId` matches the user's `companyId` BEFORE returning data.
- [ ] Users cannot access resources from other companies by guessing or iterating IDs.
- [ ] PATTERN: Always include tenant filtering in queries:

  // ✅ SECURE
  const lead = await ctx.db.get(args.leadId);
  if (!lead || lead.companyId !== user.companyId) {
    throw new ConvexError("Not found");
  }

  // ❌ INSECURE — returns data without checking ownership
  const lead = await ctx.db.get(args.leadId);
  return lead;
```

### 3.4 — Privilege Escalation Prevention

```
ACTION: Verify these protections exist.

- [ ] Users cannot change their own role. Only Sales Admins can change another user's role.
- [ ] Users cannot change their own `companyId` or `status`.
- [ ] The Convex mutation for role changes verifies the CALLER is a Sales Admin, not just that the payload says "admin."
- [ ] Clerk metadata updates (role, permissions) are only done from server-side Convex actions using the Clerk Backend API with the secret key — never from the client.
```

---

## 4. Multi-Tenant Data Isolation

```
CRITICAL FOR SAAS: Every query in a multi-tenant SaaS MUST include tenant filtering.
Failure to do this means Company A can see Company B's data.

ACTION: Audit every Convex table and query.

- [ ] Every table that stores tenant-specific data has a `companyId` field (type: `v.id("companies")`).
- [ ] Every query that reads tenant-specific data filters by `companyId`:

  // ✅ CORRECT
  .withIndex("by_company", (q) => q.eq("companyId", user.companyId))

  // ❌ WRONG — returns ALL companies' data
  .query("leads").collect()

- [ ] Indexes exist for `companyId` on every tenant-scoped table for performance:

  // In schema.ts
  leads: defineTable({...})
    .index("by_company", ["companyId"])
    .index("by_company_and_status", ["companyId", "status"]),

- [ ] BULK OPERATIONS (exports, reports, batch actions) are also tenant-filtered. A user cannot export another company's data.
- [ ] SEARCH FUNCTIONALITY is tenant-scoped. Full-text search results are filtered by `companyId` after retrieval.
- [ ] ADMIN PANELS (if any) are isolated — a Sales Admin can only manage their own company's users, never other companies'.
```

---

## 5. API Route & Server Action Security

### 5.1 — Next.js API Route Protection

```
ACTION: Audit every file in `app/api/` or `pages/api/`.

- [ ] Every API route handler (GET, POST, PUT, DELETE) starts by authenticating the user:

  import { auth } from "@clerk/nextjs/server";

  export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    // ... proceed
  }

- [ ] No API route trusts client-sent user IDs. The server always derives the user ID from the session/token.
- [ ] API routes that proxy to external services (e.g., Redrok API) do NOT expose the external API credentials to the client.
- [ ] API routes validate the HTTP method — a route that only accepts POST should return 405 for GET.
```

### 5.2 — Server Action Security (Next.js App Router)

```
CRITICAL LESSON FROM CVE-2025-29927:
  Middleware is NOT a security boundary in Next.js.
  A vulnerability in March 2025 (CVSS 9.1) allowed attackers to bypass ALL middleware
  by sending a special `x-middleware-subrequest` header.

  YOUR AUTH CHECKS MUST LIVE INSIDE EACH:
    - Server Action ("use server" functions)
    - Route Handler (app/api/ routes)
    - Convex mutation/query
  DO NOT rely solely on middleware for authentication/authorization.

ACTION:

- [ ] Every "use server" function re-authenticates and re-authorizes the user:

  "use server";
  import { auth } from "@clerk/nextjs/server";

  export async function createLead(formData: FormData) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Validate ALL inputs from formData
    const domain = formData.get("domain");
    if (typeof domain !== "string" || !isValidDomain(domain)) {
      throw new Error("Invalid domain");
    }
    // ... proceed
  }

- [ ] Server Actions validate ALL arguments. Never trust that the client sent valid data.
- [ ] Server Actions do NOT return more data than the client needs. Filter sensitive fields before returning.
- [ ] Closed-over variables in Server Actions are encrypted by Next.js 14+, but you should still not close over raw secrets.
```

### 5.3 — Data Access Layer (DAL) Pattern

```
RECOMMENDATION (from Next.js official security guide):
  Create a dedicated Data Access Layer that encapsulates all database access.
  No component or server action should directly call the database.
  The DAL enforces auth, authorization, and tenant isolation in one place.

// convex/dal/leads.ts (example Data Access Layer)
import { getAuthenticatedUser, requireRole, requireSameCompany } from "../lib/auth";

export const getLeadById = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const lead = await ctx.db.get(args.leadId);

    if (!lead) throw new ConvexError("Not found");
    requireSameCompany(user, lead.companyId);

    // Strip sensitive fields based on role/trial status
    return sanitizeLeadForUser(lead, user);
  },
});
```

---

## 6. Input Validation & Sanitization

```
RULE: Validate on the server. Client-side validation is UX, not security.

ACTION: Implement these validation patterns across the entire codebase.

- [ ] Every Convex mutation uses Convex validators (`v.string()`, `v.number()`, etc.) with constraints:

  args: {
    domain: v.string(),      // Convex ensures it's a string
    // But also validate format in the handler:
  },
  handler: async (ctx, args) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(args.domain)) {
      throw new ConvexError("Invalid domain format");
    }
  }

- [ ] String inputs have maximum length limits:
  - Names: max 100 characters
  - Descriptions: max 5,000 characters
  - Domains: max 253 characters
  - Email: max 254 characters
  - URLs: max 2,048 characters
  - Free text / notes: max 10,000 characters

- [ ] Numeric inputs have range limits:
  - Pagination page: min 1, max 1000
  - Pagination pageSize: min 1, max 100
  - Token amounts: min 0, max reasonable upper bound

- [ ] Enum inputs are validated against allowed values:
  - Roles: only "sales_rep" | "sales_admin" | "billing"
  - Priority: only "low" | "medium" | "high"
  - Status: only the defined set of statuses

- [ ] Email addresses are validated with a proper regex or library (e.g., `validator.isEmail()`).
- [ ] URLs are validated and must start with `https://` (never `javascript:`, `data:`, or `file:`).
- [ ] Phone numbers are validated for reasonable format (digits, dashes, spaces, parentheses, plus sign only).
- [ ] No user input is ever used to construct file paths, system commands, or dynamic imports.
```

---

## 7. Injection Attack Prevention

```
ACTION: Search the entire codebase for injection vulnerabilities.

SQL INJECTION (if using SQL databases):
- [ ] All database queries use parameterized queries / prepared statements. NEVER string concatenation.
- [ ] Convex is inherently safe from SQL injection (it's not SQL-based), but if any raw SQL is used elsewhere (Postgres, MySQL), it MUST be parameterized.

NOSQL INJECTION (Convex / MongoDB-style):
- [ ] User input is never used as object keys in query conditions. Validate types strictly.
- [ ] Filter objects are constructed server-side, not passed directly from the client.

COMMAND INJECTION:
- [ ] The codebase does NOT use `child_process.exec()`, `eval()`, `Function()`, or `new Function()` with user input.
- [ ] If shell commands are needed (e.g., for PDF generation), use `child_process.execFile()` with a fixed command and arguments array — never string interpolation.

LDAP / XPATH / TEMPLATE INJECTION:
- [ ] If any LDAP, XML, or template engine is used, inputs are escaped using the engine's built-in escaping functions.

CODE INJECTION:
- [ ] No `eval()` anywhere in the codebase. Search for it: `grep -rn "eval(" src/`
- [ ] No `dangerouslySetInnerHTML` with unsanitized content. If used, content is sanitized with DOMPurify.
- [ ] No `innerHTML` assignment in vanilla JS sections.
```

---

## 8. Cross-Site Scripting (XSS) Prevention

```
ACTION: Audit for XSS vulnerabilities.

- [ ] React/Next.js automatically escapes JSX expressions. Do NOT bypass this with `dangerouslySetInnerHTML` unless content is sanitized.
- [ ] If `dangerouslySetInnerHTML` is used ANYWHERE, the content MUST be sanitized:

  import DOMPurify from "isomorphic-dompurify";
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

- [ ] Search the codebase for every instance: `grep -rn "dangerouslySetInnerHTML" src/`
- [ ] User-generated content displayed in the UI (company names, descriptions, notes) is escaped by default via React JSX. Verify no raw HTML rendering exists.
- [ ] URLs from user input that are used in `href` or `src` attributes are validated:

  // ❌ DANGEROUS — user could input "javascript:alert(1)"
  <a href={userProvidedUrl}>Click</a>

  // ✅ SAFE — validate protocol first
  const safeUrl = userProvidedUrl.startsWith("https://") ? userProvidedUrl : "#";
  <a href={safeUrl}>Click</a>

- [ ] Content Security Policy (CSP) headers are set (see Section 13).
- [ ] No inline event handlers with user data (`onclick="doThing('${userData}')"`) — use React event handlers.
- [ ] Markdown rendering (if used) sanitizes HTML output.
```

---

## 9. Cross-Site Request Forgery (CSRF) Prevention

```
ACTION: Verify CSRF protections are in place.

- [ ] Next.js Server Actions use the POST method and automatically compare the Origin header to the Host header. This is built-in CSRF protection — verify it has not been disabled.
- [ ] All state-changing API routes (POST, PUT, DELETE) verify the Origin header.
- [ ] SameSite cookie attribute is set to "Lax" or "Strict" (Clerk handles this for session cookies by default — verify in cookie settings).
- [ ] Custom API endpoints that accept form submissions include CSRF token validation if they don't use the built-in Next.js mechanism.
- [ ] If using custom AJAX endpoints outside of Next.js Server Actions, include a CSRF token in the request headers.
```

---

## 10. Session Management & Cookie Security

```
ACTION: Audit session and cookie configuration.

- [ ] Session cookies are set with these attributes:
  - `HttpOnly: true` (prevents JavaScript access — Clerk does this by default)
  - `Secure: true` (only sent over HTTPS)
  - `SameSite: Lax` or `Strict` (prevents CSRF)
  - `Path: /` (or the most restrictive path possible)
  - Domain is NOT set to a wildcard (e.g., not `.example.com` unless cross-subdomain sharing is needed)

- [ ] Session timeout is configured:
  - Idle timeout: 30 minutes of inactivity → session invalidated
  - Absolute timeout: 24 hours → force re-authentication regardless of activity
  - These are configured in Clerk dashboard under Session settings.

- [ ] Session fixation prevention: A new session ID is issued after login (Clerk handles this).
- [ ] Concurrent sessions: Decide if users can be logged in from multiple devices. If not, new login should invalidate previous sessions.
- [ ] Logout completely destroys the server-side session (calls Clerk's session revocation endpoint), not just deletes the cookie.
- [ ] No sensitive data (user roles, permissions, company ID) is stored in client-accessible cookies or localStorage. These are derived server-side from the session.
```

---

## 11. Rate Limiting & Brute Force Protection

```
ACTION: Implement rate limiting at multiple layers.

LAYER 1 — GLOBAL (per IP):
- [ ] All API routes and Server Actions are rate-limited. Suggested defaults:
  - General API: 100 requests per 15-minute window per IP
  - Authentication endpoints (login, signup, password reset): 5 requests per 15-minute window per IP
  - Live Search (consumes tokens): 10 requests per minute per user
  - Export/Report generation: 5 requests per minute per user

IMPLEMENTATION OPTIONS:
  Option A: Use Vercel's Edge middleware with a rate limiter (e.g., @upstash/ratelimit with Redis):

    import { Ratelimit } from "@upstash/ratelimit";
    import { Redis } from "@upstash/redis";

    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, "15 m"),
    });

  Option B: Use Arcjet (arcjet.com) — a Next.js-native security SDK that provides
    rate limiting, bot detection, email validation, and attack protection.

  Option C: For Convex mutations, implement token bucket rate limiting within the mutation handler
    by tracking request counts in a Convex table:

    // Check rate limit before proceeding
    const key = `${user._id}:liveSearch`;
    const requests = await ctx.db.query("rateLimits")
      .withIndex("by_key", q => q.eq("key", key))
      .filter(q => q.gt(q.field("timestamp"), Date.now() - 60000))
      .collect();
    if (requests.length >= 10) throw new ConvexError("Rate limit exceeded");

LAYER 2 — USER-LEVEL:
- [ ] Token consumption (Live Search) is rate-limited per user per minute, in addition to the monthly quota.
- [ ] Expensive operations (PDF generation, CSV export, batch scans) are rate-limited per user.

LAYER 3 — ANTI-BRUTE-FORCE:
- [ ] After 5 failed login attempts from the same IP: introduce exponential backoff delays (1s, 2s, 4s, 8s, 16s).
- [ ] After 10 failed login attempts from the same email: temporarily lock the account for 15 minutes and send an email notification to the account owner.
- [ ] Log all failed authentication attempts with IP, timestamp, and attempted email.
```

---

## 12. Secrets & Environment Variable Management

```
ACTION: Audit all secrets and environment variables.

- [ ] ALL secrets are stored in environment variables, NEVER hardcoded in source code.
- [ ] `.env` / `.env.local` files are in `.gitignore` and NEVER committed to version control.
- [ ] Search for hardcoded secrets: grep -rn "sk_live\|sk_test\|API_KEY\|SECRET\|password" src/ --include="*.ts" --include="*.tsx" --include="*.js"
- [ ] Only variables prefixed with `NEXT_PUBLIC_` are accessible in the browser. Verify that NO secret keys have this prefix:

  ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...   (public, safe)
  ❌ NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_test_...        (LEAKED TO BROWSER!)
  ❌ NEXT_PUBLIC_CLERK_SECRET_KEY=sk_test_...          (LEAKED TO BROWSER!)

- [ ] Convex environment variables (set via `npx convex env set`) are server-side only and cannot be accessed from the client.
- [ ] Stripe secret key is ONLY used server-side (Convex actions or API routes).
- [ ] Clerk secret key is ONLY used server-side.
- [ ] Redrok API credentials are ONLY used server-side (Convex HTTP actions or proxy route).
- [ ] Database connection strings (if any) are ONLY in server-side environment variables.
- [ ] API keys are rotated periodically (at least every 90 days for non-automated keys).
- [ ] If a secret is accidentally committed, it is immediately rotated AND the commit is purged from git history (use `git filter-branch` or BFG Repo-Cleaner).
```

---

## 13. Security Headers

```
ACTION: Configure security headers in next.config.js or middleware.

// next.config.js
const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },

  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Enable XSS filter (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },

  // Control referrer information
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Prevent embedding in other sites (modern replacement for X-Frame-Options)
  // value: "require-corp" for strictest, or "same-origin" for moderate
  // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },

  // Restrict resource access from other origins
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },

  // Permissions Policy — disable unused browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },

  // Content Security Policy (CSP)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.convex.cloud https://api.stripe.com",
      "frame-src https://js.stripe.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },

  // HSTS — force HTTPS for 1 year, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

CHECKLIST:
- [ ] All headers above are configured.
- [ ] CSP is tested and does not break legitimate functionality (Clerk auth, Stripe checkout, Convex connections).
- [ ] X-Frame-Options is set to DENY (prevents clickjacking).
- [ ] HSTS is enabled with includeSubDomains and preload.
- [ ] Permissions-Policy disables camera, microphone, geolocation unless needed.
```

---

## 14. HTTPS & Transport Security

```
- [ ] ALL traffic is served over HTTPS in production. HTTP requests are redirected to HTTPS (301).
- [ ] HSTS header is set (Section 13) to prevent SSL stripping attacks.
- [ ] TLS 1.2 is the minimum supported version. TLS 1.0 and 1.1 are disabled.
- [ ] SSL certificate is valid, not expired, and issued by a trusted CA.
- [ ] Mixed content warnings: No HTTP resources loaded on HTTPS pages (images, scripts, stylesheets, API calls).
- [ ] API calls from the server to external services (Redrok, ransomware.live) use HTTPS.
```

---

## 15. File Upload Security

```
ACTION: If the application allows file uploads (CSV for Snapshot Scan, logo upload, knowledge base documents), implement these protections.

- [ ] File type validation: Check BOTH the file extension AND the MIME type. Do not trust the extension alone.
  Allowed types for logo: image/gif, image/png, image/jpeg, image/jpg
  Allowed types for CSV: text/csv, application/vnd.ms-excel

- [ ] File size limits:
  - Logo: max 5MB
  - CSV upload: max 10MB
  - Documents: max 25MB

- [ ] File name sanitization: Strip special characters, path traversal sequences (../, ..\), and null bytes from filenames:

  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

- [ ] Files are stored in a dedicated storage service (e.g., Convex file storage, S3), NOT on the application server's filesystem.
- [ ] Uploaded files are NEVER served from the same domain as the application. Use a separate domain or CDN subdomain.
- [ ] Image files are re-processed/re-encoded server-side to strip EXIF data and prevent image-based exploits.
- [ ] CSV files are parsed with a proper library (e.g., Papa Parse), not by splitting on commas (which fails with quoted fields).
- [ ] CSV content is validated after parsing: domain format validation, row count limits, etc.
- [ ] No uploaded file is ever executed by the server.
```

---

## 16. Database Security

```
ACTION: Audit database configuration and access patterns.

CONVEX-SPECIFIC:
- [ ] Convex functions (queries, mutations, actions) are the ONLY way to access data. No direct database connections from the client.
- [ ] All Convex queries use indexes for performance and to avoid full table scans.
- [ ] Convex mutations validate all arguments using `v.*` validators in the args definition.
- [ ] Internal functions (`internalQuery`, `internalMutation`, `internalAction`) are used for server-to-server operations and cannot be called from the client.
- [ ] Public-facing queries do NOT return internal fields (e.g., password hashes, API tokens, internal IDs that should be hidden).
- [ ] Data deletion respects cascading relationships (deleting a company deletes its users, leads, watchlist items, etc. — or blocks deletion if children exist).

GENERAL DATABASE SECURITY (if using additional databases):
- [ ] Database credentials are stored in environment variables.
- [ ] Database connections use SSL/TLS.
- [ ] Database user has the minimum required privileges (no root/admin access from the application).
- [ ] Backups are encrypted and stored securely.
- [ ] PII (personally identifiable information) is identified and handling complies with data privacy regulations.
```

---

## 17. Dependency & Supply Chain Security

```
ACTION: Audit and maintain dependencies.

- [ ] Run `npm audit` (or `pnpm audit` / `yarn audit`) weekly. Fix all high and critical vulnerabilities.
- [ ] Enable GitHub Dependabot or Renovate Bot for automatic dependency update PRs.
- [ ] Lock file (`package-lock.json` / `pnpm-lock.yaml`) is committed to version control.
- [ ] Use `npm ci` (not `npm install`) in CI/CD pipelines to install exact locked versions.
- [ ] Review new dependencies before adding them:
  - Check download count (popular = more eyeballs on security)
  - Check last update date (abandoned packages are risky)
  - Check for known vulnerabilities on Snyk or Socket.dev
  - Prefer well-known, maintained libraries
- [ ] Remove unused dependencies: `npx depcheck`
- [ ] Pin critical dependencies to exact versions in package.json for security-sensitive packages (Clerk, Stripe, etc.).
- [ ] Next.js version is up to date. Specifically, verify it is NOT affected by CVE-2025-29927 (fixed in 14.2.25+).
```

---

## 18. Error Handling & Information Leakage

```
RULE: Never expose internal error details to the client. They help attackers.

ACTION:

- [ ] In production, API routes and Server Actions return generic error messages:
  ✅ "An error occurred. Please try again."
  ❌ "TypeError: Cannot read property 'email' of undefined at /app/api/users/route.ts:42"
  ❌ "ConvexError: Document not found in table 'users' for ID j97f..."
  ❌ "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`)"

- [ ] Stack traces are NEVER sent to the client in production. Use a global error handler:

  // In API routes:
  try {
    // ... business logic
  } catch (error) {
    console.error("API Error:", error); // Log full error server-side
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

- [ ] Convex errors: Custom `ConvexError` messages sent to the client should be user-friendly. Internal errors should be caught and replaced.
- [ ] 404 pages do not reveal directory structure or framework details.
- [ ] Error responses do NOT include:
  - Database table names
  - SQL/query details
  - File paths
  - Server software versions
  - Stack traces
  - Environment variable names
- [ ] The `X-Powered-By` header is removed (Next.js sets this by default — disable in next.config.js):
  module.exports = { poweredByHeader: false };
```

---

## 19. Logging, Monitoring & Audit Trails

```
ACTION: Implement comprehensive security logging.

WHAT TO LOG (with timestamp, user ID, IP, and request ID):
- [ ] Authentication events: login success, login failure, logout, password change, password reset
- [ ] Authorization failures: any request that is denied due to insufficient role or wrong tenant
- [ ] Admin actions: user creation, role changes, user deactivation, integration connect/disconnect
- [ ] Data access: Live Searches performed (domain, user, tokens consumed)
- [ ] Data modification: lead creation/deletion, watchlist changes, campaign creation
- [ ] Billing events: plan changes, payment failures, trial expiration
- [ ] Security events: rate limit hits, CSRF violations, invalid token attempts
- [ ] Error events: unhandled exceptions, external API failures

WHAT NOT TO LOG:
- [ ] Passwords (even hashed)
- [ ] Full credit card numbers (Stripe handles this — never log raw card data)
- [ ] Full API keys / secrets
- [ ] Session tokens / JWTs (log a hash or last 4 characters only)

STORAGE:
- [ ] Logs are stored in the Convex `auditLog` table AND/OR an external logging service (Datadog, Sentry, LogRocket, etc.).
- [ ] Logs are retained for at least 90 days.
- [ ] Logs are tamper-resistant (append-only, not editable by application users).
- [ ] Critical security events trigger alerts (email to admin or Slack notification).

SENTRY / ERROR MONITORING:
- [ ] Sentry (or equivalent) is configured for production error tracking.
- [ ] Sentry DSN is in an environment variable.
- [ ] Sensitive data is scrubbed from Sentry events (use `beforeSend` hook to strip PII).
```

---

## 20. Billing & Payment Security (Stripe)

```
ACTION: Audit Stripe integration.

- [ ] Stripe secret key is ONLY used server-side. Never in client code or `NEXT_PUBLIC_*`.
- [ ] Stripe publishable key is the only Stripe key exposed to the browser.
- [ ] All Stripe webhooks verify the webhook signature using the webhook secret:

  const sig = request.headers.get("stripe-signature");
  const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

  If signature verification fails, the request is rejected with 400.

- [ ] Webhook endpoints are idempotent — processing the same event twice does not cause duplicate charges or data corruption. Use Stripe's event ID for deduplication.
- [ ] The application NEVER stores raw credit card numbers, CVVs, or full card details. All payment processing goes through Stripe's secure elements (Stripe.js, Stripe Elements, or Stripe Checkout).
- [ ] Subscription status changes (upgrade, downgrade, cancellation) are driven by Stripe webhooks, NOT by client-side requests. The client may initiate a checkout session, but the actual status change comes from Stripe's webhook confirming payment.
- [ ] Trial logic is enforced server-side. A user cannot extend their own trial by manipulating client state.
- [ ] Price IDs and plan details are stored in environment variables or the database, not hardcoded.
- [ ] Failed payment webhooks trigger appropriate account status changes (e.g., grace period, then suspension).
```

---

## 21. Email Security (Outbound)

```
ACTION: If the application sends emails (via AI Agents, notifications, password reset).

- [ ] Outbound emails are sent from a verified domain with SPF, DKIM, and DMARC records configured.
- [ ] Email content does NOT include sensitive data (full passwords, API keys, full credit card numbers).
- [ ] Email templates do not render user-controlled HTML without sanitization (prevents email injection / XSS in email).
- [ ] Unsubscribe links are included in marketing/campaign emails (CAN-SPAM compliance).
- [ ] Email sending is rate-limited to prevent the platform from being used for spam.
- [ ] If using user's connected inbox (Outlook/Gmail via OAuth), the OAuth tokens are stored securely server-side, encrypted at rest, and never exposed to the client.
```

---

## 22. Third-Party API & Webhook Security

```
ACTION: Audit all external API integrations.

OUTBOUND (calling external APIs like Redrok, ransomware.live):
- [ ] API keys for external services are stored in server-side environment variables.
- [ ] Outbound requests are made from server-side code only (Convex actions, API routes), never from the browser.
- [ ] Response data from external APIs is validated before being stored or displayed. Do not blindly trust external data.
- [ ] Timeout is set on all external HTTP requests (e.g., 30 seconds) to prevent hanging connections.
- [ ] External API errors are caught and logged. They do not crash the application or leak internal details to the user.
- [ ] SSRF prevention: If the application fetches URLs provided by users (e.g., company website for enrichment), validate that the URL:
  - Uses HTTPS protocol
  - Does NOT resolve to a private IP (127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x)
  - Is NOT a link-local or loopback address
  - Is on an allowlist of known domains (if applicable)

INBOUND (receiving webhooks from Clerk, Stripe, etc.):
- [ ] ALL incoming webhooks verify the request signature using the provider's signing secret.
- [ ] Webhook endpoints accept POST only. Return 405 for other methods.
- [ ] Webhook processing is idempotent (same event processed twice = no duplicate side effects).
- [ ] Webhook endpoints return 200 quickly and process heavy work asynchronously (to avoid timeout).
- [ ] Webhook secrets are stored in environment variables.
```

---

## 23. Next.js Specific Security

```
ACTION: Next.js App Router-specific security hardening.

MIDDLEWARE:
- [ ] Middleware is used ONLY for routing logic, redirects, and headers — NOT as the sole security gate.
- [ ] Authentication and authorization checks exist in EVERY Server Action, API route, and data fetching function, independent of middleware.
- [ ] Next.js is updated to at least version 14.2.25 to patch CVE-2025-29927.

SERVER COMPONENTS:
- [ ] Server Components do NOT pass sensitive data (secrets, full user records, internal IDs) as props to Client Components.
- [ ] Sensitive data is fetched and consumed entirely within Server Components; only the necessary display fields are passed to Client Components.
- [ ] The `"use client"` boundary is treated as a trust boundary — anything passed to a Client Component is considered visible to the user.

SERVER ACTIONS ("use server"):
- [ ] Every Server Action authenticates the user via `auth()`.
- [ ] Every Server Action validates ALL input arguments.
- [ ] Server Actions do not close over sensitive variables (even though Next.js encrypts them, treat it as defense in depth).
- [ ] Server Actions return only the data the client needs — no extra fields.

ENVIRONMENT VARIABLES:
- [ ] Verified: no `NEXT_PUBLIC_` variable contains a secret.
- [ ] Server-only packages (database clients, API SDKs with secret keys) are NOT imported in client components.

DYNAMIC ROUTES ([param]):
- [ ] All dynamic route parameters are validated (type, format, and authorization) in the page/layout component.
- [ ] No dynamic route parameter is used to construct file paths or SQL queries without sanitization.

next.config.js:
- [ ] `poweredByHeader: false` is set to hide the "X-Powered-By: Next.js" header.
- [ ] `reactStrictMode: true` is enabled.
- [ ] Image domains are explicitly allowlisted in `images.remotePatterns` (no wildcard domains).
```

---

## 24. Client-Side Security

```
ACTION: Audit client-side code.

- [ ] No secrets, API keys, or tokens are stored in:
  - localStorage
  - sessionStorage
  - Client-side cookies set by the application (auth cookies are set by Clerk with HttpOnly)
  - JavaScript variables accessible from the console
  - HTML comments or data attributes

- [ ] Sensitive data is NOT logged to `console.log()` in production.
  Remove or conditionally disable all console.log statements that output user data, tokens, or API responses:

  // Use a production-safe logger
  if (process.env.NODE_ENV === "development") {
    console.log("Debug:", data);
  }

- [ ] The browser's DevTools Network tab should NOT reveal:
  - API keys in request headers
  - Full user records with internal fields in responses
  - Password hashes or tokens in any response

- [ ] Client-side routing guards (checking role before showing a page) are ALWAYS backed by server-side checks. Client-side guards are UX shortcuts, not security.
- [ ] All links to external sites use `rel="noopener noreferrer"` and `target="_blank"`.
- [ ] Autocomplete is disabled on sensitive fields (API keys, tokens): `autoComplete="off"`.
```

---

## 25. Denial of Service (DoS) & Resource Exhaustion

```
ACTION: Protect against resource exhaustion attacks.

- [ ] Rate limiting is implemented (Section 11).
- [ ] Pagination is enforced on all list queries. No endpoint returns unbounded result sets.
  Maximum page size: 100 items. Default: 20.
- [ ] File upload size limits are enforced both client-side AND server-side (Section 15).
- [ ] CSV batch operations (Snapshot Scan) have a maximum row count (e.g., 500 domains per upload).
- [ ] Long-running operations (batch scans, report generation) are processed asynchronously with progress tracking, not in the request/response cycle.
- [ ] Database queries have timeouts configured.
- [ ] Regex patterns used for input validation are NOT vulnerable to ReDoS (Regular Expression Denial of Service). Avoid nested quantifiers: `(a+)+`, `(a|a)+`, `(a*)*`.
  Test regexes at: https://redos-checker.surge.sh/
- [ ] WebSocket connections (Convex real-time) are authenticated and rate-limited.
- [ ] Memory-intensive operations (PDF generation, large data exports) are limited in concurrency.
```

---

## 26. Deployment & Infrastructure Security

```
ACTION: Harden the deployment environment.

- [ ] Production environment variables are set via the hosting platform (Vercel, AWS, etc.), NOT via .env files on the server.
- [ ] Preview/staging deployments are password-protected or restricted to authorized users.
- [ ] Build artifacts do not contain source maps in production (`productionBrowserSourceMaps: false` in next.config.js).
- [ ] Git repository access is restricted. Only authorized team members can push to main/production branches.
- [ ] CI/CD pipeline runs `npm audit` and fails on critical vulnerabilities.
- [ ] Database backups run daily and are tested for restore capability quarterly.
- [ ] DNS is configured with DNSSEC if possible.
- [ ] CDN is configured with DDoS protection (Vercel, Cloudflare, etc.).
- [ ] Error monitoring (Sentry) and uptime monitoring (Pingdom, Uptime Robot) are configured.
- [ ] No debug endpoints or development tools are accessible in production (/api/debug, /graphql playground, etc.).
```

---

## 27. Data Privacy & Compliance

```
ACTION: Implement data privacy best practices.

GDPR / PRIVACY:
- [ ] Privacy policy is accessible and explains what data is collected and how it's used.
- [ ] Terms of service are presented and accepted during signup.
- [ ] Users can request data export (GDPR Right of Access) — implement or plan for this.
- [ ] Users can request account deletion (GDPR Right to Erasure) — implement a complete data deletion flow that removes all user data from all tables.
- [ ] Personal data is not retained longer than necessary.
- [ ] Data shared with third parties (Clerk, Stripe, Redrok) is documented in the privacy policy.

PII HANDLING:
- [ ] Personally Identifiable Information (PII) is identified across all tables: names, emails, phone numbers, addresses, IP addresses.
- [ ] PII is encrypted at rest (Convex handles this, but verify for any additional datastores).
- [ ] PII access is logged in the audit trail.
- [ ] PII is not included in error logs, analytics, or third-party tracking.

DATA CLASSIFICATION:
- [ ] Data is classified by sensitivity:
  - PUBLIC: Company names, industry, publicly available domain info
  - INTERNAL: User names, email addresses, company settings
  - CONFIDENTIAL: Exposure data, compromised credentials, API keys
  - RESTRICTED: Payment information (handled by Stripe, never stored)
- [ ] Access controls match the classification level.
```

---

## 28. Edge Cases & Hardening Checklist

```
From the skills.sh "harden" skill — test these scenarios:

INPUT HARDENING:
- [ ] Test all text fields with 200+ character strings → should be truncated or rejected, not break layout.
- [ ] Test all text fields with emoji (🔥🛡️) → should be stored and displayed correctly.
- [ ] Test all text fields with HTML tags (<script>alert(1)</script>) → should be escaped, not executed.
- [ ] Test all text fields with SQL injection attempts (' OR 1=1 --) → should be harmless.
- [ ] Test numeric fields with negative numbers, zero, extremely large numbers, and non-numeric strings.
- [ ] Test date fields with past dates, far-future dates, and invalid dates.
- [ ] Test domain fields with: subdomains, internationalized domain names (IDN), very long TLDs, IP addresses.

UI HARDENING:
- [ ] Empty states: Every list/table has a meaningful empty state (not blank or broken).
- [ ] Loading states: Every async operation shows a loading indicator.
- [ ] Error states: Every data fetch has an error fallback UI.
- [ ] Double-click prevention: All submit buttons are disabled while processing to prevent double submissions.
- [ ] Concurrent editing: If two users edit the same record, the last write wins (or optimistic concurrency control is implemented).
- [ ] Pagination: Tables with 0 items, 1 item, and 10,000+ items all render correctly.
- [ ] Long company names / contact names do not break table layouts (use text truncation with tooltips).

NETWORK HARDENING:
- [ ] Test with slow connection (3G throttle) → loading states appear, no timeouts crash the UI.
- [ ] Test with no connection (offline) → a clear "You are offline" message appears.
- [ ] Test with intermittent connection → retries work, no data corruption.
```

---

## 29. Security Testing Automation

```
ACTION: Add these to the CI/CD pipeline and/or local development workflow.

AUTOMATED SECURITY SCANS:
- [ ] `npm audit` runs in CI and blocks deployment on critical vulnerabilities.
- [ ] ESLint security plugin is configured:
    npm install --save-dev eslint-plugin-security
    // In .eslintrc:
    { "plugins": ["security"], "extends": ["plugin:security/recommended"] }

- [ ] No `eval()`, `dangerouslySetInnerHTML` without DOMPurify, or `innerHTML` passes lint.

PLAYWRIGHT SECURITY TESTS (Chromium):

Test A: "Authentication bypass — accessing protected routes without login"
  Step 1: Clear all cookies and session data.
  Step 2: Navigate directly to /news (or any protected route) without logging in.
  Step 3: Verify the user is redirected to the login page. They should NOT see any dashboard content.
  Step 4: Repeat for /live-search, /live-leads, /settings, /billing, /api/leads.
  Step 5: All should redirect to login or return 401.

Test B: "Role-based access — Sales Rep cannot access admin pages"
  Step 1: Log in as a Sales Rep user.
  Step 2: Navigate to /settings/users (admin-only page).
  Step 3: Verify the user is shown an "Access Denied" message or redirected, NOT shown the admin UI.
  Step 4: Navigate to /settings/audit-log.
  Step 5: Verify access is denied.

Test C: "Tenant isolation — User cannot see another company's data"
  Step 1: Log in as User A (Company 1).
  Step 2: Create a lead with a distinctive name: "Company1-Secret-Lead".
  Step 3: Log out. Log in as User B (Company 2).
  Step 4: Navigate to Live Leads / My Leads.
  Step 5: Search for "Company1-Secret-Lead". Verify it does NOT appear.
  Step 6: If the lead has a Convex ID, try accessing it directly via URL or API. Verify access is denied.

Test D: "XSS prevention — script tags in input fields"
  Step 1: Log in.
  Step 2: Create a new task with title: <script>alert('XSS')</script>
  Step 3: Verify the task is created but the script is NOT executed.
  Step 4: View the task. Verify the raw text appears as escaped HTML, not as executable JavaScript.
  Step 5: Repeat with: <img src=x onerror=alert(1)>
  Step 6: Verify the image tag is escaped, not rendered.

Test E: "CSRF protection — forged POST requests are rejected"
  Step 1: Using Playwright, send a raw POST request to a Server Action endpoint WITHOUT the proper session cookie or CSRF token.
  Step 2: Verify the response is 401 or 403, NOT a successful mutation.

Test F: "Rate limiting — rapid requests are throttled"
  Step 1: Log in.
  Step 2: Send 20 Live Search requests in rapid succession (within 10 seconds).
  Step 3: Verify that after the rate limit threshold, subsequent requests receive a 429 status or an error message.

Test G: "Error handling — no sensitive data in error responses"
  Step 1: Trigger an error by sending an invalid request to an API route (e.g., invalid JSON body).
  Step 2: Verify the error response does NOT contain stack traces, file paths, database table names, or environment variable names.
  Step 3: Verify the response is a generic error message with the appropriate HTTP status code.

Test H: "File upload security — malicious file types rejected"
  Step 1: Navigate to a file upload feature (CSV upload, logo upload).
  Step 2: Attempt to upload a .exe file renamed to .csv.
  Step 3: Verify the upload is rejected.
  Step 4: Attempt to upload a file larger than the size limit.
  Step 5: Verify the upload is rejected with a clear error message.

MANUAL SECURITY REVIEW CHECKLIST (run quarterly):
- [ ] Review all npm dependencies for known vulnerabilities
- [ ] Review Clerk, Stripe, Convex, and Vercel security advisories
- [ ] Review access logs for unusual patterns (brute force, scraping)
- [ ] Rotate all API keys and secrets
- [ ] Test the account deletion flow (verify all data is actually removed)
- [ ] Test the password reset flow end-to-end
- [ ] Verify backups can be restored
- [ ] Review and update the Content Security Policy
- [ ] Run an automated vulnerability scanner (OWASP ZAP, Burp Suite, or Snyk)
```

---

## Quick Reference: Files to Audit

| File/Pattern | What to Check |
|---|---|
| `app/api/**/*.ts` | Auth check at top of every handler. No exposed secrets. Proper error handling. |
| `convex/**/*.ts` | Auth + RBAC + tenant isolation in every query/mutation. Validator constraints on args. |
| `app/**/page.tsx` | Dynamic params validated. No sensitive data in Client Component props. |
| `middleware.ts` | NOT the sole auth gate. Used for routing/headers only. |
| `.env*` files | All in .gitignore. No secrets in NEXT_PUBLIC_*. |
| `next.config.js` | Security headers set. poweredByHeader: false. reactStrictMode: true. |
| `package.json` | No known vulnerable dependencies. Lock file committed. |
| Any file with `dangerouslySetInnerHTML` | Content sanitized with DOMPurify. |
| Any file with `eval(` | REMOVE IT. |
| Any file with `fetch(` to external URLs | Validate URL. Use HTTPS. Set timeout. Handle errors. |
| Any file handling file uploads | Type/size validation. Filename sanitization. |

---

## Final Note

Security is not a one-time task. It is a continuous process. After implementing all items in this guide:

1. Re-run this checklist after every major feature addition.
2. Subscribe to security advisories for Next.js, Clerk, Convex, Stripe, and all major dependencies.
3. Conduct a formal security review (or penetration test) before any public launch.
4. Keep this document updated as new threats, CVEs, and best practices emerge.
