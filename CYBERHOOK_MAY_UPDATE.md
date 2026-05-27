# CyberHook — May Update — Cursor Implementation Guide

**Source document:** `cyberhook_final_bug_fixes.docx` (May 11th feedback from Liron / AMSYS)
**Target executor:** Cursor AI
**Owner:** Cyriac
**Status:** Ready for phased execution

---

## 0. How to Use This Document

This document is the **single source of truth** for the May update. It is organized into **10 phases**. Each phase is self-contained and must be completed in order unless a dependency is explicitly skipped.

### Execution rules for Cursor

1. **Read the entire phase before writing any code.** Do not start typing until you have understood the full phase, including its dependencies, files to touch, and acceptance criteria.
2. **Search the codebase first.** All file paths in this document are best-guess hints. Always confirm by searching the codebase before editing.
3. **Do one phase at a time.** Do not jump ahead. Each phase ends with explicit acceptance criteria that must pass before moving on.
4. **Adapter pattern is sacred.** All Redrok / external API response shape mapping lives in the existing adapter layer. If a field name changes, update only the adapter — do not propagate raw response shapes into UI or business logic.
5. **Convex is the only backend.** No new server-side runtimes. All mutations, queries, and actions go through Convex.
6. **Clerk owns auth.** Do not roll any custom auth. Use Clerk for sign-up, invites, role checks, and webhooks.
7. **Stripe owns money.** Never compute pricing or seat counts client-side. Always read authoritative data from Stripe.
8. **Never reproduce mock data.** If a screen currently renders fake invoices/payments/etc., replace with live data via the appropriate Convex query.
9. **Report status after each phase** using the template in Section 11.

### Scope classification

Each phase is tagged with one of:

- **🟢 BUG FIX** — Defect against the original PRD. Inside agreed scope.
- **🟡 MIXED** — Contains both bug fixes and scope expansion.
- **🟠 NEW SCOPE** — Feature not in the original PRD. Implement only if the owner has confirmed extended scope.

> ⚠️ **Phases tagged 🟠 NEW SCOPE require explicit owner sign-off before execution.** They are documented here for completeness; do not start them until Cyriac confirms scope expansion has been approved by the client.

---

## 1. Tech Stack Reference (Authoritative)

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Backend / DB | Convex |
| Auth | Clerk |
| Billing | Stripe |
| UI | Tailwind CSS + shadcn/ui |
| Email | Resend (or current configured provider) |
| External data | Redrok / AMSYS API (`dash-api.redrok.io`), ransomware.live (public) |
| CRM integrations | HubSpot, ConnectWise (planned) |
| Email/calendar integrations | Outlook (live), Gmail/Google Calendar (planned) |
| Comms integrations | Slack, Teams |

### Likely codebase layout (confirm by searching)

```
/app/                       # Next.js App Router pages
  /(auth)/                  # Sign-up, sign-in, onboarding
  /(dashboard)/             # Authenticated app shell
    /live-search/
    /live-leads/
    /watchlist/
    /ransom-hub/
    /breach-notifications/  (or similar)
    /snapshot-scan/
    /ai-agents/
    /scripts-cadences/
    /events/
    /reporting/
    /settings/
    /billing/               # To be moved under /settings/
  /api/                     # Webhooks (Stripe, Clerk, Resend, etc.)
/components/
  /ui/                      # shadcn/ui primitives — do not modify
  /[feature]/               # Feature-scoped components
/convex/
  _generated/               # auto-generated, do not edit
  schema.ts                 # Convex DB schema
  users.ts
  invites.ts
  billing.ts
  search.ts
  leads.ts
  integrations.ts
  ...
/lib/
  /constants/
  /adapters/                # Redrok adapter lives here
  /email/                   # Email templates
/public/                    # Logos, favicons, images
```

---

## 2. Critical Rules / Do-Nots

1. **Do not change Convex schema field names** unless explicitly required by a phase. Use migrations if you must.
2. **Do not hardcode prices, plan names, or Stripe price IDs in client code.** Read them from a central config or Stripe directly.
3. **Do not duplicate enum values.** Onboarding and Settings must share the same constants module. (See Phase 2.)
4. **Do not modify shadcn/ui primitives** in `components/ui/`. If a primitive needs new behavior, wrap it.
5. **Do not introduce new dependencies without justification.** Prefer existing libs. If a new lib is needed (e.g., for guided onboarding in Phase 10), name it explicitly in the status report.
6. **Do not push raw Redrok response shapes into UI.** Always route through the adapter.
7. **Do not log secrets or PII to console.** Sanitize before logging.
8. **Do not silently swallow errors.** Show user-friendly error states, and log structured errors for debugging.

---

## 3. Phase Overview

| # | Phase | Scope | Est. Effort | Dependencies |
|---|---|---|---|---|
| 1 | Branding & Legal | 🟡 MIXED | Low | None |
| 2 | Onboarding Data Consistency | 🟢 BUG FIX | Low | None |
| 3 | Invites, Team & Approvals | 🟡 MIXED | Medium | None |
| 4 | Billing & Stripe | 🟡 MIXED | Medium-High | Stripe config |
| 5 | Live Search & Leads Filters | 🟢 BUG FIX | Medium | Redrok adapter |
| 6 | Ransomware Hub & Breach Notification | 🟡 MIXED | Low-Medium | None |
| 7 | Integrations (HubSpot, Outlook) | 🟢 BUG FIX | Medium | OAuth creds |
| 8 | AI Agents & Campaigns | 🟢 BUG FIX | Medium | Phase 7 (Outlook) |
| 9 | Events, Certifications, Admin Panel | 🟠 NEW SCOPE | Medium | None |
| 10 | Guided Onboarding | 🟠 NEW SCOPE | High | None |

---

# PHASE 1 — Branding & Legal

**Scope:** 🟡 MIXED (rebrand is new scope; T&C/Privacy URL fix is a bug)
**Source:** Section 1 of client doc
**Effort:** Low
**Dependencies:** None

## Context

The product is being rebranded from **CyberHook** to **CyberHook AI**. The favicon and logo must be updated. The Terms & Conditions and Privacy Policy links currently point to placeholder URLs and must be updated to the live website.

## Goal

Update every user-visible brand reference to "CyberHook AI" and replace all Terms/Privacy URLs with the live URLs. Do not change internal code identifiers (package names, table names, file paths, env var names) — those stay as `cyberhook`.

## Affected areas

- App shell header / navigation
- Sign-up and sign-in pages
- Onboarding screens
- Footer (every page)
- Page `<title>` tags and meta descriptions
- Email templates (Resend)
- Favicon and logo assets

## Files likely to touch

- `/app/layout.tsx` (root metadata)
- `/app/(auth)/layout.tsx` and child pages
- `/components/site/header.tsx` or `top-nav.tsx`
- `/components/site/footer.tsx`
- `/components/auth/sign-up-form.tsx`
- `/lib/email/templates/*.tsx` or `*.ts`
- `/public/favicon.ico`, `/public/logo.svg`, `/public/logo-mark.svg`
- `/public/og-image.png` (if exists)

## Implementation steps

1. **Search for every user-visible occurrence of "CyberHook"** (case-insensitive). For each hit, decide:
   - **Visible UI string** (`<h1>CyberHook</h1>`, `aria-label`, alt text, page title) → change to `CyberHook AI`.
   - **Code identifier** (`cyberhookClient`, `CYBERHOOK_API_URL`, db table name) → leave unchanged.
   - **Email template body** → change to `CyberHook AI`.
   - **Email "from" name** (e.g., `"CyberHook <noreply@…>"`) → change to `"CyberHook AI <noreply@…>"`.

2. **Update `/app/layout.tsx`** metadata:
   ```ts
   export const metadata: Metadata = {
     title: { default: "CyberHook AI", template: "%s | CyberHook AI" },
     description: "Sales enablement platform for MSPs and MSSPs.",
   };
   ```

3. **Replace logo assets** in `/public/`:
   - `favicon.ico` (32x32, 16x16)
   - `logo.svg` (full wordmark)
   - `logo-mark.svg` (icon-only)
   - `apple-touch-icon.png` (180x180)
   - Confirm with owner if the asset files are available; if not, stub with a placeholder and flag in the status report.

4. **Update Terms & Conditions URL** everywhere it appears to:
   - `https://cyberhook.ai/terms-and-conditions`

5. **Update Privacy Policy URL** everywhere it appears to:
   - `https://cyberhook.ai/privacy-policy`

6. **Audit locations for legal links** (this list is not exhaustive — search and fix):
   - Sign-up form ("By signing up you agree to…")
   - Sign-in form
   - Footer of every authenticated page
   - Footer of every public/unauthenticated page
   - Onboarding final step
   - Email templates (welcome, invite, payment receipt)
   - Settings → Account → legal section if present

7. **Search for stale or placeholder URLs** that may exist (`localhost`, `vercel.app`, `example.com`, `/terms`, `/privacy`) and replace with the canonical URLs.

## Acceptance criteria

- [ ] No user-visible string anywhere in the app reads "CyberHook" without " AI".
- [ ] Browser tab title on every page reads "… | CyberHook AI" or "CyberHook AI".
- [ ] All Terms links navigate to `https://cyberhook.ai/terms-and-conditions`.
- [ ] All Privacy links navigate to `https://cyberhook.ai/privacy-policy`.
- [ ] Favicon and logo reflect new branding.
- [ ] Email templates (invite, welcome, password reset, payment receipt) show "CyberHook AI" in the subject line and body.
- [ ] No internal code identifiers were renamed (build still passes, no schema migrations needed).

## Verification

1. Run `grep -rni "cyberhook" --include="*.tsx" --include="*.ts" --include="*.md"` and review every hit.
2. Visit every top-level route and confirm the brand name in the header and tab title.
3. Trigger a test invite email to a personal address and verify the new brand appears in the email.

---

# PHASE 2 — Onboarding Data Consistency

**Scope:** 🟢 BUG FIX
**Source:** Section 2 (data mismatch issue) of client doc
**Effort:** Low
**Dependencies:** None

## Context

The onboarding flow captures values for **Annual Revenue** and **Sales Team Size** (and possibly other dropdowns), but those values do not align with the dropdown options shown in Settings. Result: a user picks "Just me" during onboarding, but Settings shows the field as empty or different. Data is being lost / mismatched.

This is happening because each form uses its own hardcoded list. The fix is to introduce a **single source of truth** for these enums.

## Goal

Onboarding and Settings must read all dropdown options from the same constants module. Saved values must round-trip cleanly: select in onboarding → persist to Convex → read in Settings → display the same selection.

## Affected areas

- Onboarding questionnaire form
- Settings → Company Profile form
- Convex `users` (or `companies`) schema
- Profile data API

## Files likely to touch

- `/lib/constants/profile-options.ts` ← **CREATE if missing**
- `/components/onboarding/company-questionnaire.tsx` (or similar)
- `/components/settings/company-profile-form.tsx` (or similar)
- `/convex/schema.ts`
- `/convex/companies.ts` or `/convex/users.ts`

## Implementation steps

1. **Create `/lib/constants/profile-options.ts`** as the single source of truth. Use this exact shape (these match the PRD):

   ```ts
   export const PRIMARY_BUSINESS_MODEL = [
     "MSP / MSSP",
     "VAR / Reseller",
     "Systems Integrator",
     "Value Added Distributor (VAD)",
     "Technology Alliances Partner (TAP)",
     "Consultant / Referral Partner",
     "Not set",
   ] as const;

   export const ANNUAL_REVENUE = [
     "0-4M",
     "5-9M",
     "10-24M",
     "25-49M",
     "50-99M",
     "100-249M",
     "250M-1B",
     "1B+",
   ] as const;

   export const GEOGRAPHIC_COVERAGE = [
     "North America",
     "EMEA",
     "APAC",
     "ANZ",
     "LATAM",
   ] as const;

   export const TARGET_CUSTOMER_BASE = [
     "SMB",
     "Mid Market",
     "Enterprise",
     "Fortune 500",
   ] as const;

   export const TOTAL_EMPLOYEES = [
     "1-10",
     "11-50",
     "51-100",
     "101-150",
     "151-250",
     "251-500",
     "501+",
   ] as const;

   export const SALES_TEAM_SIZE = [
     "Just me (solo)",
     "2-3",
     "3-5",
     "5-10",
     "10-25",
     "25-50",
     "50+",
   ] as const;

   export type PrimaryBusinessModel = typeof PRIMARY_BUSINESS_MODEL[number];
   export type AnnualRevenue = typeof ANNUAL_REVENUE[number];
   export type GeographicCoverage = typeof GEOGRAPHIC_COVERAGE[number];
   export type TargetCustomerBase = typeof TARGET_CUSTOMER_BASE[number];
   export type TotalEmployees = typeof TOTAL_EMPLOYEES[number];
   export type SalesTeamSize = typeof SALES_TEAM_SIZE[number];
   ```

2. **Update Convex schema** in `/convex/schema.ts` to use `v.union(v.literal("..."), ...)` matching the constants above. Example:

   ```ts
   import { v } from "convex/values";
   import { SALES_TEAM_SIZE } from "../lib/constants/profile-options";

   // In your companies table:
   salesTeamSize: v.optional(
     v.union(...SALES_TEAM_SIZE.map(o => v.literal(o)))
   ),
   ```

3. **Refactor the onboarding form**: replace any inline arrays for these dropdowns with imports from `/lib/constants/profile-options.ts`. Map over the constant in JSX.

4. **Refactor the Settings → Company Profile form**: same as step 3 — import from the constants module.

5. **Audit existing data**: if records in Convex already hold stale or mismatched values (e.g., `"$5M-$9M"` instead of `"5-9M"`), write a one-off Convex migration (or admin-run mutation) to normalize them. List the rewrites you applied in your status report.

6. **Ensure submit handlers persist correctly**:
   - Onboarding `submit` → must call the same mutation that Settings calls (or one that writes to the same fields).
   - Settings `submit` → must read and write the same fields.

7. **Add a regression test or manual checklist item**: pick one combination and verify round-trip.

## Acceptance criteria

- [ ] `/lib/constants/profile-options.ts` exists and exports all dropdown enums.
- [ ] Both onboarding and Settings forms import from it (no inline duplicate arrays).
- [ ] Convex schema enforces these enum values.
- [ ] Selecting "Just me (solo)" in onboarding shows "Just me (solo)" in Settings after page reload.
- [ ] Selecting "5-9M" Annual Revenue in onboarding shows "5-9M" in Settings.
- [ ] No console errors when saving either form.
- [ ] Existing mismatched records have been normalized (or a migration script is provided).

## Verification

1. Sign up a fresh test account.
2. In onboarding, pick: Sales Team Size = "Just me (solo)", Annual Revenue = "5-9M".
3. Complete onboarding.
4. Open Settings → Company Profile.
5. Confirm both fields show the exact values selected.
6. Change one of them in Settings, save, reload, confirm the new value persists.

---

# PHASE 3 — Invites, Team Management & Approvals

**Scope:** 🟡 MIXED (invite email + three-dots are bugs; domain auto-approval is new scope; admin notifications are new scope)
**Source:** Sections 3, 11, 12, 13 of client doc
**Effort:** Medium
**Dependencies:** None

## Context

Three related issues all touch the invite and team management flow:

1. **Section 3 / Section 11:** Invited users are recorded in the system as "invited" or "pending" but no email is ever sent.
2. **Section 11:** New requirement — invited users whose email domain matches the account owner's domain should be **auto-approved**. Different-domain users still go through manual approval. Email must be sent either way.
3. **Section 13:** Three-dots menu on the Team page shows "Change Role" and "Deactivate User" but neither mutation actually fires.
4. **Section 12:** Admin should receive real-time email notifications for pending approvals and other key admin events.

## Goal

Make the invite flow end-to-end functional, with deterministic email delivery, working role/deactivation mutations, working domain-based auto-approval, and real-time admin email notifications.

## Affected areas

- Settings → Team page
- Convex `invites` and `users` modules
- Resend email transport
- Clerk invitations (if used)
- Admin notification system

## Files likely to touch

- `/convex/invites.ts`
- `/convex/users.ts`
- `/convex/notifications.ts` ← **CREATE if missing**
- `/lib/email/transport.ts`
- `/lib/email/templates/invite.tsx` ← **CREATE if missing**
- `/lib/email/templates/admin-approval-pending.tsx` ← **CREATE if missing**
- `/components/settings/team/team-table.tsx`
- `/components/settings/team/invite-dialog.tsx`
- `/components/settings/team/row-actions.tsx`

## Implementation steps

### 3A. Fix invite email delivery (Section 3 / 11)

1. **Locate the invite mutation** (e.g., `convex/invites.ts → createInvite`).
2. Confirm it persists an invite record with status `"pending"` and an `inviteToken` (Clerk's invite token or a self-generated one).
3. **Confirm Resend is wired**:
   - Check `RESEND_API_KEY` env var is set (do not log it).
   - Confirm `from` address is a verified domain in Resend.
4. **Add the email send call** as a Convex action (not a mutation — Convex mutations cannot do network I/O):
   - Create `convex/invites.ts → sendInviteEmail` as an `action`.
   - The mutation that creates the invite must `ctx.scheduler.runAfter(0, internal.invites.sendInviteEmail, { inviteId })`.
5. **Build the email template** at `/lib/email/templates/invite.tsx`:
   - Subject: `You've been invited to CyberHook AI`
   - Body: company name, inviter name, "Accept invite" button linking to `${SITE_URL}/accept-invite?token={token}`.
6. **Handle failures**: if Resend returns a non-2xx, log the structured error to Convex and set the invite status to `"failed_to_send"` so admins can retry. Show a "Resend invite" action on the row.

### 3B. Domain-based auto-approval (Section 11)

1. **Define the rule**: on invite acceptance, compare the invitee's email domain to the inviter's email domain (lowercased, trimmed). If equal → set `approvalStatus = "auto_approved"` and skip the manual review queue.
2. **Add a helper** in `/lib/email-domain.ts`:
   ```ts
   export function emailDomain(email: string): string {
     return email.trim().toLowerCase().split("@")[1] ?? "";
   }
   export function isSameDomain(a: string, b: string): boolean {
     return emailDomain(a) === emailDomain(b) && emailDomain(a) !== "";
   }
   ```
3. **Apply the rule** in the invite-acceptance mutation:
   - If `isSameDomain(inviter.email, invitee.email)` → user goes straight to active, no admin approval, no extra email to admin.
   - If different domain → user enters `pendingApproval` queue, admin receives notification (see 3D), user sees "Account Under Review" until approved.
4. **Email is sent in both cases.** The auto-approved email reads "You're in!" and the manual-review email reads "Your access is being reviewed."
5. **Edge cases**:
   - Inviter and invitee email casing mismatch → normalize to lowercase before comparing.
   - Subdomains: treat `mail.xyzmsp.com` and `xyzmsp.com` as different. (Confirm with Cyriac if loose matching is desired — default to strict.)
   - Personal email providers (gmail, outlook, yahoo) should NEVER auto-approve regardless of match. Maintain a denylist:
     ```ts
     const PERSONAL_DOMAINS = new Set([
       "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
       "icloud.com", "aol.com", "proton.me", "protonmail.com",
     ]);
     ```
     If the inviter's domain is in `PERSONAL_DOMAINS`, force manual review regardless.

### 3C. Three-dots actions (Section 13)

1. **Open the Team page row component** (`team-table.tsx` or `row-actions.tsx`).
2. The three-dots dropdown is likely a `DropdownMenu` from shadcn/ui. Items: "Change Role", "Deactivate User", "Resend Invite" (after Phase 3A).
3. **Wire each item to a mutation**:
   - `Change Role` → opens a sub-menu or modal with a role picker (Sales Rep, Sales Admin, Billing User). On select, calls `convex.users.updateRole({ userId, role })`.
   - `Deactivate User` → calls `convex.users.deactivate({ userId })`. Use a confirmation dialog (shadcn `AlertDialog`).
   - On success: optimistically update the row, then refetch the team query.
4. **Convex mutations** must check the caller's role (`Sales Admin` only) and refuse with a typed error if not authorized.
5. **Deactivation behavior**: user is soft-deleted (`deactivatedAt: Date.now()`). They cannot sign in. Their data remains. There must also be a "Reactivate" action when the user is currently deactivated.
6. **UI states**: deactivated rows render with reduced opacity and a "Deactivated" badge.

### 3D. Admin email notifications (Section 12)

1. **Define notification events** in `/convex/notifications.ts`:
   - `user_pending_approval`
   - `invite_sent`
   - `invite_accepted`
   - `user_deactivated`
   - `user_role_changed`
2. **Send email on `user_pending_approval`**:
   - To: all `Sales Admin` users of the company.
   - Subject: `A user is awaiting approval`.
   - Body: invitee email, inviter name, "Review" button linking to `/settings/team/pending`.
3. **Other events**: log to a notifications table; do not necessarily email for all of them. Confirm with Cyriac which events should trigger emails versus in-app notifications only. For the initial scope, **only `user_pending_approval` triggers email**.
4. **Throttle**: if an admin would receive >1 email per minute, batch into a single digest.
5. **User notification preferences**: respect any existing `emailNotificationsEnabled` flag on the user record. Add the flag if missing.

## Acceptance criteria

- [ ] Inviting a user sends a real email through Resend, arriving within 30 seconds.
- [ ] Failed-send invites show a "Resend" button on the team row.
- [ ] Invitee from same domain as inviter is auto-approved and lands on the News page on first login (no "Under Review" screen).
- [ ] Invitee from a different domain sees the "Account Under Review" screen.
- [ ] Inviter from a personal email domain (e.g., gmail.com) always forces manual review regardless of match.
- [ ] Three-dots → Change Role updates the user's role in Convex and reflects in the UI without a page reload.
- [ ] Three-dots → Deactivate User soft-deletes the user, hides them from active lists, and blocks sign-in.
- [ ] Three-dots → Reactivate restores the user.
- [ ] Mutations refuse if the caller is not a Sales Admin (return a typed error, no crash).
- [ ] On a pending approval, every Sales Admin of the company receives an email within 30 seconds.

## Verification

1. From admin account A (`admin@msp-a.com`), invite `bob@msp-a.com`. Bob receives an email, clicks accept, and lands on the News page immediately.
2. From admin account A, invite `eve@somewhere-else.com`. Eve receives an email and lands on the "Account Under Review" screen. Admin A receives an email notifying them of the pending approval.
3. From admin account A, click three-dots on user `charlie@msp-a.com` → Change Role → Billing User. Refresh. Charlie's role is "Billing User".
4. From admin account A, click three-dots on `charlie@msp-a.com` → Deactivate. Confirm. Charlie can no longer sign in.
5. From a non-admin account, attempt the same actions — they should be hidden or rejected.

---

# PHASE 4 — Billing & Stripe

**Scope:** 🟡 MIXED (charge bug, redirect bug, settings cleanup, real-data wiring, and "Manage subscription" are bugs; multi-tier plan progression is new scope)
**Source:** Sections 4, 5, 6, 7 of client doc
**Effort:** Medium-High
**Dependencies:** Valid Stripe keys, price IDs configured

## Context

Multiple billing issues:
- **Section 4:** Signup is supposed to charge $99 but no charge is actually triggered through Stripe and card details don't appear in the billing section.
- **Section 5:** Upgrade to the $299 plan redirects to the $199 plan instead.
- **Section 6:** The Settings page has a leftover Stripe "integration" toggle that doesn't do anything — needs to be removed.
- **Section 7:** Billing should live under Settings (as a tab named "Billing", placed after "Plan"). The current "Plan & Billing" label should be renamed to just "Plan". Upgrade progression should be $99 → $299 → $499. Invoices and payment methods are showing mock data and need to be real. The "Manage subscription" button does nothing. The report counter is broken.

## Goal

End-to-end working Stripe flow: signup charges the selected plan, upgrades route to the correct plan, settings cleanly displays real billing data, and admins can manage their subscription via Stripe's customer portal.

## Affected areas

- Signup → plan selection → Stripe Checkout flow
- Settings → Plan / Billing tabs
- Stripe webhook handler
- Convex subscriptions table
- Plan progression logic

## Files likely to touch

- `/app/api/stripe/webhook/route.ts`
- `/app/api/stripe/checkout/route.ts`
- `/app/api/stripe/portal/route.ts`
- `/lib/stripe/client.ts`
- `/lib/stripe/plans.ts` ← **CREATE or reorganize**
- `/components/onboarding/plan-selection.tsx`
- `/components/settings/plan/plan-card.tsx`
- `/components/settings/billing/invoices-list.tsx`
- `/components/settings/billing/payment-methods.tsx`
- `/components/settings/settings-nav.tsx` (tab order)
- `/convex/subscriptions.ts`
- `/convex/schema.ts` (subscriptions table fields)

## Implementation steps

### 4A. Central plan config

1. **Create or refactor `/lib/stripe/plans.ts`**:
   ```ts
   export const PLANS = [
     {
       id: "starter",
       name: "Starter",
       priceMonthlyUsd: 99,
       stripePriceId: process.env.STRIPE_PRICE_STARTER!,
       upgradePath: "growth", // next tier
     },
     {
       id: "growth",
       name: "Growth",
       priceMonthlyUsd: 299,
       stripePriceId: process.env.STRIPE_PRICE_GROWTH!,
       upgradePath: "scale",
     },
     {
       id: "scale",
       name: "Scale",
       priceMonthlyUsd: 499,
       stripePriceId: process.env.STRIPE_PRICE_SCALE!,
       upgradePath: null, // top tier
     },
   ] as const;

   export type PlanId = typeof PLANS[number]["id"];

   export function getPlan(id: PlanId) {
     const p = PLANS.find(p => p.id === id);
     if (!p) throw new Error(`Unknown plan: ${id}`);
     return p;
   }

   export function getNextPlan(id: PlanId) {
     const next = getPlan(id).upgradePath;
     return next ? getPlan(next) : null;
   }
   ```

2. **Confirm Stripe Price IDs** for $99 / $299 / $499 plans exist in the Stripe dashboard. Get them from Cyriac if not present. Store in environment as:
   - `STRIPE_PRICE_STARTER` ($99)
   - `STRIPE_PRICE_GROWTH` ($299)
   - `STRIPE_PRICE_SCALE` ($499)
3. **If the existing code references a $199 plan** that does not correspond to any of $99/$299/$499 — delete it. The $199 was a stale wiring that was causing the wrong redirect.

### 4B. Fix signup → $99 charge (Section 4)

1. **Trace the current signup flow**: where does the user land after completing the company questionnaire? It should hit a "Choose your plan" or "Confirm payment" screen, which calls a server action that creates a Stripe Checkout Session.
2. **Confirm the Checkout Session is actually being created**:
   - The endpoint must call `stripe.checkout.sessions.create()` with:
     ```ts
     mode: "subscription",
     line_items: [{ price: getPlan("starter").stripePriceId, quantity: 1 }],
     subscription_data: {
       trial_period_days: 5, // per PRD
       metadata: { companyId, userId },
     },
     customer_email: user.email,
     success_url: `${SITE_URL}/onboarding/account-under-review`,
     cancel_url: `${SITE_URL}/onboarding/plan?canceled=1`,
     ```
3. **Confirm the user is redirected to `session.url`**. If the code currently returns the session ID and tries to redirect client-side, switch to a 303 redirect.
4. **Confirm the webhook handler** at `/app/api/stripe/webhook/route.ts` is processing these events:
   - `checkout.session.completed` → mark the Convex `subscriptions` record as active.
   - `customer.subscription.updated` → update plan, status, current_period_end.
   - `customer.subscription.deleted` → mark as canceled.
   - `invoice.paid` / `invoice.payment_failed` → update payment status.
5. **Confirm the webhook signature is verified** with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.
6. **Confirm the webhook endpoint is registered in Stripe** for the deployed URL. If not, register it.

### 4C. Fix $299 redirect bug (Section 5)

1. **Find the upgrade button handler**. It almost certainly calls a route or server action that takes a target plan name and creates a Checkout session.
2. **Bug is likely**: the handler hardcodes the wrong price ID, or there's an off-by-one in the plan array.
3. **Fix**: change the handler to read from `getPlan(targetPlanId).stripePriceId` directly. Never compute the next plan as `currentIndex + 2` or similar.
4. **Test all upgrade paths**:
   - Starter → Growth ($99 → $299) lands on Growth checkout.
   - Growth → Scale ($299 → $499) lands on Scale checkout.

### 4D. Remove Stripe from Settings (Section 6)

1. **Find Settings → Integrations** (or wherever the dangling Stripe toggle lives).
2. **Delete the Stripe row/card from the integrations list.**
3. Do **NOT** remove any Stripe code from `/lib/stripe/`, `/app/api/stripe/`, or anywhere else that handles payments. This is UI cleanup only.

### 4E. Move Billing into Settings (Section 7)

1. **Settings navigation** currently has tabs like `Profile`, `Team`, `Plan & Billing`, `Integrations`, etc.
2. **Rename** `Plan & Billing` to just `Plan`.
3. **Add a new tab** `Billing` immediately after `Plan`.
4. **The Plan tab** shows: current plan card, upgrade buttons, plan progression visual.
5. **The Billing tab** shows: invoices list, payment methods, "Manage subscription" button.
6. **The standalone `/app/billing/page.tsx`** (if it exists at root) should redirect to `/settings/billing`.

### 4F. Real invoices + payment methods (Section 7)

1. **Invoices**: create a Convex query `subscriptions.listInvoices({ companyId })` that:
   - Reads the Stripe `customerId` from the Convex subscription record.
   - Calls `stripe.invoices.list({ customer, limit: 24 })` (server-side, in a Convex action).
   - Returns: `{ id, number, amount, status, hostedInvoiceUrl, pdfUrl, createdAt }[]`.
2. **Render** invoices in a table: Date, Number, Amount, Status, Actions (View / Download PDF).
3. **Payment methods**: create `subscriptions.listPaymentMethods({ companyId })`:
   - Calls `stripe.customers.listPaymentMethods({ customer, type: "card" })`.
   - Returns: `{ id, brand, last4, expMonth, expYear, isDefault }[]`.
4. **Render** payment methods as a list with brand icon, last 4, expiry, and a "Default" badge.
5. **Add card / remove card / set default** actions go through the Stripe customer portal (see 4G), not custom UI.

### 4G. "Manage subscription" button (Section 7)

1. **Create `/app/api/stripe/portal/route.ts`** that:
   - Authenticates the caller (must be Sales Admin of the company).
   - Looks up the company's Stripe `customerId`.
   - Calls `stripe.billingPortal.sessions.create({ customer, return_url: `${SITE_URL}/settings/billing` })`.
   - Returns `{ url }`.
2. **The button** calls this endpoint, then `window.location.href = url` to redirect to the Stripe-hosted portal.
3. After the user returns, the webhook will have updated their subscription state — the UI just refetches.

### 4H. Fix report counter (Section 7)

1. **Locate the report counter** on the Billing page (likely showing "Reports generated this month" or similar).
2. **Determine what it should count**: PDFs/CSVs generated via Live Search and Snapshot Scan? Confirm with Cyriac.
3. **Wire it to a Convex query** that aggregates the count from a `reports` or `searches` table, filtered to the current billing period.
4. **If the underlying data is not yet tracked**, add the tracking event (a mutation that increments a counter when a report is generated) and surface the count.

## Acceptance criteria

- [ ] New signup completing the questionnaire is redirected to Stripe Checkout for the $99 starter plan.
- [ ] After successful checkout, the user lands on `/onboarding/account-under-review`.
- [ ] The Stripe dashboard shows the customer, subscription, and (after trial) the $99 charge.
- [ ] Card details appear in Settings → Billing → Payment Methods.
- [ ] Clicking "Upgrade to Growth" from the Starter plan opens a Checkout session for $299 (not $199).
- [ ] Clicking "Upgrade to Scale" from Growth opens a Checkout session for $499.
- [ ] Settings → Integrations no longer shows any Stripe row.
- [ ] Settings nav reads: `Profile`, `Team`, `Plan`, `Billing`, `Integrations`, etc.
- [ ] The Billing tab shows real Stripe invoices (date, amount, status, PDF link).
- [ ] The Billing tab shows real payment methods.
- [ ] "Manage subscription" opens the Stripe Customer Portal.
- [ ] Report counter shows a non-zero, accurate number after generating a Live Search PDF.
- [ ] Stripe webhook receives `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed` events and updates Convex accordingly.

## Verification

1. Use a fresh Stripe test card (`4242 4242 4242 4242`, any future date, any CVC).
2. Sign up a new test account → complete questionnaire → confirm redirect to Stripe Checkout for $99.
3. Complete checkout → verify "Account Under Review" page.
4. Approve the account via admin → confirm dashboard loads.
5. Open Settings → Billing → confirm invoice listed, payment method listed.
6. Click "Manage subscription" → confirm Stripe portal opens.
7. Click "Upgrade" on Starter → confirm redirect to $299 Growth checkout (not $199).
8. After upgrade, click "Upgrade" again on Growth → confirm $499 Scale checkout.

---

# PHASE 5 — Live Search & Leads Filters

**Scope:** 🟢 BUG FIX (Region/Industry/Size filters); 🟠 NEW SCOPE (State + City filters as more granular options)
**Source:** Section 16 of client doc
**Effort:** Medium
**Dependencies:** Redrok adapter (already in place)

## Context

The filters on the Live Search and Live Leads pages are broken:
- **Region filter** returns no results.
- **Industry filter** returns no results.
- **Company size filter** returns no results.
- The client also wants the filters to drill down by **State** and **City** (currently the UI only supports a single "Region" dropdown).

The root cause is almost certainly that the filter values from the UI are not being passed through to the Redrok API call correctly — either the parameter names don't match the API contract, or the adapter is stripping them.

## Goal

All filters (State, City, Industry, Company size) return accurate live results from the Redrok API. No silent failures — empty results must mean "no matches", not "filter not wired."

## Affected areas

- Live Search page filter panel
- Live Leads page filter panel
- Redrok adapter
- Convex queries that proxy to Redrok

## Files likely to touch

- `/components/live-search/filter-panel.tsx`
- `/components/live-leads/filter-panel.tsx`
- `/lib/adapters/redrok.ts`
- `/convex/search.ts` (or similar)
- `/convex/leads.ts`

## Implementation steps

1. **Locate the Redrok adapter** and review the current filter parameter mapping. Confirm exactly which keys Redrok expects (consult `CYBERHOOK_REDROK_API_GUIDE.md` if present). Hypothetical example:
   - UI sends `region: "United States"`, but Redrok expects `country: "US"`.
   - UI sends `industry: "Higher Education"`, but Redrok expects `industries: ["education"]`.
2. **Fix the adapter mappings**, not the UI. The UI continues to send the human-readable values; the adapter normalizes them into Redrok's contract.
3. **Add State and City filters** to the UI:
   - State dropdown is conditional on the selected Country (currently fixed to United States).
   - City is a free-text input with debounced autocomplete (or a dropdown if Redrok exposes a city list).
   - Both filters pass through to the adapter.
4. **Map State / City to Redrok parameters**:
   - Confirm with the Redrok docs whether they accept `state`, `region_code`, `city`, or another shape.
   - If Redrok does not support city filtering server-side, filter client-side after fetching, but flag this in the status report (it has scaling implications).
5. **Validate that "no results" is distinguishable from "broken"**:
   - If the API returns 0 results, show: `No leads match these filters. Try widening your search.`
   - If the API errors, show: `We couldn't load results. Try again or contact support.`
6. **Test with combinations** that previously returned empty:
   - Region: United States + Industry: Internet → confirm non-empty result.
   - Region: United States + Industry: Higher Education + Size: 1001-5000 → confirm Oregon State University, etc., show up (per the screenshot Cyriac shared).
7. **Pagination must respect filters**: when filters are applied, page 2 / 3 must also reflect them.

## Acceptance criteria

- [ ] Filter panel shows: Time period, Country, State, City, Region (legacy/optional — confirm with Cyriac), Industry, Company size.
- [ ] All filter selections produce a network request to the Redrok proxy with the correct parameter shape.
- [ ] Selecting Industry alone returns matching results (not an empty table).
- [ ] Selecting Company size alone returns matching results.
- [ ] Combining Industry + Size + State returns the narrowed set.
- [ ] Empty result set renders the "No leads match" empty state, not the broken/loading state.
- [ ] Errors render an error state with a retry button.
- [ ] Pagination preserves all active filters across page changes.

## Verification

1. Open Live Leads.
2. Select Country = United States, Industry = Internet → expect results.
3. Add Size = 51-200 → expect a narrower result set.
4. Add State = New York → expect only NY companies.
5. Switch Industry to Higher Education, clear Size → expect Oregon State University (and similar) to appear.
6. Click page 2 → filters remain applied; results are different from page 1.

---

# PHASE 6 — Ransomware Hub & Breach Notification

**Scope:** 🟡 MIXED (filter cleanup is a small UI change; empty-state rewording is trivial; new Breach Notification page integration is 🟠 NEW SCOPE)
**Source:** Section 17 of client doc
**Effort:** Low-Medium
**Dependencies:** None for filter/copy changes; portal data sources for Breach Notification

## Context

The client wants:
- The **state selection** removed from the Breach Notification page.
- The **Region filter** removed from the Ransomware Hub page.
- Both pages keep only: **Time Period** and **Threat Group**.
- The Breach Notification empty-state message rewritten from the current technical/internal copy to a clean user-facing message.

## Goal

Simplify the filter UI on both pages and replace the empty-state message with the new copy.

## Affected areas

- Ransomware Hub page
- Breach Notification page
- Filter components

## Files likely to touch

- `/app/(dashboard)/ransom-hub/page.tsx`
- `/components/ransom-hub/filters.tsx`
- `/app/(dashboard)/breach-notifications/page.tsx` (or similar)
- `/components/breach-notifications/filters.tsx`
- `/components/breach-notifications/empty-state.tsx`

## Implementation steps

### 6A. Ransomware Hub — remove Region filter

1. Open the Ransom Hub filter component.
2. Delete the Region dropdown and any related state, URL params, and query parameters.
3. Confirm the only remaining filters are: **Time Period**, **Threat Group**.
4. Confirm the filter still narrows results correctly after the change.

### 6B. Breach Notification — remove State selection

1. Open the Breach Notification filter component.
2. Remove the State dropdown.
3. Keep only: **Time Period**, **Threat Group**.

### 6C. Breach Notification — replace empty-state message

1. Locate the current empty-state text.
2. Replace it with exactly this copy:

   > **Select a breach portal to view the latest reported incidents and breach disclosures. Data will populate automatically based on your selected source.**

3. Remove any references to: HHS OCR Wall of Shame, California AG, Privacy Rights Clearinghouse, CSV upload, or "reach out to support". Those operational details are out per the client's direction.
4. The empty state should be visually clean: title, the message above, and a portal-selector control (dropdown or button group) that lets the user pick a source.

### 6D. Breach portal selector — 🟠 NEW SCOPE

> This sub-phase is new scope. Do not execute without owner confirmation.

1. Define the list of portals to surface. Defer to Cyriac for the canonical list — pending client clarification (Liron is to confirm which portals are in scope).
2. When the user selects a portal, the page fetches and renders the latest incidents from that source.
3. If no automated data feed is available for a portal yet, render an interim state: "This source is not yet connected. Watch this space."

## Acceptance criteria

- [ ] Ransom Hub filter bar shows only Time Period and Threat Group.
- [ ] Breach Notification filter bar shows only Time Period and Threat Group (no State selector).
- [ ] Breach Notification empty state shows the exact new copy from step 6C.
- [ ] No references to HHS OCR, California AG, Privacy Rights Clearinghouse, or CSV import remain in the user-facing copy.

## Verification

1. Open Ransom Hub → confirm no Region filter, results still load with Time Period filter applied.
2. Open Breach Notification (empty) → confirm new copy and absence of State filter.
3. Apply each remaining filter and confirm the page responds.

---

# PHASE 7 — Integrations (HubSpot, Outlook)

**Scope:** 🟢 BUG FIX
**Source:** Section 15 of client doc
**Effort:** Medium
**Dependencies:** Valid HubSpot and Outlook (Microsoft Graph) OAuth credentials

## Context

- HubSpot integration: not authenticating / syncing correctly.
- Outlook integration: not authenticating / syncing correctly.
- Integration logos throughout the platform are broken or missing.

## Goal

A user can connect HubSpot and Outlook through OAuth, see a "Connected" status, and trigger a sync that actually moves data. All integration tiles display correct logos.

## Affected areas

- Settings → Integrations page
- OAuth callback routes
- Convex `integrations` module
- HubSpot API client
- Microsoft Graph API client

## Files likely to touch

- `/app/api/integrations/hubspot/callback/route.ts`
- `/app/api/integrations/outlook/callback/route.ts`
- `/app/api/integrations/hubspot/connect/route.ts`
- `/app/api/integrations/outlook/connect/route.ts`
- `/convex/integrations.ts`
- `/lib/integrations/hubspot/client.ts`
- `/lib/integrations/outlook/client.ts`
- `/components/settings/integrations/integration-tile.tsx`
- `/public/integrations/*.svg` (or `.png`) — logo assets

## Implementation steps

### 7A. HubSpot OAuth

1. Confirm `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI` env vars are set and registered in the HubSpot app dashboard.
2. The "Connect HubSpot" button should `window.location.href = "/api/integrations/hubspot/connect"`.
3. `/connect` route builds the authorize URL with the required scopes:
   - `crm.objects.contacts.read`, `crm.objects.contacts.write`
   - `crm.objects.companies.read`, `crm.objects.companies.write`
   - `oauth`
4. After consent, HubSpot redirects to `/callback?code=...&state=...`.
5. `/callback` exchanges the code for an access + refresh token via `POST https://api.hubapi.com/oauth/v1/token`.
6. Persist tokens encrypted in Convex `integrations` table, scoped to the company.
7. Set a periodic refresh: use Convex scheduled function to refresh access tokens 5 minutes before expiry.

### 7B. Outlook OAuth

1. Confirm `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID` (use `common` for multi-tenant), `MS_REDIRECT_URI` env vars.
2. Authorize endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`.
3. Scopes: `offline_access`, `Mail.Send`, `Mail.ReadWrite`, `User.Read`.
4. Token exchange at `https://login.microsoftonline.com/common/oauth2/v2.0/token`.
5. Persist tokens encrypted.

### 7C. Sync logic

1. **HubSpot push**: when a lead is pushed via "Push to CRM", create or update a contact + associated company in HubSpot using the persisted access token. Map fields:
   - Company name, domain, industry → HubSpot company
   - Contact name, email, role → HubSpot contact, associated with the company
2. **Outlook send**: when AI Agents triggers an email, send via Microsoft Graph `POST /me/sendMail` using the persisted access token.
3. **Error handling**:
   - 401 → attempt refresh, retry once. If still 401, mark integration as `needs_reauth` and surface a banner.
   - 429 → backoff and retry with jitter.
   - Other 4xx → log structured error and surface user-friendly message.

### 7D. Integration logos

1. Audit `/public/integrations/` (or wherever logos live) — confirm presence of:
   - `hubspot.svg`
   - `outlook.svg` (or `microsoft.svg`)
   - `connectwise.svg`
   - `slack.svg`
   - `teams.svg`
   - `gmail.svg`
   - `google-calendar.svg`
   - `linkedin.svg`
2. Replace any 404'd or stretched logos with clean brand-approved SVGs (use official brand portals).
3. Standardize size: 32x32 or 40x40 in their tile container.
4. Ensure `next/image` is given explicit `width` and `height` to avoid layout shift.

## Acceptance criteria

- [ ] Clicking "Connect HubSpot" walks through OAuth and ends on the Integrations page with status "Connected".
- [ ] Clicking "Connect Outlook" walks through OAuth and ends with status "Connected".
- [ ] Disconnecting revokes the token and clears the Convex record.
- [ ] Pushing a lead to HubSpot creates a real company + contact in the HubSpot account.
- [ ] Sending an email via AI Agents (Phase 8) actually arrives in the recipient's inbox from the connected Outlook account.
- [ ] All integration tiles show correct, crisp logos at consistent size.
- [ ] Token refresh runs automatically before expiry — no manual re-auth required for at least 30 days.

## Verification

1. As an admin, click Connect HubSpot → complete OAuth → confirm "Connected" tile and last-synced timestamp.
2. Push a lead to HubSpot → check HubSpot UI → confirm new company + contact appear.
3. Connect Outlook → send a test email from AI Agents → confirm email arrives.
4. Visit Settings → Integrations and verify every tile renders its logo without broken-image icons.

---

# PHASE 8 — AI Agents & Campaigns

**Scope:** 🟢 BUG FIX
**Source:** Section 14 of client doc
**Effort:** Medium
**Dependencies:** Phase 7 (Outlook auth must work for email sending)

## Context

- Three-dots actions in AI Agents are not working properly.
- Emails are not actually sending.

## Goal

Three-dots menu on every AI Agent / Campaign row performs its action correctly, and outbound emails actually go out through the configured Outlook account.

## Affected areas

- AI Agents page (campaign list + row actions)
- Campaign execution engine
- Email sending pipeline

## Files likely to touch

- `/components/ai-agents/campaign-row.tsx`
- `/components/ai-agents/row-actions.tsx`
- `/convex/campaigns.ts`
- `/convex/campaignSteps.ts`
- `/lib/integrations/outlook/send.ts`
- `/convex/scheduler.ts` or similar

## Implementation steps

### 8A. Three-dots actions

1. **Audit the menu items.** Typical items: Edit, Duplicate, Pause / Resume, Delete, View Logs.
2. For each item, confirm:
   - The handler is wired (`onSelect={() => fn(campaign.id)}`).
   - The Convex mutation it calls exists and is authorized correctly.
   - The mutation updates state and the UI refetches.
3. **Delete** should show a confirmation dialog (`AlertDialog`).
4. **Pause** sets campaign status to `paused`; the scheduler must skip paused campaigns.
5. **Resume** sets it to `active`; the scheduler picks it up at the next tick.
6. **View Logs** opens a side panel showing recent send attempts with status (sent, failed, skipped).

### 8B. Email sending

1. **Locate the send function** (probably `convex/campaignSteps.ts → executeStep` or similar).
2. **Confirm the path**:
   - Scheduler triggers `executeStep` at the right time.
   - `executeStep` reads the recipient, template, personalization data.
   - It calls `/lib/integrations/outlook/send.ts → sendEmail`.
   - `sendEmail` reads the company's Outlook access token from Convex and calls Microsoft Graph `POST /me/sendMail`.
3. **Common failure modes to check**:
   - Outlook token expired → refresh path not wired. Fix via Phase 7C.
   - `from` address mismatch → Microsoft Graph requires the authenticated user's address; do not override.
   - Required scopes missing → confirm `Mail.Send` is requested in OAuth.
   - HTML body malformed → ensure `body.contentType: "HTML"`, `body.content: "<html>..."`.
4. **Log every send attempt** to Convex `email_logs` table: `{ campaignId, stepId, recipientEmail, status, error, sentAt }`.
5. **Surface failures**: campaign row shows a warning badge if recent sends are failing.

### 8C. Scheduling

1. Confirm the campaign step scheduler is running. In Convex, use scheduled functions: `crons.daily("ai-agents-tick", internal.campaigns.tick)`.
2. The tick:
   - Lists active campaigns.
   - For each, finds steps that are due (`scheduledFor <= now`).
   - Executes them.
   - Marks as sent or failed.
3. Add a `dry_run` mode used in development.

## Acceptance criteria

- [ ] Every three-dots menu item performs its action without console errors.
- [ ] Pausing a campaign halts further sends within one scheduler tick.
- [ ] Resuming a paused campaign continues from where it left off.
- [ ] Deleting a campaign asks for confirmation and removes it (soft delete preferred).
- [ ] Triggering a campaign with one step and one recipient delivers an email to that recipient from the connected Outlook account within 60 seconds.
- [ ] `email_logs` table records every attempt with status.
- [ ] Failing sends do not crash the scheduler — they are logged and the campaign continues with other recipients.

## Verification

1. Create a test campaign with one step targeting your own email.
2. Activate it. Wait one scheduler tick.
3. Confirm the email arrives.
4. Open the campaign → confirm `email_logs` shows the successful send.
5. Try each three-dots action and confirm each behaves as expected.

---

# PHASE 9 — Events, Certifications & Admin Panel

**Scope:** 🟠 NEW SCOPE (most of this is feature expansion beyond the original PRD)
**Source:** Sections 8, 9, 10, 12 of client doc
**Effort:** Medium
**Dependencies:** None

> ⚠️ This phase is new scope. Do not execute without owner sign-off.

## Context

Three small-to-medium new features:
- **Section 8:** Admin needs to be able to add/edit/remove "Suggested Events" that appear for all users.
- **Section 9:** The "Add Certification" popup should include a file upload field for the certification document.
- **Section 10:** Admin should be able to increase or decrease an individual user's search quota.

## Goal

Each of the three sub-features works end-to-end with proper permissions and persistence.

## Affected areas

- Events page (admin CRUD UI)
- Certifications popup
- Admin panel / user detail page

## Files likely to touch

- `/app/(dashboard)/events/page.tsx`
- `/components/events/admin-event-form.tsx` ← **CREATE**
- `/convex/events.ts`
- `/components/certifications/add-certification-dialog.tsx`
- `/convex/certifications.ts`
- `/convex/files.ts` (Convex file storage)
- `/components/settings/team/user-detail.tsx`
- `/convex/users.ts` (quota fields + mutations)

## Implementation steps

### 9A. Suggested Events admin CRUD

1. **Add an "Add Event" button** visible only to Sales Admin role.
2. Open a form dialog with fields: name, date/time, end date/time, location, type (Conference / Webinar / Meetup / Other), description, link URL.
3. On submit, call `convex.events.create({ ... })` with `scope: "system"` (visible to all users in the company).
4. **Edit / Delete** actions on each event row, also admin-only.
5. The Events listing shows system events alongside user-created events, distinguished by a badge.

### 9B. Certification file upload

1. **In the "Add Certification" dialog**, add a file input field after the existing fields.
2. Accepted file types: PDF, PNG, JPG, JPEG, max 10 MB.
3. **On submit**:
   - Upload the file to Convex file storage via `useMutation(api.files.generateUploadUrl)` → `PUT` to the upload URL → receive `storageId`.
   - Call `convex.certifications.create({ ..., fileStorageId })`.
4. **In the Certifications list**, render each entry with a "View file" link that opens `await ctx.storage.getUrl(storageId)`.
5. **Delete** removes both the certification record and the stored file.

### 9C. Admin per-user search quota

1. **In the User Detail panel** (Settings → Team → click a user), add a "Search quota" section showing:
   - Allocation this month (editable by admin)
   - Used this month (read-only)
   - Remaining (computed)
2. **Allocation** is editable inline: a number input with "Save" button.
3. On save, call `convex.users.setSearchQuota({ userId, monthlyAllocation })`.
4. **The Live Search and Snapshot Scan token-deduction logic** must read this per-user quota first; if exceeded, block the search with: `You've hit your monthly search quota. Contact your admin to increase it.`
5. **Bulk adjust** (optional, confirm with Cyriac): support setting the same quota for multiple users at once.

### 9D. Inline note on admin email notifications

Section 12 (real-time admin email notifications) is covered structurally in Phase 3D. Confirm those notifications cover the events surfaced by 9A–9C if relevant (e.g., admin changing another admin's quota probably should NOT generate an email, but admin invites / approvals should — already covered).

## Acceptance criteria

- [ ] Sales Admin can create, edit, and delete system events that appear for all users in the company.
- [ ] Non-admins can see system events but cannot edit them.
- [ ] The Add Certification dialog accepts a file upload and stores the file.
- [ ] The certification entry displays a working "View file" link.
- [ ] Admin can set per-user search quota; the user's Live Search respects the new value immediately.
- [ ] A user who exceeds quota is blocked with a clear message.
- [ ] None of these admin-only mutations succeed when called by a Sales Rep or Billing User.

## Verification

1. As an admin, add an event "Test Conference 2026". Log in as a sales rep — confirm the event is visible.
2. As a sales rep, add a certification with a PDF attached. Confirm the file is downloadable from the entry.
3. As an admin, set a sales rep's quota to 5. As the sales rep, run 5 searches then attempt a 6th — confirm the block message appears.

---

# PHASE 10 — Guided Onboarding

**Scope:** 🟠 NEW SCOPE
**Source:** Section 2 (guided onboarding) of client doc
**Effort:** High
**Dependencies:** All other phases (this is best built last, against a stable UI)

> ⚠️ This phase is new scope and represents a substantial feature build. Do not execute without owner sign-off. The complexity here is high because the tour must cover **every major section** of the platform.

## Context

The client wants an interactive product tour similar to Protectron's onboarding — guided tooltips, step-by-step walkthroughs, progress tracking, the ability to skip and revisit.

## Goal

A first-time user is walked through the platform with a clear, skippable, resumable guided tour. Progress is persisted so a refresh doesn't reset the tour. The admin can also trigger the tour again from Help.

## Affected areas

- Every major page (the tour visits each)
- User profile (to persist tour state)
- A new tour-orchestration system

## Library recommendation

Use **`driver.js`** (lightweight, framework-agnostic, no React-specific peer deps) or **`react-joyride`** (more React-idiomatic, slightly heavier). Recommend **`driver.js`** for less coupling. Decide and document in the status report.

```bash
npm install driver.js
```

## Files likely to touch / create

- `/lib/onboarding/tour-config.ts` ← **CREATE** (defines steps per section)
- `/lib/onboarding/tour-controller.tsx` ← **CREATE** (wraps the library, exposes a context)
- `/components/onboarding/tour-overlay.tsx` ← **CREATE**
- `/components/onboarding/tour-trigger.tsx` ← **CREATE** (Help → Restart tour)
- `/convex/onboarding.ts` ← **CREATE** (persist progress)
- `/convex/schema.ts` (add `tourProgress` field to users)

## Implementation steps

### 10A. Define tour steps

1. List the major sections to cover:
   - News (home)
   - To-Do List
   - Ransom Hub
   - Live Search
   - Live-Leads
   - Watchlist
   - Snapshot Scan
   - AI Agents
   - Scripts & Cadences
   - Events & Conferences
   - Reporting
   - Settings
2. For each, define 2–4 tour steps. Example for Live Search:
   ```ts
   {
     section: "live-search",
     steps: [
       { target: "#live-search-input", title: "Run a search", description: "Enter a domain to surface exposure data." },
       { target: "#live-search-results", title: "Results", description: "Breaches, leaks, and credentials show here." },
       { target: "#live-search-actions", title: "Save as lead", description: "Convert any result into a tracked lead." },
     ],
   }
   ```
3. Use stable `id` or `data-tour` attributes on the targeted elements. Do not rely on class selectors.

### 10B. Tour controller

1. Wrap the app shell in a `<TourProvider>` that:
   - Loads the user's `tourProgress` from Convex on mount.
   - If `tourProgress.completed === false` and `tourProgress.lastStep === null`, auto-starts on the News page.
   - Exposes `start()`, `skip()`, `resume()`, `goToStep(id)` via context.
2. When the user navigates between sections, the tour follows along — pause when the route changes, resume on the new section's first step.
3. Persist progress on every step transition (debounced 1s).

### 10C. UI

1. **Onboarding checklist tile** on the News page: shows progress (e.g., 3/12 sections completed). Clicking resumes the tour.
2. **Skip button** in every tour step.
3. **"Restart Tour"** in the Help / user menu.
4. Smooth transitions: fade overlay, scroll target into view before highlighting.

### 10D. Persistence

1. Convex `users.tourProgress` field:
   ```ts
   tourProgress: v.optional(v.object({
     completed: v.boolean(),
     lastSection: v.optional(v.string()),
     lastStepIndex: v.optional(v.number()),
     skipped: v.boolean(),
     updatedAt: v.number(),
   })),
   ```
2. Mutation: `updateTourProgress({ section, stepIndex, completed?, skipped? })`.

### 10E. Responsive

1. Verify tour overlay positions correctly on mobile / tablet.
2. On viewports where the targeted element isn't visible (e.g., sidebar collapsed), open the sidebar first or skip the step.

## Acceptance criteria

- [ ] A brand-new user lands on News and is immediately offered the tour.
- [ ] Clicking "Start tour" walks through every defined section.
- [ ] Each step highlights its target element and shows the description.
- [ ] Skip dismisses the tour and persists `skipped: true`.
- [ ] Page refresh resumes the tour at the last completed step.
- [ ] User can restart the tour from the Help menu.
- [ ] Tour works on desktop, tablet, and mobile widths.
- [ ] News page shows progress (X/Y sections completed) until the tour is finished or skipped.

## Verification

1. Sign up a fresh test account.
2. Confirm the tour offers itself on first login.
3. Click through 3 sections, then refresh — confirm resume at section 3.
4. Skip — confirm the tour does not re-prompt on next login but is accessible from Help.
5. Restart from Help — confirm it starts over.
6. Resize the window to mobile width — confirm the overlay still works.

---

# 4. Status Report Template

After each phase, report back with this template. Do not skip fields. Empty fields are red flags.

```
## Phase {N}: {Title}

**Status:** complete | partial | blocked
**Files changed:** {count} ({list})
**New files created:** {list}
**New dependencies added:** {list with versions, or "none"}
**Env vars needed:** {list, or "none"}
**Convex schema changes:** {yes — describe | no}
**Migrations run:** {yes — describe | no}

### Acceptance criteria
- [x] item 1
- [x] item 2
- [ ] item 3 — blocked because {reason}

### Decisions made
- {Decision 1 and why}
- {Decision 2 and why}

### Open questions for Cyriac
- {Question 1}
- {Question 2}

### Risks / regressions to test
- {What could have broken elsewhere}
```

---

# 5. Regression Checklist (Run After Each Phase)

After each phase, manually verify these critical paths still work:

- [ ] New user can sign up, complete onboarding, see "Account Under Review".
- [ ] Approved user lands on News page on sign-in.
- [ ] Live Search runs against a known domain and returns results.
- [ ] Adding a company to Watchlist persists across reloads.
- [ ] Stripe webhook receives `customer.subscription.updated` and Convex updates accordingly.
- [ ] Settings → Profile → save → reload preserves values.
- [ ] No console errors on any top-level route.
- [ ] No 4xx/5xx in network tab on any top-level route under normal use.

---

# 6. Open Questions for Cyriac

These should be confirmed before or during execution. Surface them in the status report if not yet resolved:

1. **Trial duration:** PRD says 5 days, but client preference is 7. Which value should signup use?
2. **Breach portal list:** Which specific external breach portals should the Breach Notification page surface? (HHS OCR, California AG, and Privacy Rights Clearinghouse were removed from the empty-state copy — does the actual integration still target them, or a different set?)
3. **Subdomain matching for auto-approval:** Should `mail.xyzmsp.com` and `xyzmsp.com` be treated as the same domain for auto-approval, or strictly compared?
4. **Personal-domain denylist:** Confirm the list (`gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`, `icloud.com`, `aol.com`, `proton.me`, `protonmail.com`) — anything to add or remove?
5. **Report counter source of truth:** What exactly should the report counter on the Billing page count? PDF exports? CSV exports? Both? All searches?
6. **Brand assets:** Are final logo / favicon files for "CyberHook AI" available, or should we stub with placeholders?
7. **Guided onboarding library preference:** `driver.js` (recommended) or `react-joyride`?
8. **Search quota — bulk adjust:** Should admins be able to update quota for multiple users at once, or one at a time only?

---

# 7. Phase Execution Order — Quick Reference

If executing strictly in order, this is the recommended sequence:

1. **Phase 1** — Branding & Legal (quick wins; user-visible immediately)
2. **Phase 2** — Onboarding Data Consistency (unblocks clean signups)
3. **Phase 3A & 3C** — Invite emails + three-dots (bug fixes, no scope debate)
4. **Phase 4A–4G** — Billing / Stripe (critical revenue path)
5. **Phase 5** — Live Search filters (visible product quality)
6. **Phase 6A–6C** — Ransom Hub + Breach Notification filter cleanup and copy
7. **Phase 7** — Integration auth fixes
8. **Phase 8** — AI Agents email sending (depends on Phase 7 Outlook)
9. **(SCOPE GATE — confirm before proceeding)**
10. **Phase 3B & 3D** — Domain auto-approval + admin email notifications
11. **Phase 6D** — Breach portal selector new feature
12. **Phase 9** — Events / Certifications / Quota admin
13. **Phase 10** — Guided Onboarding

---

# 8. Done Definition

The May update is **done** when:

- All 🟢 BUG FIX phases are complete and verified.
- All 🟡 MIXED phases have their bug-fix portions complete.
- 🟠 NEW SCOPE phases are either complete (if scope was approved) or explicitly deferred to a follow-up phase (with a clear note in the status report).
- The full Regression Checklist passes.
- No console errors or 4xx/5xx network failures during a 10-minute happy-path walkthrough.
- Cyriac has signed off after a live demo.

---

_End of document._
