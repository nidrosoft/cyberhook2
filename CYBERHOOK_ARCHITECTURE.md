# CyberHook - Complete Architecture & Implementation Guide

> **Version:** 1.0.0  
> **Last Updated:** February 2026  
> **Purpose:** System prompt for Cursor AI to build CyberHook Sales Enablement Platform

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Design System](#3-design-system)
4. [Project Structure](#4-project-structure)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Onboarding Flow](#6-onboarding-flow)
7. [Role-Based Access Control](#7-role-based-access-control)
8. [Database Schema](#8-database-schema)
9. [Application Routes](#9-application-routes)
10. [Layout & Navigation](#10-layout--navigation)
11. [Module Specifications](#11-module-specifications)
12. [State Management](#12-state-management)
13. [API & Backend Functions](#13-api--backend-functions)
14. [External Integrations](#14-external-integrations)
15. [Component Library](#15-component-library)

---

## 1. PROJECT OVERVIEW

### 1.1 What is CyberHook?

CyberHook is a **sales enablement platform** for MSPs (Managed Service Providers) and MSSPs (Managed Security Service Providers). It transforms dark web intelligence, ransomware activity, and exposure data into actionable sales motions.

### 1.2 Core Value Proposition

- Turn cyber threat data into qualified sales leads
- Enable MSP/MSSP sales teams to prospect companies that have been breached
- Monitor target accounts for new exposures
- Automate outreach campaigns using threat intelligence as the "hook"

### 1.3 Key Business Logic

**Token System:**
- Tokens are the currency for searches ONLY (not enrichment or calls)
- Live Searches consume tokens
- Snapshot Scan (batch) consumes tokens per domain
- Display format: "59 / 1000 searches left this month"

**Gated Access Model:**
- All sign-ups require manual approval within 24-48 hours
- This prevents misuse of sensitive dark web data
- Trial billing and functional access are decoupled

### 1.4 Three User Roles

| Role | Description |
|------|-------------|
| **Sales Rep** | Day-to-day selling, sees only own data |
| **Sales Admin** | Team manager + account owner, full access |
| **Billing User** | Finance role, read-only billing/usage access |

---

## 2. TECH STACK

### 2.1 Core Technologies

```
Frontend:       Next.js 14+ (App Router)
Database:       Convex
Authentication: Clerk
Styling:        Tailwind CSS
UI Components:  shadcn/ui (customized)
Icons:          Lucide React
Charts:         Recharts
Forms:          React Hook Form + Zod
```

### 2.2 External Services

```
Payments:       Stripe
Email:          Outlook API (via Microsoft Graph)
CRM:            HubSpot or Monday (Phase 1: pick one)
PSA:            ConnectWise
Data:           ransomware.live API, Dark Web providers (TBD)
```

### 2.3 Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "convex": "^1.0.0",
    "@clerk/nextjs": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "lucide-react": "^0.300.0",
    "recharts": "^2.10.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.22.0",
    "@tanstack/react-table": "^8.0.0",
    "date-fns": "^3.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

## 3. DESIGN SYSTEM

### 3.1 Visual Philosophy

Inspired by **Vercel's design system**:
- Clean, minimal, sophisticated
- Dark mode as primary theme
- Grid-based layouts
- Subtle borders and dividers
- Monochromatic with accent colors for actions

### 3.2 Color Palette

```css
:root {
  /* Background Colors */
  --bg-primary: #000000;        /* Main background */
  --bg-secondary: #0a0a0a;      /* Cards, panels */
  --bg-tertiary: #171717;       /* Elevated elements */
  --bg-hover: #262626;          /* Hover states */
  
  /* Border Colors */
  --border-primary: #262626;    /* Default borders */
  --border-secondary: #404040;  /* Emphasized borders */
  --border-focus: #fafafa;      /* Focus rings */
  
  /* Text Colors */
  --text-primary: #fafafa;      /* Primary text */
  --text-secondary: #a1a1aa;    /* Secondary text */
  --text-tertiary: #71717a;     /* Muted text */
  --text-inverse: #000000;      /* Text on light backgrounds */
  
  /* Accent Colors */
  --accent-primary: #ffffff;    /* Primary actions */
  --accent-success: #22c55e;    /* Success states */
  --accent-warning: #f59e0b;    /* Warning states */
  --accent-danger: #ef4444;     /* Error/danger states */
  --accent-info: #3b82f6;       /* Info states */
  
  /* Special Colors */
  --exposure-high: #ef4444;     /* High risk exposure */
  --exposure-medium: #f59e0b;   /* Medium risk */
  --exposure-low: #22c55e;      /* Low risk */
}
```

### 3.3 Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 3.4 Spacing Scale

```css
/* Based on 4px grid */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 3.5 Border Radius

```css
--radius-sm: 0.25rem;   /* 4px - small elements */
--radius-md: 0.375rem;  /* 6px - buttons, inputs */
--radius-lg: 0.5rem;    /* 8px - cards */
--radius-xl: 0.75rem;   /* 12px - modals */
--radius-full: 9999px;  /* Pills, avatars */
```

### 3.6 Component Patterns

**Buttons:**
```
Primary:   White background, black text, white border on hover
Secondary: Transparent, white text, subtle border
Ghost:     Transparent, gray text, no border
Danger:    Red background for destructive actions
```

**Cards:**
```
Background: --bg-secondary
Border:     1px solid --border-primary
Radius:     --radius-lg
Padding:    --space-6
```

**Tables:**
```
Header:     --bg-tertiary, uppercase, small text
Rows:       Hover state with --bg-hover
Borders:    Horizontal dividers only
```

**Forms:**
```
Inputs:     Dark background, subtle border, white text
Labels:     Small, muted text above inputs
Focus:      White ring, 2px offset
Errors:     Red border, red helper text
```

---

## 4. PROJECT STRUCTURE

### 4.1 Root Directory Structure

```
cyberhook/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (no sidebar)
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── pending-approval/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/              # Dashboard group (with sidebar)
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # News/Home (default)
│   │   ├── todos/
│   │   │   └── page.tsx
│   │   ├── ransom-hub/
│   │   │   └── page.tsx
│   │   ├── live-search/
│   │   │   └── page.tsx
│   │   ├── live-leads/
│   │   │   ├── page.tsx          # List view
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Detail view
│   │   ├── watchlist/
│   │   │   └── page.tsx
│   │   ├── snapshot-scan/
│   │   │   ├── page.tsx          # List/history
│   │   │   └── new/
│   │   │       └── page.tsx      # New scan
│   │   ├── ai-agents/
│   │   │   ├── page.tsx          # Campaigns list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Campaign detail
│   │   │   └── new/
│   │   │       └── page.tsx      # Create campaign
│   │   ├── scripts-cadences/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── reporting/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx          # Redirect to profile
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx
│   │   │   └── audit-log/
│   │   │       └── page.tsx
│   │   └── billing/
│   │       └── page.tsx
│   │
│   ├── api/                      # API routes
│   │   └── webhooks/
│   │       ├── clerk/
│   │       │   └── route.ts
│   │       └── stripe/
│   │           └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── not-found.tsx
│
├── components/
│   ├── ui/                       # Base UI components (shadcn)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── tooltip.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── popover.tsx
│   │   ├── calendar.tsx
│   │   ├── date-picker.tsx
│   │   ├── command.tsx
│   │   ├── combobox.tsx
│   │   └── form.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── sidebar-item.tsx
│   │   ├── sidebar-section.tsx
│   │   ├── header.tsx
│   │   ├── user-nav.tsx
│   │   ├── token-display.tsx
│   │   ├── notification-bell.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── auth/                     # Auth components
│   │   ├── auth-card.tsx
│   │   ├── social-buttons.tsx
│   │   └── auth-form.tsx
│   │
│   ├── onboarding/               # Onboarding components
│   │   ├── onboarding-wizard.tsx
│   │   ├── step-indicator.tsx
│   │   ├── company-info-form.tsx
│   │   ├── business-details-form.tsx
│   │   ├── team-invite-form.tsx
│   │   └── plan-selection.tsx
│   │
│   ├── dashboard/                # Dashboard components
│   │   ├── kpi-card.tsx
│   │   ├── kpi-grid.tsx
│   │   ├── today-panel.tsx
│   │   ├── news-feed.tsx
│   │   ├── quick-actions.tsx
│   │   └── greeting-header.tsx
│   │
│   ├── search/                   # Live Search components
│   │   ├── search-form.tsx
│   │   ├── search-results.tsx
│   │   ├── exposure-card.tsx
│   │   ├── exposure-summary.tsx
│   │   └── search-history.tsx
│   │
│   ├── leads/                    # Live-Leads components
│   │   ├── leads-table.tsx
│   │   ├── leads-filters.tsx
│   │   ├── lead-card.tsx
│   │   ├── lead-detail.tsx
│   │   ├── contacts-list.tsx
│   │   ├── contact-card.tsx
│   │   └── enrichment-badge.tsx
│   │
│   ├── watchlist/                # Watchlist components
│   │   ├── watchlist-table.tsx
│   │   ├── add-to-watchlist.tsx
│   │   └── alert-indicator.tsx
│   │
│   ├── ransom-hub/               # Ransom Hub components
│   │   ├── incident-table.tsx
│   │   ├── incident-filters.tsx
│   │   └── incident-row.tsx
│   │
│   ├── campaigns/                # AI Agents components
│   │   ├── campaign-list.tsx
│   │   ├── campaign-card.tsx
│   │   ├── campaign-wizard.tsx
│   │   ├── audience-selector.tsx
│   │   ├── cadence-selector.tsx
│   │   ├── email-preview.tsx
│   │   └── campaign-stats.tsx
│   │
│   ├── scripts/                  # Scripts & Cadences
│   │   ├── script-list.tsx
│   │   ├── script-editor.tsx
│   │   ├── cadence-builder.tsx
│   │   └── template-card.tsx
│   │
│   ├── events/                   # Events components
│   │   ├── event-calendar.tsx
│   │   ├── event-list.tsx
│   │   ├── event-form.tsx
│   │   └── event-card.tsx
│   │
│   ├── reporting/                # Reporting components
│   │   ├── metrics-grid.tsx
│   │   ├── performance-chart.tsx
│   │   ├── team-breakdown.tsx
│   │   └── export-button.tsx
│   │
│   ├── settings/                 # Settings components
│   │   ├── settings-nav.tsx
│   │   ├── profile-form.tsx
│   │   ├── users-table.tsx
│   │   ├── invite-user-dialog.tsx
│   │   ├── integration-card.tsx
│   │   └── audit-log-table.tsx
│   │
│   ├── billing/                  # Billing components
│   │   ├── subscription-card.tsx
│   │   ├── usage-meter.tsx
│   │   ├── invoice-list.tsx
│   │   └── payment-method.tsx
│   │
│   ├── shared/                   # Shared components
│   │   ├── data-table.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-state.tsx
│   │   ├── error-state.tsx
│   │   ├── page-header.tsx
│   │   ├── stat-card.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── search-input.tsx
│   │   ├── filter-bar.tsx
│   │   ├── pagination.tsx
│   │   └── status-badge.tsx
│   │
│   └── providers/                # Context providers
│       ├── convex-provider.tsx
│       ├── clerk-provider.tsx
│       ├── theme-provider.tsx
│       └── toast-provider.tsx
│
├── convex/                       # Convex backend
│   ├── _generated/               # Auto-generated
│   ├── schema.ts                 # Database schema
│   ├── auth.ts                   # Auth helpers
│   ├── users/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── companies/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── leads/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── watchlist/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── searches/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── campaigns/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── scripts/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── events/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── tasks/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── ransomHub/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── billing/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── audit/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── integrations/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   └── crons/
│       ├── watchlistMonitor.ts
│       └── ransomHubSync.ts
│
├── lib/                          # Utilities
│   ├── utils.ts
│   ├── cn.ts
│   ├── constants.ts
│   ├── validations.ts
│   └── formatters.ts
│
├── hooks/                        # Custom hooks
│   ├── use-user.ts
│   ├── use-company.ts
│   ├── use-tokens.ts
│   ├── use-permissions.ts
│   ├── use-debounce.ts
│   └── use-media-query.ts
│
├── types/                        # TypeScript types
│   ├── index.ts
│   ├── user.ts
│   ├── company.ts
│   ├── lead.ts
│   ├── search.ts
│   └── campaign.ts
│
├── config/                       # Configuration
│   ├── site.ts
│   ├── navigation.ts
│   └── plans.ts
│
├── public/                       # Static assets
│   ├── logo.svg
│   ├── logo-icon.svg
│   └── placeholder-avatar.png
│
├── middleware.ts                 # Clerk middleware
├── tailwind.config.ts
├── next.config.js
├── convex.json
├── tsconfig.json
└── package.json
```

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 Clerk Configuration

**Environment Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Clerk Appearance (Vercel-style):**
```typescript
// lib/clerk-theme.ts
export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#ffffff',
    colorBackground: '#000000',
    colorInputBackground: '#171717',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    borderRadius: '0.375rem',
  },
  elements: {
    card: 'bg-black border border-neutral-800',
    formButtonPrimary: 'bg-white text-black hover:bg-neutral-200',
    formFieldInput: 'bg-neutral-900 border-neutral-800',
    footerActionLink: 'text-white hover:text-neutral-300',
  },
};
```

### 5.2 Middleware Configuration

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);
const isPendingRoute = createRouteMatcher(['/pending-approval(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = auth();
  
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  
  const userStatus = sessionClaims?.metadata?.status;
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  
  if (!onboardingComplete && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }
  
  if (userStatus === 'pending' && !isPendingRoute(req)) {
    return NextResponse.redirect(new URL('/pending-approval', req.url));
  }
  
  if (userStatus === 'rejected') {
    return NextResponse.redirect(new URL('/sign-in?error=rejected', req.url));
  }
  
  if (userStatus === 'approved') {
    if (isOnboardingRoute(req) || isPendingRoute(req)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### 5.3 User Session Data

```typescript
// types/user.ts
interface UserMetadata {
  role: 'sales_rep' | 'sales_admin' | 'billing';
  status: 'pending' | 'approved' | 'rejected';
  onboardingComplete: boolean;
  companyId: string;
}

interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  metadata: UserMetadata;
}
```

---

## 6. ONBOARDING FLOW

### 6.1 Flow Overview

```
Sign Up Complete
       │
       ▼
┌──────────────────┐
│  STEP 1: Company │  ← Company Name, Phone, Website
│  Basic Info      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  STEP 2: Business│  ← Business Model, Revenue, Geography
│  Details         │    Target Market, Employees, Sales Team
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  STEP 3: Team    │  ← Invite team members (optional)
│  Invitations     │    Logo upload (optional)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  STEP 4: Plan &  │  ← Select plan, enter payment details
│  Payment         │    (Stripe Elements)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PENDING         │  ← Account Under Review screen
│  APPROVAL        │    (24-48 hours)
└──────────────────┘
```

### 6.2 Step 1: Company Basic Info

**Required Fields:**
| Field | Type | Validation |
|-------|------|------------|
| Company Name | text | Required, min 2 chars |
| Phone | tel | Required, valid phone |
| Website | url | Required, valid URL |

### 6.3 Step 2: Business Details

**Required Fields:**
| Field | Type | Options |
|-------|------|---------|
| Primary Business Model | single-select | MSP/MSSP, VAR/Reseller, Systems Integrator, VAD, TAP, Consultant/Referral Partner, Not set |
| Annual Revenue | single-select | 0-4M, 5-9M, 10-24M, 25-49M, 50-99M, 100-249M, 250M-1B, 1B+ |
| Geographic Coverage | multi-select | North America, EMEA, APAC, ANZ, LATAM |
| Target/Customer Base | multi-select | SMB, Mid Market, Enterprise, Fortune 500 |
| Total Employees | single-select | 1-10, 11-50, 51-100, 101-150, 151-250, 251-500, 501+ |
| Total Sales People | single-select | Just me (solo), 2-3, 3-5, 5-10, 10-25, 25-50, 50+ |

**Optional Fields:**
| Field | Type | Notes |
|-------|------|-------|
| Country | select | Country list |
| Street Address | text | Full address |
| Notes | textarea | Additional info |
| Secondary Business Model | select | Same options as primary |

### 6.4 Step 3: Team Invitations

**Fields:**
| Field | Type | Notes |
|-------|------|-------|
| Team Emails | text area | Comma or newline separated |
| Logo Upload | file | GIF, PNG, JPG, JPEG, JFIF. Min 256x256px |

**Note:** Invited users default to Sales Rep role. Invitations sent AFTER approval.

### 6.5 Step 4: Plan & Payment

- Plan selection (Starter, Growth, Enterprise)
- Stripe Card Element for payment
- 5-day free trial starts after payment details entered
- Card charged after trial unless cancelled

### 6.6 Pending Approval Page

Display "Account Under Review" message with:
- Estimated time (24-48 hours)
- Explanation of why manual review exists
- Email notification will be sent
- Sign out option

---

## 7. ROLE-BASED ACCESS CONTROL

### 7.1 Permission Matrix

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
| **Create Personal Scripts** | ✅ | ✅ | ❌ |
| **Create Global Scripts** | ❌ | ✅ | ❌ |
| **Live-Leads** | Own | All | ❌ |
| **Watchlist** | Own | All | ❌ |
| **Ransom Hub** | ✅ | ✅ | ❌ |
| **Snapshot Scan** | ✅ | ✅ | ❌ |
| **AI Agents** | Own | All | ❌ |
| **Scripts & Cadences** | Own + Platform | All | ❌ |
| **Events** | ✅ | ✅ | ❌ |
| **Reporting** | Own | All | ❌ |

### 7.2 Navigation Visibility

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
  {
    title: 'Snapshot Scan',
    href: '/snapshot-scan',
    icon: FileSearch,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'AI Agents',
    href: '/ai-agents',
    icon: Bot,
    roles: ['sales_rep', 'sales_admin'],
  },
  {
    title: 'Scripts & Cadences',
    href: '/scripts-cadences',
    icon: FileText,
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

### 7.3 RBAC Hook

```typescript
// hooks/use-permissions.ts
import { useUser } from '@clerk/nextjs';

export function usePermissions() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as UserRole;
  
  const permissions = {
    canRunSearch: ['sales_rep', 'sales_admin'].includes(role),
    canViewOwnMetrics: ['sales_rep', 'sales_admin'].includes(role),
    canViewTeamMetrics: role === 'sales_admin',
    canManageUsers: role === 'sales_admin',
    canManageIntegrations: role === 'sales_admin',
    canViewAuditLog: role === 'sales_admin',
    canViewSearchHistory: role === 'sales_admin',
    canManageCompanyProfile: role === 'sales_admin',
    canViewBilling: ['sales_admin', 'billing'].includes(role),
    canManageBilling: role === 'sales_admin',
    canCreateLeads: ['sales_rep', 'sales_admin'].includes(role),
    canCreateCampaigns: ['sales_rep', 'sales_admin'].includes(role),
    canCreateGlobalScripts: role === 'sales_admin',
    canCreatePersonalScripts: ['sales_rep', 'sales_admin'].includes(role),
    dataScope: role === 'sales_admin' ? 'all' : 'own',
  };
  
  return { role, permissions };
}
```

---

## 8. DATABASE SCHEMA

### 8.1 Convex Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================
  // USERS & COMPANIES
  // ============================================
  
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.optional(v.string()),
    companyId: v.id('companies'),
    role: v.union(
      v.literal('sales_rep'),
      v.literal('sales_admin'),
      v.literal('billing')
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('deactivated')
    ),
    timezone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_company', ['companyId'])
    .index('by_email', ['email']),

  companies: defineTable({
    name: v.string(),
    phone: v.string(),
    website: v.string(),
    logoUrl: v.optional(v.string()),
    primaryBusinessModel: v.string(),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.string(),
    geographicCoverage: v.array(v.string()),
    targetCustomerBase: v.array(v.string()),
    totalEmployees: v.string(),
    totalSalesPeople: v.string(),
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    defaultTimezone: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    mrrTarget: v.optional(v.number()),
    appointmentTarget: v.optional(v.number()),
    tokenAllocation: v.number(),
    tokensUsed: v.number(),
    tokenResetDate: v.number(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    status: v.union(
      v.literal('trial'),
      v.literal('active'),
      v.literal('past_due'),
      v.literal('cancelled'),
      v.literal('pending_approval')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_stripe_customer', ['stripeCustomerId']),

  // ============================================
  // LEADS & CONTACTS
  // ============================================

  leads: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.id('users'),
    name: v.string(),
    domain: v.string(),
    website: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    industry: v.optional(v.string()),
    employeeCount: v.optional(v.string()),
    revenueRange: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    exposureSeverity: v.optional(v.union(
      v.literal('high'),
      v.literal('medium'),
      v.literal('low'),
      v.literal('none')
    )),
    exposureCount: v.optional(v.number()),
    lastExposureDate: v.optional(v.number()),
    source: v.union(
      v.literal('live_search'),
      v.literal('ransom_hub'),
      v.literal('snapshot_scan'),
      v.literal('manual')
    ),
    sourceReferenceId: v.optional(v.string()),
    status: v.union(
      v.literal('new'),
      v.literal('contacted'),
      v.literal('qualified'),
      v.literal('proposal'),
      v.literal('won'),
      v.literal('lost')
    ),
    crmSynced: v.optional(v.boolean()),
    crmRecordId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_creator', ['createdByUserId'])
    .index('by_domain', ['domain'])
    .index('by_status', ['companyId', 'status']),

  contacts: defineTable({
    leadId: v.id('leads'),
    companyId: v.id('companies'),
    firstName: v.string(),
    lastName: v.string(),
    title: v.optional(v.string()),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    phoneVerified: v.optional(v.boolean()),
    creditsPurchased: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_lead', ['leadId'])
    .index('by_company', ['companyId']),

  // ============================================
  // WATCHLIST
  // ============================================

  watchlistItems: defineTable({
    companyId: v.id('companies'),
    userId: v.id('users'),
    leadId: v.optional(v.id('leads')),
    domain: v.string(),
    name: v.string(),
    lastCheckedAt: v.optional(v.number()),
    lastExposureDate: v.optional(v.number()),
    exposureCount: v.optional(v.number()),
    hasNewExposures: v.optional(v.boolean()),
    newExposureWindow: v.number(),
    emailNotification: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_user', ['userId'])
    .index('by_domain', ['domain']),

  // ============================================
  // SEARCHES
  // ============================================

  searches: defineTable({
    companyId: v.id('companies'),
    userId: v.id('users'),
    searchType: v.union(
      v.literal('live_search'),
      v.literal('snapshot_scan')
    ),
    input: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('success'),
      v.literal('failed')
    ),
    resultSummary: v.optional(v.object({
      exposureCount: v.number(),
      dateRange: v.optional(v.object({
        from: v.number(),
        to: v.number(),
      })),
      dataTypes: v.optional(v.array(v.string())),
    })),
    tokensConsumed: v.number(),
    createdAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_user', ['userId'])
    .index('by_created', ['companyId', 'createdAt']),

  searchResults: defineTable({
    searchId: v.id('searches'),
    exposureType: v.string(),
    sourceType: v.string(),
    detectedAt: v.number(),
    dataPreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_search', ['searchId']),

  // ============================================
  // CAMPAIGNS (AI AGENTS)
  // ============================================

  campaigns: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    cadenceId: v.optional(v.id('cadences')),
    sendingWindow: v.optional(v.object({
      startHour: v.number(),
      endHour: v.number(),
      timezone: v.string(),
      daysOfWeek: v.array(v.number()),
    })),
    throttling: v.optional(v.object({
      maxPerDay: v.number(),
      minDelayMinutes: v.number(),
    })),
    aiPersonalization: v.boolean(),
    requireApproval: v.boolean(),
    status: v.union(
      v.literal('draft'),
      v.literal('active'),
      v.literal('paused'),
      v.literal('completed')
    ),
    totalRecipients: v.optional(v.number()),
    emailsSent: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_creator', ['createdByUserId'])
    .index('by_status', ['companyId', 'status']),

  campaignRecipients: defineTable({
    campaignId: v.id('campaigns'),
    contactId: v.id('contacts'),
    leadId: v.id('leads'),
    currentStep: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('opted_out'),
      v.literal('bounced')
    ),
    lastContactedAt: v.optional(v.number()),
    nextScheduledAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_contact', ['contactId']),

  campaignMessages: defineTable({
    campaignId: v.id('campaigns'),
    recipientId: v.id('campaignRecipients'),
    stepNumber: v.number(),
    channel: v.union(v.literal('email'), v.literal('linkedin')),
    subject: v.optional(v.string()),
    body: v.string(),
    aiGenerated: v.boolean(),
    approvedByUserId: v.optional(v.id('users')),
    approvedAt: v.optional(v.number()),
    status: v.union(
      v.literal('draft'),
      v.literal('pending_approval'),
      v.literal('scheduled'),
      v.literal('sent'),
      v.literal('failed')
    ),
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_recipient', ['recipientId'])
    .index('by_status', ['campaignId', 'status']),

  // ============================================
  // SCRIPTS & CADENCES
  // ============================================

  scripts: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.optional(v.id('users')),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    type: v.union(
      v.literal('cold_call'),
      v.literal('cold_email'),
      v.literal('follow_up_email'),
      v.literal('post_scan_email'),
      v.literal('renewal_email'),
      v.literal('event_follow_up'),
      v.literal('linkedin_message')
    ),
    persona: v.optional(v.union(
      v.literal('owner'),
      v.literal('it_manager'),
      v.literal('ciso'),
      v.literal('cfo'),
      v.literal('general')
    )),
    salesMotion: v.optional(v.union(
      v.literal('net_new'),
      v.literal('upsell'),
      v.literal('qbr'),
      v.literal('event_follow_up')
    )),
    scope: v.union(
      v.literal('platform'),
      v.literal('global'),
      v.literal('personal')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_creator', ['createdByUserId'])
    .index('by_scope', ['companyId', 'scope']),

  cadences: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.optional(v.id('users')),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.union(
      v.literal('platform'),
      v.literal('global'),
      v.literal('personal')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_creator', ['createdByUserId']),

  cadenceSteps: defineTable({
    cadenceId: v.id('cadences'),
    stepNumber: v.number(),
    dayOffset: v.number(),
    channel: v.union(v.literal('email'), v.literal('linkedin'), v.literal('call')),
    scriptId: v.optional(v.id('scripts')),
    createdAt: v.number(),
  })
    .index('by_cadence', ['cadenceId']),

  // ============================================
  // TASKS (TO-DO)
  // ============================================

  tasks: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.id('users'),
    assignedToUserId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    leadId: v.optional(v.id('leads')),
    status: v.union(
      v.literal('pending'),
      v.literal('completed')
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high')
    ),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_assignee', ['assignedToUserId'])
    .index('by_creator', ['createdByUserId'])
    .index('by_due_date', ['assignedToUserId', 'dueDate']),

  // ============================================
  // EVENTS & CONFERENCES
  // ============================================

  events: defineTable({
    companyId: v.id('companies'),
    createdByUserId: v.optional(v.id('users')),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal('conference'),
      v.literal('webinar'),
      v.literal('meeting'),
      v.literal('appointment'),
      v.literal('custom')
    ),
    isSystemEvent: v.boolean(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    leadId: v.optional(v.id('leads')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_creator', ['createdByUserId'])
    .index('by_date', ['companyId', 'startDate']),

  // ============================================
  // RANSOM HUB
  // ============================================

  ransomIncidents: defineTable({
    companyName: v.string(),
    domain: v.optional(v.string()),
    industry: v.optional(v.string()),
    geography: v.optional(v.string()),
    attackDate: v.number(),
    ransomwareGroup: v.string(),
    sourceUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_date', ['attackDate'])
    .index('by_external_id', ['externalId']),

  // ============================================
  // AUDIT LOG
  // ============================================

  auditLogs: defineTable({
    companyId: v.id('companies'),
    userId: v.optional(v.id('users')),
    eventType: v.string(),
    eventDescription: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_user', ['userId'])
    .index('by_event_type', ['companyId', 'eventType'])
    .index('by_created', ['companyId', 'createdAt']),

  // ============================================
  // INTEGRATIONS
  // ============================================

  integrations: defineTable({
    companyId: v.id('companies'),
    type: v.union(
      v.literal('connectwise'),
      v.literal('hubspot'),
      v.literal('monday'),
      v.literal('outlook'),
      v.literal('stripe')
    ),
    status: v.union(
      v.literal('connected'),
      v.literal('disconnected'),
      v.literal('error')
    ),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    settings: v.optional(v.any()),
    lastError: v.optional(v.string()),
    lastErrorAt: v.optional(v.number()),
    connectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_type', ['companyId', 'type']),

  // ============================================
  // NOTIFICATIONS
  // ============================================

  notifications: defineTable({
    companyId: v.id('companies'),
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    actionUrl: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_unread', ['userId', 'read']),

  // ============================================
  // TEAM INVITATIONS
  // ============================================

  invitations: defineTable({
    companyId: v.id('companies'),
    invitedByUserId: v.id('users'),
    email: v.string(),
    role: v.union(
      v.literal('sales_rep'),
      v.literal('sales_admin'),
      v.literal('billing')
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('expired')
    ),
    token: v.string(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_email', ['email'])
    .index('by_token', ['token']),
});
```

---

## 9. APPLICATION ROUTES

### 9.1 Route Map

```
PUBLIC ROUTES (No Auth Required)
├── /sign-in              → Clerk Sign In
├── /sign-up              → Clerk Sign Up
└── /api/webhooks/*       → Webhook endpoints

AUTH ROUTES (Auth Required, No Dashboard)
├── /onboarding           → Onboarding wizard
└── /pending-approval     → Account under review

DASHBOARD ROUTES (Auth + Approved)
├── /                     → News (Home Dashboard)
├── /todos                → To-Do List
├── /ransom-hub           → Ransom Hub
├── /live-search          → Live Search
├── /live-leads           → Live-Leads list
│   └── /[id]             → Lead detail
├── /watchlist            → Watchlist
├── /snapshot-scan        → Snapshot Scan history
│   └── /new              → New scan
├── /ai-agents            → Campaigns list
│   ├── /[id]             → Campaign detail
│   └── /new              → Create campaign
├── /scripts-cadences     → Scripts & Cadences
│   └── /[id]             → Edit script/cadence
├── /events               → Events list
│   └── /[id]             → Event detail
├── /reporting            → Reporting dashboard
├── /settings             → Settings (redirect to profile)
│   ├── /profile          → Company profile
│   ├── /users            → User management
│   ├── /integrations     → Integrations
│   └── /audit-log        → Audit log
└── /billing              → Billing & Usage
```

### 9.2 Route Protection

```typescript
const ROUTE_PERMISSIONS = {
  '/': ['sales_rep', 'sales_admin', 'billing'],
  '/todos': ['sales_rep', 'sales_admin'],
  '/ransom-hub': ['sales_rep', 'sales_admin'],
  '/live-search': ['sales_rep', 'sales_admin'],
  '/live-leads': ['sales_rep', 'sales_admin'],
  '/watchlist': ['sales_rep', 'sales_admin'],
  '/snapshot-scan': ['sales_rep', 'sales_admin'],
  '/ai-agents': ['sales_rep', 'sales_admin'],
  '/scripts-cadences': ['sales_rep', 'sales_admin'],
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

---

## 10. LAYOUT & NAVIGATION

### 10.1 Dashboard Layout Structure

```
┌────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                      │
│ ┌────────┬──────────────────────────────────────────┬───────────────────┐  │
│ │ [Logo] │                                          │ 🔔 [59/1000] [👤] │  │
│ └────────┴──────────────────────────────────────────┴───────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌─────────────────────────────────────────────────────┐   │
│ │              │ │                                                     │   │
│ │   SIDEBAR    │ │                    MAIN CONTENT                     │   │
│ │              │ │                                                     │   │
│ │  • News      │ │                                                     │   │
│ │  • To-Do     │ │                                                     │   │
│ │  • Ransom Hub│ │                                                     │   │
│ │  • Search    │ │                                                     │   │
│ │  • Leads     │ │                                                     │   │
│ │  • Watchlist │ │                                                     │   │
│ │  • Scan      │ │                                                     │   │
│ │  • AI Agents │ │                                                     │   │
│ │  • Scripts   │ │                                                     │   │
│ │  • Events    │ │                                                     │   │
│ │  • Reporting │ │                                                     │   │
│ │  ─────────── │ │                                                     │   │
│ │  Admin       │ │                                                     │   │
│ │  • Settings  │ │                                                     │   │
│ │  • Billing   │ │                                                     │   │
│ └──────────────┘ └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Token Display Component

```typescript
// components/layout/token-display.tsx
interface TokenDisplayProps {
  used: number;
  total: number;
}

export function TokenDisplay({ used, total }: TokenDisplayProps) {
  const remaining = total - used;
  const percentage = (remaining / total) * 100;
  
  const getStatusColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5">
            <Search className="h-4 w-4 text-neutral-400" />
            <span className="text-sm text-neutral-300">
              {remaining} / {total}
            </span>
            <div className="h-1.5 w-16 rounded-full bg-neutral-800">
              <div 
                className={cn('h-full rounded-full', getStatusColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{remaining} searches remaining this month</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## 11. MODULE SPECIFICATIONS

### 11.1 News (Home Dashboard)

**Route:** `/`  
**Access:** All roles (Billing has limited view)

**Components:**
- `GreetingHeader` - "Hello, [First Name]" with company name
- `KpiGrid` - 4-column grid of KPI cards
- `KpiCard` - MRR vs target, Appointments booked, Searches (7 days), Emails sent
- `TodayPanel` - Upcoming appointments and tasks due
- `QuickActions` - "Run Live Search", "Add to Watchlist", "Start Campaign"
- `NewsFeed` - Curated cyber/IT news

**Billing User View:** Limited to subscription status and aggregate usage only.

### 11.2 To-Do List

**Route:** `/todos`  
**Access:** Sales Rep, Sales Admin

**Features:**
- Task creation with title, description, due date, priority
- Link tasks to companies from Live-Leads/Watchlist
- Assign to self or team members (admin only for team)
- Mark complete / reopen
- Filter by assignee, status, due date, priority

### 11.3 Ransom Hub

**Route:** `/ransom-hub`  
**Access:** Sales Rep, Sales Admin

**Features:**
- Display ransomware incidents from ransomware.live
- Table with: Company, Industry, Geography, Group, Date
- Filters: Date range, geography, industry, ransomware group
- Row actions: View Exposure, Add to Watchlist, Create Lead

### 11.4 Live Search

**Route:** `/live-search`  
**Access:** Sales Rep, Sales Admin

**Features:**
- Domain input with token cost warning
- Token deduction on search
- Results: Exposure summary (count, date range, data types)
- Exposure details list
- Actions: Save as Lead, Add to Watchlist, Export PDF

### 11.5 Live-Leads

**Route:** `/live-leads`  
**Access:** Sales Rep (own), Sales Admin (all)

**List View Features:**
- Filters: Geography, industry, size, status, exposure risk
- Columns: Company, Domain, Size, Revenue, Status, Risk indicator

**Detail View Features:**
- Company overview with enrichment data
- Tabs: Overview, Contacts, Exposures, Activity
- Contacts with email/phone reveal (credit system)
- Actions: Add to Watchlist, Start Campaign, Push to CRM

### 11.6 Watchlist

**Route:** `/watchlist`  
**Access:** Sales Rep (own), Sales Admin (all)

**Features:**
- Add from Ransom Hub, Live Search, Live-Leads, or manual
- Periodic monitoring for new exposures
- "New in last X days" flag (7/30/90)
- Email notification option
- Filters: New exposures window, geography, industry, size

### 11.7 Snapshot Scan

**Route:** `/snapshot-scan`  
**Access:** Sales Rep, Sales Admin

**Features:**
- CSV upload or manual multi-domain input
- Batch exposure checks (token per domain)
- Results table with exposure summary
- Actions: Convert to Lead, Add to Watchlist, Export

### 11.8 AI Agents (Campaigns)

**Route:** `/ai-agents`  
**Access:** Sales Rep (own), Sales Admin (all)

**Campaign Wizard Steps:**
1. Basic Info - Name, description
2. Audience Selection - From Live-Leads or Watchlist with filters
3. Cadence Selection - Choose cadence, configure sending window
4. Review & Launch - Preview AI-generated emails, approve

**Features:**
- AI personalization using exposure context
- Human approval before sending (configurable)
- Step-based cadence execution
- Tracking: Emails sent, opens/clicks (Phase 2)

### 11.9 Scripts & Cadences

**Route:** `/scripts-cadences`  
**Access:** Sales Rep (personal + platform), Sales Admin (all)

**Script Types:**
- Cold call, Cold email, Follow-up email
- Post-scan email, Renewal email, Event follow-up
- LinkedIn message

**Scope Levels:**
- Platform (CyberHook provided)
- Global (company-wide, admin created)
- Personal (user's own)

### 11.10 Events & Conferences

**Route:** `/events`  
**Access:** Sales Rep, Sales Admin

**Features:**
- Calendar and list views
- System events (curated industry events)
- Custom events (meetings, appointments)
- Link events to leads
- "Appointment/meeting" type counted for reporting

### 11.11 Reporting

**Route:** `/reporting`  
**Access:** Sales Rep (own), Sales Admin (team)

**Metrics:**
- Live Searches count
- Snapshot Scan domains processed
- Emails sent via AI Agents
- Appointments count
- Calls logged
- Events attended

**Views:**
- My Performance - User stats vs targets
- Team Performance (Admin) - Per-user breakdown with export

### 11.12 Settings

**Route:** `/settings`  
**Access:** Sales Admin only

**Sub-pages:**
- `/settings/profile` - Company info, targets
- `/settings/users` - Invite, manage, change roles
- `/settings/integrations` - Connect Outlook, CRM, ConnectWise
- `/settings/audit-log` - Event log with filters

### 11.13 Billing & Usage

**Route:** `/billing`  
**Access:** Sales Admin (full), Billing User (read-only)

**Features:**
- Current plan display with upgrade option (admin)
- Token usage meter with reset date
- Usage history chart
- Payment method (update for admin)
- Invoice list with PDF download

---

## 12. STATE MANAGEMENT

### 12.1 Server State (Convex)

All data fetching uses Convex reactive queries:

```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const leads = useQuery(api.leads.queries.list, { companyId, status: 'new' });
const createLead = useMutation(api.leads.mutations.create);
```

### 12.2 Client State (React)

Use React hooks for UI state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [filters, setFilters] = useState<FilterState>({});

// React Hook Form for forms
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

### 12.3 URL State

Use URL params for shareable state:

```typescript
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const status = searchParams.get('status') || 'all';
const page = parseInt(searchParams.get('page') || '1');
```

---

## 13. API & BACKEND FUNCTIONS

### 13.1 Token Consumption Example

```typescript
// convex/searches/mutations.ts
export const runSearch = mutation({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await getUser(ctx, identity.subject);
    const company = await ctx.db.get(user.companyId);
    
    // Check token balance
    const tokensRemaining = company.tokenAllocation - company.tokensUsed;
    if (tokensRemaining < 1) {
      throw new Error('Insufficient tokens');
    }
    
    // Deduct token
    await ctx.db.patch(company._id, {
      tokensUsed: company.tokensUsed + 1,
    });
    
    // Log search
    const searchId = await ctx.db.insert('searches', {
      companyId: user.companyId,
      userId: user._id,
      searchType: 'live_search',
      input: args.domain,
      status: 'pending',
      tokensConsumed: 1,
      createdAt: Date.now(),
    });
    
    return searchId;
  },
});
```

---

## 14. EXTERNAL INTEGRATIONS

### 14.1 Stripe Webhook

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(body, signature, secret);
  
  switch (event.type) {
    case 'customer.subscription.updated':
      await convex.mutation(api.billing.mutations.updateSubscription, {
        stripeCustomerId: event.data.object.customer,
        status: event.data.object.status,
      });
      break;
  }
  
  return new Response('OK');
}
```

### 14.2 Clerk Webhook

```typescript
// app/api/webhooks/clerk/route.ts
export async function POST(req: Request) {
  const evt = wh.verify(payload, headers);
  
  switch (evt.type) {
    case 'user.created':
      await convex.mutation(api.users.mutations.create, {
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
      });
      break;
  }
  
  return new Response('OK');
}
```

---

## 15. COMPONENT LIBRARY

### 15.1 Button Variants

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-neutral-200',
        secondary: 'bg-transparent text-white border border-neutral-700 hover:bg-neutral-800',
        ghost: 'text-neutral-400 hover:text-white hover:bg-neutral-800',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
  }
);
```

### 15.2 Shared Components

**Page Header:**
```typescript
export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
```

**Empty State:**
```typescript
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-neutral-600">{icon}</div>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mt-1 text-sm text-neutral-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

**Status Badge:**
```typescript
const statusColors = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  qualified: 'bg-green-500/10 text-green-400 border-green-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-400 border-red-500/20',
};
```

---

## APPENDIX A: ENVIRONMENT VARIABLES

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=xxx

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# External APIs (TBD)
EXPOSURE_API_KEY=xxx
RANSOMWARE_LIVE_API_KEY=xxx
```

---

## APPENDIX B: IMPLEMENTATION PRIORITY

**Phase 1 - Foundation:**
1. Project setup & configuration
2. Authentication (Clerk) & middleware
3. Database schema (Convex)
4. Onboarding flow
5. Dashboard layout & navigation
6. News (Home) page

**Phase 2 - Core Features:**
7. Live Search
8. Live-Leads
9. Watchlist
10. Ransom Hub
11. To-Do List

**Phase 3 - Automation:**
12. AI Agents (Campaigns)
13. Scripts & Cadences
14. Snapshot Scan

**Phase 4 - Supporting:**
15. Events
16. Reporting
17. Settings
18. Billing

---

## END OF ARCHITECTURE DOCUMENT

This document serves as the complete blueprint for building CyberHook. Follow this guide sequentially for best results.
