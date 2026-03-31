"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
    SearchLg,
    Target05,
    Mail01,
    Calendar,
    BarChartSquare02,
    Globe01,
    ArrowRight,
    ChevronRight,
    CheckCircle,
    Loading02,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { MetricsChart04, MetricsIcon04 } from "@/components/application/metrics/metrics";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "1d ago";
    return `${days}d ago`;
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatEventDates(startDate: number, endDate?: number): string {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!endDate) return startStr;
    const end = new Date(endDate);
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr}–${endStr}`;
}

function getPriorityStyles(priority: string): { color: string; dotColor: string } {
    switch (priority) {
        case "high":
            return { color: "text-error-600", dotColor: "bg-error-500" };
        case "medium":
            return { color: "text-warning-600", dotColor: "bg-warning-500" };
        case "low":
            return { color: "text-success-600", dotColor: "bg-success-500" };
        default:
            return { color: "text-tertiary", dotColor: "bg-gray-400" };
    }
}

function getIncidentSeverity(incidentType: string): { label: string; color: "error" | "warning" | "success" } {
    if (incidentType === "ransomware") {
        return { label: "Critical", color: "error" };
    }
    return { label: "Breach", color: "warning" };
}

const quickActions = [
    { label: "New Live Search", href: "/live-search", icon: SearchLg },
    { label: "Launch Campaign", href: "/ai-agents/new", icon: Mail01 },
    { label: "Generate Report", href: "/reporting", icon: BarChartSquare02 },
    { label: "Schedule Event", href: "/events", icon: Calendar },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const {
        user,
        isLoading,
        kpis,
        recentSearches,
        todaysTasks,
        upcomingEvents,
        recentIncidents,
        tasksStats,
        leadsStats,
    } = useDashboardData();

    const { companyId } = useCurrentUser();

    const searchStats = useQuery(
        api.searches.getStats,
        companyId ? { companyId } : "skip"
    );
    const campaignStats = useQuery(
        api.campaigns.getStats,
        companyId ? { companyId } : "skip"
    );

    const bottomStatsLoading =
        searchStats === undefined || campaignStats === undefined;

    const searchesThisMonthTitle = bottomStatsLoading
        ? "—"
        : (searchStats.last30Days ?? 0).toLocaleString();
    const searchesChange = bottomStatsLoading
        ? "…"
        : `${(searchStats?.last7Days ?? 0).toLocaleString()} in last 7 days`;

    const emailsSentTitle = bottomStatsLoading
        ? "—"
        : (campaignStats?.totalEmailsSent ?? 0).toLocaleString();
    const emailsSentChange = bottomStatsLoading
        ? "…"
        : (campaignStats?.totalEmailsSent ?? 0) === 0
          ? "No sends recorded yet"
          : "Total across campaigns";

    const pipelineTitle = bottomStatsLoading
        ? "—"
        : (leadsStats?.total ?? 0).toLocaleString();
    const pipelineChange = bottomStatsLoading
        ? "…"
        : "Live leads (no $ pipeline yet)";

    const completeTask = useMutation(api.tasks.complete);
    const reopenTask = useMutation(api.tasks.reopen);

    const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

    const toggleTask = async (taskId: Id<"tasks">, currentStatus: string) => {
        setCompletingTasks((prev) => new Set(prev).add(taskId));
        try {
            if (currentStatus === "completed") {
                await reopenTask({ id: taskId });
            } else {
                await completeTask({ id: taskId });
            }
        } finally {
            setCompletingTasks((prev) => {
                const next = new Set(prev);
                next.delete(taskId);
                return next;
            });
        }
    };

    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    const greeting = useMemo(() => {
        if (!user) return "Welcome back";
        return `Welcome back, ${user.firstName}`;
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }
    return (
        <div className="pt-6 pb-8 w-full sm:pt-8 sm:pb-12">
            <div className="flex flex-col gap-8">

                {/* ── 1. Greeting ──────────────────────────── */}
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-xs font-semibold text-primary sm:text-display-sm">
                            {greeting} 👋
                        </h1>
                        <p className="text-md text-secondary">
                            Here&apos;s what&apos;s happening with your pipeline today.
                        </p>
                        <p className="text-sm text-tertiary">{currentDate}</p>
                    </div>
                </div>

                {/* ── 2. KPI Tiles ─────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-5 sm:px-6 lg:grid-cols-4 lg:gap-6 lg:px-8">
                    <MetricsChart04
                        title={kpis.tokenBalance.value?.toLocaleString() ?? "0"}
                        subtitle="Token Balance"
                        change={kpis.tokenBalance.total ? `${Math.round((kpis.tokenBalance.value ?? 0) / kpis.tokenBalance.total * 100)}%` : "0%"}
                        changeTrend={kpis.tokenBalance.status === "critical" || kpis.tokenBalance.status === "warning" ? "negative" : "positive"}
                        changeDescription={`of ${kpis.tokenBalance.total?.toLocaleString() ?? 0} remaining`}
                    />
                    <MetricsChart04
                        title={kpis.liveLeads.value.toLocaleString()}
                        subtitle="Live-Leads"
                        change={kpis.liveLeads.newThisWeek.toString()}
                        changeTrend="positive"
                        changeDescription="new this week"
                    />
                    <MetricsChart04
                        title={kpis.activeCampaigns.value.toString()}
                        subtitle="Active Campaigns"
                        change="0"
                        changeTrend="positive"
                        changeDescription="awaiting approval"
                    />
                    <MetricsChart04
                        title={kpis.watchlistAlerts.value.toString()}
                        subtitle="Watchlist Alerts"
                        change={kpis.watchlistAlerts.total.toString()}
                        changeTrend={kpis.watchlistAlerts.value > 0 ? "negative" : "positive"}
                        changeDescription="total monitored"
                    />
                </div>

                {/* ── 3. Two-Column Layout ─────────────────── */}
                <div className="grid grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-5 md:gap-6 lg:gap-8 lg:px-8">

                    {/* ── LEFT COLUMN (3/5 ≈ 60%) ─────────── */}
                    <div className="md:col-span-3 flex flex-col gap-6 lg:gap-8">

                        {/* News Feed - Ransom Incidents */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Globe01 className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Cyber News Feed</h2>
                                </div>
                                <Link href="/ransom-hub" className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-secondary">
                                {recentIncidents.length === 0 ? (
                                    <div className="px-5 py-8 text-center text-sm text-tertiary">
                                        No recent incidents to display
                                    </div>
                                ) : (
                                    recentIncidents.slice(0, 5).map((incident) => {
                                        const severity = getIncidentSeverity(incident.incidentType);
                                        return (
                                            <div
                                                key={incident._id}
                                                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-secondary_alt transition-colors"
                                            >
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-sm font-semibold text-primary line-clamp-1">
                                                        {incident.companyName} - {incident.ransomwareGroup || incident.incidentType}
                                                    </span>
                                                    <span className="text-xs text-tertiary">
                                                        {incident.industry || "Unknown"} &middot; {formatRelativeTime(incident.attackDate)}
                                                    </span>
                                                </div>
                                                <Badge color={severity.color} size="sm">
                                                    {severity.label}
                                                </Badge>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Recent Searches */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <SearchLg className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Recent Searches</h2>
                                </div>
                                <Link href="/live-search" className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors">
                                    View All
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-secondary bg-secondary_subtle">
                                            <th className="px-5 py-3 text-xs font-medium text-tertiary">Domain</th>
                                            <th className="px-5 py-3 text-xs font-medium text-tertiary">Exposures Found</th>
                                            <th className="px-5 py-3 text-xs font-medium text-tertiary">Date</th>
                                            <th className="px-5 py-3 text-xs font-medium text-tertiary">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary">
                                        {recentSearches.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-8 text-center text-sm text-tertiary">
                                                    No searches yet. Start by searching a domain.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentSearches.map((search) => (
                                                <tr key={search._id} className="hover:bg-secondary_alt transition-colors">
                                                    <td className="px-5 py-3 font-medium text-primary">{search.domain}</td>
                                                    <td className="px-5 py-3 text-tertiary">{search.totalExposures ?? 0}</td>
                                                    <td className="px-5 py-3 text-tertiary whitespace-nowrap">{formatDate(search.createdAt)}</td>
                                                    <td className="px-5 py-3">
                                                        {search.status === "success" && (search.totalExposures ?? 0) === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-success-600 font-medium">
                                                                Clean <CheckCircle className="h-4 w-4" />
                                                            </span>
                                                        ) : search.status === "failed" ? (
                                                            <Badge color="error" size="sm">Failed</Badge>
                                                        ) : search.status === "pending" ? (
                                                            <Badge color="warning" size="sm">Pending</Badge>
                                                        ) : (
                                                            <Badge color="gray" size="sm">Complete</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN (2/5 ≈ 40%) ────────── */}
                    <div className="md:col-span-2 flex flex-col gap-6 lg:gap-8">

                        {/* Today's Tasks */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Target05 className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Today&apos;s Tasks</h2>
                                    <Badge color="brand" size="sm">{tasksStats?.dueToday ?? 0}</Badge>
                                </div>
                                <Link href="/to-do-list" className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-secondary">
                                {todaysTasks.length === 0 ? (
                                    <div className="px-5 py-8 text-center text-sm text-tertiary">
                                        No tasks due today. Great job! 🎉
                                    </div>
                                ) : (
                                    todaysTasks.map((task) => {
                                        const isDone = task.status === "completed";
                                        const isCompleting = completingTasks.has(task._id);
                                        const priorityStyles = getPriorityStyles(task.priority);
                                        return (
                                            <div key={task._id} className="flex items-start gap-3 px-5 py-4">
                                                <button 
                                                    type="button" 
                                                    className="mt-0.5 cursor-pointer disabled:opacity-50" 
                                                    onClick={() => toggleTask(task._id, task.status)}
                                                    disabled={isCompleting}
                                                >
                                                    {isCompleting ? (
                                                        <Loading02 className="h-5 w-5 animate-spin text-brand-500" />
                                                    ) : isDone ? (
                                                        <CheckCircle className="h-5 w-5 text-success-500" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-md border-2 border-secondary hover:border-brand-500 transition-colors" />
                                                    )}
                                                </button>
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className={`text-sm font-medium ${isDone ? "line-through text-tertiary" : "text-primary"}`}>
                                                        {task.title}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-xs text-tertiary">
                                                        <span>Due today</span>
                                                        <span className={`flex items-center gap-1 font-medium ${priorityStyles.color}`}>
                                                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${priorityStyles.dotColor}`} />
                                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <h2 className="text-lg font-semibold text-primary">Quick Actions</h2>
                            </div>
                            <div className="flex flex-col gap-2 p-4">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action.label}
                                        href={action.href}
                                        color="secondary"
                                        size="md"
                                        iconLeading={action.icon}
                                        iconTrailing={ChevronRight}
                                        className="w-full justify-between"
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Upcoming Events</h2>
                                    <Badge color="brand" size="sm">{upcomingEvents.length}</Badge>
                                </div>
                            </div>
                            <div className="divide-y divide-secondary">
                                {upcomingEvents.length === 0 ? (
                                    <div className="px-5 py-8 text-center text-sm text-tertiary">
                                        No upcoming events scheduled
                                    </div>
                                ) : (
                                    upcomingEvents.map((event) => (
                                        <div key={event._id} className="flex items-start gap-3 px-5 py-4">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                                                <Calendar className="h-4 w-4 text-brand-600" />
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-sm font-semibold text-primary">{event.title}</span>
                                                <span className="text-xs text-tertiary">
                                                    {event.location || (event.isVirtual ? "Virtual" : "TBD")} &middot; {formatEventDates(event.startDate, event.endDate)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="border-t border-secondary px-5 py-3 text-center">
                                <Link
                                    href="/events"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                                >
                                    View All Events
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 4. Bottom Quick Stats ─────────────────── */}
                <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:gap-5 sm:px-6 lg:px-8">
                    <MetricsIcon04
                        icon={SearchLg}
                        title={searchesThisMonthTitle}
                        subtitle="Searches (last 30 days)"
                        change={searchesChange}
                        changeTrend="positive"
                    />
                    <MetricsIcon04
                        icon={Mail01}
                        title={emailsSentTitle}
                        subtitle="Emails Sent (campaigns)"
                        change={emailsSentChange}
                        changeTrend={
                            bottomStatsLoading
                                ? "positive"
                                : (campaignStats?.totalEmailsSent ?? 0) > 0
                                  ? "positive"
                                  : "negative"
                        }
                    />
                    <MetricsIcon04
                        icon={Target05}
                        title={pipelineTitle}
                        subtitle="Pipeline Value"
                        change={pipelineChange}
                        changeTrend={
                            bottomStatsLoading
                                ? "positive"
                                : (leadsStats?.total ?? 0) > 0
                                  ? "positive"
                                  : "negative"
                        }
                    />
                </div>
            </div>
        </div>
    );
}
