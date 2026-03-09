# CyberHook — Complete Implementation Blueprint

> **Version:** 2.0  
> **Last Updated:** February 2026  
> **Purpose:** Master guide for Cursor AI to build every feature of CyberHook end-to-end  
> **How to Use:** Follow the phases in order. Each feature section contains: what it does, user journey, UI behavior, data model, API calls, and edge cases.

---

## PRODUCT CONTEXT

CyberHook is a **sales enablement platform** for MSPs (Managed Service Providers) and MSSPs (Managed Security Service Providers). These are IT service companies that help businesses with technology management and cybersecurity.

**The Problem:** MSPs struggle to acquire new clients. Sales cycles are long, cold calling is ineffective, and there's no way to turn cyber threat intelligence into sales opportunities.

**The Solution:** CyberHook takes dark web exposure data, ransomware activity, and breach notifications and transforms them into qualified leads that MSP sales teams can act on immediately. A salesperson can say: *"Hey, we found 7 leaked credentials tied to your company in the last 5 days — who should I talk to about this?"*

**Tech Stack:**
- Frontend: Next.js 14+ (App Router)
- Database: Convex (reactive real-time)
- Auth: Clerk
- Styling: Tailwind CSS + shadcn/ui (dark mode, Vercel-inspired aesthetic)
- Payments: Stripe
- Icons: Lucide React
- Charts: Recharts
- Forms: React Hook Form + Zod

---

## TABLE OF CONTENTS

1. [Access Model & User Roles](#1-access-model--user-roles)
2. [Onboarding & Approval Flow](#2-onboarding--approval-flow)
3. [Dashboard Layout & Navigation](#3-dashboard-layout--navigation)
4. [News (Home Dashboard)](#4-news-home-dashboard)
5. [To-Do List](#5-to-do-list)
6. [Ransom Hub](#6-ransom-hub)
7. [Live Search](#7-live-search)
8. [Live-Leads](#8-live-leads)
9. [Watchlist](#9-watchlist)
10. [AI Agents (Campaigns)](#10-ai-agents-campaigns)
11. [Knowledge Base](#11-knowledge-base)
12. [RFP Hub](#12-rfp-hub)
13. [Events & Conferences](#13-events--conferences)
14. [Reporting](#14-reporting)
15. [Settings](#15-settings)
16. [Billing & Usage](#16-billing--usage)
17. [Integrations](#17-integrations)
18. [Guided Tour](#18-guided-tour)
19. [Report Template (PDF Generation)](#19-report-template-pdf-generation)
20. [Token System](#20-token-system)
21. [Notifications](#21-notifications)
22. [Database Schema (Complete)](#22-database-schema-complete)
23. [Routes & File Structure](#23-routes--file-structure)
24. [Environment Variables](#24-environment-variables)
25. [Implementation Phases](#25-implementation-phases)

---

## 1. ACCESS MODEL & USER ROLES

### Three Roles

| Role | Who | What They See |
|------|-----|--------------|
| **Sales Rep** | Individual salesperson | Only their own data — tasks, campaigns, leads, metrics |
| **Sales Admin** | Team manager / account owner | Everything — all users' data, settings, integrations, billing, approvals |
| **Billing User** | Finance person | Read-only billing/usage data only — no operational features |

### Permission Matrix

| Feature | Sales Rep | Sales Admin | Billing User |
|---------|:---------:|:-----------:|:------------:|
| News/Dashboard | Own data | All data | Limited (usage only) |
| Run Live Search | ✅ | ✅ | ❌ |
| View Own Metrics | ✅ | ✅ | ❌ |
| View Team Metrics | ❌ | ✅ | ❌ |
| Manage Users | ❌ | ✅ | ❌ |
| Manage Integrations | ❌ | ✅ | ❌ |
| View Audit Log | ❌ | ✅ | ❌ |
| View Search History | ❌ | ✅ | ❌ |
| View Billing Details | ❌ | ✅ | ✅ (read-only) |
| Manage Billing | ❌ | ✅ | ❌ |
| Create Campaigns | ✅ (own) | ✅ (all) | ❌ |
| Create Watchlist Items | ✅ (own) | ✅ (all) | ❌ |
| Create Tasks | ✅ | ✅ | ❌ |
| Manage Company Profile | ❌ | ✅ | ❌ |
| Knowledge Base (personal) | ✅ | ✅ | ❌ |
| Knowledge Base (global) | ❌ | ✅ | ❌ |
| RFP Hub (view/create) | ✅ | ✅ | ❌ |
| RFP Hub (approve references) | ❌ | ✅ | ❌ |
| Live-Leads | Own | All | ❌ |
| Watchlist | Own | All | ❌ |
| Ransom Hub | ✅ | ✅ | ❌ |
| AI Agents | Own | All | ❌ |
| Events | ✅ | ✅ | ❌ |
| Reporting | Own | All | ❌ |

### RBAC Implementation

```typescript
// hooks/use-permissions.ts
export function usePermissions() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as 'sales_rep' | 'sales_admin' | 'billing';
  
  return {
    role,
    canRunSearch: ['sales_rep', 'sales_admin'].includes(role),
    canViewTeamMetrics: role === 'sales_admin',
    canManageUsers: role === 'sales_admin',
    canManageIntegrations: role === 'sales_admin',
    canViewAuditLog: role === 'sales_admin',
    canManageCompanyProfile: role === 'sales_admin',
    canViewBilling: ['sales_admin', 'billing'].includes(role),
    canManageBilling: role === 'sales_admin',
    canCreateGlobalContent: role === 'sales_admin',
    canApproveReferences: role === 'sales_admin',
    dataScope: role === 'sales_admin' ? 'all' : 'own',
  };
}
```

---

## 2. ONBOARDING & APPROVAL FLOW

### User Journey (Step by Step)

**Step 1 — Sign Up**
- User visits `/sign-up`
- Fills: email, password, first name, last name
- Clerk handles email verification
- After verification → redirect to `/onboarding`

**Step 2 — Company Questionnaire (`/onboarding` page, multi-step wizard)**

The onboarding is a 3-step wizard. Progress bar at top showing Step 1/2/3.

*Step 1 of 3 — Company Basic Info:*
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Company Name | text | ✅ | Min 2 chars |
| Phone | tel | ✅ | Valid phone format |
| Website | url | ✅ | Valid URL |

*Step 2 of 3 — Business Details:*
| Field | Type | Required | Options |
|-------|------|----------|---------|
| Primary Business Model | single-select | ✅ | MSP/MSSP, VAR/Reseller, Systems Integrator, VAD, TAP, Consultant/Referral Partner, Not set |
| Annual Revenue | single-select | ✅ | 0–4M, 5–9M, 10–24M, 25–49M, 50–99M, 100–249M, 250M–1B, 1B+ |
| Geographic Coverage | multi-select | ✅ | North America, EMEA, APAC, ANZ, LATAM |
| Target Customer Base | multi-select | ✅ | SMB, Mid Market, Enterprise, Fortune 500 |
| Total Employees | single-select | ✅ | 1–10, 11–50, 51–100, 101–150, 151–250, 251–500, 501+ |
| Total Sales People | single-select | ✅ | Just me (solo), 2–3, 3–5, 5–10, 10–25, 25–50, 50+ |
| Primary Location | text | ❌ | Address, city, state, country — creates first location entry |
| Notes | textarea | ❌ | Additional info |

*Step 3 of 3 — Team & Branding:*
| Field | Type | Notes |
|-------|------|-------|
| Team Member Emails | textarea | Comma or newline separated, optional |
| Logo Upload | file | GIF, PNG, JPG, JPEG, JFIF — min 256x256px |

When submitted: Create `company` record in Convex, create `user` record linked to company, set status to `pending_approval`.

**Step 3 — Plan & Payment (`/onboarding/payment`)**
- Display plan options (Starter, Growth, Enterprise)
- Stripe Card Element for payment details
- On submit: Create Stripe customer + subscription with 5-day trial
- Card on file, auto-converts to paid after trial unless cancelled

**Step 4 — Pending Approval (`/pending-approval`)**
- Full-screen "Account Under Review" page
- Message: "We received your information. Your account is under review and will be granted access within 24–48 hours if approved. We do this to prevent misuse of sensitive information and ensure only verified partners gain access."
- Sign out button
- User CANNOT access any dashboard routes until approved
- Invited team members receive emails ONLY after the account is approved

**Step 5 — Admin Approves/Rejects**
- Sales Admin (internal CyberHook team) reviews from `/settings/users` → "Pending Approvals" tab
- **Approve:** User status → `approved`, email notification sent, user can now access dashboard
- **Reject:** User status → `rejected`, trial/plan cancelled, notification sent

### Middleware Logic

```
On every authenticated route:
1. Check if user exists in Convex
2. If no user record → redirect to /onboarding
3. If user.status === 'pending' → redirect to /pending-approval
4. If user.status === 'rejected' → show rejection page
5. If user.status === 'approved' → allow access (check role permissions)
```

---

## 3. DASHBOARD LAYOUT & NAVIGATION

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                  │
│ [CH Logo] [Search... (global)] │ 🔔 [941/1,000] ⚙️ [Avatar]│
├────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────────────────────────────────────┐  │
│ │ SIDEBAR  │ │ MAIN CONTENT AREA                        │  │
│ │          │ │                                           │  │
│ │ News     │ │  (changes per route)                     │  │
│ │ To-Do    │ │                                           │  │
│ │ Ransom   │ │                                           │  │
│ │ Search   │ │                                           │  │
│ │ Leads    │ │                                           │  │
│ │ Watchlist│ │                                           │  │
│ │ AI Agents│ │                                           │  │
│ │ Knowl.   │ │                                           │  │
│ │ RFP Hub  │ │                                           │  │
│ │ Events   │ │                                           │  │
│ │ Report.  │ │                                           │  │
│ │ ──────── │ │                                           │  │
│ │ ADMIN    │ │                                           │  │
│ │ Settings │ │                                           │  │
│ │ Billing  │ │                                           │  │
│ │          │ │                                           │  │
│ │[Collapse]│ │                                           │  │
│ └──────────┘ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation Config

Items shown are filtered by user role. Sidebar is collapsible.

```
GROWTH section:
  - News          → /               [Home icon]        [all roles]
  - To-Do List    → /todos          [CheckSquare]      [sales_rep, sales_admin]
  - Ransom Hub    → /ransom-hub     [Shield]           [sales_rep, sales_admin]
  - Live Search   → /live-search    [Search]           [sales_rep, sales_admin]
  - Live-Leads    → /live-leads     [Users]            [sales_rep, sales_admin]
  - Watchlist     → /watchlist      [Eye]              [sales_rep, sales_admin]
  - AI Agents     → /ai-agents     [Bot]              [sales_rep, sales_admin]
  - Knowledge Base→ /knowledge-base [BookOpen]         [sales_rep, sales_admin]
  - RFP Hub       → /rfp-hub       [FileCheck]        [sales_rep, sales_admin]
  - Events        → /events        [Calendar]         [sales_rep, sales_admin]
  - Reporting     → /reporting     [BarChart3]        [sales_rep, sales_admin]

ADMIN section:
  - Settings      → /settings      [Settings]         [sales_admin]
  - Billing & Usage → /billing     [CreditCard]       [sales_admin, billing]
```

### Header Bar Components

- **Left:** CyberHook logo + hamburger menu (mobile)
- **Center:** Global search bar (searches across leads, watchlist, tasks)
- **Right:** Notification bell (with unread count badge), Token display bar (`941 / 1,000` with progress bar), Settings gear, User avatar with dropdown (Profile, Sign Out)

### Token Display

Always visible in header. Shows: `[search icon] remaining / total` with a colored progress bar.
- Green: >50% remaining
- Yellow: 20–50% remaining  
- Red: <20% remaining

Tooltip on hover: "X searches remaining this month"

---

## 4. NEWS (HOME DASHBOARD)

**Route:** `/`  
**Access:** All approved users (Billing users see limited view)

### What the User Sees

When a Sales Rep/Admin logs in, they land on News. It's their daily command center.

### UI Components (top to bottom)

**Greeting Header:**
- "Hello, [First Name]"
- Subtitle: "Welcome back to CyberHook. Here's what's happening today."

**KPI Tiles (4-column grid):**
| Tile | Data | Visual |
|------|------|--------|
| MRR vs Target | `$45,231` / `+12% of $50,000 target` | Dollar amount with % indicator |
| Appointments Booked | `8` / `+23% this month` | Count with trend |
| Searches (7 days) | `47` / `941 remaining` | Count with remaining tokens |
| Emails Sent | `156` / `+8% this month` | Count with trend |

For Sales Admin: Toggle to see "My" vs "Team" aggregates.  
For Billing User: Only show token usage and subscription status tiles.

**Today Panel (left column below KPIs):**
- "Today" header with calendar icon
- **Appointments** section: List of today's meetings/calls with time and type badge
- **Tasks Due** section: List of tasks due today/overdue with priority dots (red=high, yellow=medium, blue=low)

**Quick Actions (right column, beside Today):**
Three large clickable cards:
1. 🔍 "Run Live Search" → navigates to `/live-search`
2. 🔔 "Add to Watchlist" → opens Watchlist add dialog
3. ✉️ "Start Campaign" → navigates to `/ai-agents/new`

**Cyber News Feed (below):**
- Header: "Cyber News" with "View All →" link
- Feed of 4–6 news items, each showing:
  - Headline (clickable, opens source)
  - Source name + time ago (e.g., "CyberNews • 2 hours ago")
  - Category badge (Ransomware, Vulnerability, Industry, Alert)
- News is filtered by user's geographic coverage and industry
- Source: RSS feeds or curated API (cybersecurity news aggregator)

### Behavior

- Data refreshes reactively via Convex subscriptions
- KPI tiles pull from: `events` (appointments), `searches` (search count), `campaignMessages` (emails sent), company MRR settings
- Tasks pull from `tasks` table filtered by assignee + due date
- Appointments pull from `events` table filtered by type = 'appointment' or 'meeting' + today's date

---

## 5. TO-DO LIST

**Route:** `/todos`  
**Access:** Sales Rep, Sales Admin

### User Journey

A salesperson opens To-Do to see all their tasks. They can create new tasks, assign to themselves or teammates, link tasks to leads/watchlist companies, and mark them complete.

### Task Data Model

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text | ✅ | What needs to be done |
| Description | textarea | ❌ | Additional details |
| Due Date | date picker | ❌ | When it's due |
| Priority | select | ✅ | Low / Medium / High |
| Linked Company | search/select | ❌ | From Live-Leads or Watchlist |
| Assigned To | user select | ✅ | Defaults to self. Admin can assign to any user |
| Status | auto | — | Pending or Completed |

### UI Behavior

**Page Layout:**
- Page header: "To-Do List" with "+ New Task" button
- Tab bar: "My Tasks" | "Team Tasks" (admin only)
- Filter bar: Status (all/pending/completed), Priority, Due Date range, Assignee (admin)
- Task list showing: Priority dot, Title, Linked company (if any), Due date, Assigned avatar
- Click task → expand inline or open detail panel

**Creating a Task:**
- Click "+ New Task" → slide-out panel or modal
- Fill fields, submit → task appears in list
- Confirmation toast: "Task created"

**Completing a Task:**
- Click checkbox next to task → status changes to "completed", strikethrough styling
- Can reopen by unchecking

**Task Assignment (Admin only):**
- When creating task, admin sees a dropdown of all company users
- Sales Reps only see themselves in the Assigned To field

---

## 6. RANSOM HUB

**Route:** `/ransom-hub`  
**Access:** Sales Rep, Sales Admin

### Purpose

Shows companies that have already been breached or attacked by ransomware. These are immediate sales prospects — the MSP can offer recovery and protection services.

### Data Sources

1. **Ransomware Attacks** — from `ransomware.live` API (companies posted by ransomware groups)
2. **Breach Notifications** — from government/public breach databases:
   - HHS OCR Breach Portal (healthcare HIPAA breaches)
   - Privacy Rights Clearinghouse (general breaches)
   - California AG Breach List (California-specific)

### User Journey

Salesperson opens Ransom Hub → sees a table of recently breached companies → filters by geography/industry → clicks a company → can "View Exposure" (pre-fills Live Search), "Add to Watchlist", or "Create Lead".

### UI Layout

**Tabs at top:** `[Ransomware Attacks]` `[Breach Notifications]`

**Filter Bar:**
- Date Range (picker)
- Geography (multi-select)
- Industry (multi-select)
- Ransomware Group (for Ransomware tab)
- Source (for Breach Notifications tab)

**Table Columns:**
| Column | Description |
|--------|-------------|
| Company Name | Name of breached company |
| Domain | If available |
| Industry | If available |
| Geography | Location |
| Date | Attack/filing date |
| Group/Source | Ransomware group name or breach source |
| Individuals Affected | (Breach Notifications only) |

**Row Actions (3-dot menu or action buttons):**
- "View Exposure" → navigates to `/live-search?domain=[domain]` (pre-filled)
- "Add to Watchlist" → opens quick-add dialog
- "Create Lead" → creates a new lead in Live-Leads from this incident

### Backend

- Cron job (`convex/crons/ransomHubSync.ts`) pulls data from ransomware.live periodically
- Cron job (`convex/crons/breachNotificationSync.ts`) scrapes breach notification sites
- Data stored in `ransomIncidents` table with `incidentType` field distinguishing ransomware vs breach_notification

---

## 7. LIVE SEARCH

**Route:** `/live-search`  
**Access:** Sales Rep, Sales Admin

### Purpose

The core feature. User enters a company's domain, the system searches dark web/exposure databases and returns a report of leaked credentials, exposed data, and breaches.

### User Journey

1. User navigates to Live Search
2. Enters a domain (e.g., `acmecorp.com`)
3. Sees token cost warning: "This search will use 1 token. You have 941 remaining."
4. Clicks "Search"
5. System deducts 1 token, queries exposure API
6. Results appear with summary and detailed findings
7. User can: Save as Lead, Add to Watchlist, Generate PDF Report

### UI Layout

**Search Input Area:**
```
┌──────────────────────────────────────────────┐
│  Live Search                                  │
│  Enter a domain to search for exposures       │
│                                               │
│  [acmecorp.com                    ] [Search]  │
│  This search will use 1 token (941 remaining) │
└──────────────────────────────────────────────┘
```

**Results Area (after search):**

*Summary Cards:*
| Card | Content |
|------|---------|
| Total Exposures | Count (e.g., "7") |
| Severity | HIGH / MEDIUM / LOW / NONE |
| Date Range | "Jan 2024 – Feb 2026" |
| Data Types | "Credentials, Email Addresses, Passwords" |

*Detailed Findings Table:*
| # | Type | Source | Detected | Data Preview |
|---|------|--------|----------|--------------|
| 1 | Credential | Dark Web | Feb 12, 2026 | j***@acmecorp.com |
| 2 | Credential | Dark Web | Feb 10, 2026 | m***@acmecorp.com |
| ... | ... | ... | ... | ... |

**IMPORTANT: All sensitive data (emails, passwords) must be masked/partially redacted.**

*Action Buttons:*
- "Save as Lead" → creates a new Live-Leads entry with exposure data linked
- "Add to Watchlist" → adds this domain to the user's watchlist
- "Generate Report" → creates a branded PDF (see Section 19)
- "Export CSV" → downloads findings as CSV

### Backend Flow

```
1. User clicks Search
2. Frontend calls convex mutation: searches.runSearch({ domain })
3. Mutation:
   a. Validates user is approved and has token balance
   b. Deducts 1 token from company.tokensUsed
   c. Creates search record (status: 'pending')
   d. Calls external exposure API with domain
   e. Parses results, creates searchResults records
   f. Updates search record (status: 'success' or 'failed')
4. Frontend reactively receives results via Convex subscription
```

### Edge Cases

- **No tokens left:** Show error "You've used all your search tokens this month. Contact your admin to upgrade."
- **API failure:** Show error, refund the token, log the failure
- **No results found:** Show "No exposures found for [domain]. This is a good sign!" with option to Add to Watchlist anyway
- **Domain validation:** Validate format before submitting (no http://, just domain.com)

---

## 8. LIVE-LEADS

**Route:** `/live-leads` and `/live-leads/[id]`  
**Access:** Sales Rep (own leads), Sales Admin (all leads)

### Purpose

Central database of prospect companies discovered through Live Search, Ransom Hub, or manual entry. Each lead is enriched with company info and key decision maker contacts.

### User Journey — List View

1. User opens Live-Leads
2. Sees a sidebar with filters (time range, country, region, industry, size) and a main table
3. Table shows companies with name, industry, website, country, region, employee count
4. User can filter, search, and paginate
5. Clicking "Generate Report" on any row creates a branded PDF
6. Clicking a company row opens the Lead Detail page

### List View UI

**Left Sidebar Filters:**
- Time Range: Last 24 Hours, Last 7 Days, Last 30 Days, All Time
- Country: dropdown (default: United States)
- Region: dropdown
- Industry: dropdown with search
- Size (Employee Count): dropdown ranges

**Main Table Columns:**
| Column | Description |
|--------|-------------|
| Avatar/Initials | First two letters of company name |
| Name | Company name |
| Industry | Industry category |
| Website | Domain/website |
| Country | Country |
| Region | State/region |
| Employees | Range (e.g., "51-200") |
| Actions | "Generate Report" button + 3-dot menu |

**3-dot menu per row:**
- View Details
- Add to Watchlist
- Start Campaign
- Push to CRM

**Pagination:** "Showing 1 to 20 of 47 entries" with page controls

### User Journey — Lead Detail View (`/live-leads/[id]`)

**Header Section:**
```
← Back to Live-Leads

[Company Logo]  Powerful Electric Inc.
                powerfulelectric.com • Construction
                📍 Los Angeles, CA • 100 employees
                Revenue: $10M–$24M

[Add to Watchlist] [Start Campaign] [Push to CRM] [Generate Report]
```

**Tab Navigation:**
`[Overview]` `[Key Contacts]` `[Exposures]` `[Activity]`

**Overview Tab:**
- Company info grid: Headquarters, Industry, Employee Count, Revenue Range, Website (link), LinkedIn (link)
- Office Locations list (from enrichment): HQ address, branch offices
- Exposure Summary cards: X exposures, last exposure date, severity level

**Key Contacts Tab:**
- List of decision makers (CEO, CFO, COO, CIO, CISO, IT Manager)
- Each contact shows: Name, Title, LinkedIn link
- "Reveal Email 💰" button — costs credits, calls contact reveal API
- "Reveal Phone 💰" button — costs credits, calls contact reveal API
- "Add to Campaign" button — adds this contact to a campaign recipient list
- Target Roles listed at bottom for reference

**Exposures Tab:**
- Linked search results from when this lead was discovered
- Same table format as Live Search results
- Can re-run search (costs a token)

**Activity Tab:**
- Timeline of actions taken on this lead: when created, when contacted, campaigns sent, notes

### Enrichment Flow

When a lead is created (from Live Search, Ransom Hub, or manual), the system:
1. **Auto-enriches company data** via Company Enrichment API (Clearbit/ZoomInfo/Apollo) — headquarters, employee count, revenue, LinkedIn, office locations
2. **Auto-enriches decision makers** via People API (Apollo People API/RocketReach) — names, titles, LinkedIn URLs
3. **On-demand contact reveal** via Contact Reveal API (Apollo/Hunter/Lusha) — email and phone ONLY when user clicks "Reveal" (this costs additional credits)

Enrichment data is stored in `leads.enrichmentData` field. Contacts are stored in `contacts` table linked to the lead.

---

## 9. WATCHLIST

**Route:** `/watchlist`  
**Access:** Sales Rep (own), Sales Admin (all)

### Purpose

Monitor specific companies for new dark web exposures. When new data surfaces, the user gets alerted so they can reach out immediately.

### User Journey

1. User adds companies to watchlist from: Live Search results, Ransom Hub, Live-Leads, or manually
2. System periodically checks each watchlisted domain for new exposures
3. If new exposure found within configured window (7/30/90 days), item gets flagged
4. User sees "New" indicator on flagged items
5. Optional: email notification sent

### Adding to Watchlist

From any module, clicking "Add to Watchlist" opens a dialog:
- Domain (pre-filled if coming from another module)
- Company Name (pre-filled or enter manually)
- Notification Preference: toggle for email alerts
- Monitoring Window: 7 days / 30 days / 90 days (default: 30)

### Watchlist UI

**Filter Bar:**
- New exposures in: 7 / 30 / 90 days
- Geography, Industry, Size

**Table Columns:**
| Column | Description |
|--------|-------------|
| Company | Company name |
| Domain | Watched domain |
| Last Exposure | Date of most recent exposure |
| Status | "🔴 New" flag if exposure within window, "✅ Clear" otherwise |
| Added | When added to watchlist |
| Actions | View Exposure, Remove |

**Row Actions:**
- "View Exposure" → pre-filled Live Search
- "Create Lead" → sends to Live-Leads
- "Start Campaign" → direct to AI Agents
- "Remove" → remove from watchlist with confirmation

### Backend

- Cron job (`convex/crons/watchlistMonitor.ts`) runs on schedule
- For each watchlisted domain, checks exposure API for new data since `lastCheckedAt`
- If new data found: updates `hasNewExposures`, `lastExposureDate`, `exposureCount`
- Creates notification record if user has email notifications enabled
- Updates `lastCheckedAt` timestamp

---

## 10. AI AGENTS (CAMPAIGNS)

**Route:** `/ai-agents`, `/ai-agents/new`, `/ai-agents/[id]`  
**Access:** Sales Rep (own campaigns), Sales Admin (all)

### Purpose

Help sales teams create and execute personalized outreach campaigns using AI-generated emails based on exposure data. The "hook" is: *"We found exposed data linked to your company."*

### Campaign Flow (V1 - Two Phases)

**Phase A (MVP):** AI generates email text → user copies/pastes into their email client manually.  
**Phase B (Full):** If Outlook/Gmail integration is connected, send email directly from the system.

### User Journey — Creating a Campaign

**Step 1: Basic Info**
- Campaign Name (required)
- Description (optional)

**Step 2: Select Audience**
- Choose contacts from Live-Leads and/or Watchlist
- Filters: Region, employee size, exposure status, lead status
- Check/uncheck contacts to include
- Shows count: "23 contacts selected"

**Step 3: Configure Cadence**
- Select a cadence pattern or create custom:
  - Day 1: Email
  - Day 3: Follow-up email
  - Day 5: Email
  - Day 7: Final email
- Sending window: Start time, End time, Days of week, Timezone
- Throttling: Max emails per day, Min delay between sends

**Step 4: Generate & Review Emails**
- AI generates personalized emails for each contact using:
  - Company name
  - Exposure data (what was found, how many credentials)
  - Contact's name and title
  - MSP's branding info from company settings
  - Selected script template from Knowledge Base (if any)
- User can preview, edit, and approve each email before sending
- Default mode: approval required before sending

**Step 5: Launch**
- Confirm and start campaign
- Campaign status: Draft → Active → Completed

### Campaign List View

**Table showing all campaigns:**
| Column | Description |
|--------|-------------|
| Campaign Name | Link to detail |
| Status | Draft / Active / Paused / Completed |
| Recipients | Total contacts |
| Emails Sent | Count sent |
| Created | Date created |
| Actions | Pause, Resume, Delete |

### Email Generation (AI)

```
System Prompt for LLM:
"You are a sales email assistant for an MSP/MSSP company. Generate a personalized 
cold outreach email based on the following context:

Company: {target_company_name}
Contact: {contact_name}, {contact_title}
Exposure Data: {exposure_summary}
MSP Company: {msp_company_name}

The email should:
- Reference the specific exposure data found
- Be professional but urgent
- Be 3-5 sentences
- End with a call to action (meeting or call)
- NOT be alarmist or threatening
"
```

API: Use OpenAI or Anthropic API. Store API key in env variables.

### Email Delivery

**Phase A (no integration):**
- Show generated email in a text area
- "Copy to Clipboard" button
- User manually pastes into Outlook/Gmail

**Phase B (with integration):**
- If Outlook integration connected → send via Microsoft Graph API (Mail.Send scope)
- If Gmail integration connected → send via Gmail API (gmail.send scope)
- Email sent from user's actual email address
- Log sent timestamp in `campaignMessages` table

---

## 11. KNOWLEDGE BASE

**Route:** `/knowledge-base`, `/knowledge-base/[id]`  
**Access:** Sales Rep (personal + global view), Sales Admin (all + can create global)

### Purpose

Replaces the old "Scripts & Cadences" module. A content repository where sales teams store reusable materials: website references, FAQ templates, email scripts, and documents.

### Content Types (4 types, NO "Tables")

| Type | Icon | Description | Fields |
|------|------|-------------|--------|
| **Web Crawler** | 🌐 | Save URLs, optionally crawl and extract content | URL, crawled content |
| **FAQ** | ❓ | Question-answer pairs (max 1000 chars each) | Question, Answer |
| **Rich Text** | 📝 | Named rich text entries with formatting | Name, HTML content |
| **File Upload** | 📎 | Upload PDF, DOC, DOCX files | File, name |

### UI Layout

**Page Header:** "Knowledge Base" with "+ Add Source" button (dropdown showing 4 types)

**Tab Navigation:** `[All]` `[Web Crawler]` `[FAQ]` `[Rich Text]` `[File Upload]`

**Entry List:** Cards showing:
- Type icon + Name
- Type label + metadata (date, character count, file size)
- URL for web crawler entries
- Entry count for FAQ sets

**Scope Badge:** "Global" (visible to all) or "Personal" (only creator)

### Add Source Dialogs

**Web Crawler Dialog:**
- "Crawl and extract content from a website"
- Input: URL mode selector (Exact URL dropdown) + URL field
- "Extract Data" button → calls a web scraper/fetcher, stores extracted text

**FAQ Dialog:**
- "Write a question and answer pair"
- Q field: textarea (0/1000 characters)
- A field: textarea (0/1000 characters)
- Cancel / Save buttons

**Rich Text Editor:**
- Name field at top
- Formatting toolbar: Paragraph style, Font, Size, Line height, Bold/Italic/Underline/Strikethrough, Alignment, Link, Lists, Code
- Content area
- Save button

**File Upload Dialog:**
- "Upload files to your knowledge base"
- Drag-and-drop zone: "Drop files here or browse"
- Supports: PDF, DOC, DOCX
- Cancel / Upload Files buttons

### Permissions

- **Sales Rep:** Can create personal entries, view global + own personal, edit/delete own
- **Sales Admin:** Can create global entries, view all, edit/delete any

### Connection to AI Agents

When AI Agents generate emails, they can reference Knowledge Base entries (specifically Rich Text entries that contain email templates/scripts) to use as a base for personalization.

---

## 12. RFP HUB

**Route:** `/rfp-hub`, plus sub-routes  
**Access:** Sales Rep, Sales Admin (admin can approve references)

### Purpose

Help MSPs manage RFP responses, track reference clients, store certifications, and maintain reusable answer content. Three sub-modules.

### Navigation

RFP Hub landing page shows three cards/tabs linking to sub-modules:
1. **Use Cases** — `/rfp-hub/use-cases`
2. **Certifications** — `/rfp-hub/certifications`
3. **RFP Tracker** — `/rfp-hub/tracker`

### 12.1 Use Cases

**Purpose:** Structured case studies and reference clients that salespeople access during sales cycles.

**Use Case Entry Fields:**
| Field | Type | Required |
|-------|------|----------|
| Title | text | ✅ |
| Industry | select | ✅ |
| Headcount | text | ❌ |
| Revenue | select | ❌ |
| Problem Statement | textarea | ✅ |
| Scope of Work | textarea | ✅ |
| How We Help | textarea | ✅ |
| Comparison Table | structured (before/after) | ❌ |
| Value Adds | list of strings | ❌ |
| Is Approved Reference | boolean | ✅ (Admin only can toggle) |

**Reference Client Info (within each Use Case):**
- Company Name, Contact Name, Email, Phone, Industry, Website, Projects Summary

**UI:** Card list with industry icons, filterable by industry and approved status. Detail page shows full use case with all fields.

### 12.2 Certifications

**Purpose:** Store all company certifications, insurance, awards, accreditations.

**Entry Fields:**
| Field | Type | Required |
|-------|------|----------|
| Name | text | ✅ (e.g., "SOC 2 Type II") |
| Category | select | ✅ (Certification, Insurance, Award, Accreditation, Compliance, Other) |
| Issuing Authority | text | ❌ |
| Issue Date | date | ❌ |
| Expiry Date | date | ❌ |
| Status | select | ✅ (Active, Expired, Pending, Renewal Required) |
| Description | textarea | ❌ |
| Document URL | text | ❌ |
| Document Upload | file | ❌ |
| Tags | multi-select | ❌ |

**UI:** Cards or table list with status badges. Visual warning if expiry date is within 30 days. Pre-populated categories: SOC 2 Type II, FedRAMP, HIPAA Compliance, PCI DSS, ISO 27001, CMMC, Veteran Owned, Woman Owned, MBE, SBE, DBE, HUBZone, 8(a), SDVOSB.

### 12.3 RFP Tracker

**Three sections within RFP Tracker:**

**A. RFP Deadline Tracker:**
| Field | Type | Required |
|-------|------|----------|
| RFP Title | text | ✅ |
| Client/Prospect | text | ✅ |
| Submission Deadline | date | ✅ |
| Status | select | ✅ (Draft, In Progress, Submitted, Won, Lost, No Bid) |
| Assigned To | user select | ❌ |
| Estimated Value | currency | ❌ |
| Notes | textarea | ❌ |
| Linked Use Case | select | ❌ |

**UI:** Table with deadline indicators (🔴 overdue, 🟡 due within 3 days, 🟢 on track). Win/Loss summary cards at top of page.

**B. Pre-Built RFP Answer Bank:**
- Searchable list of pre-written Q&A pairs organized by category
- Fields: Question/Category, Answer (rich text), Tags
- Click to copy answer to clipboard
- Sales team can customize company-specific answers

**C. Quick Downloads:**
- Grid of downloadable files with category badges
- Pre-suggested categories: Capabilities Deck, Security Whitepaper, Compliance Evidence Pack, Insurance Certificates, Case Studies, Partner Program Overview
- Upload button for each, download button for each

---

## 13. EVENTS & CONFERENCES

**Route:** `/events`, `/events/[id]`  
**Access:** Sales Rep, Sales Admin

### Purpose

Help MSPs plan which industry events to attend and track event-related meetings.

### Two Types of Events

**System Events:** Pre-curated list of industry events (conferences, webinars). Examples: RSA Conference, Right of Boom, Black Hat, NVIDIA GTC, Tech Week LA/Austin/NYC.

**User Events:** Custom events the user creates — meetings, appointments, custom conferences. Events flagged as "appointment" or "meeting" type count toward reporting metrics.

### UI Views

**Calendar View:** Month/week calendar with events as colored blocks. Color-coded by type.

**List View:** Filterable table with:
- Event title
- Date/time
- Location
- Type badge (Conference, Webinar, Meeting, Appointment, Custom)
- Owner (who created it)
- Linked Lead (if associated)

### Creating an Event

| Field | Type | Required |
|-------|------|----------|
| Title | text | ✅ |
| Type | select | ✅ (Conference, Webinar, Meeting, Appointment, Custom) |
| Start Date/Time | datetime | ✅ |
| End Date/Time | datetime | ❌ |
| Location | text | ❌ |
| Is Virtual | toggle | ❌ |
| Description | textarea | ❌ |
| Linked Lead | search/select | ❌ (from Live-Leads) |

### Behavior

- Events of type "appointment" or "meeting" are counted in the News dashboard KPIs and Reporting metrics
- System events are read-only for users (admin seeds them)
- Calendar integration: If Google/Outlook Calendar connected, events sync bidirectionally

---

## 14. REPORTING

**Route:** `/reporting`  
**Access:** Sales Rep (own data), Sales Admin (team data)

### Metrics Tracked

| Metric | Source |
|--------|--------|
| Live Searches run | `searches` table count |
| Emails sent via AI Agents | `campaignMessages` where status='sent' |
| Active campaigns | `campaigns` where status='active' |
| Completed campaigns | `campaigns` where status='completed' |
| Appointments booked | `events` where type='appointment' or 'meeting' |
| Calls logged | Manual log or integration count |
| Events attended/created | `events` table count |

### UI Views

**My Performance (Sales Rep default):**
- KPI tiles showing personal stats vs targets
- Simple bar/line charts for trends over time
- Time range selector: This month, Last 30 days, This quarter, This year

**Team Performance (Sales Admin):**
- Aggregate metrics across all users
- Per-user breakdown table: User name, Searches, Emails, Appointments, Calls
- Export CSV button

**Billing User:** Does NOT see sales performance. Only sees aggregate usage and billing reports.

---

## 15. SETTINGS

**Route:** `/settings` (redirects to `/settings/profile`)  
**Sub-routes:** `/settings/profile`, `/settings/users`, `/settings/integrations`, `/settings/audit-log`  
**Access:** Sales Admin only

### 15.1 Company Profile (`/settings/profile`)

Organized into sections:

**GENERAL INFORMATION:**
- Company Name, Location ID (unique tracking identifier), Company Type (was "Industry"), Website, Phone, Logo upload

**CONTACT INFORMATION:**
- Support Email, Support Phone, Sales Email, Sales Phone

**BUSINESS DETAILS:**
- Primary Business Model, Secondary Business Model, Annual Revenue, Company Size (employees), Sales Team Size, Geographic Coverage, Target Customer Base

**OFFICE LOCATIONS:**
- List of locations with Add/Edit/Delete
- Each location: Label (e.g., "HQ"), Address, City, State, Country, ZIP, Is Headquarters toggle
- Support multiple office locations

**TARGETS:**
- MRR Target ($), Appointment Target, Default Timezone, Default Currency

### 15.2 User Management (`/settings/users`)

**Three tabs:** `[Active Users]` `[Pending Approvals]` `[Deactivated]`

**Active Users:** Table of all active users with: Name, Email, Role, Last Active, Actions (Edit Role, Deactivate)

**Pending Approvals:** Cards showing applicant info:
- Name, email, company, business model, employee count, revenue, applied date
- "View Full Application" button → modal showing all questionnaire data
- "✅ Approve" and "❌ Reject" buttons

**Deactivated:** Table of deactivated users with Reactivate option

**Invite Users:** "Invite User" button → dialog with email field and role selector

### 15.3 Integrations (`/settings/integrations`)

See Section 17 for full details. Grid of integration cards organized by category.

### 15.4 Audit Log (`/settings/audit-log`)

**Tracks:**
- Logins
- User invites, role changes, deactivations
- Integration connections/disconnections
- Token allocation and plan changes
- Searches performed (link to Search History)

**Search History sub-view:**
Each search record: Timestamp, User, Search Type, Input (domain), Result Status, Tokens Consumed

**Filters:** Date range, User, Search type, Result status

---

## 16. BILLING & USAGE

**Route:** `/billing`  
**Access:** Sales Admin (full control), Billing User (read-only)

### Page Sections

**Subscription:**
- Current plan name, renewal date, seats, base price
- Upgrade/Downgrade buttons (Admin only)

**Usage:**
- Token usage meter: "X / Y searches used this month" with progress bar
- Historical usage chart (monthly bar chart via Recharts)
- Per-user usage breakdown (Admin only)

**Invoices:**
- Table: Invoice date, Amount, Status (Paid/Pending/Failed), Download PDF button

**Payment Method:**
- Masked card display (e.g., •••• 4242)
- "Update Payment Method" button (Admin only) → Stripe Card Element
- Billing contact info

### Role Behavior

| Feature | Sales Admin | Billing User |
|---------|-------------|--------------|
| View subscription | ✅ | ✅ |
| Change plan | ✅ | ❌ |
| View invoices | ✅ | ✅ |
| Download invoices | ✅ | ✅ |
| View payment method | ✅ | ✅ |
| Update payment method | ✅ | ❌ |
| View usage metrics | ✅ | ✅ |
| View per-user usage | ✅ | ❌ |

---

## 17. INTEGRATIONS

### Integration Matrix

| Integration | Category | Priority | Purpose |
|-------------|----------|----------|---------|
| **Stripe** | Payments | P0 | Subscriptions, invoices, payments |
| **Outlook Email** | Email | P0 | Send outreach emails from user's address |
| **Gmail** | Email | P1 | Alternative email integration |
| **Outlook Calendar** | Calendar | P1 | Sync events/appointments |
| **Google Calendar** | Calendar | P1 | Sync events/appointments |
| **HubSpot** | CRM | P1 | Push leads/contacts to CRM |
| **GoHighLevel (GHL)** | CRM | P1 | Alternative CRM option |
| **Microsoft Teams** | Messaging | P2 | Notifications and alerts |
| **Slack** | Messaging | P2 | Notifications and alerts |
| **LinkedIn** | Social | P2 | Profile viewing, outreach |

### Integrations Settings Page Layout

Grid of integration cards grouped by category (Email, Calendar, CRM, Messaging, Social, Payments). Each card shows: Icon, Name, Status (Connected ✅ / Not Connected), Connect/Disconnect button.

### OAuth Flow (for each integration)

1. User clicks "Connect" on integration card
2. Redirects to provider's OAuth consent screen
3. User grants permissions
4. Callback URL receives auth code
5. Exchange for access + refresh tokens
6. Store tokens in `integrations` table (encrypted)
7. Show "Connected ✅" status

### Per-Integration Details

**Outlook/Gmail Email:** Used by AI Agents to send emails from user's actual address. Scopes needed: Mail.Send, Mail.ReadWrite.

**Calendar:** Sync events bidirectionally. When user creates event in CyberHook, create in external calendar and vice versa.

**CRM (HubSpot/GHL):** When user clicks "Push to CRM" on a lead, create/update company + contact records in the CRM.

**Teams/Slack:** Send notifications (new watchlist alerts, campaign completions) as messages.

---

## 18. GUIDED TOUR

### Trigger

- Automatically starts on first login after account approval
- Checks `user.guidedTourCompleted` — if false or null, trigger tour

### Tour Steps

1. **Welcome** — "Welcome to CyberHook! Let's take a quick tour."
2. **News Dashboard** — Highlight KPI tiles: "Track your performance at a glance"
3. **Live Search** — Highlight search input: "Search any domain for dark web exposures"
4. **Live-Leads** — Highlight leads list: "Your discovered leads, enriched with company data"
5. **Watchlist** — "Monitor companies and get alerted to new exposures"
6. **AI Agents** — "Create personalized outreach campaigns"
7. **Knowledge Base** — "Store scripts, FAQs, and reference materials"
8. **Token Counter** — Highlight token display: "Track your search usage here"
9. **Complete** — "You're all set! Start by running your first Live Search."

### Behavior

- User can skip at any time ("Skip Tour" button)
- Tour can be replayed from Settings
- On completion or skip: set `guidedTourCompleted = true`, `guidedTourCompletedAt = Date.now()`
- Use a library like `react-joyride` or similar for spotlight/tooltip tour UI

---

## 19. REPORT TEMPLATE (PDF GENERATION)

### Purpose

Generate a branded PDF exposure report that MSPs give to prospects. White-labeled with the MSP's own logo and branding.

### Report Structure

```
┌─────────────────────────────────────────────────┐
│  [MSP Logo]              EXPOSURE REPORT          │
│  [MSP Company Name]                               │
│  [MSP Website]           Generated: [Date]        │
├─────────────────────────────────────────────────┤
│  TARGET COMPANY: [Name]                           │
│  DOMAIN: [domain.com]                             │
│  INDUSTRY: [Industry]                             │
│  HEADQUARTERS: [Location]                         │
├─────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY                                │
│  [X] Exposures  |  [Severity]  |  Last: [Date]   │
│  Types: Leaked Credentials (5), Email (2)         │
├─────────────────────────────────────────────────┤
│  DETAILED FINDINGS                                │
│  # | Type | Source | Detected | Data Preview      │
│  1 | Cred | Dark   | Feb 12   | j***@company.com │
│  ...                                              │
├─────────────────────────────────────────────────┤
│  RECOMMENDATIONS                                  │
│  (Static text with MSP's services pitch)          │
├─────────────────────────────────────────────────┤
│  CONTACT US                                       │
│  [MSP Name] • [MSP Phone] • [MSP Email]          │
│  [MSP Website]                                    │
│  CONFIDENTIAL                                     │
└─────────────────────────────────────────────────┘
```

### Adaptive Fields (pulled from company settings)

- MSP Logo → `companies.logoUrl`
- MSP Company Name → `companies.name`
- MSP Website → `companies.website`
- MSP Phone → `companies.salesPhone` or `companies.phone`
- MSP Email → `companies.salesEmail`

### Implementation

Use `@react-pdf/renderer` for server-side PDF generation. Create a React component that renders the PDF layout, populate with data from the search results and company settings.

---

## 20. TOKEN SYSTEM

### How Tokens Work

- Tokens = search credits. 1 search = 1 token.
- Only Live Searches consume tokens.
- Enrichment, calls, emails do NOT consume tokens.
- Contact reveal (email/phone) costs separate credits (implementation TBD).

### Token Display

- Always visible in header: `[remaining] / [total]` with progress bar
- Color-coded: Green (>50%), Yellow (20-50%), Red (<20%)

### Token Management

- `companies.tokenAllocation` = total tokens per month (e.g., 1000)
- `companies.tokensUsed` = tokens consumed this month
- `companies.tokenResetDate` = timestamp when tokens reset
- Cron job resets `tokensUsed` to 0 on the 1st of each month

### When Tokens Run Out

- Search button disabled
- Message: "You've used all your search tokens this month."
- Admin can upgrade plan for more tokens
- Token usage visible per-user for admin in Billing & Usage

---

## 21. NOTIFICATIONS

### Notification Types

| Type | Trigger | Channel |
|------|---------|---------|
| Watchlist Alert | New exposure detected for watched domain | In-app + Email (if enabled) |
| Approval Status | Account approved or rejected | Email |
| Campaign Complete | All emails in campaign sent | In-app |
| Token Low | <10% tokens remaining | In-app |
| Token Depleted | 0 tokens remaining | In-app + Email |
| Team Invite | New user invited to team | Email |
| Task Assigned | Task assigned to user | In-app |

### In-App Notifications

- Bell icon in header with unread count badge
- Click opens notification dropdown panel
- Each notification: icon, title, message, timestamp, mark as read
- "Mark All as Read" action
- Stored in `notifications` table

---

## 22. DATABASE SCHEMA (COMPLETE)

### Tables Summary

| Table | Purpose |
|-------|---------|
| `users` | User accounts linked to Clerk |
| `companies` | MSP company accounts with settings |
| `leads` | Prospect companies (Live-Leads) |
| `contacts` | Decision makers linked to leads |
| `watchlistItems` | Monitored domains |
| `searches` | Search history and results metadata |
| `searchResults` | Individual exposure findings |
| `campaigns` | AI Agent campaigns |
| `campaignRecipients` | Contacts in a campaign |
| `campaignMessages` | Generated/sent emails |
| `tasks` | To-Do items |
| `events` | Events and conferences |
| `ransomIncidents` | Ransomware + breach notification data |
| `knowledgeBaseEntries` | Knowledge Base content |
| `useCases` | RFP Hub use cases |
| `certifications` | RFP Hub certifications |
| `rfpEntries` | RFP deadline tracker |
| `rfpAnswers` | RFP answer bank |
| `rfpDownloads` | RFP quick downloads |
| `auditLogs` | System audit trail |
| `integrations` | Connected external services |
| `notifications` | In-app notifications |
| `invitations` | Pending team invitations |
| `scripts` | DEPRECATED — migrated to Knowledge Base |
| `cadences` | DEPRECATED — migrated to Knowledge Base |
| `cadenceSteps` | DEPRECATED — migrated to Knowledge Base |

For full schema definitions with field types, validators, and indexes, refer to `CYBERHOOK_ARCHITECTURE__1_.md` Section 8 and `CYBERHOOK_V2_CHANGES.md` Section 13.

---

## 23. ROUTES & FILE STRUCTURE

### Complete Route Map

```
PUBLIC ROUTES
├── /sign-in                   → Clerk Sign In
├── /sign-up                   → Clerk Sign Up
└── /api/webhooks/*            → Webhook endpoints (Clerk, Stripe)

AUTH ROUTES (before approval)
├── /onboarding                → Company questionnaire wizard
├── /onboarding/payment        → Plan selection + Stripe payment
└── /pending-approval          → "Account Under Review" page

DASHBOARD ROUTES (approved users)
├── /                          → News (Home Dashboard)
├── /todos                     → To-Do List
├── /ransom-hub                → Ransom Hub (ransomware + breach)
├── /live-search               → Live Search
├── /live-leads                → Live-Leads list
│   └── /[id]                  → Lead detail (Overview, Contacts, Exposures, Activity)
├── /watchlist                 → Watchlist
├── /ai-agents                 → Campaigns list
│   ├── /new                   → Campaign creation wizard
│   └── /[id]                  → Campaign detail
├── /knowledge-base            → Knowledge Base (all content types)
│   └── /[id]                  → Entry detail/edit
├── /rfp-hub                   → RFP Hub landing
│   ├── /use-cases             → Use Cases list
│   │   └── /[id]              → Use Case detail
│   ├── /certifications        → Certifications list
│   │   └── /[id]              → Certification detail
│   └── /tracker               → RFP Tracker + Answer Bank + Downloads
│       └── /[id]              → RFP entry detail
├── /events                    → Events list + calendar
│   └── /[id]                  → Event detail
├── /reporting                 → Reporting dashboard
├── /settings                  → (redirects to /settings/profile)
│   ├── /profile               → Company profile settings
│   ├── /users                 → User management + approvals
│   ├── /integrations          → Integration connections
│   └── /audit-log             → Audit log + search history
└── /billing                   → Billing & Usage page
```

### File Structure

```
app/
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (onboarding)/
│   ├── onboarding/page.tsx
│   ├── onboarding/payment/page.tsx
│   └── pending-approval/page.tsx
├── (dashboard)/
│   ├── layout.tsx                    # Dashboard shell with sidebar + header
│   ├── page.tsx                      # News / Home
│   ├── todos/page.tsx
│   ├── ransom-hub/page.tsx
│   ├── live-search/page.tsx
│   ├── live-leads/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── watchlist/page.tsx
│   ├── ai-agents/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── knowledge-base/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── rfp-hub/
│   │   ├── page.tsx
│   │   ├── use-cases/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── certifications/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── tracker/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── events/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── reporting/page.tsx
│   ├── settings/
│   │   ├── page.tsx                  # redirects to profile
│   │   ├── profile/page.tsx
│   │   ├── users/page.tsx
│   │   ├── integrations/page.tsx
│   │   └── audit-log/page.tsx
│   └── billing/page.tsx
├── api/
│   └── webhooks/
│       ├── clerk/route.ts
│       └── stripe/route.ts

components/
├── layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── token-display.tsx
│   └── notification-bell.tsx
├── dashboard/
│   ├── kpi-grid.tsx
│   ├── kpi-card.tsx
│   ├── today-panel.tsx
│   ├── quick-actions.tsx
│   └── news-feed.tsx
├── live-search/
│   ├── search-input.tsx
│   ├── search-results.tsx
│   └── exposure-table.tsx
├── live-leads/
│   ├── leads-table.tsx
│   ├── lead-filters.tsx
│   ├── lead-detail.tsx
│   ├── contact-card.tsx
│   └── enrichment-display.tsx
├── watchlist/
│   ├── watchlist-table.tsx
│   ├── add-to-watchlist-dialog.tsx
│   └── watchlist-filters.tsx
├── ai-agents/
│   ├── campaign-wizard.tsx
│   ├── audience-selector.tsx
│   ├── cadence-builder.tsx
│   ├── email-preview.tsx
│   └── campaign-list.tsx
├── knowledge-base/
│   ├── knowledge-base-tabs.tsx
│   ├── entry-list.tsx
│   ├── entry-card.tsx
│   ├── add-source-button.tsx
│   ├── web-crawler-dialog.tsx
│   ├── faq-dialog.tsx
│   ├── rich-text-editor.tsx
│   └── file-upload-dialog.tsx
├── rfp-hub/
│   ├── rfp-hub-nav.tsx
│   ├── use-case-form.tsx
│   ├── certification-form.tsx
│   ├── rfp-tracker-table.tsx
│   ├── answer-bank-list.tsx
│   └── quick-downloads-grid.tsx
├── events/
│   ├── event-calendar.tsx
│   ├── event-list.tsx
│   └── event-form.tsx
├── reporting/
│   ├── performance-charts.tsx
│   └── team-breakdown-table.tsx
├── settings/
│   ├── company-profile-form.tsx
│   ├── user-management-table.tsx
│   ├── approval-queue.tsx
│   └── integration-cards.tsx
├── billing/
│   ├── subscription-display.tsx
│   ├── usage-chart.tsx
│   ├── invoice-table.tsx
│   └── payment-method.tsx
├── onboarding/
│   ├── questionnaire-wizard.tsx
│   ├── guided-tour.tsx
│   └── tour-steps.ts
├── shared/
│   ├── page-header.tsx
│   ├── empty-state.tsx
│   ├── status-badge.tsx
│   ├── data-table.tsx
│   ├── confirm-dialog.tsx
│   └── loading-spinner.tsx

convex/
├── schema.ts                         # Complete schema definition
├── users/
│   ├── queries.ts
│   └── mutations.ts
├── companies/
│   ├── queries.ts
│   └── mutations.ts
├── leads/
│   ├── queries.ts
│   └── mutations.ts
├── contacts/
│   ├── queries.ts
│   └── mutations.ts
├── searches/
│   ├── queries.ts
│   └── mutations.ts
├── watchlist/
│   ├── queries.ts
│   └── mutations.ts
├── campaigns/
│   ├── queries.ts
│   └── mutations.ts
├── tasks/
│   ├── queries.ts
│   └── mutations.ts
├── events/
│   ├── queries.ts
│   └── mutations.ts
├── ransomHub/
│   ├── queries.ts
│   └── mutations.ts
├── knowledgeBase/
│   ├── queries.ts
│   └── mutations.ts
├── rfpHub/
│   ├── useCases/
│   ├── certifications/
│   ├── tracker/
│   ├── answerBank/
│   └── downloads/
├── billing/
│   ├── queries.ts
│   └── mutations.ts
├── auditLog/
│   ├── queries.ts
│   └── mutations.ts
├── integrations/
│   ├── queries.ts
│   └── mutations.ts
├── notifications/
│   ├── queries.ts
│   └── mutations.ts
├── invitations/
│   ├── queries.ts
│   └── mutations.ts
└── crons/
    ├── watchlistMonitor.ts           # Check watchlist domains for new exposures
    ├── ransomHubSync.ts              # Sync ransomware.live feed
    ├── breachNotificationSync.ts     # Scrape breach notification sites
    └── tokenReset.ts                 # Monthly token reset

hooks/
├── use-permissions.ts                # RBAC hook
├── use-current-user.ts               # Get current user from Convex
└── use-company.ts                    # Get current company data

config/
├── navigation.ts                     # Sidebar navigation items
└── constants.ts                      # App-wide constants

lib/
├── utils.ts                          # Utility functions (cn, formatDate, etc.)
├── pdf-generator.ts                  # Report PDF generation
└── ai.ts                             # LLM integration helpers
```

---

## 24. ENVIRONMENT VARIABLES

```env
# APP
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CONVEX
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=xxx

# CLERK (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# STRIPE (Payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# DARK WEB / EXPOSURE APIs
EXPOSURE_API_KEY=xxx
RANSOMWARE_LIVE_API_KEY=xxx

# ENRICHMENT APIs
COMPANY_ENRICHMENT_API_KEY=xxx       # Clearbit/ZoomInfo/Apollo
PEOPLE_ENRICHMENT_API_KEY=xxx        # Apollo/RocketReach
CONTACT_REVEAL_API_KEY=xxx           # Apollo/Hunter/Lusha

# LLM API (for AI Agents email generation)
OPENAI_API_KEY=xxx
# ANTHROPIC_API_KEY=xxx              # Alternative

# MICROSOFT (Outlook Email + Calendar + Teams)
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_REDIRECT_URI=xxx

# GOOGLE (Gmail + Google Calendar)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=xxx

# CRM: HubSpot
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
HUBSPOT_REDIRECT_URI=xxx

# CRM: GoHighLevel (GHL)
GHL_CLIENT_ID=xxx
GHL_CLIENT_SECRET=xxx
GHL_REDIRECT_URI=xxx

# MESSAGING: Slack
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_REDIRECT_URI=xxx

# SOCIAL: LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=xxx
```

---

## 25. IMPLEMENTATION PHASES

Build in this order. Each phase should be fully working before moving to the next.

### Phase 1 — Foundation (MUST DO FIRST)
1. Project setup: Next.js + Convex + Clerk + Tailwind + shadcn/ui
2. Authentication: Clerk integration, middleware for route protection
3. Database schema: Deploy complete Convex schema
4. Dashboard layout: Sidebar + Header + Token display + Role-based nav
5. Onboarding flow: 3-step wizard + payment + pending approval page

### Phase 2 — Core Data Features
6. Live Search: Search input, API call, results display, token deduction
7. Live-Leads: List view with filters + Detail view with tabs
8. Lead Enrichment: Company data + Decision makers auto-fetch
9. Watchlist: Add/monitor/alert functionality
10. Ransom Hub: Ransomware feed + Breach notifications display

### Phase 3 — Productivity Tools
11. To-Do List: Task CRUD, assignment, filtering
12. News Dashboard: KPI tiles, Today panel, Quick Actions, News feed
13. Events & Conferences: Calendar + list views, event creation

### Phase 4 — AI & Outreach
14. AI Agents: Campaign wizard, email generation, copy-paste flow
15. Knowledge Base: All 4 content types with CRUD

### Phase 5 — Business Tools
16. RFP Hub: Use Cases, Certifications, RFP Tracker + Answer Bank + Downloads
17. Reporting: Performance metrics, charts, team breakdown
18. Report Template: PDF generation with MSP branding

### Phase 6 — Admin & Integration
19. Settings: Company profile, User management, Approval queue
20. Billing & Usage: Stripe integration, usage tracking, invoices
21. Integrations: OAuth flows for all services
22. Audit Log: Event logging and search history

### Phase 7 — Polish
23. Guided Tour: First-login walkthrough
24. Notifications: In-app + email notification system
25. Token Management: Monthly reset cron, low-balance alerts
26. Watchlist Monitoring: Cron job for periodic exposure checks

---

## DESIGN GUIDELINES

### Visual Style
- **Dark mode primary** — black/near-black backgrounds
- **Vercel-inspired** — clean, minimal, sophisticated
- **Color palette:** Background #000000/#0a0a0a, Borders #262626, Text #fafafa/#a1a1aa, Accent white, Success green, Warning amber, Danger red, Info blue (teal accent for highlighted actions)
- **Typography:** System font stack, clean sans-serif
- **Cards:** Subtle borders (#262626), slight elevation on hover
- **Tables:** Clean rows, hover highlight, minimal dividers
- **Forms:** Dark inputs with border focus rings

### Component Patterns
- Use shadcn/ui components as base (Button, Dialog, Select, Table, etc.)
- All forms use React Hook Form + Zod validation
- All data tables use @tanstack/react-table
- Charts use Recharts
- Icons from Lucide React
- Toast notifications for actions (success/error)
- Loading states: skeleton loaders for content, spinners for actions
- Empty states: icon + title + description + action button

---

## END OF IMPLEMENTATION BLUEPRINT

This document is the single source of truth for building CyberHook. For detailed database schema field definitions and Convex validator syntax, cross-reference with `CYBERHOOK_ARCHITECTURE__1_.md` and `CYBERHOOK_V2_CHANGES.md`. Build phase by phase, verify each works, then move on.
