# CyberHook — Client Review Fixes & Implementation Guide

> **Source:** Loom recordings from client (Liron @ AMSYS) — April 1, 2026
> **Purpose:** Exhaustive, phase-sequenced instructions for Cursor AI to implement all fixes, enhancements, and wiring identified during the client's live walkthrough of the deployed build.
> **Priority note from client:** "Let's focus around Live Search and Live Leads first."

---

## Table of Contents

1. [Phase 1 — Critical Bug Fixes & UI Corrections](#phase-1--critical-bug-fixes--ui-corrections)
2. [Phase 2 — Core Module Functionality (Live Search & Live Leads Priority)](#phase-2--core-module-functionality-live-search--live-leads-priority)
3. [Phase 3 — Secondary Module Fixes & Enhancements](#phase-3--secondary-module-fixes--enhancements)
4. [Phase 4 — Settings, Billing, Integrations & Polish](#phase-4--settings-billing-integrations--polish)
5. [Phase 5 — Comprehensive Playwright E2E Tests](#phase-5--comprehensive-playwright-e2e-tests)

---

## Tech Stack Reference

- **Framework:** Next.js 14 (App Router)
- **Backend/DB:** Convex
- **Auth:** Clerk
- **Billing:** Stripe
- **Styling:** Tailwind CSS + shadcn/ui
- **External Data API:** Redrok API (`dash-api.redrok.io`)
- **Ransomware Data:** ransomware.live (public API)

---

## Phase 1 — Critical Bug Fixes & UI Corrections

These are visual bugs, broken navigation links, and UI misalignments that must be fixed first because they affect every page and the client's first impression.

---

### 1.1 — News Dashboard: Counter Misalignment

**Problem:** The KPI counter tiles on the News (Home Dashboard) page are visually misaligned — the numbers and labels are not properly centered or evenly spaced within their tile containers.

**Fix instructions:**
1. Open the News/Dashboard page component (likely `app/(dashboard)/news/page.tsx` or similar).
2. Locate the KPI tile grid — this is the row of metric cards (MRR, Appointments, Searches, Emails, Calls).
3. Ensure every tile uses identical height, padding, and flex alignment. Use `items-center justify-center` on the inner content wrapper.
4. The counter number (large font) and its label (smaller font below) must be vertically centered within each tile.
5. All tiles in the row must be the same height — use `h-full` on the card component and `grid grid-cols-5 gap-4` (or however many tiles) on the parent with `items-stretch`.
6. Test at multiple viewport widths (1280px, 1440px, 1920px) to confirm alignment holds.

---

### 1.2 — News Dashboard: Task Count Mismatch

**Problem:** The "Today" panel on the News dashboard shows a task count of "10" but there is only 1 task in the system. The counter is not reflecting the actual number of tasks.

**Fix instructions:**
1. Locate the "Today" panel component on the News page — the section that shows "Tasks due today" and "Overdue."
2. The task count must query the actual Convex `todos` (or `tasks`) table and count only tasks where:
   - `assignedTo` equals the current user's ID, AND
   - `dueDate` is today (for "due today") OR `dueDate` is before today AND `status !== "completed"` (for overdue).
3. Do NOT use a hardcoded number or a stale cache. Use a live Convex `useQuery` hook that returns the count.
4. If there are zero tasks due today, display "0" — do not hide the section.

---

### 1.3 — News Dashboard: Tasks Not Showing (Due Date Filter Too Strict)

**Problem:** The "Today" panel shows no tasks even though tasks exist in the system. The issue is that tasks not due today are completely hidden. The client expects to see upcoming tasks as well, not just today's.

**Fix instructions:**
1. In the "Today" panel, show two sub-sections:
   - **"Due Today"** — tasks with `dueDate === today`.
   - **"Overdue"** — tasks with `dueDate < today` AND `status !== "completed"`.
2. Optionally add a third: **"Upcoming"** — tasks with `dueDate` within the next 3 days.
3. If there are tasks in the system but none match any of these windows, show a message like "No tasks due soon" instead of showing nothing.
4. Each task row should show: title, due date, priority badge, and a link/click handler to navigate to the To-Do List page.

---

### 1.4 — News Dashboard: Remove "Pipeline Value" KPI Tile

**Problem:** The "Pipeline Value" KPI tile is on the dashboard but the client says to remove it for now — the data is not available or relevant in V1.

**Fix instructions:**
1. Find the Pipeline Value tile in the KPI grid on the News dashboard.
2. Remove it entirely from the rendered output. Do not just hide it — remove the component or conditionally exclude it.
3. Adjust the grid column count so the remaining tiles redistribute evenly (e.g., if going from 5 tiles to 4, use `grid-cols-4`).

---

### 1.5 — News Dashboard: Fix "To-Do" Navigation Link

**Problem:** On the News dashboard, there is a link/button to navigate to the To-Do List page and it does not work (clicking does nothing or goes to the wrong route).

**Fix instructions:**
1. Find the "To-Do" link/button on the News dashboard — likely in the "Today" panel header or a "View All" link.
2. Ensure the `href` or `router.push` target points to the correct route for the To-Do List page (e.g., `/todo` or `/to-do-list`).
3. Verify the link renders as a Next.js `<Link>` component (not a plain `<a>` tag with a broken href).
4. Confirm the Ransom Hub link works (client confirmed it does) — use it as a reference for the correct pattern.

---

### 1.6 — News Dashboard: Remove Three-Dot Overflow Menus from All Containers

**Problem:** The KPI tiles and section containers on the News dashboard have three-dot (ellipsis/overflow) menus. The client says these are irrelevant and should be removed.

**Fix instructions:**
1. Search the News dashboard component tree for any `DropdownMenu`, `Popover`, or icon button rendering a three-dot (`MoreHorizontal`, `MoreVertical`, `EllipsisVertical`, or `...`) icon.
2. Remove these from every tile/container on the News dashboard.
3. Also apply this same removal globally to the Ransom Hub page containers (client mentioned it there too).
4. If these overflow menus are part of a shared card/tile component used across the app, add a prop like `showOverflowMenu={false}` rather than deleting the component feature entirely, so other pages can still use it if needed.

---

### 1.7 — Live Search: Counter Misalignment

**Problem:** Same counter alignment issue as the News dashboard, but on the Live Search results page — the summary counters (number of exposures, credential count, etc.) are not visually aligned.

**Fix instructions:**
1. Open the Live Search results component.
2. Apply the same alignment fix as 1.1: ensure all summary stat tiles/counters use consistent height, padding, and flex centering.
3. Numbers should be large and centered; labels should be directly below, also centered.

---

## Phase 2 — Core Module Functionality (Live Search & Live Leads Priority)

The client explicitly said: **"Let's focus around Live Search and Live Leads."** These are the highest-priority functional fixes.

---

### 2.1 — Live Search: Move Action Buttons to the Top

**Problem:** The action buttons — "Download Report", "Add to Watchlist", and "Create Lead" — are at the bottom of the Live Search results page. The client says they are very hard to reach and should be at the top.

**Fix instructions:**
1. Open the Live Search results view (the component that renders after a domain search completes).
2. Move the action button group ("Download Report", "Add to Watchlist", "Create Lead") to appear immediately below the summary stats section, ABOVE the detailed credential/exposure list.
3. Use a sticky header or a prominent button bar:
   ```
   [Summary Stats Row]
   [Action Buttons: Download Report | Add to Watchlist | Create Lead]
   [Detailed Results Table/List]
   ```
4. The buttons should be clearly visible without scrolling when results load.

---

### 2.2 — Live Search: Sample Record Disclaimer (15 Credentials Cap)

**Problem:** The Redrok API returns a maximum of 15 compromised credential records as a sample. The actual number of compromised credentials may be higher. The client wants this clearly communicated in the UI.

**Fix instructions:**
1. In the Live Search results view, wherever the compromised credentials count is displayed (e.g., "15 Compromised Credentials"), add a disclaimer.
2. If the returned count equals 15 (the sample cap), display:
   - The count as: **"15+ Compromised Credentials"** (with the `+` sign)
   - A subtitle or tooltip: **"Showing sample records. Actual count may be higher."**
3. If the count is less than 15, display the exact count without the disclaimer.
4. This applies anywhere credential counts are shown: summary tile, detail section header, and exported reports.

---

### 2.3 — Live Search: Show All Available Data (Unmask Unless Trial)

**Problem:** Some data fields in the Live Search results are masked/hidden. The client wants to show all information that comes back from the API, UNLESS the user is in trial mode — in which case data should remain masked.

**Fix instructions:**
1. Check the user's account status (trial vs. approved/paid). This likely comes from Clerk metadata or the Convex `users`/`companies` table — look for a field like `status: "trial" | "active"` or `isTrialActive: boolean`.
2. If the user is in **trial mode**: keep credential data masked (e.g., `j***@example.com`, `pass****`). Show a message: "Upgrade to view full details."
3. If the user is **active/paid**: unmask and show all data returned by the API — emails, credential sources, dates, everything available.
4. The masking logic should be in a utility function like `maskSensitiveData(value: string, isTrial: boolean)` so it can be applied consistently.

---

### 2.4 — Live Search: "Details" Button → Side Panel

**Problem:** The "Details" button on individual exposure/credential rows does not work. The client wants it to open a side panel (slide-over drawer) with full details.

**Fix instructions:**
1. For each row in the compromised credentials list, there should be a "Details" or "View" button/link.
2. Clicking this should open a **right-side slide-over panel** (not a modal, not a new page). Use shadcn/ui's `Sheet` component:
   ```tsx
   <Sheet open={isOpen} onOpenChange={setIsOpen}>
     <SheetContent side="right" className="w-[500px] sm:w-[600px]">
       <SheetHeader>
         <SheetTitle>Credential Details</SheetTitle>
       </SheetHeader>
       {/* Full detail content here */}
     </SheetContent>
   </Sheet>
   ```
3. The side panel should show:
   - Full email/credential (unmasked if user is paid, masked if trial)
   - Source/breach name
   - Date discovered
   - Type of exposure
   - Any other fields returned by the Redrok API for this record
4. Include a "Close" button and clicking outside the panel should close it.

---

### 2.5 — Live Search: Report Generation

**Problem:** The client needs the ability to generate a downloadable report after running a Live Search scan. "Similar to what you had in the cyber tool — it generates a report based on the company information and whatever is available."

**Fix instructions:**
1. The "Download Report" button (now moved to the top per 2.1) should trigger PDF report generation.
2. The report should be generated client-side or via a Convex action/serverless function. Use a library like `@react-pdf/renderer` or `jspdf` + `html2canvas`.
3. Report contents:
   - **Header:** CyberHook logo + "Exposure Report" title + generation date
   - **Company Summary:** Company name, domain, industry (if available), location
   - **Exposure Overview:** Total exposures count, date range of exposures, types of exposed data
   - **Compromised Credentials Table:** Each credential row with date, source type, masked/unmasked email (depending on trial/paid)
   - **Sample Disclaimer:** If 15 records shown, include: "This report contains sample records. Contact us for the full dataset."
   - **Footer:** "Generated by CyberHook — [date]" + "Confidential — For authorized use only"
4. The report should download as a PDF named: `CyberHook_Exposure_Report_[domain]_[YYYY-MM-DD].pdf`

---

### 2.6 — Live Leads: "Discover New Leads" as Default Active Tab

**Problem:** When navigating to the Live Leads page, the user currently has to manually click on "Discover New Leads" (or a sub-nav item) before any data appears. The client wants this to be the first/default tab that auto-loads with data.

**Fix instructions:**
1. Open the Live Leads page component.
2. The sidebar or sub-navigation within Live Leads has items like "Discover New Leads", "My Leads", etc.
3. Set "Discover New Leads" as:
   - The **first item** in the sub-nav list (move it above any other items if it's not already first).
   - The **default active** tab/section when the page loads. Use the URL path or state to default to this view.
4. On page load, automatically trigger the data fetch for "Discover New Leads" — do NOT wait for the user to click a "Search" or "Find" button.
5. The data should load immediately using the last-used filter settings (or sensible defaults like "Last 24 Hours" + "United States").
6. On every subsequent navigation to the Live Leads page, the "Discover New Leads" section should refresh its data automatically.

---

### 2.7 — Live Leads: Country Filter — US and Canada First

**Problem:** In the country dropdown filter on the Live Leads page, "United States" and "Canada" are not at the top. The client wants them prioritized.

**Fix instructions:**
1. Find the country dropdown/select component used on the Live Leads page (and apply globally to any country filter across the app).
2. Sort the options list so that:
   - "United States" is first
   - "Canada" is second
   - Then a separator or divider line
   - Then the remaining countries in alphabetical order
3. Example implementation:
   ```tsx
   const priorityCountries = ["United States", "Canada"];
   const sortedCountries = [
     ...priorityCountries,
     "---", // separator
     ...allCountries.filter(c => !priorityCountries.includes(c)).sort()
   ];
   ```

---

### 2.8 — Live Leads: Pop-ups Must Match Platform Theme

**Problem:** Pop-up dialogs/modals in the Live Leads section are not styled consistently with the rest of the platform's dark theme.

**Fix instructions:**
1. Audit all modals, dialogs, and popover components rendered from the Live Leads page.
2. Ensure they use the shadcn/ui `Dialog` or `AlertDialog` components which inherit the app's theme.
3. Check for any inline styles or hardcoded light-theme colors (`bg-white`, `text-black`, etc.) in these pop-ups and replace with theme-aware classes (`bg-background`, `text-foreground`, `border-border`).
4. The pop-up background, text color, border, and button styles must match the dark-themed look of the rest of the tool.

---

### 2.9 — Live Leads: Add New Lead Form Enhancement

**Problem:** The "Add New Lead" form needs additional fields and the Industry field needs to be a typeable/searchable input (not a rigid dropdown).

**Fix instructions:**
1. Open the "Add New Lead" dialog/form component.
2. The form must include these fields:
   - **Company Name** (required, text input)
   - **Domain / Website** (required, text input with URL validation)
   - **Industry** (required, **combobox/autocomplete** — user types freely, suggestions appear from a predefined list, but any text is accepted). Use shadcn/ui `Command` + `Popover` for a searchable combobox pattern. The industry list should be broad (e.g., "Accounting", "Computer Software", "Environmental Services", "Higher Education", "Hospital & Health Care", "Information Technology", "Internet", "Law Enforcement", "Motion Pictures", etc. — pull from whatever industry list the Redrok API uses or define a comprehensive list of 50+ industries).
   - **Contact Name** (optional, text input)
   - **Contact Email** (optional, text input with email validation)
   - **Contact Phone** (optional, text input with phone format)
3. On submit, create the lead in the Convex `leads` table with all these fields.
4. If contact info is provided, also create/link a contact record.

---

### 2.10 — Live Leads: "Add to Watchlist" Action Not Working

**Problem:** Selecting leads from "My Leads" and clicking "Add to Watchlist" does nothing.

**Fix instructions:**
1. Find the "Add to Watchlist" button/action in the My Leads view.
2. Wire it to a Convex mutation that:
   - Takes the selected lead's domain (and company name, if available).
   - Checks if the domain already exists in the `watchlist` table for this company/user.
   - If not, inserts a new watchlist record: `{ domain, companyName, addedBy, addedAt, companyId }`.
   - If it already exists, show a toast: "This domain is already on your watchlist."
3. After successful addition, show a success toast: "Added to Watchlist."
4. This must work for both single-lead actions (row action menu) and bulk actions (select multiple → "Add to Watchlist" toolbar button).

---

### 2.11 — Live Leads: "Start Campaign" Action Not Working

**Problem:** The "Start Campaign" action from My Leads does not work.

**Fix instructions:**
1. The "Start Campaign" button should navigate the user to the AI Agents page with the selected lead(s) pre-loaded as the campaign's target audience.
2. Implementation:
   - On click, store the selected lead IDs in a Convex table (e.g., `campaignDrafts`) or in URL query params.
   - Navigate to `/ai-agents/new?leads=[id1,id2,...]` (or the equivalent route).
   - The AI Agents "New Campaign" form should read these IDs and pre-populate the target list.
3. If the AI Agents module is not yet fully functional (see Phase 3), at minimum show a toast: "Campaign creation coming soon" — but still wire the navigation so it's ready once AI Agents is implemented.

---

### 2.12 — Live Leads: "Export Selected" Not Working

**Problem:** Selecting leads and clicking "Export Selected" does nothing.

**Fix instructions:**
1. Wire the "Export Selected" button to a client-side CSV export function.
2. When clicked:
   - Gather all selected lead rows.
   - Generate a CSV with columns: Company Name, Domain, Industry, Country, Region, Employees, Exposures, Website.
   - Trigger a browser download of the CSV file named: `CyberHook_Leads_Export_[YYYY-MM-DD].csv`.
3. Use a utility like:
   ```tsx
   function exportToCSV(leads: Lead[], filename: string) {
     const headers = ["Company Name", "Domain", "Industry", "Country", "Region", "Employees", "Website"];
     const rows = leads.map(l => [l.companyName, l.domain, l.industry, l.country, l.region, l.employees, l.website]);
     const csv = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
     const blob = new Blob([csv], { type: "text/csv" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = filename;
     a.click();
     URL.revokeObjectURL(url);
   }
   ```

---

### 2.13 — Live Leads: Exposure Count Accuracy Indicator

**Problem:** Some leads show "0 Exposures" and the client isn't sure if a scan was actually conducted or if the data just hasn't been fetched yet.

**Fix instructions:**
1. In the leads table, the "Exposures" column should show one of three states:
   - **"[number] Exposures"** — a scan was conducted and returned this count.
   - **"0 Exposures ✓"** (with a checkmark or "Scanned" badge) — a scan was conducted and genuinely returned zero results.
   - **"Not Scanned"** (greyed out or with a different style) — no scan has been run for this domain yet.
2. To support this, the lead record in Convex needs a field like `lastScanDate: number | null`. If `lastScanDate` is null, the lead has never been scanned. If it has a value, the exposure count is genuine.
3. Add a "Scan Now" quick action for leads in the "Not Scanned" state.

---

### 2.14 — Live Leads: "Generate Report" Button per Lead Row

**Problem:** Looking at the screenshot, each lead row has a "Generate Report" button. The client needs this to work — it should generate a report for that specific company.

**Fix instructions:**
1. The "Generate Report" button on each row in the Live Leads table should:
   - Trigger a Live Search for that lead's domain (if no cached scan results exist), or use existing scan data.
   - Generate a PDF report identical to the one described in 2.5 but using this lead's data.
2. If scan data already exists for this domain, generate the report immediately from cached data.
3. If no scan data exists, show a confirmation: "No scan data available for [domain]. Run a scan first?" with options "Scan & Generate" (costs a token) or "Cancel."
4. The generated PDF should download with the same format as 2.5.

---

## Phase 3 — Secondary Module Fixes & Enhancements

These are important but come after the Live Search / Live Leads priority items.

---

### 3.1 — To-Do List: Task Assignment to Other Users

**Problem:** When creating a new task, there is no way to assign it to another user on the platform. If no other users exist, it should auto-assign to the current user.

**Fix instructions:**
1. In the "New Task" creation form/dialog, add an **"Assignee"** field.
2. This should be a dropdown/combobox that:
   - Lists all active users in the same company (query the Convex `users` table where `companyId` matches and `status === "active"`).
   - Defaults to the current user (pre-selected).
   - If the current user is the only user, show just their name (still allow it to remain, don't hide the field).
3. Store the `assignedTo` user ID in the task record.
4. On the To-Do List page, "My Tasks" shows tasks where `assignedTo === currentUserId`. "Team Tasks" (admin view) shows all tasks for the company.

---

### 3.2 — To-Do List: Quick Date Buttons for Due Date

**Problem:** The client wants quick-select buttons for setting the due date — "Today", "Tomorrow", and potentially more.

**Fix instructions:**
1. In the "New Task" form, below or beside the due date picker, add quick-select buttons:
   - **"Today"** — sets due date to today at 11:59 PM.
   - **"Tomorrow"** — sets due date to tomorrow at 11:59 PM.
   - **"Next Week"** — sets due date to next Monday.
2. These are shortcut buttons that populate the date picker. The user can still manually pick any date.
3. Style as small outlined buttons in a row:
   ```
   Due Date: [________📅]  [Today] [Tomorrow] [Next Week]
   ```
4. When clicked, the date picker value updates to reflect the selection.

---

### 3.3 — To-Do List: Link Task to Customer/Contact

**Problem:** The client wants the ability to associate a task with a specific customer or contact (from Live Leads / Watchlist).

**Fix instructions:**
1. In the "New Task" form, add a **"Related Company / Contact"** field.
2. This should be a searchable combobox that queries:
   - Companies from the `leads` table (My Leads).
   - Companies from the `watchlist` table.
3. When a company is selected, store its ID as `relatedCompanyId` (or `relatedLeadId`) on the task record.
4. In the task list view, if a task has a linked company, show the company name as a clickable badge/chip that navigates to that lead's detail page.
5. This field is optional — tasks can still be created without a linked company.

---

### 3.4 — To-Do List: Enable Task Editing

**Problem:** Existing tasks cannot be edited — the only option is to delete them.

**Fix instructions:**
1. In the task list, each task row should have an "Edit" action (either via a row action menu or an edit icon button).
2. Clicking "Edit" should open the same form used for creating a task, but pre-populated with the existing task's data.
3. All fields should be editable: title, description, due date, priority, assignee, related company.
4. The save action should call a Convex mutation to update the task record.
5. Also add inline quick-edit capabilities:
   - Click a task's title to edit it inline.
   - Click the priority badge to cycle through Low → Medium → High.
   - Click the due date to open a date picker popover.

---

### 3.5 — Ransom Hub: Add Missing Columns

**Problem:** The Ransom Hub table only shows "Group" and "Victim" columns. It's missing: dates (posted date), estimated attack date, and country.

**Fix instructions:**
1. Open the Ransom Hub page component and its data table definition.
2. Add these columns to the table:
   - **"Posted Date"** — the date the incident was posted on the ransomware group's site. Field from ransomware.live API: `published` or `date`.
   - **"Attack Date"** (Estimated) — the estimated date of the actual attack. Field: `attacked` or similar.
   - **"Country"** — the victim's country. Field: `country` from the API.
3. Ensure the Convex query or cron job that fetches from ransomware.live is storing these fields. If the fields exist in the API response but aren't being saved, update the cron job to include them.
4. Format dates as `MMM DD, YYYY` (e.g., "Mar 28, 2026").

---

### 3.6 — Ransom Hub: Update Data (Outdated)

**Problem:** The data displayed is outdated.

**Fix instructions:**
1. Check the ransomware.live cron job schedule. It should be running at minimum once per day (every 24 hours), ideally every 6-12 hours.
2. Verify the cron job in `convex/crons.ts` is configured and active:
   ```ts
   crons.interval("sync ransomware data", { hours: 6 }, internal.ransomware.syncRansomwareData);
   ```
3. In the sync function, ensure it's fetching the latest data from `https://api.ransomware.live/recentvictims` (or the correct endpoint).
4. Add a "Last Updated" timestamp displayed on the Ransom Hub page header so users know when data was last refreshed.
5. Optionally add a manual "Refresh" button for admins.

---

### 3.7 — Ransom Hub: Link to Original Incident on ransomware.live

**Problem:** Each ransomware incident row needs a clickable link that takes the user to the incident page on ransomware.live.

**Fix instructions:**
1. The ransomware.live API typically returns a `post_url` or you can construct one: `https://ransomware.live/group/[group_name]/[victim_slug]` or similar.
2. Add an external link icon/button on each row. When clicked, open the ransomware.live incident page in a new tab.
3. If the API provides a `website` field for the victim, also store that and make the victim name clickable to visit their actual website.
4. Implementation:
   ```tsx
   <a href={incident.postUrl} target="_blank" rel="noopener noreferrer" title="View on ransomware.live">
     <ExternalLink className="h-4 w-4" />
   </a>
   ```

---

### 3.8 — Ransom Hub: Remove Status Tabs and Severity Levels

**Problem:** The client says to remove the "All / Active / Contained / Resolved" status tabs AND the "Critical / High / Medium / Low" severity filter. Reason: "We cannot estimate that."

**Fix instructions:**
1. Remove the status tabs (All / Active / Contained / Resolved) from the Ransom Hub page header/toolbar. Just show all incidents in a single table.
2. Remove the severity filter (Critical / High / Medium / Low) from the filter bar.
3. Remove any related columns from the table that show status or severity.
4. If these fields exist in the Convex schema, leave them in the DB (no schema migration needed) but stop rendering them in the UI.

---

### 3.9 — Ransom Hub: Fix Filters

**Problem:** The filter dropdowns on the Ransom Hub page do not work — selecting a filter value does not update the displayed data.

**Fix instructions:**
1. Open the Ransom Hub filter components. Verify each filter (date range, geography, industry, group) is:
   - Correctly reading its selected value from state.
   - Passing the filter values to the Convex query.
2. The Convex query for ransomware data must accept filter parameters:
   ```ts
   export const getRansomwareIncidents = query({
     args: {
       dateFrom: v.optional(v.number()),
       dateTo: v.optional(v.number()),
       country: v.optional(v.string()),
       group: v.optional(v.string()),
     },
     handler: async (ctx, args) => {
       let q = ctx.db.query("ransomwareIncidents").order("desc");
       // Apply filters...
     }
   });
   ```
3. Ensure the filters trigger a re-query when changed (verify `useQuery` dependencies include the filter state).

---

### 3.10 — Ransom Hub: Fix Export CSV

**Problem:** The Export CSV button on the Ransom Hub page does not work.

**Fix instructions:**
1. Wire the Export CSV button to a client-side export function similar to 2.12.
2. Export all currently-displayed (filtered) ransomware incidents.
3. CSV columns: Group, Victim, Country, Posted Date, Attack Date (Estimated), Post URL.
4. File name: `CyberHook_RansomHub_Export_[YYYY-MM-DD].csv`.

---

### 3.11 — Ransom Hub: Breach Notifications Section

**Problem:** The "Breach Notifications" section/tab on the Ransom Hub page is not working. It should scrape tables from breach notification websites (e.g., HHS OCR breach portal) and each source should have a tooltip/link to the original website.

**Fix instructions:**
1. The Breach Notifications section needs a data source. Implement a cron job or on-demand fetch that pulls data from public breach notification sources:
   - **HHS OCR Breach Portal** (https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf) — healthcare breaches
   - Other sources as identified (state AG breach notices, etc.)
2. For each breach notification entry, store:
   - Organization name
   - Date reported
   - Individuals affected (count)
   - Type of breach
   - Source (which portal/website)
   - Source URL (link to the original record)
3. Display as a table with a clickable source icon/tooltip on each row:
   ```tsx
   <TooltipProvider>
     <Tooltip>
       <TooltipTrigger>
         <a href={notification.sourceUrl} target="_blank" rel="noopener noreferrer">
           <ExternalLink className="h-4 w-4" />
         </a>
       </TooltipTrigger>
       <TooltipContent>View on {notification.sourceName}</TooltipContent>
     </Tooltip>
   </TooltipProvider>
   ```
4. If scraping is complex, start with a daily cron that fetches from an RSS feed or structured data endpoint for these portals. As a fallback, use a serverless function with a headless browser (Puppeteer/Playwright) to scrape the table data.

---

### 3.12 — Ransom Hub: Remove Three-Dot Overflow Menus

**Problem:** Same as 1.6 — remove the three-dot overflow menus from containers on the Ransom Hub page.

**Fix:** Apply the same fix as 1.6 to all card/container components on the Ransom Hub page.

---

### 3.13 — Watchlist: Fix Alert Preferences (Not Saving)

**Problem:** The alert/notification preferences on the Watchlist page do not work — changes are not saved.

**Fix instructions:**
1. Open the Watchlist alert preferences component.
2. Verify that the save action calls a Convex mutation to persist the preferences. The mutation should update the user's record (or a separate `watchlistPreferences` table) with:
   - `emailNotifications: boolean`
   - `inAppNotifications: boolean`
   - `notificationFrequency: "immediate" | "daily" | "weekly"`
   - Any other preference fields.
3. After the mutation succeeds, show a success toast: "Alert preferences saved."
4. On page load, the preference form should read the current values from the DB and pre-populate the form.
5. Debug the specific failure: Is the mutation being called? Is it throwing an error? Check the Convex dashboard logs.

---

### 3.14 — Watchlist: Remove "Monitoring Window" from Add Domain Form

**Problem:** When adding a new domain to the Watchlist, there is a "Monitoring Window" field that the client says is not needed.

**Fix instructions:**
1. Open the "Add Domain to Watchlist" dialog/form.
2. Remove the "Monitoring Window" field from the form UI.
3. If the DB schema has a `monitoringWindow` field, either set a sensible default (e.g., 30 days) in the Convex mutation or remove it from the schema if unused.
4. The form should only require: Domain (required), Company Name (optional), Notes (optional).

---

### 3.15 — AI Agents: Basic Workflow Implementation

**Problem:** The AI Agents module is not working at all. The client says "the workflow is very simple."

**Fix instructions:**
1. Implement the core AI Agents campaign workflow:
   - **Step 1: Create Campaign** — Form with: Campaign Name, Description.
   - **Step 2: Select Audience** — Choose leads from My Leads / Watchlist. Show a searchable list with checkboxes. Selected leads become the campaign target list.
   - **Step 3: Configure Cadence** — Choose from existing templates in the Knowledge Base (formerly Scripts & Cadences), or define a simple cadence: Day 1 email, Day 3 follow-up, Day 7 final follow-up.
   - **Step 4: AI Drafts** — For each selected lead/contact, use an AI prompt to generate a personalized email draft based on: the company's exposure data, the selected template, and the company's industry/size/geography.
   - **Step 5: Review & Approve** — Show all generated drafts in a list. User can edit each one before sending. Default mode is "approval required" (not auto-send).
   - **Step 6: Send** — Once approved, queue emails for sending via the connected email integration (Outlook/Gmail).
2. For V1, the AI generation can use a simple prompt sent to the Anthropic API (or whatever LLM is integrated) with the lead's exposure context and the template.
3. Campaign status tracking: Draft → Active → Completed. Track: emails sent, emails pending approval.
4. Store campaigns in a `campaigns` Convex table with related `campaignEmails` for individual drafts.

---

### 3.16 — Knowledge Base: Fix "Extract Data" Functionality

**Problem:** The "Extract Data" feature in the Knowledge Base does not work.

**Fix instructions:**
1. Identify what "Extract Data" is supposed to do in the Knowledge Base context. Based on the module design, this likely means extracting key data points (talking points, objection handling, competitor info) from uploaded documents or templates.
2. Wire the "Extract Data" button to:
   - Parse the selected knowledge base entry's content.
   - Use an AI call to extract structured data (key points, action items, data highlights) from the content.
   - Display the extracted data in a structured format (e.g., bullet points, a summary card).
3. If this is an AI-powered feature, send the KB content to the LLM with a system prompt like: "Extract the key sales talking points, relevant statistics, and action items from the following content."

---

### 3.17 — Knowledge Base: Move "Scope" Field to Last Position

**Problem:** In each Knowledge Base entry form/view, the "Scope" field is not in the right position. The client wants it to be the **last** field in every entry.

**Fix instructions:**
1. Open the Knowledge Base entry form/detail component.
2. Reorder the fields so that "Scope" appears as the last field, below all other content fields.
3. Apply this to both the create form and the edit/detail view.
4. Apply this consistently to **every** Knowledge Base entry type — the client said "every single one of them."

---

### 3.18 — RFP Hub: Add Missing Fields to RFP Form

**Problem:** The RFP creation/detail form needs additional fields: Submission Deadline (date & time), Assignee, and Link to original RFP.

**Fix instructions:**
1. Open the RFP Hub creation/edit form component.
2. Add these fields:
   - **Submission Deadline** — Date AND time picker (not just date). Use a combined date-time picker component. Store as a timestamp in Convex.
   - **Assignee** — A dropdown/combobox listing team members (same pattern as 3.1). Can also accept a free-text name for external assignees.
   - **RFP Link** — A URL text input for linking to the original RFP document (e.g., a Google Drive link, a procurement portal link, etc.). Validate as URL.
3. Update the Convex schema for the `rfps` table to include: `submissionDeadline: v.number()`, `assigneeId: v.optional(v.id("users"))`, `assigneeName: v.optional(v.string())`, `rfpLink: v.optional(v.string())`.
4. Display these fields in both the RFP list view (as columns) and the RFP detail view.

---

### 3.19 — Events: Fix Non-Functional Module

**Problem:** The Events & Conferences module does not work.

**Fix instructions:**
1. Implement the core Events functionality:
   - **Create Event** — Form with: Title, Date (start), Time, End Date/Time (optional), Location, Description, Type (Conference / Webinar / Meeting / Appointment / Other).
   - **Link to Company** — Optional dropdown to link event to a lead/watchlist company.
   - **Calendar View** — Month and week view using a calendar component (e.g., `react-big-calendar` or a custom implementation with date-fns).
   - **List View** — Filterable table of events sorted by date.
2. Events marked as "Appointment" or "Meeting" should count toward the Appointments KPI on the News dashboard.
3. Store in a Convex `events` table: `{ title, startDate, endDate, location, description, type, linkedCompanyId, createdBy, companyId }`.
4. Add curated "System Events" — a seed dataset of known cybersecurity industry events (RSA Conference, Black Hat, etc.). These can be stored in the same table with a `isSystemEvent: true` flag.

---

## Phase 4 — Settings, Billing, Integrations & Polish

---

### 4.1 — Settings: Integration Logos

**Problem:** The integration cards in Settings show incorrect or placeholder images. The client wants the proper logos for each integration.

**Fix instructions:**
1. Open the Settings > Integrations page component.
2. For each integration card, replace the current image with the correct official logo:
   - **Stripe** — Use the official Stripe wordmark (purple/blue on dark, or white on dark)
   - **ConnectWise** — Official ConnectWise logo
   - **HubSpot** — Official HubSpot sprocket logo
   - **Outlook / Microsoft** — Microsoft Outlook icon
   - **Gmail / Google** — Gmail icon
   - **Google Calendar** — Google Calendar icon
   - **Microsoft Teams** — Teams icon
   - **Slack** — Slack icon
   - **LinkedIn** — LinkedIn icon
   - **GoHighLevel** — GoHighLevel logo
3. Store logos as static assets in the `/public/integrations/` directory (or use CDN URLs for official logos).
4. Use proper sizing: all logo images should be the same dimensions within their card containers (e.g., 40x40px or 48x48px).

---

### 4.2 — Settings: User Management Not Working

**Problem:** Under Settings > Users, the admin cannot modify users (edit roles, deactivate, etc.).

**Fix instructions:**
1. Open the Settings > User Management page.
2. For each user row, ensure these actions work:
   - **Change Role** — Dropdown to switch between Sales Rep, Sales Admin, Billing User. Calls a Convex mutation to update the user's `role` field AND syncs with Clerk metadata.
   - **Deactivate / Reactivate** — Toggle button that sets `status: "inactive"` or `status: "active"`. Deactivated users should be blocked from logging in (update Clerk user metadata or ban the Clerk user).
   - **Remove** — Delete the user from the company (with confirmation dialog).
3. Verify the Convex mutations exist and have proper admin-only authorization checks:
   ```ts
   // Example: only allow if calling user is Sales Admin
   const caller = await getAuthUser(ctx);
   if (caller.role !== "sales_admin") throw new Error("Unauthorized");
   ```
4. After any change, show a success toast and refresh the user list.

---

### 4.3 — Settings: Location ID Auto-Generated & Static

**Problem:** The "Location ID" field in company settings should be automatically generated and not editable by the user.

**Fix instructions:**
1. In the company settings form, find the "Location ID" field.
2. Make it **read-only** — render as a disabled input or plain text display.
3. Auto-generate the Location ID when the company is first created during onboarding. Use a format like:
   - `LOC-[6-char-random-alphanumeric]` (e.g., `LOC-A3F8K2`)
   - Or a UUID
4. Store it in the Convex `companies` table as `locationId`.
5. Display it in settings as informational only — no edit capability.

---

### 4.4 — Settings: Billing Packages (Three Tiers)

**Problem:** The client specified three pricing tiers: $99, $199, and $499.

**Fix instructions:**
1. In the billing/subscription management section, configure three Stripe price IDs corresponding to:
   - **Starter:** $99/month
   - **Growth:** $199/month
   - **Enterprise:** $499/month
2. Update the environment variables or Convex configuration with the correct Stripe Price IDs once the client provides the Stripe API key.
3. The plan selection UI should show all three tiers with feature comparison.
4. The current plan should be highlighted, with upgrade/downgrade options for admins.
5. Note: The client said "I'm gonna share with you the API key" — the Stripe key is pending. Build the UI and plan logic now with placeholder price IDs, and swap in the real IDs when received.

---

### 4.5 — Settings: Audit Log Not Working

**Problem:** The Audit Log section in Settings does not display any data.

**Fix instructions:**
1. Verify that audit events are being written to the Convex `auditLog` table. Check that the following events trigger writes:
   - User login (via Clerk webhook)
   - User invite, role change, deactivation
   - Integration connect / disconnect
   - Token allocation or plan changes
   - Live Search executions
   - Settings changes
2. The audit log query should:
   - Fetch from the `auditLog` table filtered by `companyId`.
   - Support pagination (load 50 records at a time).
   - Support date range, user, and event type filters.
3. Each log entry should display: Timestamp, User (name + avatar), Event Type (badge), Description, Details (expandable).
4. Only Sales Admins should see this page.

---

### 4.6 — Reporting: Fix Generate PDF Report

**Problem:** The "Generate PDF Report" button on the Reporting page does not work.

**Fix instructions:**
1. Wire the PDF generation to create a performance report containing:
   - Date range of the report
   - User or team scope
   - KPIs: Searches run, Emails sent, Appointments booked, Calls logged, Events created
   - Charts as static images (render charts to canvas, then to image, then embed in PDF)
2. Use the same PDF generation approach as 2.5.
3. File name: `CyberHook_Performance_Report_[YYYY-MM-DD].pdf`

---

### 4.7 — Reporting: Fix Filter Options

**Problem:** The filter/dropdown options on the Reporting page (Performance section) do not work — selecting a filter does not update the charts/data.

**Fix instructions:**
1. Verify each filter (date range, user, metric type) is:
   - Connected to component state.
   - Passed as arguments to the Convex query.
   - Triggering a re-render when changed.
2. Common issue: filters are wired to local state but the `useQuery` call doesn't include the filter values in its args. Ensure the query args include all active filter values.
3. Test: Change the date range → data should update. Change user filter → data should update.

---

## Phase 5 — Comprehensive Playwright E2E Tests

**Browser:** Chromium (as specified by the client)

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Playwright config (`playwright.config.ts`):**
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

**Test organization:** One test file per module. Each test is written as sequential step-by-step instructions so Cursor can implement them deterministically.

---

### Test 1: News Dashboard (`e2e/news-dashboard.spec.ts`)

```
Test: "News Dashboard loads correctly and all elements function"

Step 1: Navigate to the News dashboard page (the default landing page after login).
Step 2: Verify the greeting text is visible and contains the logged-in user's first name (e.g., "Hello, Liron").
Step 3: Verify the token usage bar is visible and shows a format like "X / Y searches left this month" where X and Y are numbers.
Step 4: Verify there are exactly 4 KPI tiles visible (MRR, Appointments, Searches, Emails — NOT Pipeline Value).
Step 5: For each KPI tile, verify the number is centered vertically and horizontally within its container. Verify all tiles have equal rendered height.
Step 6: Verify no three-dot overflow menu icons exist anywhere on the page.
Step 7: Verify the "Today" panel is visible and shows task sections (Due Today, Overdue).
Step 8: Verify the task count shown in the "Today" panel matches the actual number of tasks returned by querying the page content.
Step 9: Click the "View All" or "To-Do" link in the Today panel. Verify navigation to the To-Do List page (URL contains "/todo" or "/to-do").
Step 10: Navigate back to News. Click the Ransom Hub link. Verify navigation works (URL contains "/ransom").
Step 11: Verify the News Feed section is visible and contains at least one news article card.
Step 12: Verify Quick Action buttons are visible: "Run Live Search", "Add to Watchlist", "Start Campaign".
```

---

### Test 2: To-Do List (`e2e/todo-list.spec.ts`)

```
Test: "To-Do List CRUD operations and task assignment"

Step 1: Navigate to the To-Do List page.
Step 2: Click the "New Task" button. Verify a creation form/dialog appears.
Step 3: Verify the form contains fields: Title, Description, Due Date, Priority, Assignee, Related Company/Contact.
Step 4: Verify the Assignee dropdown defaults to the current user's name.
Step 5: Verify quick date buttons exist: "Today", "Tomorrow", "Next Week". Click "Today" — verify the date picker value updates to today's date.
Step 6: Fill in the form: Title = "Test Task Alpha", Description = "E2E test task", Priority = "High", Assignee = current user, Due Date = Today.
Step 7: Submit the form. Verify a success toast appears. Verify the new task "Test Task Alpha" appears in the task list.
Step 8: Verify the task shows the correct priority badge (High), due date (today), and assignee name.
Step 9: Click the Edit action on "Test Task Alpha". Verify the edit form opens pre-populated with all existing values.
Step 10: Change the title to "Test Task Alpha Updated". Change priority to "Medium". Save. Verify the changes are reflected in the list.
Step 11: Mark the task as complete. Verify it moves to a "Completed" section or gets a strikethrough/checkmark.
Step 12: Reopen the task. Verify it moves back to the active section.
Step 13: Delete the task. Confirm the deletion dialog. Verify the task is removed from the list.
```

---

### Test 3: Ransom Hub (`e2e/ransom-hub.spec.ts`)

```
Test: "Ransom Hub displays data correctly with all columns and functional filters"

Step 1: Navigate to the Ransom Hub page.
Step 2: Verify the data table is visible and contains at least one row of ransomware incident data.
Step 3: Verify the table has these columns: Group, Victim, Country, Posted Date, Attack Date (Estimated).
Step 4: Verify there are NO status tabs (All / Active / Contained / Resolved) visible on the page.
Step 5: Verify there is NO severity filter (Critical / High / Medium / Low) visible.
Step 6: Verify there are NO three-dot overflow menus on any container on the page.
Step 7: Verify each row has an external link icon that, when hovered, shows a tooltip mentioning "ransomware.live" or "View original".
Step 8: Click the external link on the first row. Verify it opens a new tab with a URL containing "ransomware.live" (check the link's href attribute without actually navigating).
Step 9: Open the date range filter. Select "Last 7 Days". Verify the table updates and all visible Posted Dates are within the last 7 days.
Step 10: Open the country filter. Select "United States". Verify all visible rows show "United States" in the Country column.
Step 11: Clear all filters. Verify the full unfiltered dataset reappears.
Step 12: Click "Export CSV". Verify a file download is triggered. Verify the downloaded file name contains "RansomHub" and ends with ".csv".
Step 13: Verify the "Last Updated" timestamp is visible on the page and shows a recent date/time.
```

---

### Test 4: Live Search (`e2e/live-search.spec.ts`)

```
Test: "Live Search performs a domain search and displays results with all actions"

Step 1: Navigate to the Live Search page.
Step 2: Verify the search input field is visible with a placeholder like "Enter domain" and a search/submit button.
Step 3: Verify the token counter is visible and aligned properly (number and label centered in their container).
Step 4: Enter a test domain (e.g., "example.com") into the search field.
Step 5: Click the search button. Verify a loading state appears while the search is processing.
Step 6: Wait for results to load. Verify the summary stats section appears with: number of exposures, date range, types of data exposed.
Step 7: Verify the action buttons are visible ABOVE the detailed results list (not at the bottom). Confirm these buttons exist: "Download Report", "Add to Watchlist", "Create Lead".
Step 8: If the credential count equals 15, verify a "+" appears next to the count (e.g., "15+") and a disclaimer text is visible mentioning "sample records."
Step 9: Scroll to the detailed credentials list. Verify individual credential rows are visible.
Step 10: Click the "Details" button on the first credential row. Verify a side panel (Sheet) slides in from the right side.
Step 11: Verify the side panel contains: full credential details (email, source, date, type). Verify the panel has a close button. Close the panel.
Step 12: Click "Download Report". Verify a PDF file download is triggered. Verify the filename contains "Exposure_Report" and the searched domain.
Step 13: Click "Add to Watchlist". Verify a success toast appears: "Added to Watchlist."
Step 14: Click "Create Lead". Verify navigation to the Live Leads page or a lead creation confirmation.
```

---

### Test 5: Live Leads (`e2e/live-leads.spec.ts`)

```
Test: "Live Leads loads default view, CRUD operations, and all actions work"

Step 1: Navigate to the Live Leads page.
Step 2: Verify "Discover New Leads" is the first item in the sub-navigation sidebar and is automatically active/selected.
Step 3: Verify the data table has loaded with lead data automatically (no need to click "Search" or "Find") — verify at least one row is visible.
Step 4: Verify the table columns include: Name, Industry, Website, Country, Region, Employees.
Step 5: Open the Country filter. Verify "United States" is the first option and "Canada" is the second option.
Step 6: Each row should have a "Generate Report" button. Click it on the first row. Verify either a PDF download starts or a confirmation dialog appears about scanning.
Step 7: Navigate to "My Leads" in the sidebar.
Step 8: Click "Add New Lead". Verify the form contains: Company Name, Domain/Website, Industry (as a searchable/typeable combobox), Contact Name, Contact Email, Contact Phone.
Step 9: Type a partial industry name in the Industry field (e.g., "Inform"). Verify autocomplete suggestions appear (e.g., "Information Technology"). Select one.
Step 10: Fill in Company Name = "Test Corp E2E", Domain = "testcorpe2e.com". Submit. Verify success toast and the new lead appears in My Leads.
Step 11: Select the new lead via checkbox. Click "Add to Watchlist". Verify success toast: "Added to Watchlist."
Step 12: Select the lead again. Click "Export Selected". Verify a CSV file download is triggered with the correct filename.
Step 13: Click "Start Campaign" on the selected lead. Verify navigation to AI Agents or a "coming soon" toast.
Step 14: Verify the exposure count shows either a number with a "Scanned" indicator or "Not Scanned" (not a bare "0" with no context).
Step 15: Delete the test lead. Confirm deletion. Verify it is removed from the list.
```

---

### Test 6: Watchlist (`e2e/watchlist.spec.ts`)

```
Test: "Watchlist management and alert preferences"

Step 1: Navigate to the Watchlist page.
Step 2: Verify the watchlist table is visible.
Step 3: Click "Add Domain". Verify the add form appears with fields: Domain, Company Name (optional), Notes (optional).
Step 4: Verify there is NO "Monitoring Window" field in the form.
Step 5: Enter Domain = "watchtest.com", Company Name = "Watch Test Corp". Submit. Verify success toast and the domain appears in the watchlist.
Step 6: Open Alert Preferences. Change a notification toggle (e.g., enable email notifications). Click Save.
Step 7: Verify a success toast appears: "Alert preferences saved."
Step 8: Refresh the page. Open Alert Preferences again. Verify the toggle you changed is still in the saved state (persistence check).
Step 9: Delete "watchtest.com" from the watchlist. Confirm. Verify it is removed.
```

---

### Test 7: AI Agents (`e2e/ai-agents.spec.ts`)

```
Test: "AI Agents campaign creation workflow"

Step 1: Navigate to the AI Agents page.
Step 2: Click "Create Campaign" (or equivalent new campaign button).
Step 3: Verify the campaign creation form appears with: Campaign Name, Description fields.
Step 4: Enter Campaign Name = "E2E Test Campaign", Description = "Automated test". Proceed to next step.
Step 5: Verify the audience selection step shows a list of leads. Select at least one lead.
Step 6: Proceed to cadence selection. Verify at least one template/cadence option is available.
Step 7: Select a cadence. Proceed.
Step 8: Verify AI-generated email drafts appear (or a loading state while they generate). Wait for drafts to load.
Step 9: Verify each draft can be edited (click into the draft text and modify it).
Step 10: Save the campaign. Verify it appears in the campaigns list with status "Draft" or "Pending Approval."
```

---

### Test 8: Knowledge Base (`e2e/knowledge-base.spec.ts`)

```
Test: "Knowledge Base entry management and field ordering"

Step 1: Navigate to the Knowledge Base page.
Step 2: Verify existing entries are visible.
Step 3: Open any Knowledge Base entry detail view.
Step 4: Verify the "Scope" field is the LAST field displayed in the entry detail, below all other fields.
Step 5: Click "Edit" on the entry. Verify the edit form also shows "Scope" as the last field.
Step 6: Test the "Extract Data" button: click it on an entry that has content. Verify some output is generated (extracted data points, summary, or structured content appears).
```

---

### Test 9: RFP Hub (`e2e/rfp-hub.spec.ts`)

```
Test: "RFP Hub with new fields"

Step 1: Navigate to the RFP Hub page.
Step 2: Click "Create New RFP" (or equivalent).
Step 3: Verify the form contains these fields: Title, Submission Deadline (date AND time picker), Assignee (dropdown of team members or free text), RFP Link (URL input).
Step 4: Fill in: Title = "E2E Test RFP", Submission Deadline = tomorrow at 3:00 PM, Assignee = current user, RFP Link = "https://example.com/rfp".
Step 5: Submit. Verify the RFP appears in the list with the correct Submission Deadline, Assignee, and a clickable link.
Step 6: Click the RFP Link. Verify it opens in a new tab (check href attribute).
Step 7: Delete the test RFP. Confirm. Verify removal.
```

---

### Test 10: Events & Conferences (`e2e/events.spec.ts`)

```
Test: "Events creation and calendar views"

Step 1: Navigate to the Events page.
Step 2: Verify the page loads with either a calendar view or a list view.
Step 3: Click "Create Event". Verify the form contains: Title, Start Date/Time, End Date/Time, Location, Description, Type (Conference/Webinar/Meeting/Appointment/Other).
Step 4: Create an event: Title = "E2E Test Meeting", Type = "Appointment", Start = tomorrow at 10:00 AM, Location = "Zoom".
Step 5: Submit. Verify the event appears in the list/calendar.
Step 6: Switch between Calendar and List views. Verify the event is visible in both.
Step 7: Delete the event. Confirm. Verify removal.
```

---

### Test 11: Reporting (`e2e/reporting.spec.ts`)

```
Test: "Reporting displays metrics and export works"

Step 1: Navigate to the Reporting page.
Step 2: Verify KPI cards/charts are visible: Searches, Emails, Appointments, Calls, Events.
Step 3: Change the date range filter. Verify the displayed data updates (numbers or chart changes).
Step 4: If a user filter exists, change it. Verify the data updates.
Step 5: Click "Generate PDF Report". Verify a PDF file download is triggered with filename containing "Performance_Report".
Step 6: Verify the Export CSV button (if present) triggers a download.
```

---

### Test 12: Settings (`e2e/settings.spec.ts`)

```
Test: "Settings — User Management, Integrations, Audit Log, Billing"

Step 1: Navigate to Settings. Verify the settings page loads with sub-sections visible: Company Profile, Users, Integrations, Audit Log, Billing.
Step 2: Go to Integrations. Verify each integration card has a proper logo image (not a broken image or placeholder). Check that the image elements have valid src attributes and load successfully (naturalWidth > 0).
Step 3: Go to Users. Verify the user list is visible with at least the current user.
Step 4: If another test user exists, click "Edit" on them. Verify the role dropdown appears with options: Sales Rep, Sales Admin, Billing User. Change the role and save. Verify the change persists after page refresh.
Step 5: Go to Company Profile. Verify the "Location ID" field is visible and is read-only (the input is disabled or displayed as plain text). Verify it has a value that matches the pattern (e.g., starts with "LOC-" or is a UUID).
Step 6: Go to Billing. Verify three plan tiers are displayed: $99, $199, $499 per month.
Step 7: Go to Audit Log. Verify the audit log table is visible and contains at least one log entry. Verify each entry shows: Timestamp, User, Event Type, Description.
Step 8: Apply a date range filter on the Audit Log. Verify the results update accordingly.
```

---

### Test Helper: Authentication Setup (`e2e/auth.setup.ts`)

```
Before all tests, implement a global setup that:

Step 1: Navigate to the login page.
Step 2: Log in with test credentials (use environment variables: E2E_TEST_EMAIL, E2E_TEST_PASSWORD).
Step 3: Wait for the dashboard (News page) to load.
Step 4: Store the authenticated browser state (cookies + localStorage) to a file (e.g., "e2e/.auth/user.json").
Step 5: All subsequent tests reuse this stored state to avoid logging in before each test.

In playwright.config.ts, add:
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { storageState: 'e2e/.auth/user.json' }, dependencies: ['setup'] },
  ]
```

---

## Implementation Sequence Summary

| Order | Phase | Priority | Description |
|-------|-------|----------|-------------|
| 1 | Phase 1 (all items) | 🔴 Critical | UI bugs, misalignment, broken navigation |
| 2 | Phase 2 (2.1–2.5) | 🔴 Critical | Live Search fixes (client's top priority) |
| 3 | Phase 2 (2.6–2.14) | 🔴 Critical | Live Leads fixes (client's top priority) |
| 4 | Phase 3 (3.1–3.4) | 🟡 High | To-Do List enhancements |
| 5 | Phase 3 (3.5–3.12) | 🟡 High | Ransom Hub fixes |
| 6 | Phase 3 (3.13–3.14) | 🟡 High | Watchlist fixes |
| 7 | Phase 3 (3.15) | 🟡 High | AI Agents basic workflow |
| 8 | Phase 3 (3.16–3.18) | 🟠 Medium | Knowledge Base + RFP Hub |
| 9 | Phase 3 (3.19) | 🟠 Medium | Events module |
| 10 | Phase 4 (all items) | 🟠 Medium | Settings, Billing, Reporting |
| 11 | Phase 5 (all tests) | 🟢 Final | E2E Playwright tests |

---

## Notes for Cursor

- **Do not change the existing Convex schema structure unless a fix explicitly requires it.** Add new fields as `v.optional()` to avoid breaking existing data.
- **All Convex mutations that modify data must include authorization checks** — verify the user's role before allowing writes.
- **Toast notifications** — use the existing toast system (likely `sonner` or shadcn/ui toast). Success = green, Error = red, Info = blue.
- **All external links must open in a new tab** with `target="_blank" rel="noopener noreferrer"`.
- **All exports (CSV, PDF) should include the current date in the filename** formatted as `YYYY-MM-DD`.
- **Country lists everywhere in the app** should follow the pattern: United States first, Canada second, divider, then alphabetical.
- **The Stripe API key is pending from the client** — use placeholder/test keys for now and structure the code so keys are read from environment variables (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- **After completing each phase**, run the corresponding Playwright test suite to validate all fixes before moving to the next phase.
