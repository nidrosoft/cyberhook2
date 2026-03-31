"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import {
    DownloadCloud01,
    FileCheck02,
    Mail01,
    Clock,
    Target04,
    Zap,
    Loading02,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ChartTooltipContent, ChartActiveDot } from "@/components/application/charts/charts-base";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Avatar } from "@/components/base/avatar/avatar";

const dateRangeOptions = [
    { label: "This Month", value: "this-month" },
    { label: "Last 30 Days", value: "last-30" },
    { label: "Last Quarter", value: "last-quarter" },
    { label: "Last Year", value: "last-year" },
    { label: "Custom", value: "custom" },
];

const statusBadgeColor: Record<string, "success" | "warning" | "gray" | "blue"> = {
    active: "success",
    paused: "warning",
    completed: "gray",
    draft: "blue",
};

const LEAD_SOURCE_COLORS = ["#7F56D9", "#12B76A", "#98A2B3"];

function LoadingState({ message = "Loading data..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loading02 className="size-6 text-fg-brand-primary animate-spin" />
            <p className="text-sm text-tertiary">{message}</p>
        </div>
    );
}

function EmptyChartState({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary">{title}</h3>
                <p className="text-sm text-tertiary mt-0.5">{subtitle}</p>
            </div>
            <div className="flex items-center justify-center h-[260px] text-sm text-tertiary">
                Chart data will populate as activity is recorded
            </div>
        </div>
    );
}

function SearchesChart({ searches }: { searches: Array<{ createdAt: number }> }) {
    const chartData = useMemo(() => {
        if (!searches.length) return [];

        const now = new Date();
        const months: { month: string; searches: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
            const label = d.toLocaleDateString("en-US", { month: "short" });
            const count = searches.filter((s) => {
                const ts = s.createdAt;
                return ts >= d.getTime() && ts <= monthEnd.getTime();
            }).length;
            months.push({ month: label, searches: count });
        }
        return months;
    }, [searches]);

    if (!chartData.length || chartData.every((d) => d.searches === 0)) {
        return <EmptyChartState title="Searches Over Time" subtitle="Monthly search volume" />;
    }

    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary">Searches Over Time</h3>
                    <p className="text-sm text-tertiary mt-0.5">Monthly search volume (last 6 months)</p>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#7F56D9" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary, #EAECF0)" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-tertiary, #98A2B3)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-tertiary, #98A2B3)" }} dx={-4} allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--color-border-secondary, #EAECF0)" }} />
                    <Area
                        type="monotone"
                        dataKey="searches"
                        name="Searches"
                        stroke="#7F56D9"
                        strokeWidth={2}
                        fill="url(#searchGradient)"
                        activeDot={<ChartActiveDot />}
                        className="text-utility-brand-600"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function LeadSourcesChart({ leads }: { leads: Array<{ source?: string }> }) {
    const { chartData, total } = useMemo(() => {
        if (!leads.length) return { chartData: [], total: 0 };

        let liveSearch = 0;
        let watchlist = 0;
        let other = 0;

        leads.forEach((l) => {
            const src = l.source ?? "other";
            if (src === "live_search") liveSearch++;
            else if (src === "watchlist") watchlist++;
            else other++;
        });

        return {
            chartData: [
                { name: "Live Search", value: liveSearch },
                { name: "Watchlist", value: watchlist },
                { name: "Other", value: other },
            ].filter((d) => d.value > 0),
            total: leads.length,
        };
    }, [leads]);

    if (!chartData.length) {
        return <EmptyChartState title="Lead Sources" subtitle="No leads recorded yet" />;
    }

    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary">Lead Sources</h3>
                <p className="text-sm text-tertiary mt-0.5">{total.toLocaleString()} total leads</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative shrink-0">
                    <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                                cornerRadius={4}
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={index} fill={LEAD_SOURCE_COLORS[index % LEAD_SOURCE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltipContent isPieChart formatter={(v) => `${v} leads`} />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-display-xs font-bold text-primary">{total.toLocaleString()}</span>
                        <span className="text-xs text-tertiary">Total</span>
                    </div>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                    {chartData.map((d, i) => {
                        const pct = Math.round((d.value / total) * 100);
                        return (
                            <div key={d.name} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEAD_SOURCE_COLORS[i % LEAD_SOURCE_COLORS.length] }} />
                                        <span className="text-sm font-medium text-secondary">{d.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">{d.value}</span>
                                        <span className="text-xs text-tertiary">({pct}%)</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: LEAD_SOURCE_COLORS[i % LEAD_SOURCE_COLORS.length] }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function ReportingPage() {
    const [dateRange, setDateRange] = useState("this-month");
    const [teamSort, setTeamSort] = useState<SortDescriptor>({ column: "searches", direction: "descending" });
    const [campaignSort, setCampaignSort] = useState<SortDescriptor>({ column: "sent", direction: "descending" });
    const [dealSort, setDealSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });
    const [activitySort, setActivitySort] = useState<SortDescriptor>({ column: "metric", direction: "ascending" });

    const { companyId, isLoading: isUserLoading } = useCurrentUser();

    const searchStats = useQuery(
        api.searches.getStats,
        companyId ? { companyId } : "skip"
    );

    const campaignStats = useQuery(
        api.campaigns.getStats,
        companyId ? { companyId } : "skip"
    );

    const eventStats = useQuery(
        api.events.getStats,
        companyId ? { companyId } : "skip"
    );

    const leadStats = useQuery(
        api.leads.getStats,
        companyId ? { companyId } : "skip"
    );

    const allSearches = useQuery(
        api.searches.list,
        companyId ? { companyId } : "skip"
    );

    const allLeads = useQuery(
        api.leads.list,
        companyId ? { companyId } : "skip"
    );

    const allCampaigns = useQuery(
        api.campaigns.list,
        companyId ? { companyId } : "skip"
    );

    const teamMembers = useQuery(
        api.users.getByCompanyId,
        companyId ? { companyId } : "skip"
    );

    const isLoading = isUserLoading || searchStats === undefined || campaignStats === undefined || leadStats === undefined;

    const activityData = useMemo(() => {
        if (!searchStats || !campaignStats || !leadStats || !eventStats) return [];

        return [
            { id: "1", metric: "Total Searches", current: searchStats.total, recent: searchStats.last7Days, label: "last 7 days" },
            { id: "2", metric: "Leads Created", current: leadStats.total, recent: leadStats.newThisWeek, label: "new this week" },
            { id: "3", metric: "Emails Sent", current: campaignStats.totalEmailsSent, recent: campaignStats.active, label: "active campaigns" },
            { id: "4", metric: "Events Booked", current: eventStats.total, recent: eventStats.thisWeek, label: "this week" },
            { id: "5", metric: "Active Campaigns", current: campaignStats.active, recent: campaignStats.draft, label: "drafts" },
        ];
    }, [searchStats, campaignStats, leadStats, eventStats]);

    const campaignTableData = useMemo(() => {
        if (!allCampaigns) return [];
        return allCampaigns.map((c) => ({
            id: c._id,
            name: c.name,
            status: c.status,
            recipients: c.totalRecipients ?? 0,
            sent: c.emailsSent ?? 0,
            opened: c.emailsOpened ?? 0,
            clicked: c.emailsClicked ?? 0,
            openRate: c.emailsSent ? `${Math.round(((c.emailsOpened ?? 0) / c.emailsSent) * 100)}%` : "—",
            clickRate: c.emailsSent ? `${Math.round(((c.emailsClicked ?? 0) / c.emailsSent) * 100)}%` : "—",
        }));
    }, [allCampaigns]);

    const leadPipelineData = useMemo(() => {
        if (!leadStats?.byStatus) return [];
        const entries = Object.entries(leadStats.byStatus);
        if (!entries.length) return [];

        const maxLeads = Math.max(...entries.map(([, count]) => count));
        return entries.map(([stage, count]) => ({
            stage: stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, " "),
            leads: count,
            pct: maxLeads > 0 ? Math.round((count / maxLeads) * 100) : 0,
        }));
    }, [leadStats]);

    const teamTableData = useMemo(() => {
        if (!teamMembers || !allSearches || !allLeads) return [];

        return teamMembers
            .filter((m) => m.status === "approved")
            .map((member) => {
                const memberSearches = allSearches.filter((s) => s.userId === member._id).length;
                const memberLeads = allLeads.filter((l) => l.createdByUserId === member._id).length;
                const initials = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase();

                return {
                    id: member._id,
                    name: `${member.firstName} ${member.lastName}`,
                    initials,
                    role: member.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    searches: memberSearches,
                    leads: memberLeads,
                };
            });
    }, [teamMembers, allSearches, allLeads]);

    const teamTotals = useMemo(() => {
        return teamTableData.reduce(
            (acc, m) => ({
                searches: acc.searches + m.searches,
                leads: acc.leads + m.leads,
            }),
            { searches: 0, leads: 0 }
        );
    }, [teamTableData]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full flex-col bg-primary relative">
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8">
                        <LoadingState message="Loading reporting data..." />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-display-sm font-semibold text-primary">Reporting</h1>
                            <p className="text-md text-tertiary">
                                Track performance, pipeline, and campaign metrics
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <FilterDropdown
                                aria-label="Date range"
                                value={dateRange}
                                onChange={(v) => setDateRange(v)}
                                options={dateRangeOptions}
                            />
                            <Button size="md" color="secondary" iconLeading={FileCheck02}>
                                Generate PDF Report
                            </Button>
                            <Button size="md" color="secondary" iconLeading={DownloadCloud01}>
                                Export Data
                            </Button>
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <Tabs className="w-full">
                        <Tabs.List size="sm" type="button-border" className="mb-6" items={[
                            { id: "overview", label: "Overview" },
                            { id: "team", label: "Team Performance" },
                            { id: "ai", label: "AI Campaigns" },
                            { id: "pipeline", label: "Pipeline" },
                        ]}>
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
                        <Tabs.Panel id="overview">
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04
                                        title={searchStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Total Searches"
                                        change={`${searchStats?.last30Days ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="last 30 days"
                                    />
                                    <MetricsChart04
                                        title={leadStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Leads Generated"
                                        change={`${leadStats?.newThisWeek ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="new this week"
                                    />
                                    <MetricsChart04
                                        title={campaignStats?.totalEmailsSent.toLocaleString() ?? "0"}
                                        subtitle="Emails Sent"
                                        change={`${campaignStats?.active ?? 0} active`}
                                        changeTrend="positive"
                                        changeDescription="campaigns"
                                    />
                                    <MetricsChart04
                                        title={eventStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Events / Meetings"
                                        change={`${eventStats?.upcoming ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="upcoming"
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <SearchesChart searches={allSearches ?? []} />
                                    <LeadSourcesChart leads={allLeads ?? []} />
                                </div>

                                {/* Activity Summary Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Activity Summary" />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Activity Summary" sortDescriptor={activitySort} onSortChange={setActivitySort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="metric" isRowHeader allowsSorting>Metric</Table.Head>
                                                <Table.Head id="current" allowsSorting>Total</Table.Head>
                                                <Table.Head id="recent" allowsSorting>Recent</Table.Head>
                                                <Table.Head id="label">Period</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={activityData}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.metric}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary font-semibold">{item.current.toLocaleString()}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">{item.recent.toLocaleString()}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-tertiary">{item.label}</span>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ TEAM PERFORMANCE TAB ═══════════════════ */}
                        <Tabs.Panel id="team">
                            <div className="flex flex-col gap-6">
                                {teamTableData.length === 0 ? (
                                    <div className="rounded-xl border border-secondary bg-primary p-8 text-center">
                                        <p className="text-sm text-tertiary">No team members found</p>
                                    </div>
                                ) : (
                                    <TableCard.Root>
                                        <TableCard.Header title="Team Members" description="Performance breakdown by team member" />
                                        <div className="overflow-x-auto">
                                        <Table aria-label="Team Performance" sortDescriptor={teamSort} onSortChange={setTeamSort}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.Head id="name" isRowHeader allowsSorting>Team Member</Table.Head>
                                                    <Table.Head id="role">Role</Table.Head>
                                                    <Table.Head id="searches" allowsSorting>Searches</Table.Head>
                                                    <Table.Head id="leads" allowsSorting>Leads Created</Table.Head>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body items={teamTableData}>
                                                {(item) => (
                                                    <Table.Row id={item.id}>
                                                        <Table.Cell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar size="sm" initials={item.initials} />
                                                                <span className="font-medium text-primary">{item.name}</span>
                                                            </div>
                                                        </Table.Cell>
                                                        <Table.Cell><span className="text-tertiary">{item.role}</span></Table.Cell>
                                                        <Table.Cell><span className="text-secondary">{item.searches}</span></Table.Cell>
                                                        <Table.Cell><span className="text-secondary">{item.leads}</span></Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                        </div>
                                        <div className="flex items-center border-t border-secondary bg-secondary_subtle px-4 py-3 md:px-6">
                                            <div className="grid w-full grid-cols-4 items-center gap-4">
                                                <span className="font-semibold text-primary">Team Total</span>
                                                <span className="text-tertiary" />
                                                <span className="font-semibold text-primary">{teamTotals.searches}</span>
                                                <span className="font-semibold text-primary">{teamTotals.leads}</span>
                                            </div>
                                        </div>
                                    </TableCard.Root>
                                )}

                                {/* Team Summary Cards */}
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-lg font-semibold text-primary">Team Overview</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Target04 className="w-4 h-4" />
                                                <span className="text-sm">Team Size</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">{teamTableData.length}</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">Total Searches</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">{teamTotals.searches}</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Mail01 className="w-4 h-4" />
                                                <span className="text-sm">Total Leads</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">{teamTotals.leads}</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Zap className="w-4 h-4" />
                                                <span className="text-sm">Tokens Used</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">{searchStats?.tokensConsumed.toLocaleString() ?? 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ AI CAMPAIGNS TAB ═══════════════════ */}
                        <Tabs.Panel id="ai">
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04
                                        title={String(campaignStats?.active ?? 0)}
                                        subtitle="Active Campaigns"
                                        change={`${campaignStats?.total ?? 0} total`}
                                        changeTrend="positive"
                                        changeDescription=""
                                    />
                                    <MetricsChart04
                                        title={campaignStats?.totalEmailsSent.toLocaleString() ?? "0"}
                                        subtitle="Total Emails Sent"
                                        change={`${campaignStats?.totalRecipients ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="recipients"
                                    />
                                    <MetricsChart04
                                        title={String(campaignStats?.draft ?? 0)}
                                        subtitle="Draft Campaigns"
                                        change={`${campaignStats?.paused ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="paused"
                                    />
                                    <MetricsChart04
                                        title={String(campaignStats?.completed ?? 0)}
                                        subtitle="Completed Campaigns"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                    />
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Campaigns" description="All campaign performance data" />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Campaign Performance" sortDescriptor={campaignSort} onSortChange={setCampaignSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Campaign Name</Table.Head>
                                                <Table.Head id="status">Status</Table.Head>
                                                <Table.Head id="recipients" allowsSorting>Recipients</Table.Head>
                                                <Table.Head id="sent" allowsSorting>Emails Sent</Table.Head>
                                                <Table.Head id="openRate" allowsSorting>Open Rate</Table.Head>
                                                <Table.Head id="clickRate" allowsSorting>Click Rate</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={campaignTableData}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.name}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={statusBadgeColor[item.status] ?? "gray"} size="sm">
                                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.recipients.toLocaleString()}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.sent.toLocaleString()}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.openRate}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.clickRate}</span></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                    {campaignTableData.length === 0 && (
                                        <div className="flex items-center justify-center py-12">
                                            <p className="text-sm text-tertiary">No campaigns created yet</p>
                                        </div>
                                    )}
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ PIPELINE TAB ═══════════════════ */}
                        <Tabs.Panel id="pipeline">
                            <div className="flex flex-col gap-6">
                                {/* Pipeline KPI Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04
                                        title={leadStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Total Leads"
                                        change={`${leadStats?.newThisWeek ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="new this week"
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["qualified"] ?? 0)}
                                        subtitle="Qualified"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["contacted"] ?? 0)}
                                        subtitle="Contacted"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["new"] ?? 0)}
                                        subtitle="New Leads"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                    />
                                </div>

                                {/* Pipeline by Status */}
                                {leadPipelineData.length > 0 ? (
                                    <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                                        <h3 className="text-lg font-semibold text-primary mb-5">Pipeline by Status</h3>
                                        <div className="flex flex-col gap-4">
                                            {leadPipelineData.map((s) => {
                                                const isLost = s.stage.toLowerCase().includes("lost") || s.stage.toLowerCase().includes("disqualified");
                                                const isWon = s.stage.toLowerCase().includes("won") || s.stage.toLowerCase().includes("converted");
                                                return (
                                                    <div key={s.stage} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                        <span className="w-full sm:w-32 shrink-0 text-sm font-medium text-primary">{s.stage}</span>
                                                        <div className="flex-1 h-6 sm:h-8 rounded-md bg-secondary_subtle overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-md transition-all ${isLost ? "bg-error-solid" : isWon ? "bg-success-solid" : "bg-brand-solid"}`}
                                                                style={{ width: `${s.pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-full sm:w-20 text-left sm:text-right text-sm font-semibold text-primary">{s.leads} leads</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-secondary bg-primary p-8 text-center">
                                        <p className="text-sm text-tertiary">No pipeline data yet. Lead statuses will appear here as leads are categorized.</p>
                                    </div>
                                )}

                                {/* Recent Leads Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Recent Leads" />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Recent Leads" sortDescriptor={dealSort} onSortChange={setDealSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Lead Name</Table.Head>
                                                <Table.Head id="domain">Domain</Table.Head>
                                                <Table.Head id="status">Status</Table.Head>
                                                <Table.Head id="source">Source</Table.Head>
                                                <Table.Head id="exposures" allowsSorting>Exposures</Table.Head>
                                                <Table.Head id="date" allowsSorting>Created</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={(allLeads ?? []).slice(0, 10).map((l) => ({ ...l, id: l._id }))}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.name}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">{item.domain}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge
                                                            color={
                                                                item.status === "qualified" ? "success"
                                                                : item.status === "contacted" ? "blue"
                                                                : item.status === "new" ? "brand"
                                                                : "gray"
                                                            }
                                                            size="sm"
                                                        >
                                                            {(item.status ?? "new").charAt(0).toUpperCase() + (item.status ?? "new").slice(1)}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-tertiary">{(item.source ?? "manual").replace(/_/g, " ")}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">{item.exposureCount ?? 0}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">
                                                            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                        </span>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                    {(allLeads ?? []).length === 0 && (
                                        <div className="flex items-center justify-center py-12">
                                            <p className="text-sm text-tertiary">No leads in pipeline yet</p>
                                        </div>
                                    )}
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
