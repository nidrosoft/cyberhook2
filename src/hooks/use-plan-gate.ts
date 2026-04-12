"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getPlan, getUpgradeTarget, type PlanTier } from "@/lib/plans";

export type GatedFeature = "aiAgents" | "integrations";
export type UsageType = "searches" | "reports" | "watchlist";

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isAtLimit: boolean;
  isNearLimit: boolean; // > 80%
}

export function usePlanGate() {
  const usage = useQuery(api.companies.getUsageLimits);

  const isLoading = usage === undefined;
  const planId = (usage?.planId ?? "growth") as PlanTier;
  const plan = getPlan(planId);
  const upgradeTarget = getUpgradeTarget(planId);

  function getUsageInfo(type: UsageType): UsageInfo {
    if (!usage) return { used: 0, limit: 0, remaining: 0, percentage: 0, isAtLimit: false, isNearLimit: false };

    const data = usage[type];
    const used = "used" in data ? data.used : 0;
    const limit = data.limit;

    if (limit === -1) {
      return { used, limit: -1, remaining: -1, percentage: 0, isAtLimit: false, isNearLimit: false };
    }

    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

    return {
      used,
      limit,
      remaining,
      percentage,
      isAtLimit: used >= limit,
      isNearLimit: percentage >= 80,
    };
  }

  function isFeatureGated(feature: GatedFeature): boolean {
    if (!usage) return false;
    if (feature === "aiAgents") return !usage.aiAgents;
    if (feature === "integrations") return !usage.integrations;
    return false;
  }

  function canPerformAction(type: UsageType): boolean {
    const info = getUsageInfo(type);
    if (info.limit === -1) return true;
    return !info.isAtLimit;
  }

  return {
    isLoading,
    planId,
    plan,
    upgradeTarget,
    usage,
    getUsageInfo,
    isFeatureGated,
    canPerformAction,
    // Quick helpers
    searches: getUsageInfo("searches"),
    reports: getUsageInfo("reports"),
    watchlist: getUsageInfo("watchlist"),
    activeUsers: usage?.users?.active ?? 0,
    userLimit: usage?.users?.limit ?? 3,
  };
}
