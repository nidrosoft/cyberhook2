"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "./use-current-user";
import { useCompany } from "./use-company";

export function useDashboardData() {
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();
    const { 
        tokensRemaining, 
        tokenAllocation, 
        tokenStatus,
        isLoading: isCompanyLoading 
    } = useCompany();

    // Fetch leads stats
    const leadsStats = useQuery(
        api.leads.getStats,
        companyId ? { companyId } : "skip"
    );

    // Fetch watchlist stats
    const watchlistStats = useQuery(
        api.watchlist.getStats,
        companyId ? { companyId } : "skip"
    );

    // Fetch tasks stats
    const tasksStats = useQuery(
        api.tasks.getStats,
        companyId ? { companyId, userId: user?._id } : "skip"
    );

    // Fetch recent searches
    const recentSearches = useQuery(
        api.searches.getRecent,
        companyId ? { companyId, limit: 5 } : "skip"
    );

    // Fetch today's tasks
    const todaysTasks = useQuery(
        api.tasks.getDueToday,
        companyId ? { companyId, userId: user?._id } : "skip"
    );

    // Fetch overdue tasks
    const overdueTasks = useQuery(
        api.tasks.getOverdue,
        companyId ? { companyId, userId: user?._id } : "skip"
    );

    // Fetch upcoming tasks (next 3 days)
    const upcomingTasks = useQuery(
        api.tasks.getUpcoming,
        companyId ? { companyId, userId: user?._id, days: 3 } : "skip"
    );

    // Fetch upcoming events
    const upcomingEvents = useQuery(
        api.events.getUpcoming,
        companyId ? { companyId, userId: user?._id, limit: 5 } : "skip"
    );

    // Fetch recent ransom incidents for news feed
    const recentIncidents = useQuery(
        api.ransomHub.getRecent,
        { limit: 10 }
    );

    const isLoading = 
        isUserLoading || 
        isCompanyLoading || 
        leadsStats === undefined ||
        watchlistStats === undefined ||
        tasksStats === undefined;

    // KPI data
    const kpis = {
        tokenBalance: {
            value: tokensRemaining,
            total: tokenAllocation,
            status: tokenStatus,
        },
        liveLeads: {
            value: leadsStats?.total ?? 0,
            newThisWeek: leadsStats?.newThisWeek ?? 0,
        },
        activeCampaigns: {
            value: 0, // TODO: Add campaigns query
        },
        watchlistAlerts: {
            value: watchlistStats?.withAlerts ?? 0,
            total: watchlistStats?.total ?? 0,
        },
    };

    return {
        user,
        isLoading,
        kpis,
        recentSearches: recentSearches ?? [],
        todaysTasks: todaysTasks ?? [],
        overdueTasks: overdueTasks ?? [],
        upcomingTasks: upcomingTasks ?? [],
        upcomingEvents: upcomingEvents ?? [],
        recentIncidents: recentIncidents ?? [],
        tasksStats,
        leadsStats,
        watchlistStats,
    };
}
