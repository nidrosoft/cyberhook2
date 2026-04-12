// ─── Cyberhook Plan Definitions ──────────────────────────────────────────────
// Single source of truth for plan tiers, limits, and entitlements.
// Used by both frontend (UI gates, upgrade modals) and referenced by backend enforcement.

export type PlanTier = "solo" | "growth" | "scale";

export interface PlanEntitlements {
  id: PlanTier;
  name: string;
  price: number;
  priceLabel: string;
  maxUsers: number;
  searchesPerMonth: number;
  reportsPerMonth: number; // -1 = unlimited
  watchlistDomains: number;
  aiAgents: boolean;
  integrations: boolean;
  whiteLabel: boolean;
  tagline: string;
  marketingDescription: string;
  features: string[];
  badge?: string;
  isDefault?: boolean;
}

export const PLANS: Record<PlanTier, PlanEntitlements> = {
  solo: {
    id: "solo",
    name: "Solo",
    price: 99,
    priceLabel: "$99",
    maxUsers: 1,
    searchesPerMonth: 250,
    reportsPerMonth: 25,
    watchlistDomains: 3,
    aiAgents: false,
    integrations: false,
    whiteLabel: true,
    tagline: "For operators getting started with outbound and exposure insights",
    marketingDescription: "No onboarding fees",
    features: [
      "Find and qualify new leads in real-time",
      "Generate branded exposure reports for prospects",
      "Monitor key domains and track risk signals",
      "Built-in knowledge base to support outreach",
      "Ideal for individuals building pipeline",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 299,
    priceLabel: "$299",
    maxUsers: 3,
    searchesPerMonth: 1000,
    reportsPerMonth: 100,
    watchlistDomains: 10,
    aiAgents: true,
    integrations: true,
    whiteLabel: true,
    tagline: "For teams ready to scale outreach and close more deals",
    marketingDescription: "Everything in Solo, plus:",
    badge: "Most Popular",
    isDefault: true,
    features: [
      "AI-powered agents to automate outreach",
      "Advanced reporting to win more clients",
      "CRM & third-party integrations",
      "Expanded search and reporting capacity",
      "Monitor more domains and opportunities",
      "Built for consistent pipeline and deal flow",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    price: 499,
    priceLabel: "$499",
    maxUsers: 10,
    searchesPerMonth: 5000,
    reportsPerMonth: -1, // unlimited
    watchlistDomains: 25,
    aiAgents: true,
    integrations: true,
    whiteLabel: true,
    tagline: "For high-performing teams operating at full capacity",
    marketingDescription: "Everything in Growth, plus:",
    features: [
      "Unlimited reporting for maximum outreach",
      "High-volume search and lead generation",
      "Monitor large portfolios of target domains",
      "Full automation across your sales workflow",
      "Priority access to integrations and features",
      "Designed for aggressive growth and expansion",
    ],
  },
};

export const PLAN_ORDER: PlanTier[] = ["solo", "growth", "scale"];
export const DEFAULT_PLAN: PlanTier = "growth";

export function getPlan(planId: string | undefined | null): PlanEntitlements {
  if (planId && planId in PLANS) return PLANS[planId as PlanTier];
  return PLANS[DEFAULT_PLAN];
}

export function getUpgradeTarget(currentPlan: PlanTier): PlanTier | null {
  if (currentPlan === "solo") return "growth";
  if (currentPlan === "growth") return "scale";
  return null; // scale has no upgrade
}

export function isFeatureGated(planId: PlanTier, feature: "aiAgents" | "integrations"): boolean {
  return !PLANS[planId][feature];
}

export function isUnlimitedReports(planId: PlanTier): boolean {
  return PLANS[planId].reportsPerMonth === -1;
}

export function formatLimit(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString("en-US");
}
