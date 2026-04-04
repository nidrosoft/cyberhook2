"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import jsPDF from "jspdf";
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
import { useCompany } from "@/hooks/use-company";
import { toast } from "sonner";
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

    const { companyId, user, isLoading: isUserLoading } = useCurrentUser();
    const { company } = useCompany();

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

    const dateFrom = useMemo(() => {
        const now = new Date();
        switch (dateRange) {
            case "this-month":
                return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            case "last-30":
                return now.getTime() - 30 * 24 * 60 * 60 * 1000;
            case "last-quarter":
                return now.getTime() - 90 * 24 * 60 * 60 * 1000;
            case "last-year":
                return now.getTime() - 365 * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }, [dateRange]);

    const filteredSearches = useMemo(
        () => (allSearches ?? []).filter((s) => s.createdAt >= dateFrom),
        [allSearches, dateFrom],
    );

    const filteredLeads = useMemo(
        () => (allLeads ?? []).filter((l) => l.createdAt >= dateFrom),
        [allLeads, dateFrom],
    );

    const filteredCampaigns = useMemo(
        () => (allCampaigns ?? []).filter((c) => c.createdAt >= dateFrom),
        [allCampaigns, dateFrom],
    );

    const activityData = useMemo(() => {
        if (!searchStats || !campaignStats || !leadStats || !eventStats) return [];

        return [
            { id: "1", metric: "Total Searches", current: filteredSearches.length, recent: searchStats.last7Days, label: "last 7 days" },
            { id: "2", metric: "Leads Created", current: filteredLeads.length, recent: leadStats.newThisWeek, label: "new this week" },
            { id: "3", metric: "Emails Sent", current: filteredCampaigns.reduce((sum, c) => sum + (c.emailsSent ?? 0), 0), recent: campaignStats.active, label: "active campaigns" },
            { id: "4", metric: "Events Booked", current: eventStats.total, recent: eventStats.thisWeek, label: "this week" },
            { id: "5", metric: "Active Campaigns", current: filteredCampaigns.filter((c) => c.status === "active").length, recent: campaignStats.draft, label: "drafts" },
        ];
    }, [searchStats, campaignStats, leadStats, eventStats, filteredSearches, filteredLeads, filteredCampaigns]);

    const campaignTableData = useMemo(() => {
        if (!filteredCampaigns.length) return [];
        return filteredCampaigns.map((c) => ({
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
    }, [filteredCampaigns]);

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
        if (!teamMembers || !filteredSearches || !filteredLeads) return [];

        return teamMembers
            .filter((m) => m.status === "approved")
            .map((member) => {
                const memberSearches = filteredSearches.filter((s) => s.userId === member._id).length;
                const memberLeads = filteredLeads.filter((l) => l.createdByUserId === member._id).length;
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
    }, [teamMembers, filteredSearches, filteredLeads]);

    const teamTotals = useMemo(() => {
        return teamTableData.reduce(
            (acc, m) => ({
                searches: acc.searches + m.searches,
                leads: acc.leads + m.leads,
            }),
            { searches: 0, leads: 0 }
        );
    }, [teamTableData]);

    const dateRangeLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label ?? dateRange;

    const generatePerformanceReport = useCallback(() => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        const now = new Date();
        let y = 20;

        const checkPageBreak = (needed: number) => {
            if (y + needed > 275) {
                doc.addPage();
                y = 20;
            }
        };

        const drawSectionHeader = (title: string) => {
            checkPageBreak(20);
            doc.setDrawColor(127, 86, 217);
            doc.setLineWidth(0.5);
            doc.line(margin, y, margin + contentWidth, y);
            y += 8;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30);
            doc.text(title, margin, y);
            y += 8;
        };

        const drawTableRow = (cols: string[], widths: number[], bold = false) => {
            checkPageBreak(8);
            doc.setFontSize(8);
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setTextColor(bold ? 30 : 80);
            let x = margin + 2;
            cols.forEach((col, i) => {
                doc.text(col.substring(0, 40), x, y);
                x += widths[i];
            });
            y += 5;
        };

        // Header
        doc.setFillColor(127, 86, 217);
        doc.rect(0, 0, pageWidth, 40, "F");
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255);
        doc.text("CyberHook", margin, 18);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Performance Report", margin, 28);
        doc.setFontSize(9);
        doc.text(`${dateRangeLabel}  |  ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, margin, 36);
        y = 50;

        // Company Info
        if (company) {
            doc.setTextColor(30);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Company Information", margin, y);
            y += 7;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60);

            const companyInfo = [
                ["Company", company.name],
                ["Website", company.website || "—"],
                ["Phone", company.phone || "—"],
                ["Plan", (company.planId ?? "Enterprise").charAt(0).toUpperCase() + (company.planId ?? "enterprise").slice(1)],
                ["Business Model", company.primaryBusinessModel || "—"],
                ["Revenue Range", company.annualRevenue || "—"],
                ["Geographic Coverage", (company.geographicCoverage ?? []).join(", ") || "—"],
                ["Team Size", `${teamTableData.length} member${teamTableData.length !== 1 ? "s" : ""}`],
            ];

            for (const [label, value] of companyInfo) {
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin + 2, y);
                doc.setFont("helvetica", "normal");
                doc.text(String(value).substring(0, 80), margin + 42, y);
                y += 5;
            }
            y += 4;
        }

        if (user) {
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text(`Prepared by: ${user.firstName} ${user.lastName} (${user.email})`, margin, y);
            y += 8;
        }

        // KPI Summary
        drawSectionHeader("Key Performance Indicators");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        const totalEmails = filteredCampaigns.reduce((sum, c) => sum + (c.emailsSent ?? 0), 0);
        const activeCampaigns = filteredCampaigns.filter((c) => c.status === "active").length;
        const kpis = [
            { label: "Total Searches", value: filteredSearches.length, detail: `${searchStats?.last7Days ?? 0} in last 7 days` },
            { label: "Leads Generated", value: filteredLeads.length, detail: `${leadStats?.newThisWeek ?? 0} new this week` },
            { label: "Emails Sent", value: totalEmails, detail: `${activeCampaigns} active campaign${activeCampaigns !== 1 ? "s" : ""}` },
            { label: "Events / Meetings", value: eventStats?.total ?? 0, detail: `${eventStats?.upcoming ?? 0} upcoming` },
            { label: "Tokens Consumed", value: searchStats?.tokensConsumed ?? 0, detail: "" },
        ];

        for (const kpi of kpis) {
            checkPageBreak(12);
            doc.setFillColor(248, 247, 252);
            doc.roundedRect(margin, y - 3, contentWidth, 10, 2, 2, "F");
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30);
            doc.text(kpi.label, margin + 4, y + 3);
            doc.setFontSize(12);
            doc.text(kpi.value.toLocaleString(), margin + 80, y + 3);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120);
            if (kpi.detail) doc.text(kpi.detail, margin + 110, y + 3);
            doc.setFontSize(9);
            y += 12;
        }

        // Team Performance
        if (teamTableData.length > 0) {
            drawSectionHeader("Team Performance");
            const teamWidths = [55, 40, 30, 30];
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, contentWidth, 7, "F");
            drawTableRow(["Member", "Role", "Searches", "Leads"], teamWidths, true);
            y += 1;

            for (const member of teamTableData) {
                drawTableRow([member.name, member.role, String(member.searches), String(member.leads)], teamWidths);
            }

            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 3, contentWidth, 7, "F");
            drawTableRow(["TOTAL", "", String(teamTotals.searches), String(teamTotals.leads)], teamWidths, true);
            y += 4;
        }

        // Campaign Performance
        if (campaignTableData.length > 0) {
            drawSectionHeader("Campaign Performance");
            const campWidths = [50, 25, 25, 25, 25, 25];
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, contentWidth, 7, "F");
            drawTableRow(["Campaign", "Status", "Recipients", "Sent", "Open Rate", "Click Rate"], campWidths, true);
            y += 1;

            for (const c of campaignTableData) {
                drawTableRow([c.name, c.status, String(c.recipients), String(c.sent), c.openRate, c.clickRate], campWidths);
            }
            y += 4;
        }

        // Lead Pipeline
        if (leadPipelineData.length > 0) {
            drawSectionHeader("Lead Pipeline");
            const pipeWidths = [50, 30];
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, contentWidth, 7, "F");
            drawTableRow(["Stage", "Leads"], pipeWidths, true);
            y += 1;

            for (const s of leadPipelineData) {
                drawTableRow([s.stage, `${s.leads} leads`], pipeWidths);
            }
            y += 4;
        }

        // Lead Sources
        const sourceBreakdown = filteredLeads.reduce<Record<string, number>>((acc, l) => {
            const src = (l.source ?? "other").replace(/_/g, " ");
            acc[src] = (acc[src] ?? 0) + 1;
            return acc;
        }, {});

        if (Object.keys(sourceBreakdown).length > 0) {
            drawSectionHeader("Lead Sources");
            for (const [src, count] of Object.entries(sourceBreakdown)) {
                const pct = filteredLeads.length > 0 ? Math.round((count / filteredLeads.length) * 100) : 0;
                checkPageBreak(6);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(60);
                doc.text(`${src.charAt(0).toUpperCase() + src.slice(1)}: ${count} (${pct}%)`, margin + 2, y);
                y += 5;
            }
            y += 4;
        }

        // Footer
        checkPageBreak(20);
        doc.setDrawColor(200);
        doc.line(margin, y, margin + contentWidth, y);
        y += 6;
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Generated by CyberHook on ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString()}`, margin, y);
        y += 4;
        doc.text("CONFIDENTIAL — This report is intended for authorized recipients only. Do not distribute without permission.", margin, y);

        const dateStr = now.toISOString().slice(0, 10);
        doc.save(`CyberHook_Performance_Report_${dateStr}.pdf`);
        toast.success("PDF report downloaded");
    }, [dateRangeLabel, filteredSearches, filteredLeads, filteredCampaigns, eventStats, searchStats, leadStats, teamTableData, teamTotals, campaignTableData, leadPipelineData, company, user]);

    const [showExportMenu, setShowExportMenu] = useState(false);

    const downloadCSV = useCallback((filename: string, headers: string[], rows: string[][]) => {
        const escape = (val: string) => {
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };
        const csvContent = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported successfully");
    }, []);

    const exportAllData = useCallback(() => {
        const dateStr = new Date().toISOString().slice(0, 10);
        const headers = ["Category", "Name", "Status", "Value1", "Value2", "Value3", "Created"];
        const rows: string[][] = [];

        rows.push(["--- KPI Summary ---", "", "", "", "", "", ""]);
        for (const a of activityData) {
            rows.push(["KPI", a.metric, "", String(a.current), String(a.recent), a.label, ""]);
        }

        rows.push(["", "", "", "", "", "", ""]);
        rows.push(["--- Team Performance ---", "", "", "", "", "", ""]);
        for (const m of teamTableData) {
            rows.push(["Team", m.name, m.role, String(m.searches), String(m.leads), "", ""]);
        }

        rows.push(["", "", "", "", "", "", ""]);
        rows.push(["--- Campaigns ---", "", "", "", "", "", ""]);
        for (const c of campaignTableData) {
            rows.push(["Campaign", c.name, c.status, String(c.sent), c.openRate, c.clickRate, ""]);
        }

        rows.push(["", "", "", "", "", "", ""]);
        rows.push(["--- Pipeline ---", "", "", "", "", "", ""]);
        for (const s of leadPipelineData) {
            rows.push(["Pipeline", s.stage, "", String(s.leads), `${s.pct}%`, "", ""]);
        }

        rows.push(["", "", "", "", "", "", ""]);
        rows.push(["--- Recent Leads ---", "", "", "", "", "", ""]);
        for (const l of (allLeads ?? []).slice(0, 50)) {
            rows.push(["Lead", l.name, l.status ?? "new", l.domain, String(l.exposureCount ?? 0), l.source ?? "manual", new Date(l.createdAt).toLocaleDateString()]);
        }

        downloadCSV(`CyberHook_Full_Report_${dateStr}.csv`, headers, rows);
        setShowExportMenu(false);
    }, [activityData, teamTableData, campaignTableData, leadPipelineData, allLeads, downloadCSV]);

    const exportLeadsCSV = useCallback(() => {
        const dateStr = new Date().toISOString().slice(0, 10);
        const headers = ["Name", "Domain", "Status", "Source", "Exposures", "LinkedIn", "Created"];
        const rows = (allLeads ?? []).map((l) => [
            l.name,
            l.domain,
            l.status ?? "new",
            (l.source ?? "manual").replace(/_/g, " "),
            String(l.exposureCount ?? 0),
            l.linkedinUrl ?? "",
            new Date(l.createdAt).toLocaleDateString(),
        ]);
        downloadCSV(`CyberHook_Leads_${dateStr}.csv`, headers, rows);
        setShowExportMenu(false);
    }, [allLeads, downloadCSV]);

    const exportTeamCSV = useCallback(() => {
        const dateStr = new Date().toISOString().slice(0, 10);
        const headers = ["Member", "Role", "Searches", "Leads Created"];
        const rows = teamTableData.map((m) => [m.name, m.role, String(m.searches), String(m.leads)]);
        downloadCSV(`CyberHook_Team_Performance_${dateStr}.csv`, headers, rows);
        setShowExportMenu(false);
    }, [teamTableData, downloadCSV]);

    const exportCampaignsCSV = useCallback(() => {
        const dateStr = new Date().toISOString().slice(0, 10);
        const headers = ["Campaign", "Status", "Recipients", "Sent", "Opened", "Clicked", "Open Rate", "Click Rate"];
        const rows = campaignTableData.map((c) => [c.name, c.status, String(c.recipients), String(c.sent), String(c.opened), String(c.clicked), c.openRate, c.clickRate]);
        downloadCSV(`CyberHook_Campaigns_${dateStr}.csv`, headers, rows);
        setShowExportMenu(false);
    }, [campaignTableData, downloadCSV]);

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
                            <Button size="md" color="secondary" iconLeading={FileCheck02} onClick={generatePerformanceReport}>
                                Generate PDF Report
                            </Button>
                            <div className="relative">
                                <Button size="md" color="secondary" iconLeading={DownloadCloud01} onClick={() => setShowExportMenu((prev) => !prev)}>
                                    Export Data
                                </Button>
                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                                        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-secondary bg-primary shadow-lg py-1">
                                            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-secondary_subtle transition-colors text-left" onClick={exportAllData}>
                                                <DownloadCloud01 className="w-4 h-4 text-tertiary shrink-0" />
                                                Export All Data
                                            </button>
                                            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-secondary_subtle transition-colors text-left" onClick={exportLeadsCSV}>
                                                <DownloadCloud01 className="w-4 h-4 text-tertiary shrink-0" />
                                                Export Leads
                                            </button>
                                            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-secondary_subtle transition-colors text-left" onClick={exportTeamCSV}>
                                                <DownloadCloud01 className="w-4 h-4 text-tertiary shrink-0" />
                                                Export Team Data
                                            </button>
                                            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-secondary_subtle transition-colors text-left" onClick={exportCampaignsCSV}>
                                                <DownloadCloud01 className="w-4 h-4 text-tertiary shrink-0" />
                                                Export Campaigns
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                                    <MetricsChart04
                                        title={searchStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Total Searches"
                                        change={`${searchStats?.last30Days ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="last 30 days"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={leadStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Leads Generated"
                                        change={`${leadStats?.newThisWeek ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="new this week"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={campaignStats?.totalEmailsSent.toLocaleString() ?? "0"}
                                        subtitle="Emails Sent"
                                        change={`${campaignStats?.active ?? 0} active`}
                                        changeTrend="positive"
                                        changeDescription="campaigns"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={eventStats?.total.toLocaleString() ?? "0"}
                                        subtitle="Events / Meetings"
                                        change={`${eventStats?.upcoming ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="upcoming"
                                        actions={false}
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <SearchesChart searches={filteredSearches} />
                                    <LeadSourcesChart leads={filteredLeads} />
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                                    <MetricsChart04
                                        title={String(campaignStats?.active ?? 0)}
                                        subtitle="Active Campaigns"
                                        change={`${campaignStats?.total ?? 0} total`}
                                        changeTrend="positive"
                                        changeDescription=""
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={campaignStats?.totalEmailsSent.toLocaleString() ?? "0"}
                                        subtitle="Total Emails Sent"
                                        change={`${campaignStats?.totalRecipients ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="recipients"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(campaignStats?.draft ?? 0)}
                                        subtitle="Draft Campaigns"
                                        change={`${campaignStats?.paused ?? 0}`}
                                        changeTrend="positive"
                                        changeDescription="paused"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(campaignStats?.completed ?? 0)}
                                        subtitle="Completed Campaigns"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                        actions={false}
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
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["qualified"] ?? 0)}
                                        subtitle="Qualified"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["contacted"] ?? 0)}
                                        subtitle="Contacted"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(leadStats?.byStatus?.["new"] ?? 0)}
                                        subtitle="New Leads"
                                        change=""
                                        changeTrend="positive"
                                        changeDescription=""
                                        actions={false}
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
