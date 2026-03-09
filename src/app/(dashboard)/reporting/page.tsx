"use client";

import React, { useState } from "react";
import {
    DownloadCloud01,
    FileCheck02,
    Mail01,
    Clock,
    Target04,
    Zap,
    ArrowUp,
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
    Legend,
} from "recharts";

import { ChartTooltipContent, ChartLegendContent, ChartActiveDot } from "@/components/application/charts/charts-base";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
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

const teamMembers = [
    { id: "1", name: "Liron", initials: "L", role: "Sales Admin", searches: 89, leads: 48, emailsSent: 780, openRate: "42%", meetings: 5, pipeline: "$340K" },
    { id: "2", name: "Sarah Jenkins", initials: "SJ", role: "Sales Rep", searches: 72, leads: 38, emailsSent: 620, openRate: "38%", meetings: 4, pipeline: "$280K" },
    { id: "3", name: "Mike Ross", initials: "MR", role: "Sales Rep", searches: 65, leads: 35, emailsSent: 510, openRate: "35%", meetings: 3, pipeline: "$220K" },
    { id: "4", name: "Jessica Pearson", initials: "JP", role: "Sales Rep", searches: 58, leads: 35, emailsSent: 430, openRate: "41%", meetings: 0, pipeline: "$360K" },
];

const teamTotal = { searches: 284, leads: 156, emailsSent: 2340, openRate: "39%", meetings: 12, pipeline: "$1.2M" };

const activityData = [
    { id: "1", metric: "Searches", thisWeek: 67, lastWeek: 54, change: "+24%", trend: "up" as const },
    { id: "2", metric: "Leads Created", thisWeek: 34, lastWeek: 29, change: "+17%", trend: "up" as const },
    { id: "3", metric: "Emails Sent", thisWeek: 580, lastWeek: 520, change: "+12%", trend: "up" as const },
    { id: "4", metric: "Meetings Booked", thisWeek: 12, lastWeek: 8, change: "+50%", trend: "up" as const },
    { id: "5", metric: "Reports Generated", thisWeek: 8, lastWeek: 6, change: "+33%", trend: "up" as const },
];

const campaignData = [
    { id: "1", name: "Q1 Healthcare Outreach", status: "Active" as const, audience: 250, sent: "2,100", openRate: "42%", clickRate: "18%", replies: 89, meetings: 12 },
    { id: "2", name: "Finance Sector Breach Alert", status: "Active" as const, audience: 180, sent: "1,540", openRate: "38%", clickRate: "15%", replies: 62, meetings: 8 },
    { id: "3", name: "Construction Industry Push", status: "Paused" as const, audience: 120, sent: "960", openRate: "35%", clickRate: "12%", replies: 41, meetings: 5 },
    { id: "4", name: "Tech Startup Pipeline", status: "Active" as const, audience: 300, sent: "2,400", openRate: "40%", clickRate: "16%", replies: 95, meetings: 15 },
    { id: "5", name: "Government Sector Q4", status: "Completed" as const, audience: 200, sent: "1,200", openRate: "32%", clickRate: "11%", replies: 38, meetings: 4 },
    { id: "6", name: "Education Data Breach", status: "Draft" as const, audience: 150, sent: "340", openRate: "36%", clickRate: "14%", replies: 17, meetings: 2 },
];

const pipelineStages = [
    { stage: "Prospecting", leads: 45, value: "$560K", pct: 100 },
    { stage: "Qualification", leads: 28, value: "$340K", pct: 62 },
    { stage: "Proposal", leads: 15, value: "$280K", pct: 50 },
    { stage: "Negotiation", leads: 8, value: "$180K", pct: 32 },
    { stage: "Closed Won", leads: 12, value: "$450K", pct: 80 },
    { stage: "Closed Lost", leads: 4, value: "$120K", pct: 21 },
];

const recentDeals = [
    { id: "1", deal: "Acme Healthcare", value: "$85K", outcome: "Won" as const, date: "Mar 5, 2026", owner: "Sarah Jenkins", initials: "SJ", lossReason: "" },
    { id: "2", deal: "TechForward Inc", value: "$120K", outcome: "Won" as const, date: "Mar 3, 2026", owner: "Liron", initials: "L", lossReason: "" },
    { id: "3", deal: "GlobalLogistics", value: "$45K", outcome: "Lost" as const, date: "Mar 1, 2026", owner: "Mike Ross", initials: "MR", lossReason: "Competitor" },
    { id: "4", deal: "FinServe Capital", value: "$200K", outcome: "Won" as const, date: "Feb 28, 2026", owner: "Jessica Pearson", initials: "JP", lossReason: "" },
    { id: "5", deal: "CityGov Systems", value: "$75K", outcome: "Lost" as const, date: "Feb 25, 2026", owner: "Mike Ross", initials: "MR", lossReason: "Budget" },
];

const statusBadgeColor: Record<string, "success" | "warning" | "gray" | "blue"> = {
    Active: "success",
    Paused: "warning",
    Completed: "gray",
    Draft: "blue",
};

const searchOverTimeData = [
    { month: "Oct", searches: 180, leads: 42 },
    { month: "Nov", searches: 210, leads: 55 },
    { month: "Dec", searches: 195, leads: 48 },
    { month: "Jan", searches: 240, leads: 67 },
    { month: "Feb", searches: 260, leads: 72 },
    { month: "Mar", searches: 284, leads: 84 },
];

const leadSourceData = [
    { name: "Live Search", value: 720, className: "text-utility-brand-600" },
    { name: "Watchlist", value: 300, className: "text-utility-success-600" },
    { name: "Imported", value: 180, className: "text-utility-gray-400" },
];

const LEAD_SOURCE_COLORS = ["#7F56D9", "#12B76A", "#98A2B3"];

function SearchesChart() {
    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary">Searches Over Time</h3>
                    <p className="text-sm text-tertiary mt-0.5">Monthly search volume and leads generated</p>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={searchOverTimeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#7F56D9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#12B76A" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#12B76A" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary, #EAECF0)" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-tertiary, #98A2B3)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-tertiary, #98A2B3)" }} dx={-4} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--color-border-secondary, #EAECF0)" }} />
                    <Legend content={<ChartLegendContent />} verticalAlign="top" align="right" wrapperStyle={{ top: -8, right: 0 }} />
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
                    <Area
                        type="monotone"
                        dataKey="leads"
                        name="Leads"
                        stroke="#12B76A"
                        strokeWidth={2}
                        fill="url(#leadsGradient)"
                        activeDot={<ChartActiveDot />}
                        className="text-utility-success-600"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function LeadSourcesChart() {
    const total = leadSourceData.reduce((s, d) => s + d.value, 0);

    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary">Lead Sources</h3>
                <p className="text-sm text-tertiary mt-0.5">{total.toLocaleString()} total leads this period</p>
            </div>
            <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                    <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                            <Pie
                                data={leadSourceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                                cornerRadius={4}
                            >
                                {leadSourceData.map((_, index) => (
                                    <Cell key={index} fill={LEAD_SOURCE_COLORS[index]} />
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
                    {leadSourceData.map((d, i) => {
                        const pct = Math.round((d.value / total) * 100);
                        return (
                            <div key={d.name} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEAD_SOURCE_COLORS[i] }} />
                                        <span className="text-sm font-medium text-secondary">{d.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-primary">{d.value}</span>
                                        <span className="text-xs text-tertiary">({pct}%)</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: LEAD_SOURCE_COLORS[i] }} />
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
                        <div className="flex items-center gap-3">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04 title="284" subtitle="Total Searches" change="12%" changeTrend="positive" changeDescription="from last month" />
                                    <MetricsChart04 title="156" subtitle="Leads Generated" change="8%" changeTrend="positive" changeDescription="from last month" />
                                    <MetricsChart04 title="2,340" subtitle="Emails Sent" change="15%" changeTrend="positive" changeDescription="from last month" />
                                    <MetricsChart04 title="$1.2M" subtitle="Pipeline Value" change="22%" changeTrend="positive" changeDescription="from last month" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <SearchesChart />
                                    <LeadSourcesChart />
                                </div>

                                {/* Activity Summary Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Activity Summary" />
                                    <Table aria-label="Activity Summary" sortDescriptor={activitySort} onSortChange={setActivitySort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="metric" isRowHeader allowsSorting>Metric</Table.Head>
                                                <Table.Head id="thisWeek" allowsSorting>This Week</Table.Head>
                                                <Table.Head id="lastWeek" allowsSorting>Last Week</Table.Head>
                                                <Table.Head id="change" allowsSorting>Change</Table.Head>
                                                <Table.Head id="trend">Trend</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={activityData}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.metric}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary font-semibold">{item.thisWeek.toLocaleString()}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-tertiary">{item.lastWeek.toLocaleString()}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color="success" size="sm">{item.change}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <ArrowUp className="w-4 h-4 text-fg-success-secondary" />
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ TEAM PERFORMANCE TAB ═══════════════════ */}
                        <Tabs.Panel id="team">
                            <div className="flex flex-col gap-6">
                                <TableCard.Root>
                                    <TableCard.Header title="Team Members" description="Performance breakdown by team member" />
                                    <Table aria-label="Team Performance" sortDescriptor={teamSort} onSortChange={setTeamSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Team Member</Table.Head>
                                                <Table.Head id="role">Role</Table.Head>
                                                <Table.Head id="searches" allowsSorting>Searches</Table.Head>
                                                <Table.Head id="leads" allowsSorting>Leads</Table.Head>
                                                <Table.Head id="emailsSent" allowsSorting>Emails Sent</Table.Head>
                                                <Table.Head id="openRate" allowsSorting>Open Rate</Table.Head>
                                                <Table.Head id="meetings" allowsSorting>Meetings Booked</Table.Head>
                                                <Table.Head id="pipeline" allowsSorting>Pipeline Value</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={teamMembers}>
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
                                                    <Table.Cell><span className="text-secondary">{item.emailsSent.toLocaleString()}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.openRate}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.meetings}</span></Table.Cell>
                                                    <Table.Cell><span className="font-semibold text-primary">{item.pipeline}</span></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    {/* Team Total Row */}
                                    <div className="flex items-center border-t border-secondary bg-secondary_subtle px-4 py-3 md:px-6">
                                        <div className="grid w-full grid-cols-8 items-center gap-4">
                                            <span className="font-semibold text-primary col-span-1">Team Total</span>
                                            <span className="text-tertiary col-span-1" />
                                            <span className="font-semibold text-primary">{teamTotal.searches}</span>
                                            <span className="font-semibold text-primary">{teamTotal.leads}</span>
                                            <span className="font-semibold text-primary">{teamTotal.emailsSent.toLocaleString()}</span>
                                            <span className="font-semibold text-primary">{teamTotal.openRate} avg</span>
                                            <span className="font-semibold text-primary">{teamTotal.meetings}</span>
                                            <span className="font-semibold text-primary">{teamTotal.pipeline}</span>
                                        </div>
                                    </div>
                                </TableCard.Root>

                                {/* Individual Performance Cards - Top Performer */}
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-lg font-semibold text-primary">Top Performer — Liron</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">Avg Response Time</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">2.4 hours</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Target04 className="w-4 h-4" />
                                                <span className="text-sm">Conversion Rate</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">54%</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Mail01 className="w-4 h-4" />
                                                <span className="text-sm">Emails / Day</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">26</span>
                                        </div>
                                        <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-tertiary">
                                                <Zap className="w-4 h-4" />
                                                <span className="text-sm">Top Industry</span>
                                            </div>
                                            <span className="text-display-xs font-semibold text-primary">Healthcare</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ AI CAMPAIGNS TAB ═══════════════════ */}
                        <Tabs.Panel id="ai">
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04 title="5" subtitle="Active Campaigns" change="2" changeTrend="positive" changeDescription="new" />
                                    <MetricsChart04 title="8,540" subtitle="Total Emails Sent" change="24%" changeTrend="positive" changeDescription="vs last month" />
                                    <MetricsChart04 title="38.5%" subtitle="Avg Open Rate" change="3%" changeTrend="positive" changeDescription="vs last month" />
                                    <MetricsChart04 title="342" subtitle="Total Replies" change="18%" changeTrend="positive" changeDescription="vs last month" />
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Campaigns" description="All campaign performance data" />
                                    <Table aria-label="Campaign Performance" sortDescriptor={campaignSort} onSortChange={setCampaignSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Campaign Name</Table.Head>
                                                <Table.Head id="status">Status</Table.Head>
                                                <Table.Head id="audience" allowsSorting>Audience Size</Table.Head>
                                                <Table.Head id="sent" allowsSorting>Emails Sent</Table.Head>
                                                <Table.Head id="openRate" allowsSorting>Open Rate</Table.Head>
                                                <Table.Head id="clickRate" allowsSorting>Click Rate</Table.Head>
                                                <Table.Head id="replies" allowsSorting>Replies</Table.Head>
                                                <Table.Head id="meetings" allowsSorting>Meetings Booked</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={campaignData}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.name}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={statusBadgeColor[item.status]} size="sm">{item.status}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.audience.toLocaleString()}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.sent}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.openRate}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.clickRate}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.replies}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.meetings}</span></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* ═══════════════════ PIPELINE TAB ═══════════════════ */}
                        <Tabs.Panel id="pipeline">
                            <div className="flex flex-col gap-6">
                                {/* Pipeline KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04 title="$1.2M" subtitle="Total Pipeline" change="22%" changeTrend="positive" changeDescription="this quarter" />
                                    <MetricsChart04 title="$450K" subtitle="Won This Quarter" change="15%" changeTrend="positive" changeDescription="vs last quarter" />
                                    <MetricsChart04 title="$120K" subtitle="Lost This Quarter" change="8%" changeTrend="negative" changeDescription="vs last quarter" chartColor="text-fg-error-secondary" />
                                    <MetricsChart04 title="79%" subtitle="Win Rate" change="5%" changeTrend="positive" changeDescription="vs last quarter" />
                                </div>

                                {/* Pipeline by Stage */}
                                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                                    <h3 className="text-lg font-semibold text-primary mb-5">Pipeline by Stage</h3>
                                    <div className="flex flex-col gap-4">
                                        {pipelineStages.map((s) => {
                                            const isLost = s.stage === "Closed Lost";
                                            const isWon = s.stage === "Closed Won";
                                            return (
                                                <div key={s.stage} className="flex items-center gap-4">
                                                    <span className="w-32 shrink-0 text-sm font-medium text-primary">{s.stage}</span>
                                                    <div className="flex-1 h-8 rounded-md bg-secondary_subtle overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-md transition-all ${isLost ? "bg-error-solid" : isWon ? "bg-success-solid" : "bg-brand-solid"}`}
                                                            style={{ width: `${s.pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-20 text-right text-sm font-semibold text-primary">{s.leads} leads</span>
                                                    <span className="w-20 text-right text-sm font-medium text-tertiary">{s.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recent Won/Lost Deals */}
                                <TableCard.Root>
                                    <TableCard.Header title="Recent Won / Lost Deals" />
                                    <Table aria-label="Recent Deals" sortDescriptor={dealSort} onSortChange={setDealSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="deal" isRowHeader allowsSorting>Deal</Table.Head>
                                                <Table.Head id="value" allowsSorting>Value</Table.Head>
                                                <Table.Head id="outcome">Outcome</Table.Head>
                                                <Table.Head id="date" allowsSorting>Close Date</Table.Head>
                                                <Table.Head id="owner" allowsSorting>Owner</Table.Head>
                                                <Table.Head id="reason">Loss Reason</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={recentDeals}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <span className="font-medium text-primary">{item.deal}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="font-semibold text-primary">{item.value}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={item.outcome === "Won" ? "success" : "error"} size="sm">
                                                            {item.outcome}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">{item.date}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar size="xs" initials={item.initials} />
                                                            <span className="text-secondary">{item.owner}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {item.lossReason
                                                            ? <Badge color="gray" size="sm">{item.lossReason}</Badge>
                                                            : <span className="text-quaternary">—</span>}
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
