/**
 * Phase 10 — Guided Onboarding tour configuration.
 *
 * Defines the ordered list of sections the tour visits, the targets within
 * each, and the route the user should be on when each section runs.
 *
 * Targets reference stable `[data-tour="..."]` attributes that are sprinkled
 * across the pages, plus `[data-walkthrough="nav-..."]` attributes attached
 * to the sidebar nav items themselves. Using attributes (not class names)
 * means we won't regress if Tailwind classes change.
 *
 * A "section" may have a route-level intro step (target: undefined) which
 * renders as a centred modal — useful for welcoming the user to a brand-new
 * page before highlighting individual elements.
 *
 * The custom Spotlight + Tooltip pair (see `components/walkthrough/`) is
 * driven entirely from this config.
 */

import type { FC, SVGProps } from "react";
import {
    BarChartSquare02,
    Calendar,
    CheckDone01,
    Compass03,
    Database01,
    File04,
    Mail01,
    PieChart03,
    SearchLg,
    Settings01,
    Shield01,
    Star01,
    Target05,
    Users01,
} from "@untitledui/icons";

export interface TourStep {
    /**
     * CSS selector to highlight. Omit for a centred "intro" modal at the
     * start of a section.
     */
    target?: string;
    /** Step heading shown next to the icon. */
    title: string;
    /** Body copy. */
    description: string;
    /**
     * Where the popover should appear relative to the target. Defaults
     * to "right" for sidebar items and "bottom" otherwise.
     */
    side?: "top" | "right" | "bottom" | "left" | "center";
    /** Bullet list rendered under the description (4-6 items max). */
    highlights?: string[];
    /** Single highlighted "pro tip" rendered in a brand-coloured callout. */
    tip?: string;
}

export interface TourSection {
    /** Stable id used as the key in `completedSections`. */
    id: string;
    /** Human-readable label shown in the Getting Started checklist. */
    label: string;
    /** Lucide-style icon component shown in the tooltip header. */
    icon: FC<SVGProps<SVGSVGElement>>;
    /** Route the user must be on for this section's steps. */
    route: string;
    /** Steps to walk through inside this section. */
    steps: TourStep[];
}

/**
 * The full tour. Order matters — `getNextSection()` walks this array.
 * Each section starts with a sidebar-item step so the user can mentally
 * map "this navigation entry" → "this feature", then drills into the
 * actual content of the page (Protectron-style nav-first walkthrough).
 */
export const TOUR_SECTIONS: TourSection[] = [
    // 1. News / Dashboard ───────────────────────────────────────────────────
    {
        id: "dashboard",
        label: "News & Dashboard",
        icon: BarChartSquare02,
        route: "/dashboard",
        steps: [
            {
                title: "Welcome to CyberHook AI",
                description:
                    "Let's take a quick tour. We'll visit each major section so you know exactly where to find everything. You can skip or restart this tour anytime from the avatar menu.",
                side: "center",
            },
            {
                target: '[data-walkthrough="nav-dashboard"]',
                title: "Dashboard",
                description:
                    "Your daily briefing — pipeline health, breach signals, and a feed of relevant security news. This is your home base.",
                side: "right",
                highlights: [
                    "Personalised greeting and daily KPIs",
                    "Live ransomware feed at a glance",
                    "Tasks and quick-launch actions",
                ],
            },
            {
                target: '[data-tour="dashboard-greeting"]',
                title: "Daily greeting",
                description: "Every time you sign in you'll land here with a snapshot of pipeline health.",
                side: "bottom",
            },
            {
                target: '[data-tour="dashboard-kpis"]',
                title: "KPI tiles",
                description: "Token balance, Live-Leads, campaigns sent, breach alerts — the four numbers that matter most to your day.",
                side: "bottom",
            },
            {
                target: '[data-tour="dashboard-quick-actions"]',
                title: "Quick actions",
                description: "Launch a search, start a campaign, generate a report, or schedule an event without hunting through the sidebar.",
                side: "top",
                tip: "These shortcuts adapt as you complete onboarding tasks.",
            },
        ],
    },

    // 2. To-Do List ─────────────────────────────────────────────────────────
    {
        id: "todos",
        label: "To-Do List",
        icon: CheckDone01,
        route: "/todos",
        steps: [
            {
                target: '[data-walkthrough="nav-todos"]',
                title: "To-Do List",
                description:
                    "Tasks generated by the platform — follow-ups, expiring leads, ransom alerts — land here alongside anything you create manually.",
                side: "right",
                highlights: ["Auto-generated tasks from breaches & campaigns", "Manual tasks with due dates and priorities", "Deep-links back to the source record"],
            },
            {
                target: '[data-tour="todos-create"]',
                title: "Create a task",
                description: "Add a one-off task with a due date and priority. Tasks tied to a lead, breach, or campaign deep-link back to the source.",
                side: "bottom",
            },
            {
                target: '[data-tour="todos-list"]',
                title: "Stay on top of work",
                description: "Filter by status, priority, and assignee. Completed items archive automatically after 30 days.",
                side: "top",
                tip: "Drag tasks between columns to update status without opening them.",
            },
        ],
    },

    // 3. Ransom Hub ─────────────────────────────────────────────────────────
    {
        id: "ransom-hub",
        label: "Ransom Hub",
        icon: Shield01,
        route: "/ransom-hub",
        steps: [
            {
                target: '[data-walkthrough="nav-ransom-hub"]',
                title: "Ransom Hub",
                description: "Live ransomware victim feed. Spot prospects under active attack and reach out with the right message at the right time.",
                side: "right",
                highlights: ["Real-time data from leak-site monitoring", "Filter by industry, country, and threat group", "One-click promote to Watchlist or Lead"],
            },
            {
                target: '[data-tour="ransom-filters"]',
                title: "Filter the feed",
                description: "Slice by industry, country, ransomware group, and date. Save filters as views you can return to.",
                side: "bottom",
            },
            {
                target: '[data-tour="ransom-table"]',
                title: "Convert victims into leads",
                description: "Each row exposes a Save-to-Watchlist and Save-as-Lead action so you can move from intel to outreach in one click.",
                side: "top",
                tip: "Hover the threat group badge to see the actor's known TTPs.",
            },
        ],
    },

    // 4. Live Search ────────────────────────────────────────────────────────
    {
        id: "live-search",
        label: "Live Search",
        icon: SearchLg,
        route: "/live-search",
        steps: [
            {
                target: '[data-walkthrough="nav-live-search"]',
                title: "Live Search",
                description: "Run an on-demand exposure scan against any domain. We surface breached credentials, leaked data, dark-web mentions, and exposed surfaces.",
                side: "right",
                highlights: ["Multi-source dark-web and breach lookups", "Each scan costs one search token", "Results promote to Live-Leads or Watchlist"],
            },
            {
                target: '[data-tour="live-search-input"]',
                title: "Search any domain",
                description: "Enter a company domain and we'll fan out across multiple data sources. Each scan costs one search token.",
                side: "bottom",
            },
            {
                target: '[data-tour="live-search-results"]',
                title: "Act on findings",
                description: "Once results load you can promote any row to a Live-Lead, attach it to a Watchlist entry, or launch a campaign — all from the actions menu on the right.",
                side: "top",
                tip: "Use the export button to share a redacted PDF with a prospect.",
            },
        ],
    },

    // 5. Live-Leads ─────────────────────────────────────────────────────────
    {
        id: "live-leads",
        label: "Live-Leads",
        icon: Target05,
        route: "/live-leads",
        steps: [
            {
                target: '[data-walkthrough="nav-live-leads"]',
                title: "Live-Leads",
                description: "Your pipeline. Every promoted search, captured prospect, and imported account lives here with full exposure history.",
                side: "right",
                highlights: ["Status pipeline with assignee tracking", "Full exposure timeline per lead", "HubSpot two-way sync if connected"],
            },
            {
                target: '[data-tour="live-leads-table"]',
                title: "Sort, filter, and assign",
                description: "Pin priority leads, assign them to teammates, and watch the status badge as they move through your funnel.",
                side: "top",
                tip: "Click any row to open the slide-over with full breach history.",
            },
        ],
    },

    // 6. Watchlist ──────────────────────────────────────────────────────────
    {
        id: "watchlist",
        label: "Watchlist",
        icon: Star01,
        route: "/watchlist",
        steps: [
            {
                target: '[data-walkthrough="nav-watchlist"]',
                title: "Watchlist",
                description: "Domains you want to monitor passively. We re-scan each one and alert you when a new exposure shows up.",
                side: "right",
                highlights: ["Continuous monitoring on a schedule", "Email + in-app alerts on new findings", "Promote any change to a Live-Lead"],
            },
            {
                target: '[data-tour="watchlist-add"]',
                title: "Add to Watchlist",
                description: "Paste a domain or pick one from an existing lead. We'll start scanning within minutes and notify you on changes.",
                side: "bottom",
            },
            {
                target: '[data-tour="watchlist-table"]',
                title: "See what changed",
                description: "Rows highlight when a new breach lands. Click into any entry for the full exposure timeline.",
                side: "top",
            },
        ],
    },

    // 7. AI Agents ──────────────────────────────────────────────────────────
    {
        id: "ai-agents",
        label: "AI Agents & Campaigns",
        icon: Mail01,
        route: "/ai-agents",
        steps: [
            {
                target: '[data-walkthrough="nav-ai-agents"]',
                title: "AI Agents",
                description: "Send personalised outreach in minutes. Pick recipients, point at a threat signal, and our agent writes the email for you.",
                side: "right",
                highlights: ["Threat-aware copywriting per recipient", "Audience builder pulls from leads + contacts", "Approval flow before sending"],
            },
            {
                target: '[data-tour="ai-agents-new"]',
                title: "Launch a campaign",
                description: "The campaign builder walks you through audience, threat hook, tone, and approval before sending. Drafts are saved automatically.",
                side: "bottom",
            },
            {
                target: '[data-tour="ai-agents-list"]',
                title: "Track sent campaigns",
                description: "Open, click, and reply rates show inline. The three-dots menu has View logs, Duplicate, Pause, and Delete.",
                side: "top",
                tip: "Replies are pulled into a unified inbox so you can respond without context switching.",
            },
        ],
    },

    // 8. Contacts ───────────────────────────────────────────────────────────
    {
        id: "contacts",
        label: "Contacts",
        icon: Users01,
        route: "/contacts",
        steps: [
            {
                target: '[data-walkthrough="nav-contacts"]',
                title: "Contacts",
                description: "Decision-makers you've identified at target companies. Used as recipients in AI campaigns and tracked in HubSpot if synced.",
                side: "right",
                highlights: ["Search by name, company, role, or email", "Bulk-add into a campaign", "CSV import + export"],
            },
            {
                target: '[data-tour="contacts-list"]',
                title: "Search and segment",
                description: "Search by name, company, role, or email. Bulk-select to add into a campaign or export to CSV.",
                side: "top",
            },
        ],
    },

    // 9. Knowledge Base ─────────────────────────────────────────────────────
    {
        id: "knowledge-base",
        label: "Knowledge Base",
        icon: Database01,
        route: "/knowledge-base",
        steps: [
            {
                target: '[data-walkthrough="nav-knowledge-base"]',
                title: "Knowledge Base",
                description:
                    "Drop in your case studies, service descriptions, and battle-cards. The AI agent reads from here when drafting emails so the messaging is always on-brand.",
                side: "right",
                highlights: ["PDF + DOCX upload, plus pasted text", "Documents are chunked and embedded", "Used by the AI agent in real time"],
            },
            {
                target: '[data-tour="kb-add"]',
                title: "Add a document",
                description: "Paste content directly or upload PDFs/DOCX. Documents are chunked and embedded for retrieval in real time.",
                side: "bottom",
                tip: "Tag documents by topic so the agent picks the right context.",
            },
        ],
    },

    // 10. RFP Hub ───────────────────────────────────────────────────────────
    {
        id: "rfp-hub",
        label: "RFP Hub & Certifications",
        icon: File04,
        route: "/rfp-hub",
        steps: [
            {
                target: '[data-walkthrough="nav-rfp-hub"]',
                title: "RFP Hub",
                description: "Centralise your security certifications and respond to RFPs faster. The platform pulls answers from your knowledge base.",
                side: "right",
                highlights: ["Track SOC 2, ISO, CMMC, and more", "Attach certificate files for one-click sharing", "Auto-answer RFPs from your knowledge base"],
            },
            {
                target: '[data-tour="rfp-certifications"]',
                title: "Manage certifications",
                description: "Track SOC 2, ISO, CMMC, and any other framework. Attach the actual certificate file so it's one click away when a prospect asks.",
                side: "top",
            },
        ],
    },

    // 11. Events & Conferences ──────────────────────────────────────────────
    {
        id: "events",
        label: "Events & Conferences",
        icon: Calendar,
        route: "/events",
        steps: [
            {
                target: '[data-walkthrough="nav-events"]',
                title: "Events & Conferences",
                description: "Plan field marketing and track the security events you attend. Admins can also suggest events to the whole team.",
                side: "right",
                highlights: ["Upcoming, Past, and Suggested views", "Team-wide visibility on conferences", "Tasks auto-created for owned events"],
            },
            {
                target: '[data-tour="events-tabs"]',
                title: "Three views",
                description: "Switch between Upcoming, Past, and Suggested. Suggested events come from your admin and show up for everyone on the team.",
                side: "bottom",
            },
        ],
    },

    // 12. Reporting ─────────────────────────────────────────────────────────
    {
        id: "reporting",
        label: "Reporting",
        icon: PieChart03,
        route: "/reporting",
        steps: [
            {
                target: '[data-walkthrough="nav-reporting"]',
                title: "Reporting",
                description: "Generate executive-ready PDFs of your activity: searches run, leads created, campaigns sent, breaches surfaced.",
                side: "right",
                highlights: ["Custom date ranges", "PDF and CSV export", "Branded templates"],
            },
            {
                target: '[data-tour="reporting-generate"]',
                title: "Build a report",
                description: "Pick a date range and the data sets to include. Export as PDF or CSV.",
                side: "bottom",
            },
        ],
    },

    // 13. Settings ──────────────────────────────────────────────────────────
    {
        id: "settings",
        label: "Settings",
        icon: Settings01,
        route: "/settings",
        steps: [
            {
                target: '[data-tour="settings-tabs"]',
                title: "Settings",
                description: "Profile, team, billing, integrations, and notifications all live here. Admins also manage per-user search quotas.",
                side: "bottom",
                highlights: ["Profile and account preferences", "Team and role management (admins)", "Billing, plans, and integrations"],
            },
            {
                title: "You're all set",
                description: "That's the full tour. You can restart it any time from your avatar menu in the top right. Happy hunting!",
                side: "center",
            },
        ],
    },
];

/** Convenience: section ids in order. */
export const TOUR_SECTION_IDS = TOUR_SECTIONS.map((s) => s.id);

export function getSection(id: string): TourSection | undefined {
    return TOUR_SECTIONS.find((s) => s.id === id);
}

export function getSectionIndex(id: string): number {
    return TOUR_SECTIONS.findIndex((s) => s.id === id);
}

export function getNextSection(id: string): TourSection | undefined {
    const idx = getSectionIndex(id);
    if (idx === -1) return undefined;
    return TOUR_SECTIONS[idx + 1];
}

export const TOTAL_SECTIONS = TOUR_SECTIONS.length;

/** Total number of *steps* across all sections — used for progress dots. */
export const TOTAL_STEPS = TOUR_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0);

/** Flatten section/step indices into a single linear cursor. */
export function flattenCursor(sectionIndex: number, stepIndex: number): number {
    let acc = 0;
    for (let i = 0; i < sectionIndex; i += 1) {
        acc += TOUR_SECTIONS[i].steps.length;
    }
    return acc + stepIndex;
}
