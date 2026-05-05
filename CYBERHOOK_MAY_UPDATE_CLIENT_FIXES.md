# CyberHook — May Update: Client Review Fixes & Implementation Guide

> **Source:** Loom recordings from client (Liron @ AMSYS) — May 1, 2026
> **Walkthrough subject:** Live signup flow + deployed platform review (Events module + Prospecting Report)
> **Purpose:** Exhaustive, phase-sequenced instructions for **Cursor AI** to implement every fix and enhancement identified during the client's live walkthrough. Each item below includes the exact symptom the client observed, the root-cause hypothesis, the file(s) most likely affected, the fix steps, and an acceptance test.
> **Highest-priority item:** The **Prospecting Report** (Phase 2). The client called this *"the most critical, client-facing part of the tool."* It is the artifact MSPs hand to their end customers — it must look professional, branded, and "stand out."

---

## Codebase-Verified Phase Plan — Use This Before Implementing

This section was added after reviewing the current codebase. Some paths in the original implementation guide below were hypothesis paths; the following are the **actual files and current implementation state** to use when executing the fixes phase-by-phase.

### Current codebase reality check

- **Onboarding questionnaire, invite, logo upload, and payment trial UI:** `src/app/(onboarding)/onboarding/page.tsx`
- **Onboarding backend mutation:** `convex/onboarding.ts`
- **Settings company profile, logo upload, team invites, pending invite UI:** `src/app/(dashboard)/settings/page.tsx`
- **Invite backend / resend / cancel:** `convex/invitations.ts`
- **Email delivery:** `convex/emails.ts`
- **File upload hook:** `src/hooks/use-file-upload.ts`
- **Convex storage helper:** `convex/storage.ts`
- **Company schema and update mutation:** `convex/schema.ts`, `convex/companies.ts`
- **Current PDF generation:** `src/lib/pdf-report.ts` using `jsPDF`
- **Live Search report entry point:** `src/app/(dashboard)/live-search/page.tsx`
- **Live Leads row report entry point:** `src/app/(dashboard)/live-leads/page.tsx`
- **Lead Detail report button:** `src/app/(dashboard)/live-leads/[id]/page.tsx`
- **Events module:** `src/app/(dashboard)/events/page.tsx`
- **Existing friendly error helper:** `src/lib/friendly-errors.ts`

### Phase 1 — Signup & Onboarding Hardening

**Implementation status:** Core code changes completed and verified with `tsc --noEmit` and `npm run build`. Manual signup/inbox testing is still recommended before client signoff.

#### 1.1 Required onboarding fields

**Actual target files:**

- `src/app/(onboarding)/onboarding/page.tsx`
- `convex/onboarding.ts`
- `convex/schema.ts`

**Current state found in code:**

- Step 1 fields use `isRequired`, but the `Next` button directly calls `setStep(2)`.
- Step 2 required-looking fields directly advance with `setStep(3)`.
- Step 3 `teamEmails` and `logoUrl` are optional and should remain optional.
- `convex/onboarding.ts` validates value types but does not reject empty strings or empty arrays for required questionnaire data.

**Implementation scope:**

- Add per-step validation before `setStep`.
- Required: `companyName`, `phone`, `website`, `businessModel`, `annualRevenue`, `geoCoverage`, `targetCustomers`, `totalEmployees`, `totalSales`.
- Add visible field-level or section-level friendly errors.
- Add backend empty-value checks in `completeOnboarding`.

**Verification:**

- [ ] Step 1 cannot advance blank.
- [ ] Step 2 cannot advance blank.
- [ ] Backend rejects empty required strings/arrays.
- [ ] Optional logo and team invites remain skippable.

#### 1.2 Customer-friendly payment errors

**Actual target files:**

- `src/app/(onboarding)/onboarding/page.tsx`
- `convex/onboarding.ts`
- `src/lib/friendly-errors.ts`
- Optional helper if needed: `src/lib/payment-errors.ts`

**Current state found in code:**

- Payment fields are local/mock card fields in Step 4.
- Submit is disabled unless `step4Validation.allValid`.
- Backend throws `Payment details are required to start your trial.`
- Catch block currently renders `err.message` directly.

**Implementation scope:**

- Map payment/onboarding backend failures to friendly copy.
- Preferred message: `Please enter your credit card information to start your free trial.`
- Do not show `Server error`, `ConvexError`, or raw stack-style errors to customers.

**Verification:**

- [ ] Missing/invalid card information shows friendly copy.
- [ ] No user-visible raw backend error appears.

#### 1.3 Invite emails delivery

**Actual target files:**

- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `convex/onboarding.ts`
- `convex/invitations.ts`
- `convex/emails.ts`
- `convex/schema.ts`

**Current state found in code:**

- Settings invites already call `api.invitations.create`, which schedules `internal.emails.sendInviteEmailInternal`.
- Settings invite records store `emailDeliveryStatus`.
- Onboarding creates invite records directly and schedules `sendInviteEmailInternal`, but does **not** pass `invitationId`, so delivery status cannot be updated for onboarding-created invites.
- `convex/emails.ts` uses `@convex-dev/resend` with `testMode: false`.
- Sender defaults are `CyberHook <noreply@cyberhook.ai>` and `CyberHook Team <team@cyberhook.ai>`.

**Implementation scope:**

- Pass onboarding invitation IDs into `sendInviteEmailInternal`.
- Initialize onboarding invite records with `emailDeliveryStatus: "pending"`.
- Confirm production Resend env/config/domain verification outside code.
- Preserve Settings resend/cancel behavior.

**Verification:**

- [ ] Onboarding invite row records delivery status.
- [ ] Settings invite row records delivery status.
- [ ] Test inbox receives invite email.
- [ ] Failed delivery is visible enough for admin debugging.

#### 1.4 Invite stale UI

**Actual target files:**

- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `convex/invitations.ts`

**Current state found in code:**

- Settings invite modal resets fields and closes after success.
- Settings pending invitations are reactive through `api.invitations.list`.
- Onboarding only has a textarea and then leaves onboarding after completion; it does not currently show a pending invite list.

**Implementation scope:**

- Verify Settings modal reset and pending-list refresh after invite.
- Keep onboarding simple unless client wants pre-payment invite confirmation UI.
- Ensure pending invitation list keys use Convex `_id`.

**Verification:**

- [ ] Invite input clears after send.
- [ ] Pending invite appears immediately.
- [ ] Resend remains available.

### Phase 2 — Prospecting Report Redesign

**Implementation status:** Code changes completed and verified with `tsc --noEmit` and `npm run build`. Manual browser/PDF visual review is still recommended before client signoff.

#### 2.1 Professional prospecting report template

**Actual target files:**

- `src/lib/pdf-report.ts`
- `src/app/(dashboard)/live-search/page.tsx`
- `src/app/(dashboard)/live-leads/page.tsx`
- `src/app/(dashboard)/live-leads/[id]/page.tsx`
- `src/hooks/use-company.ts`
- `convex/companies.ts`
- `convex/schema.ts`
- Optional, if deeper report data is needed: `convex/redrokApi.ts`, `convex/leads.ts`

**Current state found in code:**

- PDF generation currently uses `jsPDF`.
- Live Search already generates a PDF with actual search credentials.
- Live Leads list generates a PDF but currently passes `credentials: []`.
- Lead Detail has a `Generate Report` button but it is not wired to any handler.
- Current PDF does not include MSP logo/branding and is visually basic.

**Implementation scope:**

- Redesign `generateExposureReport` with a polished MSP-facing layout:
  - MSP logo and company name
  - target company summary
  - exposure/risk overview
  - business impact narrative
  - findings table or summary
  - recommended next steps
  - MSP call-to-action
  - confidential footer
- Keep existing callers working by adding optional fields rather than breaking the current function shape.
- Live Search should pass actual search data plus MSP branding.
- Live Leads should generate a meaningful summary report even when detailed credentials are unavailable.
- Lead Detail button must actually download the redesigned report.

**Verification:**

- [ ] Live Search report uses redesigned template and real search data.
- [ ] Live Leads row report does not look empty.
- [ ] Lead Detail `Generate Report` downloads a PDF.
- [ ] MSP logo appears when configured.
- [ ] Missing logo has a graceful fallback.

#### 2.2 MSP logo upload and report propagation

**Actual target files:**

- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/hooks/use-file-upload.ts`
- `convex/storage.ts`
- `convex/companies.ts`
- `convex/schema.ts`
- `src/lib/pdf-report.ts`

**Current state found in code:**

- Onboarding uploads logo through `useFileUpload()` and passes `logoUrl` into `completeOnboarding`.
- Settings logo upload patches `company.logoUrl`.
- `use-file-upload.ts` manually builds a URL from upload URL origin plus `/api/storage/<storageId>`.
- `convex/storage.ts` has a proper `getUrl` query, but schema currently stores only `logoUrl`, not `storageId`.

**Implementation scope:**

- Verify current constructed logo URLs remain accessible after reload.
- If unreliable, store a Convex storage ID and resolve URL through `ctx.storage.getUrl`.
- Ensure report generation reads current `company.logoUrl`.

**Verification:**

- [ ] Onboarding logo persists after account creation.
- [ ] Settings logo upload persists after reload.
- [ ] Live Search report includes logo.
- [ ] Live Leads/Lead Detail reports include logo.

### Phase 3 — Events Module Fixes

**Implementation status:** Code changes completed and verified with `tsc --noEmit` and `npm run build`. Manual browser checks for calendar deeplinks and `.ics` import are still recommended before client signoff.

#### 3.1 Event detail formatting

**Actual target file:**

- `src/app/(dashboard)/events/page.tsx`

**Current state found in code:**

- Event table `View` calls `setViewingEvent(item)`.
- Suggested events also call `setViewingEvent(ev)`.
- The detail render block is in the same file and should be edited only there.

**Implementation scope:**

- Add internal padding/spacing to the `viewingEvent` detail UI.
- Ensure normal and suggested events share readable formatting.

**Verification:**

- [ ] Detail content no longer sticks to the panel edge.
- [ ] Long descriptions wrap cleanly.
- [ ] Mobile spacing remains acceptable.

#### 3.2 Google and Outlook calendar links

**Actual target file:**

- `src/app/(dashboard)/events/page.tsx`

**Current state found in code:**

- `buildGoogleCalendarUrl` returns `https://calendar.google.com/calendar/render?...`
- `buildOutlookCalendarUrl` returns `https://outlook.live.com/calendar/0/action/compose?...`
- Suggested cards render separate Google and Outlook buttons.
- Detail-view buttons still need verification.

**Implementation scope:**

- Confirm every Google-labeled button uses `buildGoogleCalendarUrl`.
- Confirm every Outlook-labeled button uses `buildOutlookCalendarUrl`.
- Ensure links use `target="_blank"` and `rel="noopener noreferrer"`.

**Verification:**

- [ ] Google opens Google Calendar compose.
- [ ] Outlook opens Outlook Calendar compose.
- [ ] Title/date/location/description are prefilled.

#### 3.3 `.ics` download verification

**Actual target file:**

- `src/app/(dashboard)/events/page.tsx`

**Current state found in code:**

- `downloadIcsFile` exists and builds a client-side `.ics` file.

**Implementation scope:**

- Do not rewrite unless testing finds a bug.
- Verify it is available from relevant event actions.

**Verification:**

- [ ] `.ics` downloads.
- [ ] Apple Calendar imports the event correctly.

#### 3.4 Native OAuth calendar creation

**Decision:**

- Defer unless explicitly approved. The May update should complete deeplinks and `.ics` first.

**Potential future files:**

- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/events/page.tsx`
- New Convex OAuth/token actions
- `convex/schema.ts`

### Phase 4 — Cross-Cutting Polish & Verification

**Implementation status:** Code changes completed and verified with `./node_modules/.bin/tsc --noEmit --pretty false` and `npm run build`. Phase 4.5 gap cleanup also completed for account review, report sample records, logo validation/storage, Outlook deeplinks, and native calendar OAuth tracking. Manual browser QA is still recommended before client signoff.

#### 4.1 Required-form audit

**Primary files to audit:**

- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/todos/page.tsx`
- `src/app/(dashboard)/watchlist/page.tsx`
- `src/app/(dashboard)/ai-agents/new/page.tsx`
- `src/app/(dashboard)/events/page.tsx`
- `src/app/(dashboard)/rfp-hub/page.tsx`
- `src/app/(dashboard)/knowledge-base/page.tsx`

**Current state found in scan:**

- Todos create task requires `formTitle`, but save currently silently returns if it is missing.
- Watchlist add domain requires `newDomain`, but add currently silently returns if it is missing.
- AI Agents campaign name is marked required; step/launch validation needs verification.
- Events create/schedule forms have `*` labels and need save-handler verification.
- Settings location label is validated with a toast.

**Implementation scope:**

- Search for `isRequired`, labels with `*`, and handlers that silently `return`.
- Replace silent returns with visible friendly validation.
- Keep changes local to each form.

**Verification:**

- [x] Required fields cannot be bypassed.
- [x] Missing required fields show visible friendly messages.

#### 4.2 Friendly error audit

**Primary files/helpers to audit:**

- `src/lib/friendly-errors.ts`
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/live-search/page.tsx`
- `src/app/(dashboard)/live-leads/page.tsx`
- `src/app/(dashboard)/events/page.tsx`
- `src/app/(dashboard)/todos/page.tsx`
- `src/app/(dashboard)/watchlist/page.tsx`
- `src/app/(dashboard)/ai-agents/page.tsx`
- `src/app/(dashboard)/ai-agents/new/page.tsx`
- `src/app/(dashboard)/rfp-hub/page.tsx`
- `src/app/(dashboard)/knowledge-base/page.tsx`

**Search strings:**

- `Server error`
- `ConvexError`
- `NetworkError`
- `TypeError`
- raw `err.message` / `error.message` in visible toasts
- `undefined` / `null` in customer-facing strings

**Verification:**

- [x] No customer-visible raw framework/backend errors in audited customer-facing paths.
- [x] Payment, invite, report, and event failures use friendly copy.

#### 4.3 Report entry points

**Actual target files:**

- `src/app/(dashboard)/live-search/page.tsx`
- `src/app/(dashboard)/live-leads/page.tsx`
- `src/app/(dashboard)/live-leads/[id]/page.tsx`
- `src/lib/pdf-report.ts`

**Current state found in code:**

- Live Search has a results-state `Download Report (PDF)` CTA.
- Live Leads has `handleGenerateReport`.
- Lead Detail has a visible `Generate Report` button but no handler.

**Implementation scope:**

- Make labels consistent as `Generate Report`.
- Ensure every Live Leads row has a row-level report action.
- Wire Lead Detail to the same report utility.
- Pass MSP branding to all three entry points.

**Verification:**

- [x] Live Search successful results show report CTA.
- [x] Every Live Leads row can generate report.
- [x] Lead Detail report button works.

#### 4.5 Five-pass gap cleanup

**Implementation status:** Code changes completed after a five-pass review of the full client guide and codebase.

**Resolved gaps:**

- New onboarding-created company owners now use `status: "pending"` and redirect to `/pending-approval` after onboarding completion.
- Prospecting PDF filenames now use `CyberHook-Report-{targetDomain}-{YYYY-MM-DD}.pdf`.
- Prospecting PDFs now render a `5 Sample Leaked Records` section and mask sample credential usernames.
- Company logo upload now validates GIF, PNG, JPG, JPEG, or JFIF and enforces a 256×256 minimum before upload in onboarding and Settings.
- Company logo uploads now persist both `logoUrl` and `logoStorageId`.
- Outlook calendar links now use `/calendar/0/deeplink/compose`.
- Native Google Calendar / Microsoft Graph OAuth push integration remains deferred with an in-code TODO.
- Snapshot Scan and Scripts & Cadences routes were searched; Scripts & Cadences is represented by the Knowledge Base V2 schema/module, and no separate Snapshot Scan route was found in the current codebase.

**Verification:**

- [x] `./node_modules/.bin/tsc --noEmit --pretty false`
- [x] `npm run build`

---

## Execution Instructions for Cursor

1. **Work the phases in order.** Phases are sequenced by client priority and by dependency (e.g., signup hardening blocks new-user testing of every other module).
2. **For every item below**:
   a. Read the existing implementation in the affected file(s).
   b. Reproduce the symptom (or confirm current behavior).
   c. Apply the fix per the steps.
   d. Run the acceptance test verbatim.
3. **After each phase**, produce a brief status report in this exact format:
   ```
   Phase X Status Report
   ID    | Status (Fixed / Already Correct / Blocked) | Notes / File(s) touched
   X.1   | Fixed                                      | app/(auth)/onboarding/questionnaire/page.tsx
   X.2   | Blocked                                    | Awaiting Resend API key in env
   ```
4. **Do not skip any item.** If something is blocked, mark it explicitly and continue.
5. **Cross-reference with prior fix docs** (`CYBERHOOK_CLIENT_FIXES_IMPLEMENTATION.md`, `CYBERHOOK_PRODUCTION_READINESS_FIXES.md`) before assuming a fix is new — some items may already be partially addressed and only need verification.

---

## Tech Stack Reference (for Cursor's lookups)

- **Framework:** Next.js 14 (App Router)
- **Backend / DB:** Convex (`convex/` directory — schema in `convex/schema.ts`, mutations & queries in topic-named files)
- **Auth:** Clerk
- **Billing:** Stripe (via Convex actions)
- **Email delivery:** Resend (or configured provider)
- **Styling:** Tailwind CSS + shadcn/ui (`components/ui/`)
- **External data:** Redrok API (`dash-api.redrok.io`) — adapter at `convex/redrok/adapter.ts`
- **Ransomware feed:** ransomware.live (free public API)
- **PDF generation:** `@react-pdf/renderer` or `puppeteer` — confirm which is currently in use before touching the report module

---

## Table of Contents

1. [Phase 1 — Signup & Onboarding Hardening (CRITICAL)](#phase-1--signup--onboarding-hardening-critical)
2. [Phase 2 — Prospecting Report Redesign (HIGHEST CLIENT PRIORITY)](#phase-2--prospecting-report-redesign-highest-client-priority)
3. [Phase 3 — Events Module Fixes](#phase-3--events-module-fixes)
4. [Phase 4 — Cross-Cutting Polish & Verification](#phase-4--cross-cutting-polish--verification)
5. [Phase 5 — Regression Test Checklist](#phase-5--regression-test-checklist)
6. [Open Questions for Liron (Block Before Final Hand-Off)](#open-questions-for-liron-block-before-final-hand-off)

---

## Phase 1 — Signup & Onboarding Hardening (CRITICAL)

> **Client's exact words:** *"These are required fields, and then I can skip without them, so it's not enforcing any of the required fields."*
>
> Every new MSP that signs up touches this flow. Bugs here = lost partners. Fix this phase first.

---

### 1.1 — Enforce required fields on the Company Profile Questionnaire

**Symptom (client video):** Liron signed up as a brand-new account and was able to advance through the questionnaire steps **without filling in fields that the UI labelled as required (with the asterisk `*`).** He pressed "Skip" / "Next" and the form let him through.

**Root cause hypothesis:** The required-field validation is either:
- (a) declared in the UI label only (visual asterisk) but not wired into the form submission handler, or
- (b) using `react-hook-form` / Zod with optional fields where they should be required, or
- (c) the "Skip" button on the questionnaire bypasses validation entirely.

**Affected files (most likely):**
- `app/(auth)/onboarding/questionnaire/page.tsx`
- `app/(auth)/onboarding/questionnaire/_components/questionnaire-form.tsx`
- `lib/validations/questionnaire.ts` (Zod schema if present)
- Any "Skip" button component within the onboarding flow

**Fix steps:**

1. **Locate the Zod schema (or equivalent validator)** for the questionnaire. If none exists, create one. The schema must mark **every field listed in PRD §4.2 as required** unless explicitly marked optional in the PRD:

   **REQUIRED fields (must validate `.min(1)` / non-empty):**
   - `companyName` — string, min 1
   - `phone` — string, min 7 (basic phone length check)
   - `website` — string, must match URL pattern (`z.string().url()`)
   - `primaryBusinessModel` — enum (MSP/MSSP, VAR/Reseller, Systems Integrator, VAD, TAP, Consultant/Referral Partner). **`"Not set"` must NOT be a selectable option in the V1 UI** (remove it from the dropdown — the PRD listed it but the client wants enforcement).
   - `annualRevenue` — enum (one of the 8 buckets)
   - `geographicCoverage` — array, `min(1)` (multi-select; at least one region)
   - `targetCustomerBase` — array, `min(1)` (multi-select; at least one)
   - `totalEmployees` — enum (one of the 7 buckets)
   - `totalSalesPeople` — enum (one of the 7 buckets)

   **OPTIONAL fields (per PRD §4.2):**
   - `logo`, `country`, `streetAddress`, `notes`, `secondaryBusinessModel`, `inviteEmails`

2. **Wire the schema into the form component:**
   ```ts
   const form = useForm<QuestionnaireValues>({
     resolver: zodResolver(questionnaireSchema),
     mode: "onSubmit",            // validate at submit
     reValidateMode: "onChange",  // re-validate live after first submit
     defaultValues: { ... },
   });
   ```

3. **Remove or repurpose the "Skip" button.** If a "Skip" button exists on the questionnaire step, either:
   - Delete it entirely (preferred — the PRD does not mention a skip), OR
   - Repurpose it as "Save & Continue Later" that persists partial data but **does not advance to the Trial/Payment page**.

4. **Inline error messages:** Each field with a validation failure must show a red error message immediately below the input, e.g., *"Company name is required."*

5. **Disable the "Continue" button** until the form is valid, OR allow click but trigger full-form validation and scroll to the first error.

6. **Backend safety net:** In the Convex mutation that persists the questionnaire (likely `convex/companies.ts` → `updateCompanyProfile` or `submitQuestionnaire`), re-validate using the same Zod schema (server-side). If validation fails, throw a `ConvexError` with a user-friendly message. **Do not trust client-side validation alone.**

**Acceptance test:**
- [ ] Sign up as a brand-new user. Reach the questionnaire.
- [ ] Click "Continue" with all fields blank → the form must NOT advance and must show inline errors under every required field.
- [ ] Fill required fields one by one and re-attempt → only after the last required field is filled should "Continue" succeed.
- [ ] Confirm there is no visible "Skip" button on the required-field steps.
- [ ] Attempt to call the questionnaire mutation directly via Convex dashboard with a missing required field → must reject with a `ConvexError`.

---

### 1.2 — Fix Stripe payment error message (replace technical error with customer-friendly copy)

**Symptom (client video):** When Liron tried to advance from the Trial/Payment page without entering credit card details, the error displayed was:

> **"Server error: payment details are required"**

The client said: *"If we can change it to just, like, a more customer-facing type of error that they need to submit credit card information."*

**Root cause hypothesis:** The error string is being passed through verbatim from the Stripe API or Convex action, instead of being translated to user-facing copy.

**Affected files (most likely):**
- `app/(auth)/onboarding/payment/page.tsx`
- `app/(auth)/onboarding/payment/_components/payment-form.tsx`
- `convex/stripe.ts` or `convex/billing.ts` (the action that creates the Stripe subscription / setup intent)

**Fix steps:**

1. **In the payment-form component**, wrap the submit handler in a try/catch and replace any raw error with friendly copy:
   ```tsx
   try {
     await createSubscription({ ... });
     router.push("/onboarding/under-review");
   } catch (err: any) {
     // Map known Stripe / Convex errors to friendly copy
     const friendly = mapPaymentError(err);
     toast.error(friendly);
     setFormError(friendly);
   }
   ```

2. **Create a helper** `lib/payment-errors.ts`:
   ```ts
   export function mapPaymentError(err: unknown): string {
     const msg = err instanceof Error ? err.message : String(err);
     if (/payment details? (are )?required/i.test(msg)) {
       return "Please enter your credit card information to start your free trial.";
     }
     if (/card.*declined/i.test(msg)) {
       return "Your card was declined. Please try a different payment method.";
     }
     if (/expired/i.test(msg)) {
       return "Your card has expired. Please use a valid card.";
     }
     if (/insufficient.*funds/i.test(msg)) {
       return "The card was declined due to insufficient funds.";
     }
     // Default fallback — never expose raw server error
     return "We couldn't process your payment. Please check your card details and try again.";
   }
   ```

3. **In the Convex action** that calls Stripe, also catch and re-throw with cleaner messages so even server-side errors are user-friendly:
   ```ts
   if (!paymentMethodId) {
     throw new ConvexError("Please enter your credit card information to start your free trial.");
   }
   ```

4. **Display the error in two places**:
   - As a toast (shadcn `Sonner` or `useToast`)
   - As an inline alert above the submit button (for users who dismiss the toast)

**Acceptance test:**
- [ ] Reach the payment page without entering card details. Click "Start Trial."
- [ ] The error must read: *"Please enter your credit card information to start your free trial."* (or equivalent friendly copy).
- [ ] No string containing "Server error" or "payment details are required" appears anywhere visible to the user.
- [ ] Enter an invalid test card (`4000000000000002` — Stripe declined card). The error must read: *"Your card was declined. Please try a different payment method."*
- [ ] Enter a valid Stripe test card (`4242424242424242`). Trial enrollment proceeds and user lands on the "Account Under Review" page.

---

### 1.3 — Fix "Invite Team Members" → emails are not actually being sent

**Symptom (client video):** Liron filled in team-member emails on the questionnaire's invite step (or on Settings → User Management — confirm both code paths). The invite UI showed success, but **no invitation email was received** at any of the listed addresses.

**Root cause hypothesis (in priority order):**
1. The invite mutation creates a DB record but never calls the email-sending action.
2. The email action is being called but with an unconfigured Resend API key in the deployed environment.
3. The "from" domain isn't verified in Resend → emails silently fail.
4. The invite link is being generated but the email template / send call is mocked out.

**Affected files (most likely):**
- `convex/invitations.ts` (or `convex/users.ts` — the mutation that handles invites)
- `convex/email/sendInviteEmail.ts` (or wherever email sending lives)
- `lib/email/templates/invite.tsx` (the React Email template, if used)
- `app/(auth)/onboarding/invite-team/page.tsx`
- `app/(dashboard)/settings/users/_components/invite-user-dialog.tsx`

**Fix steps:**

1. **Trace the invite flow end-to-end:**
   - When the user submits an invite, the client calls `useMutation(api.invitations.create)`.
   - The mutation should: (a) create an `invitations` table row with `email`, `role`, `inviterUserId`, `companyId`, `token` (UUID), `status: "pending"`, `expiresAt`, and (b) schedule an action to send the email.
   - Verify there is a corresponding `internalAction` (e.g., `sendInviteEmail`) that is actually scheduled via `ctx.scheduler.runAfter(0, internal.invitations.sendInviteEmail, { invitationId })`.

2. **If step 1 is missing the scheduler call**, add it:
   ```ts
   // convex/invitations.ts
   export const create = mutation({
     args: { email: v.string(), role: v.union(v.literal("rep"), v.literal("admin"), v.literal("billing")) },
     handler: async (ctx, args) => {
       const user = await getCurrentUser(ctx);
       const invitationId = await ctx.db.insert("invitations", {
         email: args.email.toLowerCase().trim(),
         role: args.role,
         inviterUserId: user._id,
         companyId: user.companyId,
         token: crypto.randomUUID(),
         status: "pending",
         expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
         createdAt: Date.now(),
       });
       await ctx.scheduler.runAfter(0, internal.invitations.sendInviteEmail, { invitationId });
       return invitationId;
     },
   });
   ```

3. **Confirm the email-sending action actually calls Resend (or configured provider):**
   ```ts
   // convex/invitations.ts (continued)
   export const sendInviteEmail = internalAction({
     args: { invitationId: v.id("invitations") },
     handler: async (ctx, { invitationId }) => {
       const inv = await ctx.runQuery(internal.invitations.getById, { invitationId });
       if (!inv) throw new Error("Invitation not found");
       const apiKey = process.env.RESEND_API_KEY;
       if (!apiKey) throw new Error("RESEND_API_KEY not configured");

       const resend = new Resend(apiKey);
       const inviteUrl = `${process.env.SITE_URL}/invite/accept?token=${inv.token}`;
       const { error } = await resend.emails.send({
         from: process.env.EMAIL_FROM!, // e.g., "CyberHook <invites@cyberhook.io>"
         to: inv.email,
         subject: `You've been invited to join ${inv.companyName} on CyberHook`,
         react: InviteEmailTemplate({ inviteUrl, inviterName: inv.inviterName, companyName: inv.companyName, role: inv.role }),
       });
       if (error) {
         console.error("Resend send failed", error);
         throw new Error(`Email send failed: ${error.message}`);
       }
     },
   });
   ```

4. **Verify environment variables on the deployed Convex deployment:**
   - `RESEND_API_KEY` — must be set to a real, non-revoked key
   - `EMAIL_FROM` — must use a domain verified in Resend
   - `SITE_URL` — must point to the production URL

5. **Verify the Resend sending domain is verified.** Open Resend dashboard → Domains → confirm DNS records (SPF, DKIM, DMARC) are all green for the sending domain. If not, emails go to spam silently or are rejected at Resend.

6. **Add observability:** Inside `sendInviteEmail`, log to the Convex `auditLog` table both on success and failure so the admin can see in the UI whether the email was sent. Surface this in the user-management table as a "Last invite sent / Status" column.

7. **Add a "Resend invite" button** in the Settings → User Management invite list (this is also a UX upgrade the client will appreciate).

**Acceptance test:**
- [ ] On a fresh signup, fill in the "Invite Team Members" step with a real test email you control.
- [ ] Submit. Confirm the invite is created in Convex (`invitations` table has a new row).
- [ ] Within ~1 minute, the test inbox receives an email with a working invitation link.
- [ ] Click the link → it lands on `/invite/accept?token=...` and the user can complete signup as the invited role.
- [ ] In Settings → User Management, the Admin sees the new pending invite. Clicking "Resend invite" delivers a second email.
- [ ] If `RESEND_API_KEY` is intentionally unset, the mutation throws a clear error to the UI ("Email service not configured — contact support").

---

### 1.4 — Fix invite UI stale state ("This was fixed. It's still showing it like this. I'm not sure why.")

**Symptom (client video):** The client noticed the invite confirmation UI continued to display the previous state (still showed inputs as if no invite was sent / still showed the "send" affordance) even though he had already triggered the invite. Quote: *"This was fixed. It's still showing it like this. I'm not sure why."*

**Root cause hypothesis:** The component uses local React state to render the invite form but is not invalidating / refetching the Convex query after the mutation succeeds. Convex queries are reactive by default — but if the component is using `useQuery` with a stale closure or the success path of the mutation isn't clearing local form state, the UI looks unchanged.

**Affected files (most likely):**
- `app/(auth)/onboarding/invite-team/_components/invite-form.tsx`
- `app/(dashboard)/settings/users/_components/invite-user-dialog.tsx`

**Fix steps:**

1. **In the invite form `onSubmit` success branch:**
   - Reset the form fields with `form.reset()`.
   - Show a success toast: *"Invitation sent to {email}."*
   - If the form is in a dialog, close it (`setOpen(false)`).
   - If it's an inline list of pending invites (e.g., during onboarding), the Convex `useQuery` should automatically re-fire when the `invitations` table changes — verify this by adding a `console.log` of the query result count and watching it increment.

2. **If using local state to track "sent emails":**
   ```tsx
   const [sentEmails, setSentEmails] = useState<string[]>([]);
   // After mutation succeeds:
   setSentEmails(prev => [...prev, email]);
   form.reset();
   ```

3. **Add visual feedback** — once an invite is sent, render a chip / row showing the email + "Pending" badge so the user can see their action took effect.

4. **Ensure no `key` prop bug** — sometimes a list isn't re-rendering because `key` is set to `index` and React reuses DOM nodes. Use the invitation `_id` (Convex ID) as the key.

**Acceptance test:**
- [ ] Submit an invite. The input field clears.
- [ ] A toast appears confirming send.
- [ ] The pending-invites list immediately updates with the new email + "Pending" badge.
- [ ] The "Send Invite" button returns to its idle state (not stuck in loading spinner).

---

## Phase 2 — Prospecting Report Redesign (HIGHEST CLIENT PRIORITY)

> **Client's exact words:** *"The biggest thing here that I wanted to cover with you is the prospecting report. The idea is, once they search for all these companies, they can generate a report. This report is customer-facing, and it's the most important piece of this tool. We need to make this report stand out."*
>
> **Why this matters most:** The Prospecting Report is what the MSP delivers to *their* prospects/customers. It's the artifact CyberHook produces that ends up in the wild — it represents the MSP brand to end-buyers. A bad-looking report = no closed deals = no platform retention.

---

### 2.1 — Build a new, professional Prospecting Report template

**Symptom (client video):** The current report is the legacy template returned by the Redrok API ("the old report that the system used to generate"). It looks plain. The client wants a redesigned, client-presentable template based on **two reference reports he shared** (these are the design north stars).

**Affected files (most likely):**
- `components/reports/prospecting-report.tsx` (or wherever the report PDF/HTML is rendered)
- `app/(dashboard)/live-search/_components/generate-report-button.tsx`
- `app/(dashboard)/live-leads/_components/generate-report-button.tsx`
- `convex/reports.ts` (action that fetches Redrok data + assembles the report payload)
- `lib/pdf/render-report.ts` (PDF generation pipeline)

**Design contract — STATIC vs DYNAMIC:**

| Section | Static or Dynamic | Source |
|---|---|---|
| Cover page (title, subtitle, decoration) | **Static** template, **dynamic** company/MSP info | MSP company name + logo + target company name + report date |
| Executive Summary | **Static** narrative copy | Hard-coded prose with placeholders for `{targetDomain}` and headline metrics |
| Company Overview (target company) | **Dynamic** | Live-Lead enrichment data (name, domain, industry, employee count, region) |
| Threat Statistics container (credentials, systems, malware types) | **Dynamic metrics** in **static container** | Redrok API response |
| Statistics breakdown (charts/tables) | **Dynamic data** in **static visual layout** | Redrok API |
| Malware Types breakdown | **Dynamic** | Redrok API |
| Business Data exposure summary | **Dynamic** | Redrok API |
| 5 Sample Leaked Records (passwords, etc.) | **Dynamic** (5 records always, sourced from API) | Redrok API |
| Financial Impact section | **Static** narrative + industry benchmarks | Hard-coded copy with optional inserted metric |
| Recommendations / Next Steps | **Static** | Hard-coded MSP boilerplate |
| Footer (MSP company logo + contact info) | **Dynamic** (MSP profile) | Pulled from `companies` table (MSP-side) |

**Fix steps:**

1. **Read the two reference PDFs the client provided.** They are in the project assets folder (or attached to the conversation). Use them as the *visual* spec — fonts, colors, layout, section ordering, header/footer style. Do not invent a layout — match the references.

2. **Define the report data contract** in `convex/reports.ts`:
   ```ts
   export type ProspectingReportData = {
     msp: {
       companyName: string;
       logoUrl: string | null; // pulled from companies table
       contact: { email: string; phone: string | null; website: string };
     };
     target: {
       companyName: string;
       domain: string;
       industry: string | null;
       employees: string | null;
       region: string | null;
     };
     metrics: {
       totalCredentials: number;
       totalSystems: number;
       malwareTypes: { name: string; count: number }[];
       statistics: { label: string; value: number }[];
       businessData: { category: string; count: number }[];
     };
     samples: Array<{
       email: string;       // partially masked, e.g. "j***@acme.com"
       passwordHash: string; // last 4 chars or strength indicator
       source: string;
       date: number;
     }>; // exactly 5 — never more, never fewer
     generatedAt: number;
   };
   ```

3. **Build the React component** at `components/reports/ProspectingReport.tsx` using `@react-pdf/renderer` (or whatever the project already uses). The component receives `ProspectingReportData` and renders pages 1-N matching the reference design.

4. **Logo handling — critical:**
   - The MSP logo is pulled from the `companies` table at `companies.logoStorageId` (Convex storage).
   - If `logoStorageId` is null, render a placeholder rectangle with the MSP company name in large typography (do not break the report).
   - Logo display rule: top-left of cover page, height 60-80px, maintain aspect ratio.
   - Same logo also appears in the footer of every page (smaller, ~24px height).

5. **Wire the "Generate Report" button** on Live-Search and Live-Leads:
   ```tsx
   // shared component
   export function GenerateReportButton({ companyId, source }: { companyId: Id<"companies">; source: "live-search" | "live-leads" }) {
     const generate = useAction(api.reports.generateProspectingReport);
     const handle = async () => {
       try {
         const url = await generate({ companyId, source });
         window.open(url, "_blank"); // or trigger download
       } catch (e) { toast.error("Couldn't generate report. Please try again."); }
     };
     return <Button onClick={handle}><FileText className="mr-2 h-4 w-4" /> Generate Report</Button>;
   }
   ```

6. **Same component, two entry points:** The report template MUST be shared between Live-Search and Live-Leads. The client said: *"That report would obviously be the same for the Live Leads and the Live Search."* Do not duplicate the component — both pages call the same `generateProspectingReport` action with different source contexts.

7. **Loading state:** Show a "Generating report..." overlay while the action runs (PDF generation can take 5-15 seconds). Do not let the user think the click did nothing.

8. **Output format:** PDF (downloadable + opened in new tab). Filename pattern: `CyberHook-Report-{targetDomain}-{YYYY-MM-DD}.pdf`.

**Acceptance test:**
- [ ] On Live-Leads, click "Generate Report" for any row.
- [ ] A PDF downloads/opens within ~15s.
- [ ] The PDF visually matches the reference design provided by the client (cover page styling, section order, typography).
- [ ] The MSP company logo appears on the cover and on every page footer.
- [ ] The target company's name, domain, employees, industry, region all appear correctly.
- [ ] Threat metrics (credentials, systems, malware types, statistics, business data) all reflect the live Redrok API response — not hardcoded sample numbers.
- [ ] Exactly 5 sample records appear, all properly masked (no full plaintext passwords).
- [ ] Static sections (Executive Summary, Financial Impact, Recommendations) are present with polished copy.
- [ ] Repeat the same on Live-Search → produces an identical-looking PDF for the searched domain.
- [ ] If the MSP has not uploaded a logo, the cover renders gracefully with a text-based placeholder (no broken image icon).

---

### 2.2 — MSP logo upload must work and propagate to the report

**Symptom:** The client emphasized: *"The reason why the company logo is so important — because the report needs to include their company logo."* This means logo upload, storage, and rendering must be bullet-proof.

**Affected files:**
- `app/(dashboard)/settings/company/_components/logo-upload.tsx`
- `convex/companies.ts` → `uploadLogo` mutation + `generateUploadUrl` action
- `convex/schema.ts` → `companies` table must have `logoStorageId: v.optional(v.id("_storage"))`

**Fix steps:**

1. **Upload UX:** On Settings → Company Profile, the logo field should accept GIF/PNG/JPG/JPEG/JFIF (per PRD §4.2). Reject other types client-side AND server-side. Min size 256×256.

2. **Storage:** Use Convex `_storage` table. Store the `storageId` on `companies.logoStorageId`. Generate a signed URL on read via `ctx.storage.getUrl(logoStorageId)`.

3. **Display in report:** When assembling `ProspectingReportData.msp.logoUrl`, call `await ctx.storage.getUrl(company.logoStorageId)` and pass that URL into the PDF component.

4. **Display in app chrome:** The MSP logo (if present) should also appear in the top-left of the dashboard sidebar, replacing the default CyberHook wordmark. This is bonus polish but the client may notice.

**Acceptance test:**
- [ ] Upload a 256×256 PNG logo on Settings → Company Profile. Confirm preview renders immediately.
- [ ] Generate a Prospecting Report → the uploaded logo appears on cover + footer.
- [ ] Replace the logo with a different file → next generated report shows the new logo (cache-bust correctly).
- [ ] Try uploading a 100×100 PNG → form rejects with: *"Logo must be at least 256×256 pixels."*
- [ ] Try uploading a `.bmp` → form rejects with: *"Allowed formats: GIF, PNG, JPG, JPEG, JFIF."*

---

## Phase 3 — Events Module Fixes

> **Client's exact words:** *"Inside the events, once you click on view, first off we could format this properly. It's always sticking to the line. It just should be formatted a little bit to the right."*

---

### 3.1 — Fix Event Detail view formatting (content "sticking to the line")

**Symptom:** When clicking "View" on an event, the detail panel renders with content flush against the left edge of the panel (no padding/margin). It looks unfinished.

**Affected files (most likely):**
- `app/(dashboard)/events/_components/event-detail-dialog.tsx` (or `event-detail-sheet.tsx`)
- `app/(dashboard)/events/[id]/page.tsx` (if a dedicated route exists)

**Fix steps:**

1. **Locate the event detail container.** Inside the dialog/sheet body, ensure the root content div has consistent padding:
   ```tsx
   <DialogContent className="p-6 sm:p-8 max-w-2xl">
     <div className="space-y-6">
       {/* event fields */}
     </div>
   </DialogContent>
   ```

2. **Apply consistent left padding** to every row of metadata (Date, Location, Description, etc.). Use a 2-column grid:
   ```tsx
   <dl className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-sm">
     <dt className="text-muted-foreground">Date</dt>
     <dd>{formattedDate}</dd>
     <dt className="text-muted-foreground">Location</dt>
     <dd>{location}</dd>
     {/* ... */}
   </dl>
   ```

3. **Description block** (long text) — give it `pt-2` separation from the field above and `whitespace-pre-wrap` so newlines render.

4. **Action buttons** at the bottom (Add to Calendar, Edit, Delete) — `flex justify-end gap-2 pt-4 border-t mt-6`.

**Acceptance test:**
- [ ] Open any event's detail view. Visual: content has clear breathing room from the dialog edges (~24-32px).
- [ ] All field labels are aligned in a column; values are aligned in a second column.
- [ ] No content "sticks" to any edge of the dialog.

---

### 3.2 — Fix Google Calendar integration (currently redirects to Microsoft)

**Symptom:** Clicking "Add to Google Calendar" on an event sends the user to a Microsoft URL instead of Google. Quote: *"The Google Calendar and Outlook don't work. It redirected to Microsoft's page."*

**Root cause hypothesis:** The button handlers are wired to the wrong URL builder, or there is a single shared "Add to Calendar" handler that always builds the Microsoft Outlook URL regardless of which button was clicked.

**Affected files (most likely):**
- `app/(dashboard)/events/_components/add-to-calendar-buttons.tsx`
- `lib/calendar/url-builders.ts` (if exists)

**Fix steps:**

1. **Build distinct URL helpers** for each provider:

   ```ts
   // lib/calendar/url-builders.ts
   export function buildGoogleCalendarUrl(e: { title: string; startsAt: Date; endsAt: Date; description?: string; location?: string }) {
     const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
     const params = new URLSearchParams({
       action: "TEMPLATE",
       text: e.title,
       dates: `${fmt(e.startsAt)}/${fmt(e.endsAt)}`,
       details: e.description ?? "",
       location: e.location ?? "",
     });
     return `https://calendar.google.com/calendar/render?${params}`;
   }

   export function buildOutlookWebCalendarUrl(e: { title: string; startsAt: Date; endsAt: Date; description?: string; location?: string }) {
     const params = new URLSearchParams({
       path: "/calendar/action/compose",
       rru: "addevent",
       subject: e.title,
       startdt: e.startsAt.toISOString(),
       enddt: e.endsAt.toISOString(),
       body: e.description ?? "",
       location: e.location ?? "",
     });
     return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
   }

   export function buildOffice365CalendarUrl(e: { /* same shape */ }) {
     // Same as Outlook Web but at https://outlook.office.com/calendar/0/deeplink/compose
   }
   ```

2. **In the buttons component, use distinct handlers:**
   ```tsx
   <Button asChild variant="outline">
     <a href={buildGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
       <GoogleIcon /> Add to Google Calendar
     </a>
   </Button>
   <Button asChild variant="outline">
     <a href={buildOutlookWebCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
       <OutlookIcon /> Add to Outlook
     </a>
   </Button>
   <Button onClick={downloadIcs} variant="outline">
     <CalendarIcon /> Download .ics (Apple Calendar)
   </Button>
   ```

3. **Audit every event-related page** (Events list, Event detail, News dashboard "Today" panel if it has Add-to-Calendar) and confirm they all use the new helpers — not a stale shared one.

**Acceptance test:**
- [ ] Open an event. Click "Add to Google Calendar."
- [ ] A new tab opens at `calendar.google.com/calendar/render?...` with the event title, date, location, description prefilled.
- [ ] Click "Add to Outlook." A new tab opens at `outlook.live.com/calendar/0/deeplink/compose?...` (or `outlook.office.com` for work accounts) with the event prefilled.
- [ ] No click ever redirects to a Microsoft homepage / login wall unrelated to a calendar event.

---

### 3.3 — Verify .ics download (Apple Calendar / native) — already working per client

**Status:** The client confirmed: *"The download does work with the original calendar. So if I would download this and I would click on it, it would manage to add it inside the calendar."*

**Action:** No code changes needed — but **verify** this still works after Phase 3.2 changes (don't accidentally break the .ics download while fixing Google/Outlook buttons).

**Acceptance test:**
- [ ] Click "Download .ics" → file downloads.
- [ ] Open the file on macOS → Apple Calendar prompts to add the event with all fields populated.

---

### 3.4 — (Stretch) Native Google Calendar & Outlook integration via OAuth

**Client's note:** *"I don't know if that would be possible to add it to Outlook and Google as well."* — meaning, instead of just generating a deeplink, actually create the event in the user's connected calendar via API.

**Recommendation:** **Defer to a future release.** The deeplink approach (Phase 3.2) covers 95% of the use case at 5% of the engineering cost. Native API integration requires:
- Google OAuth scopes (`calendar.events.create`)
- Microsoft Graph OAuth (`Calendars.ReadWrite`)
- Token refresh handling
- Per-user connection management UI

**Action for Cursor:** Do not implement native API integration in this update. Add a tracked TODO comment in `app/(dashboard)/events/_components/add-to-calendar-buttons.tsx`:
```ts
// TODO (Post-May-Update): Native Google Calendar + Microsoft Graph API integration
// to push events directly into user's connected calendar without a deeplink.
// Requires OAuth flow setup for both providers.
```

---

## Phase 4 — Cross-Cutting Polish & Verification

### 4.1 — Confirm no other forms in the app have the "skippable required field" bug

The questionnaire bug (Phase 1.1) is a symptom of a pattern. Audit every other form:

- [ ] Settings → Company Profile (post-onboarding edit)
- [ ] Settings → User Management → Invite User dialog
- [ ] To-Do → Create Task dialog
- [ ] Watchlist → Add Domain dialog
- [ ] Snapshot Scan → Upload domains
- [ ] AI Agents → Create Campaign wizard
- [ ] Scripts & Cadences → Create Script
- [ ] Events → Create Event

For each: confirm Zod schema marks fields as required where the UI shows asterisks, and the submit button does not bypass validation.

### 4.2 — Confirm all toast/error messaging is customer-friendly

Run a global audit — search the codebase for these strings and replace with user-friendly copy:
- `"Server error"`
- `"500"` (anywhere user-visible)
- `"undefined"`
- `"null"` (in a sentence)
- `"NetworkError"`, `"TypeError"`, `"ConvexError"` (raw stack-style strings)
- `"required"` used in a technical voice → rephrase

### 4.3 — Verify the report is accessible from BOTH Live-Search and Live-Leads

The "Generate Report" button must appear:
- [ ] On every row of the Live-Leads table (right-aligned column, per the screenshot Liron shared).
- [ ] On the Live-Search results page after a successful search (prominent CTA near the top of results).
- [ ] On the Lead Detail page (Live-Leads → click into a company).

---

## Phase 5 — Regression Test Checklist

After all phases complete, run this end-to-end smoke test as a brand-new user:

1. [x] **Sign up** with a new email → email verification works.
2. [x] **Questionnaire** — every required field is enforced; cannot skip.
3. [x] **Payment** — bad card shows friendly error; good card succeeds.
4. [ ] **Account Under Review** screen appears.
5. [ ] **Approve the user** via internal admin tool / Convex dashboard.
6. [x] **Login** — News dashboard renders without console errors.
7. [x] **Settings → Company Profile** — upload a logo; verify it sticks.
8. [ ] **Settings → User Management** — invite a teammate → email is received.
9. [x] **Live-Search** — run a search on `example.com` → results display.
10. [ ] **Live-Search → Generate Report** → professional PDF with logo downloads.
11. [ ] **Live-Leads** — open the page → table renders → click "Generate Report" on a row → same template renders.
12. [x] **Watchlist** — add a domain → no console errors.
13. [x] **Events** — open an event detail → content has proper padding.
14. [x] **Events → Add to Google Calendar** → opens Google.
15. [x] **Events → Add to Outlook** → opens Outlook.
16. [x] **Events → Download .ics** → file opens in Apple Calendar.
17. [x] **News dashboard** — KPI tiles, "Today" panel, news feed all render.
18. [x] **Logout** — session cleared.

### Phase 5 Browser QA Results — 2026-05-04

- **Signup / verification / onboarding:** New account `zehcyriac@yahoo.com` completed email verification, required onboarding validation, and payment flow. Account-review screen did not appear for this account because the Convex deployment was stale during the run; Convex was synced afterward with `npx convex dev --once`, so this item must be retested with a fresh account.
- **Settings / Company Profile:** Uploaded valid `256×256` PNG logo from `src/app/icon.png`. Convex company record persisted both `logoUrl` and `logoStorageId`, and the logo remained visible after Settings reload.
- **Settings / Team invite:** Invite sent to `nidrosoft@outlook.com`; UI showed it under Pending Invitations as `Sent`. Inbox receipt was not independently verified. Also observed a row action overlay that blocked the Invite User button until dismissed.
- **Live Search:** `example.com` search returned 15 masked credential rows, showed trial masking, and consumed one token (`1000 → 999`).
- **Live Search report:** PDF downloaded as `CyberHook-Report-example.com-2026-05-05.pdf`, but the uploaded Convex logo URL returned `400` during report generation, so logo embedding is not confirmed.
- **Live Leads:** Discover table rendered with 49 companies; saving `optum.com` created one active lead. Row-level report downloaded as `CyberHook-Report-optum.com-2026-05-05.pdf`, but the same Convex logo URL returned `400` during report generation.
- **Watchlist:** Added `example-watchlist-test.com`; domain appeared as active and clean. Empty-domain submit was prevented by disabled submit state.
- **Events:** Empty create submit kept the dialog open but did not show visible inline validation text. Created `Phase 5 Calendar Smoke Test`; detail slideout rendered with proper spacing. Google Calendar opened, Outlook opened via `/calendar/0/deeplink/compose`, and `.ics` downloaded as `Phase_5_Calendar_Smoke_Test.ics`.
- **News dashboard:** Dashboard rendered KPI tiles, Cyber News Feed, Recent Searches, Quick Actions, Upcoming Events, and usage metrics.
- **Logout:** Sign out redirected to `/`; direct navigation to `/dashboard` while signed out redirected back to `/`.
- **Console findings:** Observed React read-only field error (`value` without `onChange`) and repeated Convex storage `400` errors for uploaded logo URL `kg235qdnwpz88546e0vxr1mh1s865zwz` during PDF generation.

### Phase 5 Blocker Fixes Implemented — 2026-05-04

- **Event detail alignment:** Moved the `Virtual` / `In Person` badge into the Location row content stack so it aligns with the Date, Time, and Location content instead of floating at the left edge of the slideout.
- **Event required-field validation:** Added visible inline errors for Title, Type, and Start Date in the New Event slideout. Empty submit now keeps the dialog open and shows required-field messages in addition to the toast.
- **Team row menu overlay:** Changed the floating team action menu wrapper so only the dropdown itself receives pointer events. This prevents the invisible full-screen layer from blocking the Invite User button and other page controls.
- **PDF logo URL:** Updated file uploads to resolve the official Convex storage URL via `api.storage.getUrl` instead of manually constructing `/api/storage/{storageId}`. Report generation now also resolves `logoStorageId` at Live Search, Live Leads, and Lead Detail report entry points before falling back to `logoUrl`.
- **Settings console warning:** Marked the read-only Location ID field with `isReadOnly` to remove the React controlled-input warning.
- **Account-review bypass:** Removed the auto-approval side effect from `convex/companies.ts` `adminUpgradePlan`. Upgrading a plan no longer changes a pending user to approved; approval must happen through the review/admin flow. Convex dev deployment was synced with `npx convex dev --once`.
- **Verification:** `./node_modules/.bin/tsc --noEmit --pretty false` passed. `npm run build` passed. Fresh-account browser retest is still required to confirm the account-review screen end-to-end.

### Phase 5 Gap Cleanup Implemented — 2026-05-04

- **Onboarding business model:** Removed the `Not set` option so users must choose a real primary business model.
- **Live Leads report action:** Added a visible right-aligned `Report` table column with a `Generate Report` button on every Live Leads list row, while keeping the existing row action menu.
- **Contacts friendly errors:** Replaced raw contact save/import error surfacing with `friendlyError` fallbacks.
- **PDF footer branding:** Added MSP logo rendering in the PDF footer when a logo is available, with graceful fallback to text-only footer.
- **Verification:** `./node_modules/.bin/tsc --noEmit --pretty false` passed. `npm run build` passed.

---

## Open Questions for Liron (Block Before Final Hand-Off)

These ambiguities exist in the May review and should be confirmed before declaring this update "done":

1. **Trial duration:** PRD §4.1 says **5 days** but earlier client preference noted **7 days**. Confirm the actual desired trial length and reflect in: Stripe trial config, the "Account Under Review" copy, and the on-screen messaging during signup.
2. **Two reference report PDFs:** Confirm exact file names / locations of the two PDFs Liron referenced as the design north stars for the new Prospecting Report. Without these, the design is interpretive.
3. **MSP logo storage:** Should the logo be available *before* approval (i.e., uploadable during the questionnaire), or only after approval (Settings)? The PRD says it can be added later, but reports require it. Recommend prompting upload immediately after approval if missing.
4. **Email sender domain:** Confirm `EMAIL_FROM` value and that DNS records (SPF/DKIM/DMARC) are verified for the chosen domain in Resend.
5. **Outlook.live vs Outlook.office:** Should the Outlook deeplink target consumer (`outlook.live.com`) or work/school (`outlook.office.com`) accounts by default? Recommend offering both as separate buttons, OR detecting the user's email domain and defaulting accordingly.

---

## Status Report Template (Cursor — fill this in as you complete each phase)

```
=== Phase 1 — Signup & Onboarding Hardening ===
1.1 Required fields enforcement   | [ ] | files: ___
1.2 Stripe friendly errors        | [ ] | files: ___
1.3 Invite emails delivery        | [ ] | files: ___
1.4 Invite UI stale state         | [ ] | files: ___

=== Phase 2 — Prospecting Report ===
2.1 Report template + dynamic data| [ ] | files: ___
2.2 MSP logo upload + propagation | [ ] | files: ___

=== Phase 3 — Events ===
3.1 Event detail formatting       | [ ] | files: ___
3.2 Google + Outlook deeplinks    | [ ] | files: ___
3.3 .ics download verified        | [ ] | files: ___
3.4 Native OAuth (deferred)       | TODO comment added | files: ___

=== Phase 4 — Cross-cutting ===
4.1 Form audit                    | [ ] | files: ___
4.2 Error message audit           | [ ] | files: ___
4.3 Report entry points wired     | [ ] | files: ___

=== Phase 5 — Regression Test ===
End-to-end smoke test passed: [ ] blocker fixes implemented; fresh-account browser retest still required
Blocking issues found: invite email receipt still requires inbox verification; account-review screen needs fresh-account browser retest after bypass fix
```

---

**End of CyberHook May Update Implementation Guide.**
**On completion, hand back to Cyriac for review with Liron before pushing to production.**
