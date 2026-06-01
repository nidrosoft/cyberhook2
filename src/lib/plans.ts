// ─── Cyberhook Plan Definitions ──────────────────────────────────────────────
// Single source of truth for plan tiers, limits, and entitlements.
// Used by both frontend (UI gates, upgrade modals) and referenced by backend enforcement.

export type PlanTier = "solo" | "growth" | "scale";

export interface PlanEntitlements {
  id: PlanTier;
  name: string;
  price: number;
  priceLabel: string;
  yearlyPrice: number;
  yearlyPriceLabel: string;
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
  // Stripe price IDs — live keys. Prefer env-driven overrides so a staging
  // environment can swap them without code changes (kept inline as fallback
  // because Convex actions and the React bundle both need to reach them).
  stripePriceId: string;
  stripeYearlyPriceId: string;
  /** Next-tier upgrade target. `null` for the top plan. */
  upgradePath: PlanTier | null;
}

/**
 * Returns the Stripe price ID for a plan, preferring env overrides when
 * present (e.g. `NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY`). Falls back to
 * the inlined live-mode value so existing deployments keep working.
 */
function envOr(envKey: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env?.[envKey]) {
    return process.env[envKey] as string;
  }
  return fallback;
}

export const PLANS: Record<PlanTier, PlanEntitlements> = {
  solo: {
    id: "solo",
    name: "Starter",
    price: 99,
    priceLabel: "$99",
    yearlyPrice: 950,
    yearlyPriceLabel: "$950",
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
    stripePriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_SOLO_MONTHLY",
      "price_1TILtWBs6XEduMNFnbOxNXbH",
    ),
    stripeYearlyPriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_SOLO_YEARLY",
      "price_1TILtWBs6XEduMNFmuGWVEav",
    ),
    upgradePath: "growth",
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 299,
    priceLabel: "$299",
    yearlyPrice: 2870,
    yearlyPriceLabel: "$2,870",
    maxUsers: 3,
    searchesPerMonth: 1000,
    reportsPerMonth: 100,
    watchlistDomains: 10,
    aiAgents: true,
    integrations: true,
    whiteLabel: true,
    tagline: "For teams ready to scale outreach and close more deals",
    marketingDescription: "Everything in Starter, plus:",
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
    // Phase 4: replaced the legacy $199 / $1910 prices that Stripe was
    // returning when "Upgrade to Growth" was clicked. The new IDs below
    // correspond to the documented $299 / $2,870 amounts.
    stripePriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY",
      "price_1TX5UhBs6XEduMNFOA2eAQ3S",
    ),
    stripeYearlyPriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEARLY",
      "price_1TX5UkBs6XEduMNFVjaQeoCJ",
    ),
    upgradePath: "scale",
  },
  scale: {
    id: "scale",
    name: "Enterprise",
    price: 499,
    priceLabel: "$499",
    yearlyPrice: 4790,
    yearlyPriceLabel: "$4,790",
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
    stripePriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY",
      "price_1TILtXBs6XEduMNFxtWYdxHH",
    ),
    stripeYearlyPriceId: envOr(
      "NEXT_PUBLIC_STRIPE_PRICE_SCALE_YEARLY",
      "price_1TILtXBs6XEduMNFY0oTCnSN",
    ),
    upgradePath: null,
  },
};

/**
 * Map a Stripe price ID back to a plan tier. Used by webhook handlers and
 * post-checkout sync code to figure out which plan the customer paid for.
 * Returns `null` if the price isn't one of ours (e.g. legacy/archived).
 */
export function getPlanFromStripePriceId(priceId: string): PlanTier | null {
  for (const tier of PLAN_ORDER) {
    const p = PLANS[tier];
    if (p.stripePriceId === priceId || p.stripeYearlyPriceId === priceId) return tier;
  }
  return null;
}

/**
 * Returns the next-tier plan, or `null` if already on the top tier.
 * Equivalent to looking up `PLANS[current].upgradePath`.
 */
export function getNextPlan(current: PlanTier): PlanEntitlements | null {
  const next = PLANS[current].upgradePath;
  return next ? PLANS[next] : null;
}

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
