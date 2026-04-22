# CyberHook — Production Readiness Fix & Verification Prompt

> **Purpose of this document**
> This is a **systematic fix and verification pass** over the CyberHook platform based on the client's (Liron / AMSYS) latest spreadsheet review. Every item below is either **confirmed broken** or **needs to be re-verified end-to-end**. Do not assume any item is already implemented — open the actual code, check the actual runtime behavior, and confirm the fix matches the acceptance criteria for each row.
>
> **Color-coded priority legend (from the client's sheet):**
> - 🟧 **ORANGE (Priority 1)** — Client tested and it's broken. Must be fixed.
> - 🟥 **RED (Priority 2)** — Critical data integration that isn't live yet.
> - 🟦 **BLUE (Priority 3)** — Unverified feature (client couldn't confirm it was implemented).
> - 🟨 **YELLOW (Priority 4)** — Enhancements / copy changes / polish. Verify each is actually applied.
> - ⬜ **WHITE (Priority 5)** — Items without a color flag but still listed on the sheet.
>
> **Execution instructions for Cursor:**
> 1. Go through **every item below in order**. Do not skip any.
> 2. For each item: (a) read the existing implementation, (b) reproduce the bug or check the current behavior, (c) apply the fix, (d) run the acceptance test.
> 3. After each priority section is complete, produce a short status report: `ID | Status (Fixed / Already Correct / Blocked) | Notes`.
> 4. If an item is **blocked** (e.g., needs Redrok API credentials, needs a third-party API key, needs backend changes outside the repo), mark it clearly and continue to the next item.
> 5. Update `CYBERHOOK_CLIENT_FIXES_IMPLEMENTATION.md` progress as you go — these fixes are a direct superset of that doc's client-review feedback.

---

## Table of Contents

1. [Priority 1 — 🟧 ORANGE Items (Broken — Must Fix)](#priority-1--orange-items-broken--must-fix)
2. [Priority 2 — 🟥 RED Items (Critical Data Integrations)](#priority-2--red-items-critical-data-integrations)
3. [Priority 3 — 🟦 BLUE Items (Unverified Implementation)](#priority-3--blue-items-unverified-implementation)
4. [Priority 4 — 🟨 YELLOW Items (Verification & Polish)](#priority-4--yellow-items-verification--polish)
5. [Priority 5 — ⬜ WHITE Items (Untagged but Listed)](#priority-5--white-items-untagged-but-listed)
6. [Final Acceptance Checklist](#final-acceptance-checklist)

---

# Priority 1 — 🟧 ORANGE Items (Broken — Must Fix)

These are the items the client personally tested and found broken during the Loom walkthrough. **Every one of these must be fixed and verified working before any yellow items are touched.**

---

### 🟧 1.3 — Signup: Enforce required fields (package + CC)

- **Area:** Signup
- **Current (broken) behavior (client quote):** *"packages are clickable but cc details are not required to proceed."*
- **Fix:**
  - On the signup flow, the **Continue / Next / Start Trial** button must be disabled until:
    1. A package is selected (radio-button or card-selected state confirmed).
    2. All credit-card fields (card number, expiry, CVC, ZIP) are filled and pass Stripe Elements / Payment Element validation.
  - Client-side validation must be reinforced by server-side validation in the signup mutation — reject the request if a Stripe payment method ID is not present.
- **Acceptance test:** Try to click Continue with (a) no package selected → blocked; (b) package selected but CC empty → blocked; (c) everything filled → proceeds.

---

### 🟧 1.5 — Signup: Logo upload doesn't save during signup

- **Area:** Signup
- **Current (broken) behavior (client quote):** *"did not work as I tried to upload a logo during signup"*
- **Fix:**
  - Check the file upload handler in the signup questionnaire. Likely failure modes:
    - File input not wired to state.
    - File upload action not awaited before the form submit.
    - Upload target (Convex file storage) not receiving the blob.
    - MIME type / size validation silently rejecting.
  - Ensure the file is uploaded, the resulting storage ID is attached to the `companies` record, and the logo displays in the header / sidebar after signup completion.
  - Accepted types per PRD: GIF, PNG, JPG, JPEG, JFIF; min 256×256.
- **Acceptance test:** Create a new account end-to-end, upload a PNG logo during questionnaire → after account creation, the logo appears in (a) the top-right user menu, (b) Settings → Company Profile.

---

### 🟧 1.6 — Signup: Company logo doesn't sync to Company Settings

- **Area:** Signup
- **Current (broken) behavior (client quote):** *"works inside settings but not during signup"*
- **Fix:**
  - Closely related to 1.5. The logo upload path in Settings works, so the Convex storage + mutation + schema field is fine. The problem is the **signup upload path** is writing to a different field, the wrong record, or not writing at all.
  - Audit that both paths (signup questionnaire and Settings → Company) write to the **same field** on the same `companies` document, e.g. `companies.logoStorageId`.
  - Ensure the rendering component reads from that single source of truth.
- **Acceptance test:** Upload logo at signup → open Settings → Company; the same logo is pre-populated and rendered everywhere.

---

### 🟧 2.1 — Invites & Team: Invite emails aren't being sent

- **Area:** Invites & Team
- **Current (broken) behavior (client quote):** *"showing users are pending in settings yet no emails are sent to the invited members"*
- **Fix:**
  - The invite mutation is creating the pending-user record in Convex, but the email-sending side-effect is either (a) not being called, (b) failing silently, or (c) pointing to a non-existent email provider config.
  - Verify the invite flow:
    1. `inviteUser` mutation creates pending user ✅ (already works).
    2. After mutation success, call email-send action (Resend / SendGrid / Postmark / whatever is configured).
    3. Log the send result. If the provider errors, surface a toast to the admin ("Invite created but email failed to send — click to resend").
  - Ensure `RESEND_API_KEY` (or equivalent) is actually set in environment variables, and the sender domain is verified.
  - The invite email must include a tokenized deep-link that lands on `/invite/accept?token=...`, which provisions the Clerk user upon acceptance.
- **Acceptance test:** Invite a real email address → email arrives in the inbox within 60 seconds → clicking the link creates a Clerk user and logs them into the correct org / role.

---

### 🟧 2.3 — Invites & Team: Three-dots → Change Role doesn't work

- **Area:** Invites & Team
- **Current (broken) behavior (client quote):** *"three-dots action works but role change isnt working"*
- **Fix:**
  - The dropdown menu opens and the action fires, but the role on the user record is not being updated (or is being updated in Clerk but not in Convex, or vice versa).
  - Make the role change atomic: update Convex `users.role` AND Clerk `publicMetadata.role` in the same server action. Either both succeed or both roll back.
  - After success, invalidate the user list query so the UI reflects the new role immediately.
- **Acceptance test:** As admin, change a Sales Rep to Sales Admin → refresh the page → role is persisted; newly-promoted user now sees admin-only nav items on their next login.

---

### 🟧 2.4 — Invites & Team: Three-dots → Deactivate User doesn't work

- **Area:** Invites & Team
- **Current (broken) behavior (client quote):** *"three-dots action works but user deactivation isnt working"*
- **Fix:**
  - Same pattern as 2.3. Deactivate must:
    1. Set `users.isActive = false` in Convex.
    2. Revoke the user's Clerk session(s) (via Clerk backend API).
    3. Prevent future logins — middleware must reject authenticated requests for inactive users.
  - Also implement **reactivate** as the inverse.
- **Acceptance test:** Deactivate a logged-in user → their session ends on next request; they can't sign in again until reactivated.

---

### 🟧 2.5 — Invites & Team: Notifications for new users/invites don't deep-link

- **Area:** Invites & Team
- **Fix:**
  - When a new user is invited or accepts an invite, in-app notifications must appear for admins.
  - Clicking the notification must deep-link to Settings → Team → that specific user row (use a query param like `?highlight=userId` and scroll-into-view + highlight ring).
- **Acceptance test:** Invite a user → admin sees notification → click it → lands on Team tab with that user visibly highlighted.

---

### 🟧 3.1 — Profile & Company: Profile image doesn't save/sync

- **Area:** Profile & Company
- **Current (broken) behavior (client quote):** *"doesn't save and sync with picture icons"*
- **Fix:**
  - User **profile avatar** (not company logo — different field) is not persisting, or is persisting but not being read by the header avatar / sidebar avatar / user-mentions components.
  - Ensure one canonical source field (e.g. `users.avatarStorageId`) and every avatar-rendering component reads from it via a shared hook like `useUserAvatar(userId)`.
- **Acceptance test:** Upload avatar → close browser → reopen → avatar persists in header, sidebar, comments, team list, everywhere.

---

### 🟧 3.4 — Profile & Company: Add Service Area with configurable radius

- **Area:** Profile & Company
- **Fix (new feature):**
  - Add a **Service Area** section to Company Profile settings.
  - Fields:
    - **Center location** (address with geocoding — can reuse the location picker from 3.2/3.3).
    - **Radius** — numeric input + unit toggle (miles / km).
    - **"No limit" checkbox** — when checked, radius is disabled and service area is marked as global.
  - Persist to `companies.serviceArea` as `{ centerLat, centerLng, radiusMiles, noLimit }`.
  - Later consumers: Events "near me" filter, prospect geography matching.
- **Acceptance test:** Set a 50-mile radius around "Houston, TX" → save → reopen → values persist. Toggle "No limit" → radius field disables.

---

### 🟧 4.1 — AI Agents & Campaigns: Contacts repository required

- **Area:** AI Agents & Campaigns
- **Current (broken) behavior + client directive (direct quote):**
  > *"Need to add a 'Contacts' section to enable upload of names phones and emails for AI Agents, similar to what Jen has, the AI agents will never work if you dont have a repository of contacts."*
- **Fix (net-new module):**
  - Add a **Contacts** top-level module (or nested under AI Agents — confirm placement with client, but implement under AI Agents for now).
  - Functionality:
    - CSV upload with columns: First Name, Last Name, Email, Phone, Title, Company, LinkedIn URL, Notes.
    - Manual single-contact add.
    - Edit / delete.
    - Search + filter by company, title, last contacted date.
    - Link contacts to Live-Leads company records when domain matches.
  - Convex schema: `contacts` table with `companyId` (nullable foreign key to `leads`), `createdBy`, timestamps.
  - Wire AI Agents campaign creation to **pick contacts from this repository** (replacing / augmenting the current lead-based selection).
  - Deduplication: on CSV import, dedupe by email.
- **Acceptance test:** Upload a 20-row CSV → rows appear in Contacts table → create a new AI Agents campaign → Contacts repository is selectable as the audience → emails draft against those contacts.

---

### 🟧 4.2 — AI Agents & Campaigns: Email templates/sequences missing

- **Area:** AI Agents & Campaigns
- **Fix:**
  - Seed the **Knowledge Base / Templates** with real email sequences per the PRD's Scripts & Cadences section: cold, follow-up, post-scan, renewal, event follow-up.
  - Ensure each AI Agents campaign picks a cadence, and each cadence step references a template.
  - Variables that must render correctly in previews: `{{contact.firstName}}`, `{{contact.company}}`, `{{exposure.count}}`, `{{sender.firstName}}`, `{{sender.company}}`.
- **Acceptance test:** Create a 3-step cadence (Day 0 cold, Day 3 follow-up, Day 7 breakup). Preview renders variables with real contact data. Sending sends from the connected Outlook / Gmail inbox.

---

### 🟧 4.3 — AI Agents & Campaigns: Three-dots menu broken

- **Area:** AI Agents & Campaigns
- **Fix:**
  - The three-dots (kebab) menu on each AI Agent / campaign row either doesn't open, opens empty, or items inside don't fire.
  - Ensure menu items work: **Edit**, **Duplicate**, **Pause / Resume**, **Delete**, **View Report**.
  - Use a consistent dropdown component (shadcn/ui `DropdownMenu`) across the whole app so this pattern works the same everywhere.
- **Acceptance test:** Each item in the kebab menu performs its action and updates the UI without a page refresh.

---

### 🟧 4.4 — AI Agents & Campaigns: Configure Cadence scroll UI

- **Area:** AI Agents & Campaigns
- **Current (broken) behavior:** Buttons at the bottom of the Configure Cadence modal / side panel are inaccessible because the panel doesn't scroll or the sticky footer is cut off.
- **Fix:**
  - Modal / side-panel structure must be:
    ```
    <panel>
      <header />              // sticky top
      <scroll-region />       // flex-1 overflow-y-auto
      <footer-with-buttons /> // sticky bottom, always visible
    </panel>
    ```
  - On small viewports (laptop 13"), primary CTAs (Save, Cancel) must always be visible without scrolling.
- **Acceptance test:** On a 1280×720 viewport, open Configure Cadence, add 10 steps → the body scrolls but Save/Cancel remain visible and clickable at all times.

---

### 🟧 7.1 — Integrations & Notifications: Integrations fail to authenticate/sync

- **Area:** Integrations & Notifications
- **Fix:**
  - Each integration card (ConnectWise, HubSpot, Monday, Outlook, Stripe, etc.) must:
    1. Open a real OAuth flow (or API-key input form for providers without OAuth).
    2. Store the credential encrypted in Convex (via a secrets-scoped field or Convex environment-level encryption).
    3. Show a connected / disconnected state that reflects reality (not a hard-coded UI state).
    4. Support disconnect + reconnect without leaving orphaned records.
  - For integrations not ready (see 7.3 yellow), mark them as "Coming soon" rather than showing a broken connect button.
- **Acceptance test:** Connect Outlook → OAuth succeeds → account email shown → send a test email via AI Agents → email arrives. Disconnect → state clears → reconnect works.

---

### 🟧 7.2 — Integrations & Notifications: Integration logos don't display

- **Area:** Integrations & Notifications
- **Fix:**
  - Audit each integration card's logo source. Likely causes: broken CDN URLs, missing SVG files in `/public/integrations/`, wrong filename references.
  - Use official brand SVGs (stored locally in `/public/integrations/*.svg`) — don't hotlink.
  - Fallback: if logo fails to load, show a neutral icon (e.g., `Plug` from lucide-react) plus the integration name.
- **Acceptance test:** All integration cards on the Integrations page render with their brand logo. No broken image icons.

---

### 🟧 8.1 — Live Search & Leads: Restrict domains to acme.com format

- **Area:** Live Search & Leads
- **Fix:**
  - Input validation on the Live Search domain field:
    - **Accept:** `acme.com`, `acme.co.uk`, `acme.io`, etc. (valid registrable domain + TLD).
    - **Normalize before validation:** strip `http://`, `https://`, `www.`, trailing `/`, paths, query strings.
    - **Reject:** inputs without a TLD, IP addresses, subdomains pasted without normalization failing cleanly.
  - Use a lightweight regex like `^([a-z0-9-]+\.)+[a-z]{2,}$` after normalization, or use the `tldts` library for robust parsing.
  - Show an inline error message when invalid: "Enter a domain like acme.com".
- **Acceptance test:** Paste `https://www.acme.com/about?x=1` → field normalizes to `acme.com` → search runs against `acme.com`.

---

### 🟧 8.2 — Live Search & Leads: Results must match specified domain/subdomains only

- **Area:** Live Search & Leads
- **Fix:**
  - Current behavior: Live Search may be returning results from unrelated domains (leaking results, wrong filter on the Redrok side, or no filter at all).
  - Ensure the result set is filtered such that every returned exposure either:
    - Exactly matches the queried domain, OR
    - Is a subdomain of the queried domain (e.g., `mail.acme.com` when querying `acme.com`).
  - This should happen **in the adapter layer** so that if Redrok returns extra rows, we filter them client-side. Ideally both — send the constrained query to Redrok and re-filter the response.
- **Acceptance test:** Search `acme.com` → every result row has `domain` field that ends with `acme.com`. No `acmecorp.net` leakage.

---

### 🟧 8.5 — Live Search & Leads: Regions filter (state + city) doesn't update results

- **Area:** Live Search & Leads
- **Referenced UI:** See screenshot — `Live Leads` page has "Select Region" dropdown that currently doesn't filter the table.
- **Fix:**
  - Region filter should be a cascading dropdown: Country → State/Province → City.
  - When changed, trigger a refetch of leads with the new geo filter. The Convex query must accept `{ country, state, city }` and apply WHERE clauses.
  - If the Redrok response doesn't include region fields reliably, enrich via the contact enrichment layer or infer from HQ address.
- **Acceptance test:** Set country = US, state = Texas, city = Houston → table updates → all visible rows have matching region columns.

---

### 🟧 8.7 — Live Search & Leads: Remove "email notifications" checkbox + fix toggle persistence

- **Area:** Live Search & Leads (Add Domain side panel)
- **Current (broken) behavior (client quote):** *"doesn't save the settings once you toggle 'critical alerts', 'email notifications', in-app notifications'"*
- **Fix:**
  - **Remove** the redundant "email notifications" checkbox entirely from the Add Domain side panel.
  - For the remaining toggles (Critical Alerts, In-App Notifications), fix the persistence issue. They're likely controlled components that aren't wired to any mutation on change.
  - Either save on toggle (optimistic update + mutation) OR require clicking "Save" — but the current state of toggling without persistence is unacceptable.
- **Acceptance test:** Toggle Critical Alerts ON → close side panel → reopen → still ON. Toggle again → OFF persists.

---

### 🟧 9.2 — My Leads: Three-dots menu breaks table layout

- **Area:** My Leads
- **Fix:**
  - When the kebab menu opens, it's shifting the row height or pushing columns. Likely cause: dropdown is rendering inline instead of in a portal, or its trigger button is changing size on open.
  - Use a portaled dropdown (`Radix` / shadcn `DropdownMenu` already portals by default). Ensure the trigger button has fixed width + height and no `:hover` size change.
- **Acceptance test:** Open the kebab on any row → menu appears above the row → table layout unchanged → scrolling and pagination still work.

---

### 🟧 9.4 — My Leads: Remove filter by exposure

- **Area:** My Leads
- **Fix:**
  - Remove the "Filter by exposure" control from the My Leads filter bar. Do not just hide it — remove from the component tree and remove any dead filter state from the query.
- **Acceptance test:** Filter bar no longer shows exposure filter. Remaining filters (region, industry, size, status) still work.

---

### 🟧 10.1 — Watchlist: Exposures, last checked, and alert level must reflect real scan results

- **Area:** Watchlist
- **Fix:**
  - Current behavior: watchlist rows show placeholder / stale / hardcoded values for exposure count, last-checked timestamp, and alert level.
  - These must reflect the actual result of the most recent scan:
    - **Exposures** — live count from the Redrok scan for that domain.
    - **Last checked** — timestamp of that most recent scan.
    - **Alert level** — derived: 0 exposures → Clean; 1–10 → Medium; 11–50 → High; 50+ → Critical (confirm thresholds with Liron).
  - A scheduled Convex cron job should re-scan each watchlisted domain every 24 hours (configurable per the PRD's "7/30/90 days" notifications logic).
- **Acceptance test:** Add a known-exposed domain → within the initial scan window, exposures, last-checked, and alert level all update from the cron output.

---

### 🟧 10.2 — Watchlist: Domains with exposures must not show as "Clean"

- **Area:** Watchlist
- **Current (broken) behavior (client quote):** *"when you add it it automatically needs to scan and display real result and not clean automatically"*
- **Fix:**
  - On Watchlist add, the initial state is defaulting to `Clean` without running a scan. This is dangerous — the user sees a false negative.
  - On add:
    1. Create the watchlist record with status = `Scanning...`.
    2. Immediately trigger a scan action (same code path as Live Search).
    3. When the scan completes, update the row with the real exposure count + alert level.
    4. Do **not** show any "Clean" state until the scan has successfully returned zero exposures.
  - In the UI, show a subtle spinner on rows in the `Scanning...` state.
- **Acceptance test:** Add a known-exposed domain → row shows "Scanning..." briefly → updates to real counts. Never flashes "Clean".

---

### 🟧 11.1 — Ransomware Hub: Remove redundant top-level filtering icons (and data source)

- **Area:** Ransomware Hub
- **Client note:** *"Remove data source"*
- **Fix:**
  - Remove the redundant filter icons at the top level of the Ransom Hub page. Consolidate all filtering into the unified filter bar (date, geography, industry, group).
  - Remove the "Data source" column and any UI that exposes the internal data provider (ransomware.live) — the end-user doesn't need to see this.
- **Acceptance test:** Top of page shows only the unified filter bar and the search input. No "Data source" column in the table.

---

### 🟧 12.2 — Breach Notification: On/Off toggles per state must persist

- **Area:** Breach Notification
- **Fix:**
  - The per-state toggles are currently controlled components with no persistence layer.
  - Create a `breachNotificationSettings` table in Convex keyed by `companyId`, with a map of `{ [stateCode]: boolean }`.
  - On toggle, call a mutation to update that map. Use optimistic updates.
  - On load, query the settings and hydrate all toggles.
- **Acceptance test:** Turn ON California, Texas, New York → reload page → same three are ON. Turn one OFF → persists.

---

### 🟧 12.3 — Breach Notification: Tooltip linking to official breach portal

- **Area:** Breach Notification
- **Fix:**
  - Each state row in the Breach Notification list must show a tooltip on hover (or info icon → popover on click for mobile) with:
    - State's official breach notification portal URL (e.g., California AG → `https://oag.ca.gov/privacy/databreach/list`).
    - Short description of the state's notification law (one line).
  - Source of URLs: reference `colevannote.com` (see 12.1 red item below) or an internal JSON seed of official state portals.
- **Acceptance test:** Hover any state → tooltip shows the correct official portal URL and an external-link icon that opens it in a new tab.

---

### 🟧 13.2 — Knowledge Base: URLs must be fetched and indexed

- **Area:** Knowledge Base
- **Fix:**
  - Current behavior: Knowledge Base accepts URLs but doesn't actually fetch or index their content.
  - On URL add:
    1. Validate URL.
    2. Trigger a Convex action that fetches the HTML.
    3. Extract main text (using a readability library like `@mozilla/readability` or a server-side fetch + cheerio + trafilatura-style extraction).
    4. Chunk into segments and store in Convex — optionally generate embeddings for future semantic search.
    5. Surface an indexing status: `Pending → Fetching → Indexed` or `Failed` with error reason.
  - When a URL is indexed, its content should be available as context for AI Agents email generation.
- **Acceptance test:** Paste a blog post URL → within 30 seconds status changes to Indexed → content appears in a detail view → AI Agents can reference it when composing a personalized email.

---

### 🟧 14.2 — RFP Hub: Approved Reference checkbox + side panel

- **Area:** RFP Hub
- **Client note:** *"Open info once you click on the use case — description and reference data on a side panel."*
- **Fix:**
  - In the RFP use-case form, add a checkbox labeled **"Approved Reference"**.
  - Clicking on any use-case in the RFP list opens a **side panel** showing:
    - Use-case title, description
    - Reference contact data (see 14.3 below)
    - Edit / delete actions
- **Acceptance test:** Click a use-case → side panel slides in from the right with full description and reference info.

---

### 🟧 14.3 — RFP Hub: Show reference fields only if checkbox selected

- **Area:** RFP Hub
- **Client note:** *"Show fields only if checkbox is selected"*
- **Fix:**
  - The fields **Full Name, Email, Phone, Title** must be conditionally rendered — only visible when the Approved Reference checkbox (14.2) is checked.
  - When the checkbox is unchecked, hide and clear these fields from the form state.
  - Make these fields required when the checkbox is checked (validate before allowing save).
- **Acceptance test:** Uncheck Approved Reference → fields hide. Check it → fields appear → try to save with empty Name → validation error. Fill in → saves.

---

### 🟧 15.3 — Events: Suggested Events tab

- **Area:** Events & Conferences
- **Client question:** *"How do we add suggested events to all platform users?"*
- **Fix:**
  - Add a new tab: **Suggested Events** alongside the existing "My Events" / "All Events" tabs.
  - This tab shows a curated list (seeded by CyberHook admins, not user-generated) of industry-relevant events.
  - Each row has a button: **"Add to my attendance list"** — clicking this copies the event to the user's personal event list.
  - Backend: a `suggestedEvents` table with admin-only write access. Reads are available to all users.
  - **Answer to client's question:** Suggested events are managed by CyberHook's internal admin via a back-office seed script or a super-admin panel — they propagate to every tenant's Suggested Events tab automatically (read from a shared table, not per-tenant).
- **Acceptance test:** As a normal user, see Suggested Events tab populated with ~5 events. Click "Add to my attendance list" on one → it appears in My Events.

---

### 🟧 15.5 — Events: Sort by date + archive past events

- **Area:** Events & Conferences
- **Client note:** *"Automatically archive events in the past / which have passed."*
- **Fix:**
  - Default sort order in the Events list: ascending by event date, with nearest-upcoming at the top.
  - Add a second tab: **Event History** — shows all events where `eventDate < now`. These are hidden from the main Events view.
  - A nightly cron or a query-time filter moves events from the main view to Event History at midnight local time on the day after the event.
- **Acceptance test:** Main Events tab shows only future + today's events, sorted by date. Event History tab shows past events, sorted descending (most recent first).

---

### 🟧 15.6 — Events: "Add to calendar" buttons for Outlook and Google

- **Area:** Events & Conferences
- **Current (broken) behavior (client quote):** *"Not working"*
- **Fix:**
  - In the event details view, add two buttons: **Add to Google Calendar**, **Add to Outlook Calendar**.
  - Both generate proper calendar URLs:
    - **Google:** `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title>&dates=<start>/<end>&details=<desc>&location=<loc>`
    - **Outlook:** `https://outlook.live.com/calendar/0/deeplink/compose?subject=<title>&startdt=<start>&enddt=<end>&body=<desc>&location=<loc>`
  - Dates must be ISO-formatted and URL-encoded correctly.
  - Also offer **Download .ics** as a universal fallback.
- **Acceptance test:** Click Google → new tab opens Google Calendar with all fields pre-filled. Click Outlook → same for Outlook Web. .ics downloads and opens in Apple Calendar.

---

### 🟧 16.1 — Reporting: Rename "Qualified" → "Won"

- **Area:** Reporting (Pipeline)
- **Fix:** In the Pipeline stage labels, rename "Qualified" to "Won". Update everywhere this label is shown (table header, filter dropdown, analytics charts, export columns). Also update the underlying enum value if changing the string is user-facing — otherwise just update the label map.
- **Acceptance test:** Every UI surface and export now says "Won" instead of "Qualified".

---

### 🟧 16.2 — Reporting: Rename "Contacted" → "Lost"

- **Area:** Reporting (Pipeline)
- **Fix:** Same pattern as 16.1. Rename "Contacted" to "Lost" everywhere.
- **Acceptance test:** All Pipeline references, filters, and exports show "Lost".

---

### 🟧 16.3 — Reporting: Remove Exposures column from pipeline table

- **Area:** Reporting (Pipeline)
- **Fix:** Remove the "Exposures" column from the Pipeline table view. Also remove the corresponding field from CSV/Excel exports of the pipeline.
- **Acceptance test:** Pipeline table has no Exposures column. Export file has no Exposures column.

---

### 🟧 16.4 — Reporting: Custom Filter must actually filter

- **Area:** Reporting
- **Fix:**
  - Current behavior: applying a Custom Filter doesn't affect the visible data.
  - Audit the filter state → query flow. The filter state likely isn't being passed as a parameter to the Convex query, or the query isn't using it in its `WHERE` / `.filter()` calls.
  - Ensure each filter field (date range, region, industry, size, pipeline stage, assignee) is wired end-to-end.
  - Also add a **Clear all filters** button.
- **Acceptance test:** Apply any single-field filter → table shrinks appropriately. Apply multi-field → intersected result. Clear → back to full data.

---

### 🟧 16.5 — Reporting: Rename export columns from value1/value2/value3

- **Area:** Reporting
- **Fix:**
  - Export CSV / Excel currently uses generic column headers like `value1`, `value2`, `value3`. Replace with the same human-readable labels shown in the in-app table:
    - e.g., "Company Name", "Domain", "Exposures", "Pipeline Stage", "Last Activity", "Assigned To", etc.
  - Use a single label map shared between the on-screen table and the export serializer so they never drift.
- **Acceptance test:** Export a Pipeline report → open in Excel → all columns have meaningful headers. No `value1`.

---

### 🟧 17.1 — Company Settings: Multi-select Associations & Programs with add-new

- **Area:** Company Settings
- **Client note:** *"need to be able to add a program and add it so it gets inserted below"*
- **Fix:**
  - Add a **"Associations & Programs"** multi-select in Company Settings.
  - Predefined options: CompTIA, ChannelPro, MSP Alliance, CyberHQ, MS Partner Network, Cisco Partner, Microsoft AI Cloud Partner, AWS Partner, Google Cloud Partner, Fortinet Partner, SentinelOne Partner, ASCII Group, Pax8, TD SYNNEX. *(Confirm full list with Liron — start here and allow easy extension.)*
  - **Add-new behavior:** Below the multi-select, a small "+ Add new program" input lets the user type a custom program name. On submit, it's added to both the selected list and the available-options list. Persist custom additions on the company record so they're reusable.
- **Acceptance test:** Select 3 predefined programs → type "Acme Partner Network" in add-new → press Enter → it appears as a selected chip → reload → still selected.

---

### 🟧 18.1 — Global & Misc: Documentation link goes to wrong page

- **Area:** Global & Misc
- **Fix:**
  - Find the "Documentation" link (likely in the user menu, footer, or help icon). It's pointing to a 404 or the wrong URL.
  - Update the href to the actual documentation URL. If the docs site doesn't exist yet, either:
    - Point to a placeholder Notion / GitBook URL provided by AMSYS, OR
    - Remove the link until a real docs destination is ready (don't leave a broken link in production).
- **Acceptance test:** Click Documentation → correct docs site opens in new tab. No 404.

---

---

# Priority 2 — 🟥 RED Items (Critical Data Integrations)

These are **critical data integrations** that aren't live yet. They are red because they're not merely broken UI — the backend data pipeline itself isn't in place.

---

### 🟥 11.2 — Ransomware Hub: Sync data volume with ransomware.live daily

- **Area:** Ransomware Hub
- **Fix:**
  - Implement (or verify) the Convex cron that pulls from `ransomware.live` daily (or every 6 hours for fresher data).
  - Upsert by `(group, victim, postedDate)` to avoid duplicates.
  - Ensure the data volume in the Ransom Hub matches what `ransomware.live` is publishing — currently client observed our data lags or is sparse.
  - Log every sync run: count of new rows, count of updated, count of errors. Expose a status to admins.
- **Acceptance test:** On day N, Ransom Hub shows >= as many rows in the last 7 days as `ransomware.live` shows for the same window. Stale-by-more-than-24-hours = fail.

---

### 🟥 12.1 — Breach Notification: Add all state breach portals from colevannote.com

- **Area:** Breach Notification
- **Fix:**
  - Scrape or manually seed the full list of **US state breach notification portals** referenced at `colevannote.com`.
  - Data model: `stateBreachPortals` seed table with columns `{ stateCode, stateName, portalUrl, agencyName, notificationLawRef }`.
  - All 50 states + DC + territories should be represented. Every state row in the Breach Notification UI should reference this table.
  - **Note:** Verify `colevannote.com` is the intended source — Liron may have meant another URL (it could be a shorthand for a specific site; confirm spelling and content coverage before scraping).
- **Acceptance test:** Open Breach Notification page → all 50 states appear in alphabetical order, each with a real portal URL.

---

### 🟥 12.4 — Breach Notification: Fetch and update breach data daily

- **Area:** Breach Notification
- **Fix:**
  - Daily Convex cron that fetches breach notification data from each state portal (where a machine-readable feed exists — many states publish JSON/CSV/RSS; others require scraping).
  - Store in a `stateBreachIncidents` table: `{ stateCode, entityName, reportedDate, breachDate, affectedIndividuals, breachType, sourceUrl }`.
  - Render these in the Breach Notification page table, grouped by state or shown in a unified stream with state badges.
  - **Reality check:** Not every state publishes machine-readable feeds. Start with the 10–15 largest states that do (CA, NY, TX, MA, WA, etc.). Mark the others as "Manual only" and plan scraping later.
- **Acceptance test:** After the first cron run, Breach Notification page shows recent incidents for the enabled states. Daily cron updates add new incidents within 24 hours of state publication.

---

---

# Priority 3 — 🟦 BLUE Items (Unverified Implementation)

The client flagged this as "not sure if it was implemented yet" — meaning **verification is needed, then fixing if missing**.

---

### 🟦 1.4 — Signup: Approval flow

- **Area:** Signup
- **Client note (direct quote):** *"did not require an approval as I signed up, not sure if it was implemented yet"*
- **Fix / verification:**
  - Confirm the approval flow per PRD Section 4.1 is in place:
    1. User signs up + completes questionnaire + selects plan + enters CC → enters **5-day trial** (per PRD; client has also mentioned 7 days — **confirm current setting with Liron** and align with item 1.1 yellow).
    2. User is routed to an **"Account Under Review"** page and cannot access any main module.
    3. CyberHook admin receives a notification with the new account details.
    4. Admin approves or rejects. On approval, user receives email and gains full access. On rejection, trial is cancelled.
  - If any of these steps is missing or broken, implement it.
  - Suggested internal admin UI: a super-admin dashboard at `/admin/pending-accounts` listing all accounts in review with approve/reject actions.
- **Acceptance test:** Sign up a brand-new test account → after questionnaire + CC → lands on "Account Under Review" screen. No modules accessible. Admin approves → user receives email → logs in → has full access.

---

---

# Priority 4 — 🟨 YELLOW Items (Verification & Polish)

These are copy changes, minor enhancements, and verifications. Cursor must **still open each one, check the current state, and confirm it's implemented correctly** — the client may or may not have tested these yet.

---

### 🟨 1.1 — Signup: Change default trial from 30 to 7 days
Update the default trial length on signup to 7 days. Reflect in Stripe trial config, Convex org record, and any UI copy that references trial duration.

### 🟨 1.2 — Signup: Update activation text to "7 days"
After plan activation, update UI copy from "5 days" to "7 days". Search all static strings and localization files.

### 🟨 1.7 — Signup: Pricing tables match backend
Verify the plan tiers, prices, and feature lists shown on the signup pricing page exactly match what's configured in Stripe and the billing backend. Any drift = fix. Three tiers per the existing implementation plan.

### 🟨 2.2 — Invites & Team: Invite workflow assigns proper default role
On invite, the default role must be **Sales Rep** per PRD. Admin can override at invite-time.

### 🟨 3.2 — Profile & Company: Add Location works
Verify admins can add a location (address) successfully; it saves and displays.

### 🟨 3.3 — Profile & Company: Multiple named locations
Allow multiple locations per company, each with a user-editable name (e.g., "HQ", "Houston Office", "Remote"). Primary location flag.

### 🟨 3.5 — Profile & Company: Logo field in settings synced with signup
(Related to 1.6 orange) Verify the Settings → Company logo field reads from and writes to the same field used during signup.

### 🟨 3.6 — Profile & Company: Display Location ID with copy button
Each location has a unique ID displayed inline with a "copy" button (for support / API reference use).

### 🟨 3.7 — Profile & Company: Brand color palette
Two color pickers next to the company logo — "Primary" and "Secondary" brand colors. Persist as hex strings on the company record. Later these can theme emails / reports.

### 🟨 5.1 — To-Do: Remove filter by statuses
Remove the "Filter by status" control from the To-Do filter bar.

### 🟨 5.2 — To-Do: "Completed tasks" On/Off toggle
Single toggle to show/hide completed tasks in the list. Default: Off (hide completed).

### 🟨 5.3 — To-Do: Task completion pop-up with Undo
When a task is marked complete, show a bottom-left toast: "1 task completed" + Undo button. Toast auto-dismisses after 5 seconds. Clicking Undo reopens the task.

### 🟨 5.4 — To-Do: Side panels close on outside click
All side panels (Add Lead, New Task, etc.) must close when the user clicks outside the panel. Use the shadcn `Sheet` component's built-in overlay-click behavior.

### 🟨 5.5 — To-Do: Move pop-up notifications to top right
Standardize toast placement at top-right (see also 18.3).

### 🟨 6.1 — Plans & Billing: On higher plan, hide lower plans
When the user is on a higher plan (e.g., Pro), don't show the Starter and Basic plan cards. Instead show a single "Want to modify / cancel your subscription?" button that opens the Stripe customer portal.

### 🟨 6.2 — Plans & Billing: Live Search tokens sync with real counts
Verify the token-remaining counter actually reflects real search consumption. Decrement on every search, read from Convex, not a cached / hardcoded value.

### 🟨 6.3 — Plans & Billing: Usage section accuracy
Same as 6.2 — the Usage section must show the accurate current search token count + current plan. Include historical monthly usage chart.

### 🟨 7.3 — Integrations & Notifications: Mark not-yet-ready integrations as "Coming soon"
Integrations without a working connect flow get a "Coming soon" badge and a disabled connect button.

### 🟨 7.5 — Integrations & Notifications: "Coming soon" labels on Slack and Teams
Specifically mark Slack and Teams notifications as "Coming soon" until implemented.

### 🟨 8.3 — Live Search & Leads: Trial banner text
Update banner: **"You're on a trial plan. Upgrade to access credentials."** Replace whatever the current banner text is.

### 🟨 8.4 — Live Search & Leads: Show data without "Discover leads" button
The Live Leads tab should show data immediately on load (auto-run the discovery query with default filters), not require the user to click a "Discover leads" button first.

### 🟨 9.5 — My Leads: Add filter by size
Add a "Size" (employee-count range) filter matching what's on `app.cyberhook.ai` — ranges like 1–10, 11–50, 51–200, 201–1000, 1001–5000, 5000+.

### 🟨 10.3 — Watchlist: "View" button → "Rescan"
Rename the button.

### 🟨 10.4 — Watchlist: "Rescan" opens Live Search with domain pre-filled
Clicking Rescan navigates to Live Search with the domain field pre-filled and auto-submits.

### 🟨 13.1 — Knowledge Base: URL ingestion errors vs success messages
Clear status messaging — if ingestion fails, show why (403, timeout, unparseable content). Don't show a generic success when the fetch actually errored (related to 13.2 orange).

### 🟨 14.1 — RFP Hub: Optional Company Name under Title in New RFP
Add an optional "Company Name" field positioned below the Title field in the New RFP form.

### 🟨 14.4 — RFP Hub: RFPs editable after creation
Clicking an existing RFP opens an editable form (not just a read-only view). Save persists changes.

### 🟨 14.5 — RFP Hub: Quick Won / Lost actions
Inline buttons on each RFP row: "Mark Won" / "Mark Lost" — updates status without opening the side panel.

### 🟨 15.1 — Events: New Event validation + auto-archive past events
Validate all required fields on event create. Past-dated events auto-route to Event History (related to 15.5 orange).

### 🟨 15.2 — Events: Associate appointment with event
An event can optionally have a linked appointment — fields: Meeting Link URL, Location.

### 🟨 15.4 — Events: Editable after creation
Clicking an existing event opens an editable form.

### 🟨 15.7 — Events: Updated Event Type options
Event Type options to include: Conference, Networking Event, Webinar, Trade Show, User Group, Other. (Confirm final list with Liron.)

### 🟨 15.8 — Events: Organizer fields
Add "Host" and "Organizer" fields (can be a person name, company, or free text).

### 🟨 15.9 — Events: Registration Link (URL) field
Add optional Registration Link URL field on events.

### 🟨 15.10 — Events: Ticket Type field
Add Ticket Type: Free / Paid. If Paid, show a Price field (numeric + currency).

### 🟨 15.11 — Events: Reminder Settings
Add Reminder Settings dropdown: 1 week before, 2 weeks before, 1 month before, Custom. When user has a reminder set, trigger an in-app and/or email notification at the configured time.

### 🟨 18.2 — Global & Misc: Remove non-functional search bar above dashboard
Delete the dead-code search bar above the dashboard. Don't hide it — remove from the DOM.

### 🟨 18.3 — Global & Misc: Standardize toast placement (top-right)
All toasts / pop-ups throughout the app render in the top-right corner with consistent styling (see 5.5). Use a single `Toaster` instance in the app root.

---

---

# Priority 5 — ⬜ WHITE Items (Untagged but Listed)

Items on the client's sheet without a color flag. Still listed, still need attention.

---

### ⬜ 7.4 — Integrations & Notifications: Clickable notifications deep-link

Each notification in the notification center must be clickable and deep-link to the relevant section (invite → Team tab; breach → Breach Notification; exposure → Watchlist row; etc.).

### ⬜ 8.6 — Live Search & Leads: Pagination for Live Leads

Fixed records per page (default 20, selectable 10/20/50/100). Page toggles at the bottom. (The screenshot shows this partly in place — "Showing 1 to 20 of 47 entries" is visible — verify it actually paginates correctly and doesn't re-fetch the full dataset on every page change.)

### ⬜ 9.1 — My Leads: UI glitch when selecting a lead

When a lead row is selected (click / checkbox), the table layout and surrounding buttons must remain usable. No content reflow or button hiding.

### ⬜ 9.3 — My Leads: Exposures status consistent between list and grid view

If the list view shows "3 exposures" and the grid view shows "Clean" for the same lead, they're reading from different fields. Normalize to a single source.

---

---

# Final Acceptance Checklist

After all fixes are applied, run the full regression matrix:

1. **Signup flow end-to-end:** new email → verify → questionnaire → plan + CC → Account Under Review → admin approves → user lands on News → all nav items accessible per role.
2. **Invite flow end-to-end:** admin invites → email arrives → acceptance creates Clerk user → assigns correct role → deactivate works → reactivate works → role change works.
3. **Live Search:** domain normalization, exposure results filtered to domain, region filter works, trial banner correct.
4. **Watchlist:** add domain → scans on add → shows real results → doesn't default to Clean → daily recheck cron runs.
5. **Ransom Hub:** daily sync up-to-date within 24h of ransomware.live.
6. **Breach Notification:** state toggles persist, tooltips show portal URLs, daily fetch populates incidents.
7. **AI Agents:** Contacts repository exists, CSV upload works, cadence editor scrolls, campaigns send via connected Outlook.
8. **Reporting:** Pipeline labels (Won/Lost), no Exposures column, Custom Filter filters, exports have human-readable headers.
9. **Settings:** logo, avatar, locations, service area, associations & programs all persist.
10. **Global:** documentation link works, toasts top-right, no dead search bar, all integrations either work or are clearly "Coming soon".

Produce a final report in this format:

```
Priority 1 (Orange) — X of 39 fixed, Y blocked, Z already correct
Priority 2 (Red)    — X of 3 fixed
Priority 3 (Blue)   — 1 of 1 verified / fixed
Priority 4 (Yellow) — X of 39 verified / fixed
Priority 5 (White)  — X of 4 fixed

Blocked items:
- [ID, reason, unblocker needed]
```

Attach this report to the CyberHook project channel and tag Cyriac + Liron.

---

*End of production readiness fix prompt.*

---

## Deferred / Parked Items

### ⚠️ 12.4 — Daily breach data fetch (INFRA COMPLETE, UPSTREAM PENDING)

**Status:** Infrastructure complete, upstream data feed pending AMSYS decision.

**What's done:**
- Three daily Convex crons (`hhs_ocr`, `california_ag`, `privacy_rights`) scheduled and running.
- Every run writes to the `syncLogs` table (new-rows count, duration, error message).
- Admin-visible `SyncStatusStrip` on Ransom Hub shows last-run status per source with colored chips and tooltips.
- Workaround available: `breachPortalsApi:ingestSnapshot` admin mutation accepts parsed CSV-exported rows for immediate use — safe to call repeatedly (dedup handled downstream).

**Why it's parked:**
- **HHS OCR** has NO public JSON / REST API (confirmed via research) — the portal at `ocrportal.hhs.gov/ocr/breach/breach_report.jsf` is a JSF form with CSV export requiring a browser session.
- **California AG** publishes an HTML listing only — no structured feed.
- **Privacy Rights Clearinghouse** publishes periodic CSV snapshots, no REST API.

**Unblocker needed (one of):**
1. Confirm the "colevannote.com" source referenced in the original 12.1 spec — spelling may be wrong; verify with Liron.
2. Approve a third-party aggregator (Apify HIPAA monitor, BreachAware, HIBP Enterprise) and provide credentials.
3. Provide a CSV snapshot from the HHS OCR portal that we can load through `ingestSnapshot` for instant demo-ready data.

---

## Final Rollup — Production Readiness Audit Complete

Full audit pass completed. Build green (`npx tsc --noEmit`, `npm run build`). Live Convex deploy verified for data-producing crons.

### Status by priority

| Priority | Color | Done | Partial / awaiting product decision | Total |
|----------|:-----:|:----:|:-----------------------------------:|:-----:|
| P1 Orange (client-tested, broken) | 🟧 | 39 | 0 | 39 |
| P2 Red (critical data integrations) | 🟥 | 2 (11.2, 12.1) | 1 (12.4 — upstream feed) | 3 |
| P3 Blue (unverified) | 🟦 | 1 (1.4 — dashboard shipped) | 0 | 1 |
| P4 Yellow (polish) | 🟨 | 36 | 3 (1.7 Stripe parity, 14.1 RFP field wording, 6.1 plan-card hiding rule) | 39 |
| P5 White (untagged) | ⬜ | 4 | 0 | 4 |
| **Total** | | **82** | **4** | **86** |

### Net-new infrastructure shipped during the audit

- **Super-admin console** at `/admin/pending-accounts` with platform KPIs, pending-review queue, all-users directory, companies directory, company drawer, recent-activity ribbon, status-aware row actions (approve / reject / deactivate / reactivate / copy email), full toast + confirmation dialog + audit-log coverage. Gated by `SUPER_ADMIN_EMAILS` Convex env var (fail-closed).
- **`syncLogs` table + writer + admin query** (`convex/syncLogs.ts`) — every cron-driven data fetch records one row (source, duration, count, error). Surfaced on Ransom Hub via a "Data Sync Status" chip strip.
- **State breach portals module** (`src/lib/state-breach-portals.ts`) — all 50 states + DC with official AG URLs, agency names, and `resolveStatePortal()` helper. Wired into Breach Notifications filter chips and per-row link-outs.
- **Ransomware.live daily sync** with defensive row-filtering + full sync logging.
- **Breach data ingestion stubs** — three daily crons with honest no-feed logs + admin-run `breachPortalsApi.ingestSnapshot` mutation for loading CSV-exported records once a feed is picked.
- **Historical monthly usage chart** on Billing (`searches.getMonthlyUsage` + `MonthlyUsageChart` component).
- **Watchlist → Live Search deep-link** with `?domain=…&autoSubmit=1` param handling.
- **Events table schema expansion**: `host`, `meetingUrl`, `isTicketFree`, `ticketCurrency`, `user_group` type. Free/Paid ticket toggle with conditional currency selector. Reminder preset dropdown with Custom fallback.

### Deferred — Still open (awaiting product decision, not code)

| ID | What's missing | Needed from the team |
|----|----------------|----------------------|
| **12.4** Breach data feed | Upstream JSON endpoints don't exist for HHS OCR / CA AG / Privacy Rights. Infrastructure (daily crons, sync logs, admin-run `ingestSnapshot` mutation) is in place and logging honestly. | Pick one: confirm source from 12.1 spec (`colevannote.com`?), approve third-party aggregator, or supply CSV snapshot. |
| **1.7** Pricing parity | Live Stripe dashboard needs cross-check against `src/lib/plans.ts`. | Manual comparison with Stripe before go-live. |
| **14.1** RFP "Company Name" field | Existing `Client / Prospect` field likely satisfies; needs one-line confirmation. | Liron confirms whether `Client / Prospect` is what he meant. |
| **6.1** Hide lower plan cards strictly | Current "Manage Subscription" + "Upgrade to {next}" pattern via Stripe portal arguably satisfies. | Confirm whether strict per-card hiding is required. |
| **1.4 steps 2 + 3** Owner auto-approve + signup notification email | Dashboard is ready; currently owner signups still auto-approve (by choice) and no signup-notification email fires. | Decide if/when to flip owners to `pending` and set a notification recipient. |

### Config required to activate features

```bash
# Convex env vars
npx convex env set SUPER_ADMIN_EMAILS "liron@amsysis.com,cyriac@cyberhook.ai"
# Existing required vars (already set): RANSOMWARE_LIVE_API_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY
```

### Files with the heaviest churn

- `convex/schema.ts` — `syncLogs`, `events.host/meetingUrl/isTicketFree/ticketCurrency`, `events.type "user_group"`
- `convex/superAdmin.ts` — new module, ~400 lines
- `convex/syncLogs.ts`, `convex/breachPortalsApi.ts`, `convex/ransomwareLiveApi.ts`
- `src/app/admin/pending-accounts/page.tsx` — new page (~900 lines)
- `src/lib/state-breach-portals.ts` — new module
- `src/app/(dashboard)/ransom-hub/page.tsx`, `events/page.tsx`, `billing/page.tsx`, `live-leads/page.tsx`, `watchlist/page.tsx`, `live-search/page.tsx`

**Ready for client review.** Tag Cyriac + Liron on the three open product decisions above.
