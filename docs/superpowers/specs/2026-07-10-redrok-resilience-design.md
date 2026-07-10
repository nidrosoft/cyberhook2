# Redrok Resilience Design

## Purpose

Keep Live-Leads useful and operationally visible when Redrok credentials expire or the Redrok service is unavailable, without presenting public ransomware-victim data as equivalent to Redrok credential-exposure data.

## Confirmed product decisions

- When Redrok fails, Live-Leads automatically displays a clearly labeled, limited fallback built from stored ransomware.live incidents.
- Only company Sales Admins can add, test, replace, or remove company-specific Redrok credentials.
- Affected company Sales Admins receive both email and in-app health alerts, deduplicated to at most one unhealthy alert per 24 hours.
- Fallback rows must never claim to be Redrok exposure results and must not fabricate missing firmographic or exposure fields.

## Scope

This design covers four connected capabilities:

1. Smarter Redrok error classification and retry behavior.
2. Periodic credential health checks with deduplicated alerts.
3. An automatic, clearly labeled ransomware.live fallback for Live-Leads.
4. Secure per-company Redrok credential management.

It also closes an existing security gap: company queries must not return Redrok passwords or cached bearer tokens to browser clients.

## Architecture

### 1. Redrok error model

Create a focused shared module for Redrok errors and response classification. It will expose stable, vendor-neutral application error codes:

- `REDROK_AUTH_INVALID`: authentication endpoint returned 401 or 403.
- `REDROK_CREDENTIALS_MISSING`: no usable company or global credentials exist.
- `REDROK_RATE_LIMITED`: Redrok returned 429.
- `REDROK_TIMEOUT`: request timed out.
- `REDROK_UNAVAILABLE`: upstream 5xx or network failure.
- `REDROK_TOKEN_EXPIRED`: an otherwise valid cached token was rejected.
- `REDROK_UNKNOWN`: any uncategorized failure.

All Redrok actions will return this structured error information instead of relying on free-form strings. A cached-token 401 gets exactly one forced re-authentication attempt. An authentication-endpoint 401/403 does not retry.

Frontend copy will branch on the stable error code:

- Invalid/missing credentials: tell users to ask a Sales Admin to reconnect Redrok; no Retry button.
- Rate limit, timeout, or service outage: show Retry.
- When fallback data is available, show the fallback and its provenance banner rather than an empty blocking state.

### 2. Secure per-company credentials

The existing company-level `redrokEmail` and `redrokPassword` fields will be retained for schema compatibility, but new writes store the password encrypted using the existing AES-256-GCM utility and a server-side encryption key. The browser never receives the encrypted password, plaintext password, or cached token.

Add authenticated backend operations:

- Get connection status: returns only configured/healthy/error timestamps and masked email.
- Test credentials: authenticates with Redrok without storing.
- Save credentials: Sales Admin only; test first, encrypt password, save email/encrypted secret, clear old token, mark healthy.
- Remove credentials: Sales Admin only; clear credentials and cached token.

The Settings Integrations tab will include a Redrok card with:

- Connected / Needs attention / Not connected state.
- Masked account email when connected.
- Connect, Test, Replace, and Disconnect actions.
- A modal containing email and password fields. Password is write-only.

Global Convex environment credentials remain a temporary fallback for companies without their own connection. The status response explicitly reports whether the company uses a dedicated or shared connection.

### 3. Credential health monitoring

Add a six-hour Convex cron. It checks each distinct credential source sequentially to avoid bursts:

- Each company with dedicated credentials is checked independently.
- The shared environment credential is checked once per run and its result applies to companies using it.

Persist health data on the company:

- Last health-check timestamp.
- Health state: healthy, invalid credentials, missing credentials, rate limited, unavailable, or unknown.
- Last sanitized error code/message.
- Last unhealthy alert timestamp.
- Last recovery alert timestamp.

Alert rules:

- On the transition from healthy/unknown to unhealthy, notify company Sales Admins in-app and by email.
- While still unhealthy, send at most one reminder every 24 hours.
- On recovery, send one recovery notification and clear the stale unhealthy alert state.
- Alert copy never includes passwords, bearer tokens, raw upstream bodies, or internal stack traces.

Write a summarized `syncLogs` entry for each cron run, including counts of healthy/unhealthy connections and a sanitized error summary.

### 4. Automatic ransomware.live fallback

When `liveLeads` fails because of missing/invalid credentials, rate limiting, timeout, or upstream unavailability, query recent stored `ransomIncidents` from the ransomware.live source for the requested date range and country.

Map only honest fields:

- Company name.
- Normalized website/domain when valid.
- Country, region, and industry when present.
- Attack date.
- Ransomware group.
- Source URL.
- Internal incident identifier.

Do not invent company size, locality, founding year, LinkedIn URL, or exposure counts.

The action response gains explicit source metadata:

- `source: "redrok"` for normal results.
- `source: "ransomware_live_fallback"` for fallback results.
- `isFallback: boolean`.
- Sanitized upstream error code for admin-aware UI behavior.

Live-Leads fallback UX:

- Persistent warning banner: “Limited public ransomware data — not credential-exposure results.”
- Source/date/group displayed for fallback rows.
- Filters that rely on unavailable data, such as company size, are disabled or ignored while fallback is active.
- Saving a fallback row uses `source: "ransom_hub"`, not `"live_leads"`.
- The user can still retry Redrok for transient failures.

### 5. Notification and email delivery

Reuse the existing notifications table and email layout:

- Add a system/integration notification type for Redrok health.
- Create notifications only for approved Sales Admins belonging to the affected company and respecting in-app notification preferences.
- Send email only when email notifications are not disabled.
- Use `CyberHook AI Team <team@cyberhook.ai>` and the verified Resend pipeline.
- Link alerts to Settings → Integrations.

## Data safety and authorization

- Credential mutations require authenticated company access and `sales_admin`.
- Credentials are encrypted at rest; the encryption key remains server-side.
- Client-facing company queries return an explicit safe projection rather than raw company documents.
- Logs and alerts contain stable error codes and sanitized messages only.
- Disconnecting a company credential clears the cached token and falls back to shared credentials only when the product explicitly allows it.
- Existing plaintext company passwords are migrated opportunistically: on first successful read/test, encrypt and replace them. No plaintext is returned to clients during migration.

## Testing strategy

Introduce a minimal TypeScript test runner and test pure behavior before implementation:

1. Error classification for 401/403/429/5xx/timeouts/network failures.
2. Exactly-one retry for cached-token expiry and no retry for invalid credentials.
3. Encryption/decryption round-trip and non-disclosure in safe company projections.
4. Fallback mapping, domain normalization, provenance, and no fabricated fields.
5. Alert transition and 24-hour deduplication logic.
6. Live-Leads response contracts for Redrok, fallback, and no-fallback-data cases.
7. Sales Admin authorization for save/test/remove credential operations.

Verification after implementation:

- Unit tests pass.
- TypeScript check passes.
- Production Next.js build passes.
- Convex functions/schema deploy validation passes.
- Browser smoke test confirms:
  - Invalid credentials show the limited fallback and admin guidance.
  - Settings can test/save/replace/remove credentials.
  - Successful Redrok reconnect restores normal results.
  - Alert badges and email scheduling behave as designed.

## Non-goals

- Reproducing Redrok exposure counts or enrichment fields from public ransomware data.
- Adding a second paid credential-exposure provider.
- Exposing Redrok credentials to Sales Reps.
- Silently presenting fallback rows as normal Live-Leads results.
- Rewriting unrelated Ransom Hub or notification functionality.

## Rollout

1. Add tests and pure error/fallback helpers.
2. Secure credential storage and safe projections.
3. Add credential management backend and Settings UI.
4. Add structured errors and fallback response.
5. Add health cron, in-app alerts, and email alerts.
6. Deploy to dev, test with intentionally invalid credentials, then deploy to production.
