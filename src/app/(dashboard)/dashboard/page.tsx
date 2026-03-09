"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { MetricsChart04, MetricsIcon04 } from "@/components/application/metrics/metrics";

// ─── Data ────────────────────────────────────────────────────────────────────

const newsArticles = [
    {
        title: "Critical Zero-Day in FortiGate Firewalls Exploited",
        source: "SecurityWeek",
        time: "2h ago",
        severity: "Critical",
        severityColor: "error" as const,
    },
    {
        title: "Ransomware Group 'BlackCat' Targets Healthcare Sector",
        source: "DarkReading",
        time: "4h ago",
        severity: "High",
        severityColor: "error" as const,
    },
    {
        title: "NIST Releases Updated Cybersecurity Framework 2.1",
        source: "NIST.gov",
        time: "6h ago",
        severity: "Info",
        severityColor: "success" as const,
    },
    {
        title: "Record $4.5M Average Cost of Data Breach in 2025",
        source: "IBM",
        time: "12h ago",
        severity: "Medium",
        severityColor: "warning" as const,
    },
    {
        title: "New SEC Disclosure Rules Take Effect Next Month",
        source: "Reuters",
        time: "1d ago",
        severity: "Info",
        severityColor: "success" as const,
    },
];

const recentSearches = [
    { domain: "acmecorp.com", exposures: 7, date: "Mar 7, 2026", status: "Complete" },
    { domain: "globallogistics.com", exposures: 12, date: "Mar 6, 2026", status: "Complete" },
    { domain: "techforward.io", exposures: 3, date: "Mar 5, 2026", status: "Complete" },
    { domain: "securehealth.org", exposures: 0, date: "Mar 4, 2026", status: "Clean" },
    { domain: "finserve.com", exposures: 5, date: "Mar 3, 2026", status: "Complete" },
    { domain: "nexgenhealth.com", exposures: 8, date: "Mar 2, 2026", status: "Complete" },
    { domain: "vaultpay.io", exposures: 2, date: "Mar 1, 2026", status: "Complete" },
    { domain: "ironclad-mfg.com", exposures: 15, date: "Feb 28, 2026", status: "Complete" },
    { domain: "cloudpeak.dev", exposures: 0, date: "Feb 27, 2026", status: "Clean" },
];

const tasks = [
    { label: "Follow up with Acme Corp", due: "Due today", priority: "High", priorityColor: "text-error-600", dotColor: "bg-error-500", done: false },
    { label: "Send proposal to TechNexus", due: "Due today", priority: "Medium", priorityColor: "text-warning-600", dotColor: "bg-warning-500", done: false },
    { label: "Review Q4 pipeline report", due: "Completed", priority: "", priorityColor: "", dotColor: "", done: true },
    { label: "Schedule demo with GlobalLogistics", due: "Due tomorrow", priority: "Low", priorityColor: "text-success-600", dotColor: "bg-success-500", done: false },
];

const quickActions = [
    { label: "New Live Search", href: "/live-search", icon: SearchLg },
    { label: "Launch Campaign", href: "/ai-agents/new", icon: Mail01 },
    { label: "Generate Report", href: "/reporting", icon: BarChartSquare02 },
    { label: "Schedule Event", href: "/events", icon: Calendar },
];

const upcomingEvents = [
    { name: "Channel Partners Conference", location: "Las Vegas", dates: "Mar 15–17" },
    { name: "RSAC 2026", location: "San Francisco", dates: "Apr 28–May 1" },
    { name: "MSP Summit East", location: "Orlando", dates: "May 12–14" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [tasksDone, setTasksDone] = useState<Record<string, boolean>>(
        Object.fromEntries(tasks.map((t) => [t.label, t.done]))
    );
    const toggleTask = (label: string) => setTasksDone((prev) => ({ ...prev, [label]: !prev[label] }));
    return (
        <div className="pt-8 pb-12 w-full">
            <div className="flex flex-col gap-8">

                {/* ── 1. Greeting ──────────────────────────── */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">
                            Welcome back, Liron 👋
                        </h1>
                        <p className="text-md text-secondary">
                            Here&apos;s what&apos;s happening with your pipeline today.
                        </p>
                        <p className="text-sm text-tertiary">Saturday, March 8, 2026</p>
                    </div>
                </div>

                {/* ── 2. KPI Tiles ─────────────────────────── */}
                <div className="grid grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:px-8">
                    <MetricsChart04
                        title="842"
                        subtitle="Token Balance"
                        change="84%"
                        changeTrend="positive"
                        changeDescription="of 1,000 remaining"
                    />
                    <MetricsChart04
                        title="1,204"
                        subtitle="Live-Leads"
                        change="23"
                        changeTrend="positive"
                        changeDescription="new this week"
                    />
                    <MetricsChart04
                        title="5"
                        subtitle="Active Campaigns"
                        change="3"
                        changeTrend="negative"
                        changeDescription="awaiting approval"
                    />
                    <MetricsChart04
                        title="12"
                        subtitle="Watchlist Alerts"
                        change="4"
                        changeTrend="negative"
                        changeDescription="critical"
                    />
                </div>

                {/* ── 3. Two-Column Layout ─────────────────── */}
                <div className="grid grid-cols-1 gap-8 px-4 lg:grid-cols-5 lg:px-8">

                    {/* ── LEFT COLUMN (3/5 ≈ 60%) ─────────── */}
                    <div className="lg:col-span-3 flex flex-col gap-8">

                        {/* News Feed */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Globe01 className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Cyber News Feed</h2>
                                </div>
                                <Link href="/news" className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-secondary">
                                {newsArticles.map((article) => (
                                    <div
                                        key={article.title}
                                        className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-secondary_alt transition-colors"
                                    >
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-sm font-semibold text-primary line-clamp-1">
                                                {article.title}
                                            </span>
                                            <span className="text-xs text-tertiary">
                                                {article.source} &middot; {article.time}
                                            </span>
                                        </div>
                                        <Badge color={article.severityColor} size="sm">
                                            {article.severity}
                                        </Badge>
                                    </div>
                                ))}
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
                                        {recentSearches.map((row) => (
                                            <tr key={row.domain} className="hover:bg-secondary_alt transition-colors">
                                                <td className="px-5 py-3 font-medium text-primary">{row.domain}</td>
                                                <td className="px-5 py-3 text-tertiary">{row.exposures}</td>
                                                <td className="px-5 py-3 text-tertiary whitespace-nowrap">{row.date}</td>
                                                <td className="px-5 py-3">
                                                    {row.status === "Clean" ? (
                                                        <span className="inline-flex items-center gap-1 text-success-600 font-medium">
                                                            Clean <CheckCircle className="h-4 w-4" />
                                                        </span>
                                                    ) : (
                                                        <Badge color="gray" size="sm">{row.status}</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN (2/5 ≈ 40%) ────────── */}
                    <div className="lg:col-span-2 flex flex-col gap-8">

                        {/* Today's Tasks */}
                        <div className="rounded-xl border border-secondary bg-primary shadow-xs">
                            <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Target05 className="h-5 w-5 text-tertiary" />
                                    <h2 className="text-lg font-semibold text-primary">Today&apos;s Tasks</h2>
                                    <Badge color="brand" size="sm">4</Badge>
                                </div>
                            </div>
                            <div className="divide-y divide-secondary">
                                {tasks.map((task) => {
                                    const isDone = tasksDone[task.label] ?? task.done;
                                    return (
                                    <div key={task.label} className="flex items-start gap-3 px-5 py-4">
                                        <button type="button" className="mt-0.5 cursor-pointer" onClick={() => toggleTask(task.label)}>
                                            {isDone ? (
                                                <CheckCircle className="h-5 w-5 text-success-500" />
                                            ) : (
                                                <div className="h-5 w-5 rounded-md border-2 border-secondary hover:border-brand-500 transition-colors" />
                                            )}
                                        </button>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className={`text-sm font-medium ${isDone ? "line-through text-tertiary" : "text-primary"}`}>
                                                {task.label}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-tertiary">
                                                <span>{task.due}</span>
                                                {task.priority && (
                                                    <span className={`flex items-center gap-1 font-medium ${task.priorityColor}`}>
                                                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${task.dotColor}`} />
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
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
                                    <Badge color="brand" size="sm">3</Badge>
                                </div>
                            </div>
                            <div className="divide-y divide-secondary">
                                {upcomingEvents.map((event) => (
                                    <div key={event.name} className="flex items-start gap-3 px-5 py-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                                            <Calendar className="h-4 w-4 text-brand-600" />
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-sm font-semibold text-primary">{event.name}</span>
                                            <span className="text-xs text-tertiary">
                                                {event.location} &middot; {event.dates}
                                            </span>
                                        </div>
                                    </div>
                                ))}
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
                <div className="grid grid-cols-1 gap-5 px-4 sm:grid-cols-3 lg:px-8">
                    <MetricsIcon04
                        icon={SearchLg}
                        title="158"
                        subtitle="Searches This Month"
                        change="18%"
                        changeTrend="positive"
                    />
                    <MetricsIcon04
                        icon={Mail01}
                        title="2,340"
                        subtitle="Emails Sent This Month"
                        change="24%"
                        changeTrend="positive"
                    />
                    <MetricsIcon04
                        icon={Target05}
                        title="$1.2M"
                        subtitle="Pipeline Value"
                        change="22%"
                        changeTrend="positive"
                    />
                </div>
            </div>
        </div>
    );
}
