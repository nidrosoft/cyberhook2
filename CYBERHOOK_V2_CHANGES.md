# CyberHook V2 — Change Delta & Implementation Guide

> **Version:** 2.0.0  
> **Last Updated:** February 2026  
> **Purpose:** System prompt for Cursor AI to apply all V2 changes to the existing CyberHook codebase  
> **Context:** This document describes ONLY the changes, additions, and removals relative to the V1 architecture (`CYBERHOOK_ARCHITECTURE__1_.md`). The V1 document remains the foundation — this file layers on top of it.

---

## HOW TO USE THIS DOCUMENT

1. **The V1 architecture document is still the primary source of truth** for anything NOT mentioned here.
2. This document is organized into phases. Implement changes in order.
3. Each section specifies: what changed, what to add, what to remove, and what to modify.
4. Where database schema changes are needed, full Convex schema snippets are provided.
5. Where new routes/pages are needed, the exact file paths are given.
6. Where navigation changes are needed, the exact config updates are provided.

---

## TABLE OF CONTENTS

1. [Change Summary](#1-change-summary)
2. [Phase 1 — Navigation & Menu Restructuring](#2-phase-1--navigation--menu-restructuring)
3. [Phase 2 — Settings Overhaul](#3-phase-2--settings-overhaul)
4. [Phase 3 — Knowledge Base (Replaces Scripts & Cadences)](#4-phase-3--knowledge-base-replaces-scripts--cadences)
5. [Phase 4 — RFP Hub (New Module)](#5-phase-4--rfp-hub-new-module)
6. [Phase 5 — Live-Leads Enrichment Enhancements](#6-phase-5--live-leads-enrichment-enhancements)
7. [Phase 6 — Ransom Hub + Breach Notifications](#7-phase-6--ransom-hub--breach-notifications)
8. [Phase 7 — Expanded Integrations](#8-phase-7--expanded-integrations)
9. [Phase 8 — AI Agents Refinement](#9-phase-8--ai-agents-refinement)
10. [Phase 9 — Guided Tour Onboarding](#10-phase-9--guided-tour-onboarding)
11. [Phase 10 — Report Template Redesign](#11-phase-10--report-template-redesign)
12. [Phase 11 — Admin Panel Enhancements](#12-phase-11--admin-panel-enhancements)
13. [Database Schema Changes (Complete)](#13-database-schema-changes-complete)
14. [New Routes & File Structure](#14-new-routes--file-structure)
15. [New API Keys & Environment Variables](#15-new-api-keys--environment-variables)
16. [Removals & Deprecations](#16-removals--deprecations)

---

## 1. CHANGE SUMMARY

### What's New
| Change | Type | Priority |
|--------|------|----------|
| **Knowledge Base** replaces Scripts & Cadences | Module Replace | High |
| **RFP Hub** with Use Cases, Certifications, RFP Tracker | New Module | High |
| **Settings overhaul** (Location ID, multiple locations, company type, support contacts) | Modification | High |
| **Expanded integrations** (Gmail, Google Calendar, Outlook Calendar, Teams, Slack, LinkedIn, GHL) | New Integrations | Medium |
| **Breach Notification feeds** added to Ransom Hub | Enhancement | Medium |
| **Guided tour** on first login | New Feature | Medium |
| **Live-Leads enrichment** improvements (richer company detail, decision makers) | Enhancement | High |
| **Report template** redesign with branded adaptive fields | Enhancement | Medium |
| **Admin panel** for managing user approvals | Enhancement | High |
| **AI Agent email flow** — start with copy/paste, evolve to Outlook sending | Modification | Medium |

### What's Removed
| Change | Reason |
|--------|--------|
| **Snapshot Scan** — removed from V1 scope | Client decision: "we'll pass on this right now" |
| **Monday.com CRM** option — replaced with GHL | Client specified HubSpot + GHL as the two CRM options |
| **ConnectWise** — deprioritized | Not mentioned in updated requirements, defer to later |

### What's Renamed
| Old Name | New Name |
|----------|----------|
| Scripts & Cadences | Knowledge Base |
| Industry (in company settings) | Type |
| Address (single) | Locations (multi-location support) |

---

## 2. PHASE 1 — NAVIGATION & MENU RESTRUCTURING

### Updated Sidebar Navigation

Replace the V1 navigation config in `config/navigation.ts` with:

```typescript
// config/navigation.ts
export const navigationItems = [
  {
    title: 'News',
    href: '/',
    icon: Home,
    roles: ['sales_rep', 'sales_admin', 'billing'],
  },
  {
    title: 'To-Do List',
    href: '/todos',
    icon: CheckSquare,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Ransom Hub',
    href: '/ransom-hub',
    icon: Shield,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Live Search',
    href: '/live-search',
    icon: Search,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Live-Leads',
    href: '/live-leads',
    icon: Users,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Watchlist',
    href: '/watchlist',
    icon: Eye,
    roles: ['sales_rep', 'sales_admin'],
  },
  // REMOVED: Snapshot Scan — no longer in V1 scope
  {
    title: 'AI Agents',
    href: '/ai-agents',
    icon: Bot,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Knowledge Base',  // RENAMED from "Scripts & Cadences"
    href: '/knowledge-base',
    icon: BookOpen,           // Changed icon
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'RFP Hub',         // NEW MODULE
    href: '/rfp-hub',
    icon: FileCheck,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Events',
    href: '/events',
    icon: Calendar,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Reporting',
    href: '/reporting',
    icon: BarChart3,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    section: 'Admin',
    roles: ['sales_admin', 'billing'],
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['sales_admin'],
      },
      {
        title: 'Billing & Usage',
        href: '/billing',
        icon: CreditCard,
        roles: ['sales_admin', 'billing'],
      },
    ],
  },
];
```

### Route Protection Updates

```typescript
// Update ROUTE_PERMISSIONS
const ROUTE_PERMISSIONS = {
  '/': ['sales_rep', 'sales_admin', 'billing'],
  '/todos': ['sales_rep', 'sales_admin'],
  '/ransom-hub': ['sales_rep', 'sales_admin'],
  '/live-search': ['sales_rep', 'sales_admin'],
  '/live-leads': ['sales_rep', 'sales_admin'],
  '/watchlist': ['sales_rep', 'sales_admin'],
  // REMOVED: '/snapshot-scan'
  '/ai-agents': ['sales_rep', 'sales_admin'],
  '/knowledge-base': ['sales_rep', 'sales_admin'],    // NEW
  '/rfp-hub': ['sales_rep', 'sales_admin'],            // NEW
  '/rfp-hub/use-cases': ['sales_rep', 'sales_admin'],  // NEW
  '/rfp-hub/certifications': ['sales_rep', 'sales_admin'], // NEW
  '/rfp-hub/tracker': ['sales_rep', 'sales_admin'],    // NEW
  '/events': ['sales_rep', 'sales_admin'],
  '/reporting': ['sales_rep', 'sales_admin'],
  '/settings': ['sales_admin'],
  '/settings/profile': ['sales_admin'],
  '/settings/users': ['sales_admin'],
  '/settings/integrations': ['sales_admin'],
  '/settings/audit-log': ['sales_admin'],
  '/billing': ['sales_admin', 'billing'],
};
```

### Files to DELETE (from Snapshot Scan removal)

```
app/(dashboard)/snapshot-scan/          — entire directory
components/snapshot-scan/               — entire directory (if exists)
convex/snapshotScans/                   — entire directory (if exists)
```

### Files to RENAME/MOVE (Scripts & Cadences → Knowledge Base)

```
app/(dashboard)/scripts-cadences/   →   app/(dashboard)/knowledge-base/
components/scripts/                 →   components/knowledge-base/
convex/scripts/                     →   (keep for backward compat, see Phase 3)
```

---

## 3. PHASE 2 — SETTINGS OVERHAUL

### Changes to Company Settings (`/settings/profile`)

The following fields must be ADDED, MODIFIED, or REORGANIZED in the company settings page and the onboarding questionnaire:

#### New Fields to Add

| Field | Type | Location | Notes |
|-------|------|----------|-------|
| `locationId` | `string` | Company Settings | Unique identifier to track accounts |
| `companyType` | `string` | Company Settings | **Replaces** `industry` — rename the field label from "Industry" to "Type" |
| `supportEmail` | `string` | Company Settings | Support contact email address |
| `salesEmail` | `string` | Company Settings | Sales contact email address |
| `supportPhone` | `string` | Company Settings | Support phone line |
| `salesPhone` | `string` | Company Settings | Sales phone line |
| `salesTeamSize` | `string` | Company Settings | Displayed next to company size (same options as `totalSalesPeople` in onboarding) |
| `locations` | `array of objects` | Company Settings | **Replaces** single `streetAddress` — supports multiple office locations |

#### Multi-Location Schema

Replace the single `streetAddress` and `country` fields with a `locations` array:

```typescript
// Each location object structure
interface CompanyLocation {
  id: string;           // unique identifier
  label: string;        // e.g., "HQ", "West Coast Office", "Remote"
  address: string;      // full street address
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isHeadquarters: boolean;
}
```

#### Database Schema Update for `companies` Table

```typescript
companies: defineTable({
  // ... keep all existing fields, then ADD:
  locationId: v.optional(v.string()),
  companyType: v.optional(v.string()),  // replaces conceptual "industry" usage
  supportEmail: v.optional(v.string()),
  salesEmail: v.optional(v.string()),
  supportPhone: v.optional(v.string()),
  salesPhone: v.optional(v.string()),
  salesTeamSize: v.optional(v.string()),
  locations: v.optional(v.array(v.object({
    id: v.string(),
    label: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    isHeadquarters: v.boolean(),
  }))),
  // DEPRECATE (keep for migration but stop using):
  // streetAddress → migrated into locations array
  // country → migrated into locations array
})
```

#### Settings Page UI Layout

Reorganize `/settings/profile` into sections:

```
┌─────────────────────────────────────────────────────┐
│ Company Profile                                      │
├─────────────────────────────────────────────────────┤
│ GENERAL INFORMATION                                  │
│  Company Name    │  Location ID                      │
│  Company Type    │  Website                          │
│  Phone           │  Logo                             │
├─────────────────────────────────────────────────────┤
│ CONTACT INFORMATION                                  │
│  Support Email   │  Support Phone                    │
│  Sales Email     │  Sales Phone                      │
├─────────────────────────────────────────────────────┤
│ BUSINESS DETAILS                                     │
│  Primary Business Model  │  Secondary Business Model │
│  Annual Revenue          │  Company Size             │
│  Sales Team Size         │  Geographic Coverage      │
│  Target Customer Base                                │
├─────────────────────────────────────────────────────┤
│ OFFICE LOCATIONS                                     │
│  [+ Add Location]                                    │
│  ┌──────────────────────────────────────────┐       │
│  │ HQ — 123 Main St, Houston, TX, US  [✏️][🗑️] │   │
│  │ West Coast — 456 Oak Ave, LA, CA    [✏️][🗑️] │   │
│  └──────────────────────────────────────────┘       │
├─────────────────────────────────────────────────────┤
│ TARGETS                                              │
│  MRR Target ($)         │  Appointment Target        │
│  Default Timezone       │  Default Currency           │
└─────────────────────────────────────────────────────┘
```

#### Onboarding Questionnaire Updates

In Step 1 (Company Basic Info), the fields remain the same. However, note that:
- The optional field "Street Address" is now "Primary Location" and creates the first entry in the `locations` array with `isHeadquarters: true`.
- "Country" is captured as part of the location object.

---

## 4. PHASE 3 — KNOWLEDGE BASE (REPLACES SCRIPTS & CADENCES)

### What Changed

The "Scripts & Cadences" module is completely replaced by a "Knowledge Base" module. This is NOT a rename — the functionality is different. The Knowledge Base is a content repository where sales teams store reusable materials.

### Knowledge Base Content Types

The Knowledge Base supports 4 content types (NO "Tables" type):

| Type | Icon | Description |
|------|------|-------------|
| **Web Crawler / URLs** | 🌐 | Save and crawl URLs to extract content for reference |
| **FAQ** | ❓ | Question and answer pairs (Q max 1000 chars, A max 1000 chars) |
| **Rich Text** | 📝 | Named rich text entries with formatting toolbar |
| **File Upload** | 📎 | Upload PDF, DOC, DOCX files for reference |

### Route Structure

```
app/(dashboard)/knowledge-base/
├── page.tsx                    # Main Knowledge Base page with tab navigation
└── [id]/
    └── page.tsx                # Individual entry detail/edit
```

### Knowledge Base Page Layout

```
┌──────────────────────────────────────────────────────┐
│  Knowledge Base                         [+ Add Source]│
│  Add and manage sources your team will use            │
├──────────────────────────────────────────────────────┤
│  [All] [Web Crawler] [FAQ] [Rich Text] [File Upload] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │ 🌐 Company Pricing Page                      │     │
│  │    Web Crawler • Added 3 days ago             │     │
│  │    https://example.com/pricing                │     │
│  ├─────────────────────────────────────────────┤     │
│  │ ❓ Common Objections                          │     │
│  │    FAQ • 12 entries • Updated yesterday       │     │
│  ├─────────────────────────────────────────────┤     │
│  │ 📝 CEO Cold Email Template                    │     │
│  │    Rich Text • Updated 2 days ago             │     │
│  ├─────────────────────────────────────────────┤     │
│  │ 📎 Security Whitepaper Q4 2025                │     │
│  │    File • PDF • 2.4 MB                        │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Add Source Dialogs

**Web Crawler Dialog:**
```
┌─────────────────────────────────────────┐
│  🌐 Web Crawler                      ✕  │
│  Crawl and extract content from a       │
│  website to train your bot.             │
│                                         │
│  Enter Domain                           │
│  [Exact URL ▾] [Enter URL         ]     │
│                                         │
│               [Extract Data]            │
└─────────────────────────────────────────┘
```

**FAQ Dialog:**
```
┌─────────────────────────────────────────┐
│  ❓ FAQs                             ✕  │
│  Write a question and answer pair.      │
│                                         │
│  Q  [Your question goes here     ]      │
│                         0/1000 characters│
│                                         │
│  A  [Your answer goes here       ]      │
│                         0/1000 characters│
│                                         │
│          [Cancel]  [Save]               │
└─────────────────────────────────────────┘
```

**Rich Text Editor:**
```
┌─────────────────────────────────────────┐
│  [Enter Name                        ]   │
│                                         │
│  [Paragraph ▾][Inter ▾][14px ▾][1.5 ▾] │
│  B I U S ≡ | 🔗 ≡ ≡ </>               │
│                                         │
│  [Start typing your content...]         │
│                                         │
│                              [Save]     │
└─────────────────────────────────────────┘
```

**File Upload Dialog:**
```
┌─────────────────────────────────────────┐
│  📎 Upload Files                     ✕  │
│  Upload files to your knowledge base.   │
│                                         │
│  Select Files                           │
│  ┌─────────────────────────────────┐    │
│  │    ☁️ Drop files here or browse  │    │
│  │    Supports PDF, DOC, DOCX      │    │
│  └─────────────────────────────────┘    │
│                                         │
│          [Cancel]  [Upload Files]       │
└─────────────────────────────────────────┘
```

### Database Schema — Knowledge Base

```typescript
// NEW TABLE: Replace scripts and cadences tables
knowledgeBaseEntries: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  name: v.string(),
  type: v.union(
    v.literal('web_crawler'),
    v.literal('faq'),
    v.literal('rich_text'),
    v.literal('file_upload')
  ),
  // Web Crawler fields
  url: v.optional(v.string()),
  crawledContent: v.optional(v.string()),
  crawledAt: v.optional(v.number()),
  // FAQ fields
  question: v.optional(v.string()),
  answer: v.optional(v.string()),
  // Rich Text fields
  richTextContent: v.optional(v.string()),  // HTML string
  // File Upload fields
  fileUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  fileMimeType: v.optional(v.string()),
  // Scope
  scope: v.union(
    v.literal('global'),     // visible to entire company
    v.literal('personal')    // visible only to creator
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId'])
  .index('by_creator', ['createdByUserId'])
  .index('by_type', ['companyId', 'type'])
  .index('by_scope', ['companyId', 'scope']),
```

### Permissions (Knowledge Base)

| Action | Sales Rep | Sales Admin |
|--------|-----------|-------------|
| View all global entries | ✅ | ✅ |
| View own personal entries | ✅ | ✅ |
| Create personal entries | ✅ | ✅ |
| Create global entries | ❌ | ✅ |
| Edit own entries | ✅ | ✅ |
| Edit any entry | ❌ | ✅ |
| Delete own entries | ✅ | ✅ |
| Delete any entry | ❌ | ✅ |

### Migration Note

The old `scripts` and `cadences` tables from V1 should be kept in schema but are no longer actively used. The AI Agents module should reference Knowledge Base entries (specifically rich_text entries that contain email templates/scripts) instead of the old scripts table. If existing data exists in scripts/cadences tables, it can be migrated to `knowledgeBaseEntries` as `rich_text` type entries.

### Components to Create

```
components/knowledge-base/
├── knowledge-base-tabs.tsx         # Tab navigation (All, Web Crawler, FAQ, etc.)
├── entry-list.tsx                  # List of KB entries with search/filter
├── entry-card.tsx                  # Card display for each entry
├── add-source-button.tsx           # "+ Add Source" button with dropdown
├── web-crawler-dialog.tsx          # Web crawler input dialog
├── faq-dialog.tsx                  # FAQ Q&A input dialog
├── rich-text-editor.tsx            # Rich text editor with toolbar
├── file-upload-dialog.tsx          # File upload dialog with drag-and-drop
└── entry-detail.tsx                # Full entry view/edit page
```

### Convex Backend

```
convex/knowledgeBase/
├── queries.ts                      # list, getById, getByType, search
└── mutations.ts                    # create, update, delete
```

---

## 5. PHASE 4 — RFP HUB (NEW MODULE)

### Overview

The RFP Hub is a brand new module with 3 sub-sections, designed to help MSPs manage RFP responses, track reference clients, store certifications, and maintain reusable RFP answer content.

### Route Structure

```
app/(dashboard)/rfp-hub/
├── page.tsx                        # RFP Hub landing (tabs or cards)
├── use-cases/
│   ├── page.tsx                    # Use Cases list
│   └── [id]/
│       └── page.tsx                # Use Case detail/edit
├── certifications/
│   ├── page.tsx                    # Certifications list
│   └── [id]/
│       └── page.tsx                # Certification detail/edit
└── tracker/
    ├── page.tsx                    # RFP Tracker list
    └── [id]/
        └── page.tsx                # RFP detail/edit
```

### 5.1 Use Cases Sub-Module

**Purpose:** Create structured use cases and reference clients that sales people can access during sales cycles.

**Use Case Entry Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text | ✅ | Name of the use case |
| Industry | select | ✅ | Industry of the reference client |
| Headcount | text | ❌ | Number of employees |
| Revenue | select | ❌ | Revenue range |
| Problem Statement | textarea | ✅ | What problem was solved |
| Scope of Work | textarea | ✅ | What was delivered |
| How We Help | textarea | ✅ | How the MSP helped |
| Comparison Table | structured | ❌ | Before/After or Feature comparison |
| Value Adds | array of strings | ❌ | Bullet points of extra value |
| Is Approved Reference | boolean | ✅ | Mark as approved for sharing with prospects |

**Reference Client Fields (within Use Case):**

| Field | Type | Notes |
|-------|------|-------|
| Company Name | text | Reference company name |
| Contact Name | text | Reference contact person |
| Contact Email | text | Reference contact email |
| Contact Phone | text | Reference contact phone |
| Industry | text | Industry |
| Website | text | Company website |
| Projects Summary | textarea | Summary of projects done with them |

**UI Layout:**
```
┌──────────────────────────────────────────────────┐
│  Use Cases                      [+ New Use Case] │
├──────────────────────────────────────────────────┤
│ Filter: [Industry ▾] [Approved Only ☐]           │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐     │
│ │ 🏥 Healthcare Provider – Ransomware Recovery│   │
│ │ Industry: Healthcare │ 250 employees        │   │
│ │ ✅ Approved Reference                       │   │
│ ├──────────────────────────────────────────┤     │
│ │ 🏗️ Construction Co – Network Overhaul       │   │
│ │ Industry: Construction │ 100 employees      │   │
│ │ ✅ Approved Reference                       │   │
│ └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 5.2 Certifications Sub-Module

**Purpose:** Store all certifications, insurance policies, company accolades, awards, and compliance info that sales people can reference.

**Certification Entry Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | ✅ | e.g., "SOC 2 Type II", "FedRAMP", "CMBE" |
| Category | select | ✅ | Certification, Insurance, Award, Accreditation, Compliance, Other |
| Issuing Authority | text | ❌ | Who issued it |
| Issue Date | date | ❌ | When obtained |
| Expiry Date | date | ❌ | When it expires (with visual warning if expiring soon) |
| Status | select | ✅ | Active, Expired, Pending, Renewal Required |
| Description | textarea | ❌ | Details about the certification |
| Document URL | text | ❌ | Link to certificate/document |
| Document Upload | file | ❌ | Upload certificate file |
| Tags | multi-select | ❌ | e.g., "Security", "Government", "Healthcare" |

**Common certification categories to pre-populate:**
- SOC 2 Type II
- FedRAMP
- HIPAA Compliance
- PCI DSS
- ISO 27001
- CMMC
- Veteran Owned Business
- Woman Owned Business
- Minority Business Enterprise (MBE)
- Small Business Enterprise (SBE)
- Disadvantaged Business Enterprise (DBE)
- HUBZone Certified
- 8(a) Business Development
- Service-Disabled Veteran-Owned Small Business (SDVOSB)

**UI: Cards or table list with status badges and expiry warnings.**

### 5.3 RFP Tracker Sub-Module

**Purpose:** Track RFP deadlines, wins/losses, and maintain pre-built answer bank and quick downloads.

**Three sections within RFP Tracker:**

#### A. RFP Tracker (Deadlines & Status)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| RFP Title | text | ✅ | Name/title of the RFP |
| Client/Prospect | text | ✅ | Who issued the RFP |
| Submission Deadline | date | ✅ | Due date |
| Status | select | ✅ | Draft, In Progress, Submitted, Won, Lost, No Bid |
| Assigned To | user select | ❌ | Team member responsible |
| Value | number | ❌ | Estimated contract value |
| Notes | textarea | ❌ | Additional notes |
| Linked Use Case | select | ❌ | Link to a Use Case entry |

**UI:** Table with deadline indicators (red if overdue, yellow if due soon), win/loss analytics summary at top.

#### B. Pre-Built RFP Answer Bank

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Question/Category | text | ✅ | The typical RFP question category |
| Answer | rich text | ✅ | Pre-written response (company can customize) |
| Tags | multi-select | ❌ | e.g., "Security", "Compliance", "SLA" |
| Last Updated | auto | — | Tracks when last modified |

**UI:** Searchable list grouped by category. Click to copy answer.

#### C. Quick Downloads

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | ✅ | e.g., "Company Capabilities Deck" |
| Description | text | ❌ | Brief description |
| File | file upload | ✅ | The downloadable file |
| Category | select | ✅ | Capabilities Deck, Security Whitepaper, Compliance Evidence, Insurance Certificate, Other |

**Pre-suggested quick download categories:**
- Company Capabilities Deck
- Security Whitepaper
- Compliance Evidence Pack
- Insurance Certificates
- Case Studies Collection
- Partner Program Overview

### Database Schema — RFP Hub

```typescript
// USE CASES
useCases: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  title: v.string(),
  industry: v.optional(v.string()),
  headcount: v.optional(v.string()),
  revenue: v.optional(v.string()),
  problemStatement: v.optional(v.string()),
  scopeOfWork: v.optional(v.string()),
  howWeHelp: v.optional(v.string()),
  comparisonTable: v.optional(v.string()),  // JSON string of comparison data
  valueAdds: v.optional(v.array(v.string())),
  isApprovedReference: v.boolean(),
  // Reference client info
  referenceCompanyName: v.optional(v.string()),
  referenceContactName: v.optional(v.string()),
  referenceContactEmail: v.optional(v.string()),
  referenceContactPhone: v.optional(v.string()),
  referenceIndustry: v.optional(v.string()),
  referenceWebsite: v.optional(v.string()),
  referenceProjectsSummary: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId'])
  .index('by_approved', ['companyId', 'isApprovedReference']),

// CERTIFICATIONS
certifications: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  name: v.string(),
  category: v.union(
    v.literal('certification'),
    v.literal('insurance'),
    v.literal('award'),
    v.literal('accreditation'),
    v.literal('compliance'),
    v.literal('other')
  ),
  issuingAuthority: v.optional(v.string()),
  issueDate: v.optional(v.number()),
  expiryDate: v.optional(v.number()),
  status: v.union(
    v.literal('active'),
    v.literal('expired'),
    v.literal('pending'),
    v.literal('renewal_required')
  ),
  description: v.optional(v.string()),
  documentUrl: v.optional(v.string()),
  documentFileId: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId'])
  .index('by_status', ['companyId', 'status'])
  .index('by_category', ['companyId', 'category']),

// RFP TRACKER
rfpEntries: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  title: v.string(),
  clientProspect: v.string(),
  submissionDeadline: v.number(),
  status: v.union(
    v.literal('draft'),
    v.literal('in_progress'),
    v.literal('submitted'),
    v.literal('won'),
    v.literal('lost'),
    v.literal('no_bid')
  ),
  assignedToUserId: v.optional(v.id('users')),
  estimatedValue: v.optional(v.number()),
  notes: v.optional(v.string()),
  linkedUseCaseId: v.optional(v.id('useCases')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId'])
  .index('by_status', ['companyId', 'status'])
  .index('by_deadline', ['companyId', 'submissionDeadline']),

// RFP ANSWER BANK
rfpAnswers: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  questionCategory: v.string(),
  answer: v.string(),  // Rich text HTML
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId']),

// QUICK DOWNLOADS
rfpDownloads: defineTable({
  companyId: v.id('companies'),
  createdByUserId: v.id('users'),
  name: v.string(),
  description: v.optional(v.string()),
  fileUrl: v.string(),
  fileName: v.string(),
  fileSize: v.optional(v.number()),
  fileMimeType: v.optional(v.string()),
  category: v.union(
    v.literal('capabilities_deck'),
    v.literal('security_whitepaper'),
    v.literal('compliance_evidence'),
    v.literal('insurance_certificate'),
    v.literal('case_studies'),
    v.literal('partner_overview'),
    v.literal('other')
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_company', ['companyId'])
  .index('by_category', ['companyId', 'category']),
```

### Components to Create

```
components/rfp-hub/
├── rfp-hub-nav.tsx                 # Sub-navigation for Use Cases/Certs/Tracker
├── use-case-list.tsx
├── use-case-card.tsx
├── use-case-form.tsx               # Create/edit use case with all fields
├── reference-client-form.tsx       # Embedded form for reference client info
├── certification-list.tsx
├── certification-card.tsx
├── certification-form.tsx
├── expiry-warning-badge.tsx        # Visual warning for expiring certs
├── rfp-tracker-table.tsx
├── rfp-tracker-form.tsx
├── rfp-deadline-indicator.tsx      # Red/yellow/green deadline display
├── rfp-stats-summary.tsx           # Win/Loss summary cards at top
├── answer-bank-list.tsx
├── answer-bank-entry.tsx
├── answer-bank-form.tsx
├── quick-downloads-grid.tsx
└── quick-download-upload.tsx
```

### Convex Backend

```
convex/rfpHub/
├── useCases/
│   ├── queries.ts
│   └── mutations.ts
├── certifications/
│   ├── queries.ts
│   └── mutations.ts
├── tracker/
│   ├── queries.ts
│   └── mutations.ts
├── answerBank/
│   ├── queries.ts
│   └── mutations.ts
└── downloads/
    ├── queries.ts
    └── mutations.ts
```

### Permissions (RFP Hub)

| Action | Sales Rep | Sales Admin |
|--------|-----------|-------------|
| View all entries | ✅ | ✅ |
| Create entries | ✅ | ✅ |
| Edit own entries | ✅ | ✅ |
| Edit any entry | ❌ | ✅ |
| Delete own entries | ✅ | ✅ |
| Delete any entry | ❌ | ✅ |
| Mark as approved reference | ❌ | ✅ |
| Upload quick downloads | ✅ | ✅ |

---

## 6. PHASE 5 — LIVE-LEADS ENRICHMENT ENHANCEMENTS

### What Changed

The Live-Leads detail view needs significantly richer company information and better display of decision makers. The client emphasized that clicking on a company should show "general information about the business, locations, addresses, office list, headquarters, employee count, industry, website, LinkedIn, revenue estimates, and key decision makers."

### Enhanced Lead Detail Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Live-Leads                                     │
│                                                           │
│  ┌─────────┐  Powerful Electric Inc.                      │
│  │  LOGO   │  powerfulelectric.com • Construction         │
│  │         │  📍 Los Angeles, CA • 100 employees          │
│  └─────────┘  Revenue: $10M–$24M                          │
│                                                           │
│  [Add to Watchlist] [Start Campaign] [Push to CRM]       │
│  [Generate Report]                                        │
├──────────────────────────────────────────────────────────┤
│  [Overview] [Key Contacts] [Exposures] [Activity]        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  COMPANY OVERVIEW (enriched via API)                      │
│  ┌─────────────────────┬─────────────────────────────┐   │
│  │ Headquarters        │ Los Angeles, CA, US          │   │
│  │ Industry            │ Construction                 │   │
│  │ Employee Count      │ 100                          │   │
│  │ Revenue Range       │ $10M–$24M                    │   │
│  │ Website             │ powerfulelectric.com 🔗      │   │
│  │ LinkedIn            │ linkedin.com/company/... 🔗  │   │
│  └─────────────────────┴─────────────────────────────┘   │
│                                                           │
│  OFFICE LOCATIONS (if available from enrichment API)      │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 🏢 HQ — 123 Main St, Los Angeles, CA 90001     │     │
│  │ 🏢 Branch — 456 Oak Ave, San Diego, CA 92101   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  EXPOSURE SUMMARY                                         │
│  ┌──────────────┬──────────────┬──────────────────┐      │
│  │ 🔴 7 exposures│ Last: 5 days │ Severity: HIGH  │      │
│  │              │ ago          │                   │      │
│  └──────────────┴──────────────┴──────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

### Key Contacts Tab (Enhanced)

```
┌──────────────────────────────────────────────────────────┐
│  KEY DECISION MAKERS                                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 👤 John Smith                                     │    │
│  │    CEO • Chief Executive Officer                  │    │
│  │    🔗 LinkedIn                                    │    │
│  │    [Reveal Email 💰] [Reveal Phone 💰]            │    │
│  │    [Add to Campaign]                              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ 👤 Sarah Johnson                                  │    │
│  │    CFO • Chief Financial Officer                  │    │
│  │    🔗 LinkedIn                                    │    │
│  │    [Reveal Email 💰] [Reveal Phone 💰]            │    │
│  │    [Add to Campaign]                              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ 👤 Mike Chen                                      │    │
│  │    IT Manager                                     │    │
│  │    🔗 LinkedIn                                    │    │
│  │    [Reveal Email 💰] [Reveal Phone 💰]            │    │
│  │    [Add to Campaign]                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  Target Roles: CEO, CFO, COO, CIO, CISO, IT Manager     │
└──────────────────────────────────────────────────────────┘
```

### Enrichment API Architecture

The enrichment process uses a multi-API approach:

```
Live-Leads Record (from search API)
        │
        ▼
┌──────────────────────┐
│ API 1: Company Data   │  ← Company info enrichment API
│ (headquarters, size,  │     (e.g., Clearbit, ZoomInfo, Apollo, or similar)
│  revenue, LinkedIn)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ API 2: People/Contacts│  ← Decision maker enrichment API
│ (C-suite names,       │     (e.g., Apollo People API, RocketReach, etc.)
│  titles, LinkedIn)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ API 3: Contact Reveal │  ← Email/Phone reveal (costs credits)
│ (email, phone on      │     (e.g., Apollo, Hunter.io, Lusha, etc.)
│  demand per contact)  │
└──────────────────────┘
```

**Important:** API 1 and API 2 run automatically when a lead is created or viewed. API 3 (contact reveal) only runs on-demand when user clicks "Reveal Email" or "Reveal Phone" — this costs additional credits.

### Updated Lead Schema Addition

Add to existing `leads` table:

```typescript
// Additional enrichment fields for leads table
enrichmentData: v.optional(v.object({
  headquarters: v.optional(v.string()),
  foundedYear: v.optional(v.number()),
  description: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  twitterUrl: v.optional(v.string()),
  facebookUrl: v.optional(v.string()),
  techStack: v.optional(v.array(v.string())),
  officeLocations: v.optional(v.array(v.object({
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
  }))),
})),
enrichedAt: v.optional(v.number()),
enrichmentSource: v.optional(v.string()),
```

---

## 7. PHASE 6 — RANSOM HUB + BREACH NOTIFICATIONS

### What Changed

In addition to the existing ransomware.live feed, the Ransom Hub now also pulls from **breach notification databases** that list companies legally required to file breach disclosures.

### New Breach Notification Sources

Add these as additional data feeds alongside the existing ransomware.live integration:

| Source | URL | Data Type |
|--------|-----|-----------|
| HHS OCR Breach Portal | `https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf` | Healthcare breaches (HIPAA) |
| Privacy Rights Clearinghouse | `https://privacyrights.org/data-breaches` | General breach database |
| California AG Breach List | `https://oag.ca.gov/privacy/databreach/list` | California-specific breaches |

### Updated Ransom Hub UI

Add a tab/toggle to switch between data sources:

```
┌──────────────────────────────────────────────────────┐
│  Ransom Hub                                           │
├──────────────────────────────────────────────────────┤
│  [Ransomware Attacks] [Breach Notifications]          │
├──────────────────────────────────────────────────────┤
│  Filters: [Date Range] [Geography] [Industry] [Size] │
│           [Source ▾]                                  │
├──────────────────────────────────────────────────────┤
│  (table as before, but now includes breach            │
│   notification entries as well)                       │
└──────────────────────────────────────────────────────┘
```

### Updated `ransomIncidents` Schema

```typescript
ransomIncidents: defineTable({
  // ... keep all existing fields, then ADD:
  incidentType: v.union(
    v.literal('ransomware'),           // existing
    v.literal('breach_notification')    // NEW
  ),
  source: v.union(
    v.literal('ransomware_live'),
    v.literal('hhs_ocr'),              // NEW
    v.literal('privacy_rights'),        // NEW
    v.literal('california_ag'),         // NEW
    v.literal('other')
  ),
  individualsAffected: v.optional(v.number()),  // NEW: how many people affected
  breachType: v.optional(v.string()),           // NEW: "Hacking/IT Incident", etc.
  breachVector: v.optional(v.string()),         // NEW: "Email", "Network Server", etc.
  filedDate: v.optional(v.number()),            // NEW: when breach was reported
  // ... keep existing fields
})
```

### New Cron Job

```
convex/crons/
├── watchlistMonitor.ts       # existing
├── ransomHubSync.ts          # existing (update to include new sources)
└── breachNotificationSync.ts # NEW: scrape breach notification sites
```

---

## 8. PHASE 7 — EXPANDED INTEGRATIONS

### What Changed

The integration landscape has expanded significantly. The V1 architecture had: Outlook, ConnectWise, HubSpot/Monday, Stripe. V2 requires more integrations.

### Updated Integration Matrix

| Integration | V1 | V2 | Priority | Notes |
|-------------|----|----|----------|-------|
| **Stripe** | ✅ | ✅ | P0 | No change |
| **Outlook (Email)** | ✅ | ✅ | P0 | No change — send/receive emails |
| **Gmail** | ❌ | ✅ | P1 | NEW — alternative email integration via Gmail API |
| **Outlook Calendar** | ❌ | ✅ | P1 | NEW — sync calendar events |
| **Google Calendar** | ❌ | ✅ | P1 | NEW — sync calendar events |
| **HubSpot** | ✅ | ✅ | P1 | No change — primary CRM |
| **GHL (GoHighLevel)** | ❌ | ✅ | P1 | NEW — replaces Monday.com as second CRM option |
| **Microsoft Teams** | ❌ | ✅ | P2 | NEW — notifications/messaging |
| **Slack** | ❌ | ✅ | P2 | NEW — notifications/messaging |
| **LinkedIn** | ❌ | ✅ | P2 | NEW — outreach, profile viewing |
| **ConnectWise** | ✅ | ⏸️ | P3 | Deprioritized — revisit later |

### Updated `integrations` Table Schema

```typescript
integrations: defineTable({
  companyId: v.id('companies'),
  type: v.union(
    v.literal('stripe'),
    v.literal('outlook_email'),
    v.literal('gmail'),                // NEW
    v.literal('outlook_calendar'),     // NEW
    v.literal('google_calendar'),      // NEW
    v.literal('hubspot'),
    v.literal('ghl'),                  // NEW (replaces 'monday')
    v.literal('teams'),                // NEW
    v.literal('slack'),                // NEW
    v.literal('linkedin'),             // NEW
    v.literal('connectwise')           // deprioritized
  ),
  // ... rest of schema unchanged
})
```

### Updated Integrations Settings Page

```
┌──────────────────────────────────────────────────────┐
│  Integrations                                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  EMAIL                                                │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 📧 Outlook   │  │ 📧 Gmail     │                  │
│  │ [Connect]    │  │ [Connect]    │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                       │
│  CALENDAR                                             │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 📅 Outlook   │  │ 📅 Google    │                  │
│  │   Calendar   │  │   Calendar   │                  │
│  │ [Connect]    │  │ [Connect]    │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                       │
│  CRM                                                  │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 🔶 HubSpot   │  │ 🟢 GHL      │                  │
│  │ [Connect]    │  │ [Connect]    │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                       │
│  MESSAGING                                            │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 💬 Teams     │  │ 💬 Slack     │                  │
│  │ [Connect]    │  │ [Connect]    │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                       │
│  SOCIAL                                               │
│  ┌──────────────┐                                    │
│  │ 🔗 LinkedIn  │                                    │
│  │ [Connect]    │                                    │
│  └──────────────┘                                    │
│                                                       │
│  PAYMENTS                                             │
│  ┌──────────────┐                                    │
│  │ 💳 Stripe    │                                    │
│  │ [Connected ✓]│                                    │
│  └──────────────┘                                    │
└──────────────────────────────────────────────────────┘
```

### New Environment Variables for Integrations

```env
# Gmail (Google OAuth)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=xxx

# Google Calendar (same OAuth as Gmail, different scopes)
# Uses same GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

# GoHighLevel
GHL_CLIENT_ID=xxx
GHL_CLIENT_SECRET=xxx
GHL_REDIRECT_URI=xxx

# Microsoft Teams (Microsoft Graph API — may share with Outlook)
# Uses same MICROSOFT_CLIENT_ID if already configured for Outlook

# Slack
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_REDIRECT_URI=xxx

# LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=xxx
```

---

## 9. PHASE 8 — AI AGENTS REFINEMENT

### What Changed

The client clarified the AI Agent email workflow should start simple and evolve:

**Phase A (V1 MVP):** Generate personalized email text → user copies/pastes into their email client manually.

**Phase B (V1 Full):** If Outlook/Gmail integration is connected, send email directly from the system on behalf of the user.

### Updated Campaign Flow

```
┌─────────────────────────────────────────────────┐
│  STEP 1: Select lead/contact from Live-Leads    │
│          or Watchlist                            │
├─────────────────────────────────────────────────┤
│  STEP 2: AI generates personalized email using:  │
│          • Company name                          │
│          • Exposure data found                   │
│          • Contact name & role                   │
│          • Script/template from Knowledge Base   │
│          (via LLM API — Claude/GPT/etc.)         │
├─────────────────────────────────────────────────┤
│  STEP 3a: [Copy to Clipboard] button            │
│           User pastes into their email client    │
│  — OR —                                          │
│  STEP 3b: [Send via Outlook/Gmail] button       │
│           (only if integration connected)        │
│           Sends directly from user's address     │
├─────────────────────────────────────────────────┤
│  STEP 4: Log the activity regardless of method   │
└─────────────────────────────────────────────────┘
```

### AI Personalization Prompt Structure

The AI agent should use this context when generating emails:

```typescript
const emailPromptContext = {
  recipientName: "John Smith",
  recipientRole: "CEO",
  companyName: "Powerful Electric Inc.",
  industry: "Construction",
  exposureCount: 7,
  exposureTypes: ["leaked credentials", "email addresses"],
  exposureDateRange: "last 5 days",
  senderCompanyName: "ShimonTech MSP",  // from company settings
  senderName: "Leron",                   // from user profile
  scriptTemplate: "...",                  // from Knowledge Base entry
};
```

### Environment Variables for AI

```env
# LLM API for email generation (choose one)
OPENAI_API_KEY=xxx
# OR
ANTHROPIC_API_KEY=xxx
```

---

## 10. PHASE 9 — GUIDED TOUR ONBOARDING

### What Changed

Add a guided tour that walks first-time users through the platform on their first login after approval.

### Implementation

Use a library like **Shepherd.js** or **React Joyride** for the guided tour.

```bash
npm install react-joyride
```

### Tour Steps

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Sidebar | "Welcome to CyberHook!" | "This is your navigation panel. Let's walk through the key features." |
| 2 | Token display | "Search Tokens" | "You have a monthly allocation of search tokens. Each Live Search uses 1 token." |
| 3 | News page KPI tiles | "Your Dashboard" | "Track your performance metrics, appointments, and activity at a glance." |
| 4 | Quick Actions | "Quick Actions" | "Jump straight into searching, watching companies, or starting campaigns." |
| 5 | Live Search nav | "Live Search" | "Search any domain to find dark web exposures and leaked credentials." |
| 6 | Live-Leads nav | "Live-Leads" | "Your lead database enriched with exposure data and decision maker contacts." |
| 7 | Watchlist nav | "Watchlist" | "Monitor companies and get alerted when new exposures are found." |
| 8 | AI Agents nav | "AI Agents" | "Create personalized outreach campaigns powered by AI." |
| 9 | Knowledge Base nav | "Knowledge Base" | "Store scripts, templates, FAQs, and reference materials for your team." |
| 10 | RFP Hub nav | "RFP Hub" | "Manage use cases, certifications, and RFP responses." |

### Guided Tour State

```typescript
// Track in user record whether tour has been completed
// Add to users table:
guidedTourCompleted: v.optional(v.boolean()),
guidedTourCompletedAt: v.optional(v.number()),
```

### Component

```
components/onboarding/
├── guided-tour.tsx           # Main tour wrapper component
└── tour-steps.ts             # Tour step definitions
```

### Behavior

- Tour triggers automatically on first login after account approval
- User can skip the tour at any time
- Tour can be replayed from Settings
- Tour completion is stored per-user

---

## 11. PHASE 10 — REPORT TEMPLATE REDESIGN

### What Changed

The PDF report generated from Live Search results needs to be redesigned to match the new CyberHook branding and be "white-labeled" with the MSP's own logo and branding.

### Report Template Structure

```
┌─────────────────────────────────────────────────┐
│  [MSP Logo]              EXPOSURE REPORT          │
│  [MSP Company Name]                               │
│  [MSP Website]           Generated: [Date]        │
├─────────────────────────────────────────────────┤
│                                                   │
│  COMPANY: [Target Company Name]                   │
│  DOMAIN:  [target-domain.com]                     │
│  INDUSTRY: [Industry]                             │
│  HEADQUARTERS: [Location]                         │
│                                                   │
├─────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY                                │
│  ┌────────┐ ┌────────┐ ┌──────────────────────┐  │
│  │ 7      │ │ HIGH   │ │ Last Exposure:       │  │
│  │Exposures│ │Severity│ │ Feb 12, 2026        │  │
│  └────────┘ └────────┘ └──────────────────────┘  │
│                                                   │
│  Types of exposed data:                           │
│  • Leaked Credentials (5)                         │
│  • Email Addresses (2)                            │
│                                                   │
├─────────────────────────────────────────────────┤
│  DETAILED FINDINGS                                │
│  (table of individual exposure entries)           │
│  # │ Type │ Source │ Detected │ Data Preview      │
│  1 │ Cred │ Dark   │ Feb 12   │ j***@company.com │
│  2 │ Cred │ Dark   │ Feb 10   │ m***@company.com │
│  ...                                              │
├─────────────────────────────────────────────────┤
│  RECOMMENDATIONS                                  │
│  (static text with MSP's services pitch)          │
│                                                   │
├─────────────────────────────────────────────────┤
│  CONTACT US                                       │
│  [MSP Name] • [MSP Phone] • [MSP Email]          │
│  [MSP Website]                                    │
│  CONFIDENTIAL – For intended recipient only       │
└─────────────────────────────────────────────────┘
```

### Adaptive Fields (pulled from company settings)

- MSP Logo → from `companies.logoUrl`
- MSP Company Name → from `companies.name`
- MSP Website → from `companies.website`
- MSP Phone → from `companies.phone` or `companies.salesPhone`
- MSP Email → from `companies.salesEmail`

### Implementation

Use a PDF generation library (e.g., `@react-pdf/renderer` or `puppeteer` for HTML-to-PDF) to generate branded reports.

---

## 12. PHASE 11 — ADMIN PANEL ENHANCEMENTS

### What Changed

The admin panel needs a dedicated section for managing user approvals (the gated access model). This was partially defined in V1 but the client emphasized needing a clear approve/reject workflow.

### Admin Approval Queue

Add to `/settings/users` or create a new sub-page `/settings/approvals`:

```
┌──────────────────────────────────────────────────────┐
│  User Management                                      │
│  [Active Users] [Pending Approvals] [Deactivated]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  PENDING APPROVALS (3)                                │
│  ┌────────────────────────────────────────────────┐  │
│  │ 👤 Jane Doe • jane@techco.com                  │  │
│  │    Company: TechCo MSP                          │  │
│  │    Business Model: MSP/MSSP                     │  │
│  │    Employees: 51-100 • Revenue: $10-24M         │  │
│  │    Applied: Feb 15, 2026                        │  │
│  │                                                  │  │
│  │    [View Full Application] [✅ Approve] [❌ Reject]│ │
│  └────────────────────────────────────────────────┘  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### View Full Application Modal

Shows all questionnaire data submitted during onboarding for review.

---

## 13. DATABASE SCHEMA CHANGES (COMPLETE)

### Summary of ALL Schema Changes

#### Modified Tables

**`companies`** — Add fields:
```typescript
locationId: v.optional(v.string()),
companyType: v.optional(v.string()),
supportEmail: v.optional(v.string()),
salesEmail: v.optional(v.string()),
supportPhone: v.optional(v.string()),
salesPhone: v.optional(v.string()),
salesTeamSize: v.optional(v.string()),
locations: v.optional(v.array(v.object({...}))), // see Phase 2
```

**`leads`** — Add fields:
```typescript
enrichmentData: v.optional(v.object({...})),  // see Phase 5
enrichedAt: v.optional(v.number()),
enrichmentSource: v.optional(v.string()),
```

**`ransomIncidents`** — Add fields:
```typescript
incidentType: v.union(v.literal('ransomware'), v.literal('breach_notification')),
source: v.union(...),  // see Phase 6
individualsAffected: v.optional(v.number()),
breachType: v.optional(v.string()),
breachVector: v.optional(v.string()),
filedDate: v.optional(v.number()),
```

**`integrations`** — Update `type` union to include new integrations (see Phase 7).

**`users`** — Add fields:
```typescript
guidedTourCompleted: v.optional(v.boolean()),
guidedTourCompletedAt: v.optional(v.number()),
```

#### New Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `knowledgeBaseEntries` | Knowledge Base | Stores all KB entries (URLs, FAQs, rich text, files) |
| `useCases` | RFP Hub | Use case and reference client entries |
| `certifications` | RFP Hub | Certifications, insurance, awards |
| `rfpEntries` | RFP Hub | RFP tracking with deadlines |
| `rfpAnswers` | RFP Hub | Pre-built answer bank |
| `rfpDownloads` | RFP Hub | Quick download files |

#### Removed/Deprecated Tables

| Table | Action | Notes |
|-------|--------|-------|
| `scripts` | DEPRECATE | Keep in schema, stop writing to it. Migrate content to `knowledgeBaseEntries` |
| `cadences` | DEPRECATE | Keep in schema, stop writing to it |
| `cadenceSteps` | DEPRECATE | Keep in schema, stop writing to it |

---

## 14. NEW ROUTES & FILE STRUCTURE

### New Routes to Create

```
DASHBOARD ROUTES (additions/changes)
├── /knowledge-base              → Knowledge Base (replaces /scripts-cadences)
│   └── /[id]                    → Entry detail/edit
├── /rfp-hub                     → RFP Hub landing
│   ├── /use-cases               → Use Cases list
│   │   └── /[id]                → Use Case detail
│   ├── /certifications          → Certifications list
│   │   └── /[id]                → Certification detail
│   └── /tracker                 → RFP Tracker
│       └── /[id]                → RFP detail
```

### New File Structure (additions only)

```
app/(dashboard)/
├── knowledge-base/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
├── rfp-hub/
│   ├── page.tsx
│   ├── use-cases/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── certifications/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── tracker/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx

components/
├── knowledge-base/             # (see Phase 3 for file list)
├── rfp-hub/                    # (see Phase 4 for file list)
└── onboarding/
    ├── guided-tour.tsx         # NEW
    └── tour-steps.ts           # NEW

convex/
├── knowledgeBase/
│   ├── queries.ts
│   └── mutations.ts
├── rfpHub/
│   ├── useCases/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── certifications/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── tracker/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── answerBank/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   └── downloads/
│       ├── queries.ts
│       └── mutations.ts
└── crons/
    └── breachNotificationSync.ts  # NEW
```

### Routes to DELETE

```
app/(dashboard)/snapshot-scan/     # entire directory
app/(dashboard)/scripts-cadences/  # entire directory (replaced by knowledge-base)
```

---

## 15. NEW API KEYS & ENVIRONMENT VARIABLES

### Complete Updated `.env` File

```env
# ============================================
# APP
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# CONVEX
# ============================================
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=xxx

# ============================================
# CLERK (Authentication)
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# ============================================
# STRIPE (Payments)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ============================================
# DARK WEB / EXPOSURE APIs
# ============================================
EXPOSURE_API_KEY=xxx                    # Primary dark web data API
RANSOMWARE_LIVE_API_KEY=xxx             # ransomware.live feed

# ============================================
# ENRICHMENT APIs (NEW in V2)
# ============================================
COMPANY_ENRICHMENT_API_KEY=xxx          # Company data enrichment (Clearbit/ZoomInfo/Apollo)
PEOPLE_ENRICHMENT_API_KEY=xxx           # Decision maker lookup (Apollo/RocketReach)
CONTACT_REVEAL_API_KEY=xxx              # Email/phone reveal on-demand (Apollo/Hunter/Lusha)

# ============================================
# LLM API (NEW in V2 — for AI Agents email gen)
# ============================================
OPENAI_API_KEY=xxx                      # OR use Anthropic
# ANTHROPIC_API_KEY=xxx

# ============================================
# MICROSOFT (Outlook Email + Calendar + Teams)
# ============================================
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_REDIRECT_URI=xxx
# Scopes: Mail.Send, Mail.ReadWrite, Calendars.ReadWrite, etc.

# ============================================
# GOOGLE (Gmail + Google Calendar) — NEW in V2
# ============================================
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=xxx
# Scopes: gmail.send, gmail.readonly, calendar.events, etc.

# ============================================
# CRM: HubSpot
# ============================================
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
HUBSPOT_REDIRECT_URI=xxx

# ============================================
# CRM: GoHighLevel (GHL) — NEW in V2 (replaces Monday)
# ============================================
GHL_CLIENT_ID=xxx
GHL_CLIENT_SECRET=xxx
GHL_REDIRECT_URI=xxx

# ============================================
# MESSAGING: Slack — NEW in V2
# ============================================
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_REDIRECT_URI=xxx

# ============================================
# SOCIAL: LinkedIn — NEW in V2
# ============================================
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=xxx
```

---

## 16. REMOVALS & DEPRECATIONS

### Modules Removed from V1 Scope

| Module | Action | Reason |
|--------|--------|--------|
| **Snapshot Scan** | REMOVE entirely | Client: "we'll pass on this right now" |
| **Scripts & Cadences** | REPLACE with Knowledge Base | Completely different functionality |
| **ConnectWise** | DEPRIORITIZE | Not mentioned in V2 requirements; defer to later |
| **Monday.com** | REPLACE with GHL | Client specified HubSpot + GHL as CRM options |

### What to Delete

```
# Routes
app/(dashboard)/snapshot-scan/          → DELETE entire directory
app/(dashboard)/scripts-cadences/       → DELETE entire directory

# Components
components/snapshot-scan/               → DELETE if exists
components/scripts/                     → DELETE after migration to knowledge-base

# Convex backend
convex/snapshotScans/                   → DELETE if exists

# Navigation
Remove Snapshot Scan from sidebar nav config
Remove Scripts & Cadences from sidebar nav config
```

### What to Keep but Deprecate

```
# Keep these Convex tables in schema but stop using:
convex/scripts/         → Mark as deprecated, do not write new data
convex/cadences/        → Mark as deprecated, do not write new data
```

### Updated Permission Matrix

| Feature | Sales Rep | Sales Admin | Billing User |
|---------|:---------:|:-----------:|:------------:|
| **News/Dashboard** | Own data | All data | Limited view |
| **Run Live Search** | ✅ | ✅ | ❌ |
| **View Own Metrics** | ✅ | ✅ | ❌ |
| **View Team Metrics** | ❌ | ✅ | ❌ |
| **Manage Users** | ❌ | ✅ | ❌ |
| **Manage Integrations** | ❌ | ✅ | ❌ |
| **View Audit Log** | ❌ | ✅ | ❌ |
| **View Search History** | ❌ | ✅ | ❌ |
| **View Billing Details** | ❌ | ✅ | ✅ |
| **Manage Billing** | ❌ | ✅ | ❌ |
| **Create Campaigns** | ✅ | ✅ | ❌ |
| **Create Watchlist Items** | ✅ | ✅ | ❌ |
| **Create Tasks** | ✅ | ✅ | ❌ |
| **Manage Company Profile** | ❌ | ✅ | ❌ |
| **Knowledge Base (personal)** | ✅ | ✅ | ❌ |
| **Knowledge Base (global)** | ❌ | ✅ | ❌ |
| **RFP Hub (view/create)** | ✅ | ✅ | ❌ |
| **RFP Hub (approve references)** | ❌ | ✅ | ❌ |
| **Live-Leads** | Own | All | ❌ |
| **Watchlist** | Own | All | ❌ |
| **Ransom Hub** | ✅ | ✅ | ❌ |
| ~~Snapshot Scan~~ | ~~✅~~ | ~~✅~~ | ~~❌~~ | **REMOVED** |
| **AI Agents** | Own | All | ❌ |
| ~~Scripts & Cadences~~ | — | — | — | **REPLACED by Knowledge Base** |
| **Events** | ✅ | ✅ | ❌ |
| **Reporting** | Own | All | ❌ |

---

## IMPLEMENTATION ORDER

For Cursor AI, implement these phases in order:

```
Phase 1:  Navigation & Menu Restructuring         (30 min)
Phase 2:  Settings Overhaul                        (2 hrs)
Phase 3:  Knowledge Base                           (3 hrs)
Phase 4:  RFP Hub                                  (4 hrs)
Phase 5:  Live-Leads Enrichment                    (2 hrs)
Phase 6:  Ransom Hub + Breach Notifications        (2 hrs)
Phase 7:  Expanded Integrations                    (3 hrs)
Phase 8:  AI Agents Refinement                     (2 hrs)
Phase 9:  Guided Tour                              (1 hr)
Phase 10: Report Template Redesign                 (2 hrs)
Phase 11: Admin Panel Enhancements                 (1 hr)
```

**Total estimated implementation: ~22 hours**

---

## END OF V2 CHANGE DELTA DOCUMENT

This document layers on top of `CYBERHOOK_ARCHITECTURE__1_.md`. For anything NOT mentioned here, the V1 architecture document remains the source of truth. Apply changes phase by phase and verify each phase works before moving to the next.
