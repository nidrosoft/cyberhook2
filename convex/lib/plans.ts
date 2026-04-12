// ─── Server-side plan entitlements (Convex backend) ─────────────────────────
// Must stay in sync with src/lib/plans.ts

export type PlanTier = "solo" | "growth" | "scale";

export interface PlanLimits {
  maxUsers: number;
  searchesPerMonth: number;
  reportsPerMonth: number; // -1 = unlimited
  watchlistDomains: number;
  aiAgents: boolean;
  integrations: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  solo: {
    maxUsers: 1,
    searchesPerMonth: 250,
    reportsPerMonth: 25,
    watchlistDomains: 3,
    aiAgents: false,
    integrations: false,
  },
  growth: {
    maxUsers: 3,
    searchesPerMonth: 1000,
    reportsPerMonth: 100,
    watchlistDomains: 10,
    aiAgents: true,
    integrations: true,
  },
  scale: {
    maxUsers: 10,
    searchesPerMonth: 5000,
    reportsPerMonth: -1,
    watchlistDomains: 25,
    aiAgents: true,
    integrations: true,
  },
};

export const DEFAULT_PLAN: PlanTier = "growth";

export function getPlanLimits(planId: string | undefined | null): PlanLimits {
  if (planId && planId in PLAN_LIMITS) return PLAN_LIMITS[planId as PlanTier];
  return PLAN_LIMITS[DEFAULT_PLAN];
}

export function getTokenAllocationForPlan(planId: PlanTier): number {
  return PLAN_LIMITS[planId].searchesPerMonth;
}
