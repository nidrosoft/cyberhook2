"use client";

import { useState } from "react";
import Link from "next/link";
import type { SortDescriptor } from "react-aria-components";
import {
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    Copy06,
    DotsVertical,
    Edit05,
    Eye,
    FileCheck02,
    Mail01,
    MessageChatCircle,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    Send01,
    Trash01,
    Users01,
    XCircle,
    Archive,
    BarChart01,
    Zap,
} from "@untitledui/icons";

import { Table, TableCard } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Badge } from "@/components/base/badges/badges";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";

type CampaignStatus = "Active" | "Paused" | "Completed" | "Draft";

interface Campaign {
    id: string;
    name: string;
    status: CampaignStatus;
    audience: number;
    emailsSent: number;
    openRate: number;
    clickRate: number;
    replies: number;
    meetings: number;
}

const mockCampaigns: Campaign[] = [
    { id: "cmp-1", name: "Q1 Healthcare Outreach", status: "Active", audience: 250, emailsSent: 2100, openRate: 42, clickRate: 18, replies: 89, meetings: 12 },
    { id: "cmp-2", name: "Finance Sector Breach Alert", status: "Active", audience: 180, emailsSent: 1540, openRate: 38, clickRate: 15, replies: 62, meetings: 8 },
    { id: "cmp-3", name: "Construction Industry Push", status: "Paused", audience: 120, emailsSent: 960, openRate: 35, clickRate: 12, replies: 41, meetings: 5 },
    { id: "cmp-4", name: "Tech Startup Pipeline", status: "Active", audience: 300, emailsSent: 2400, openRate: 40, clickRate: 16, replies: 95, meetings: 15 },
    { id: "cmp-5", name: "Government Sector Q4", status: "Completed", audience: 200, emailsSent: 1200, openRate: 32, clickRate: 11, replies: 38, meetings: 4 },
    { id: "cmp-6", name: "Education Data Breach", status: "Draft", audience: 150, emailsSent: 340, openRate: 36, clickRate: 14, replies: 17, meetings: 2 },
    { id: "cmp-7", name: "MSP Partner Referral", status: "Active", audience: 90, emailsSent: 720, openRate: 44, clickRate: 20, replies: 32, meetings: 6 },
];

const approvalItems = [
    {
        id: "apr-1",
        campaign: "Q1 Healthcare Outreach",
        step: 3,
        recipient: { name: "Emily Davis", title: "CISO", company: "SecureHealth" },
        subject: "Critical Vulnerability Alert for SecureHealth",
        preview: "Hi Emily, Our threat intelligence team has identified 3 new critical vulnerabilities affecting SecureHealth's public-facing infrastructure. These findings include exposed credentials and misconfigured endpoints that could...",
    },
    {
        id: "apr-2",
        campaign: "Finance Sector Breach Alert",
        step: 2,
        recipient: { name: "James Martinez", title: "CFO", company: "FinServe" },
        subject: "Compromised Credentials at FinServe",
        preview: "Hi James, We've detected compromised employee credentials from FinServe appearing on dark web marketplaces. This represents a significant risk to your organization's financial data and client records...",
    },
    {
        id: "apr-3",
        campaign: "Tech Startup Pipeline",
        step: 1,
        recipient: { name: "Alex Chen", title: "CTO", company: "DataCorp" },
        subject: "Urgent: 9 Exposed Credentials at DataCorp",
        preview: "Hi Alex, CyberHook has detected 9 exposed employee credentials associated with DataCorp across multiple breach databases. Immediate action is recommended to prevent unauthorized access to your...",
    },
];

const templates = [
    { id: "tpl-1", name: "Initial Breach Alert", trigger: "New exposures found", openRate: 42, usedCount: 156 },
    { id: "tpl-2", name: "Follow-up - No Reply", trigger: "3 days after initial", openRate: 28, usedCount: 89 },
    { id: "tpl-3", name: "Case Study Share", trigger: "After meeting booked", openRate: 55, usedCount: 34 },
    { id: "tpl-4", name: "Quarterly Check-in", trigger: "90 days after close", openRate: 38, usedCount: 45 },
    { id: "tpl-5", name: "Event Invitation", trigger: "14 days before event", openRate: 48, usedCount: 67 },
    { id: "tpl-6", name: "Renewal Reminder", trigger: "30 days before expiry", openRate: 52, usedCount: 23 },
];

const statusBadge: Record<CampaignStatus, { color: "success" | "warning" | "gray" | "blue"; label: string }> = {
    Active: { color: "success", label: "Active" },
    Paused: { color: "warning", label: "Paused" },
    Completed: { color: "gray", label: "Completed" },
    Draft: { color: "blue", label: "Draft" },
};

function getActions(status: CampaignStatus) {
    switch (status) {
        case "Active":
            return [
                { label: "View", icon: Eye, color: "secondary" as const },
                { label: "Pause", icon: PauseCircle, color: "secondary" as const },
                { label: "Archive", icon: Archive, color: "tertiary" as const },
            ];
        case "Paused":
            return [
                { label: "View", icon: Eye, color: "secondary" as const },
                { label: "Resume", icon: PlayCircle, color: "secondary" as const },
                { label: "Archive", icon: Archive, color: "tertiary" as const },
            ];
        case "Completed":
            return [
                { label: "View", icon: Eye, color: "secondary" as const },
                { label: "Duplicate", icon: Copy06, color: "secondary" as const },
                { label: "Archive", icon: Archive, color: "tertiary" as const },
            ];
        case "Draft":
            return [
                { label: "Edit", icon: Edit05, color: "secondary" as const },
                { label: "Launch", icon: Send01, color: "primary" as const },
                { label: "Delete", icon: Trash01, color: "tertiary-destructive" as const },
            ];
    }
}

export default function AiAgentsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("30d");
    const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
    });

    const filteredCampaigns = statusFilter === "all"
        ? mockCampaigns
        : mockCampaigns.filter((c) => c.status.toLowerCase() === statusFilter);

    const draftCampaigns = mockCampaigns.filter((c) => c.status === "Draft");

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto" onClick={() => openMenu && setOpenMenu(null)}>
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">AI Agents</h1>
                        <p className="text-md text-tertiary">
                            AI-powered email campaigns for cybersecurity sales outreach
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <Link href="/ai-agents/new">
                            <Button color="primary" iconLeading={Plus}>
                                New Campaign
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricsChart04 title="5" subtitle="Active Campaigns" change="2" changeTrend="positive" changeDescription="new this week" />
                    <MetricsChart04 title="8,540" subtitle="Emails Sent" change="24%" changeTrend="positive" changeDescription="vs last month" />
                    <MetricsChart04 title="38.5%" subtitle="Avg. Open Rate" change="3%" changeTrend="positive" changeDescription="vs last month" />
                    <MetricsChart04 title="342" subtitle="Total Replies" change="18%" changeTrend="positive" changeDescription="vs last month" />
                </div>

                {/* Tabs */}
                <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
                    <Tabs.List
                        type="underline"
                        size="sm"
                        items={[
                            { id: "all", label: "All Campaigns", badge: String(mockCampaigns.length) },
                            { id: "drafts", label: "Drafts", badge: String(draftCampaigns.length) },
                            { id: "approval", label: "Needs Approval", badge: String(approvalItems.length) },
                            { id: "templates", label: "Templates", badge: String(templates.length) },
                        ]}
                    />

                    {/* All Campaigns Tab */}
                    <Tabs.Panel id="all" className="pt-6">
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-secondary p-4 sm:px-6 sm:py-5">
                                <div className="flex w-full sm:w-auto items-center gap-3">
                                    <InputBase
                                        size="sm"
                                        type="search"
                                        aria-label="Search campaigns"
                                        placeholder="Search campaigns..."
                                        icon={SearchLg}
                                        className="w-full sm:min-w-[280px]"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <FilterDropdown
                                        aria-label="Status filter"
                                        value={statusFilter}
                                        onChange={(v) => setStatusFilter(v)}
                                        options={[
                                            { label: "All Statuses", value: "all" },
                                            { label: "Active", value: "active" },
                                            { label: "Paused", value: "paused" },
                                            { label: "Completed", value: "completed" },
                                            { label: "Draft", value: "draft" },
                                        ]}
                                    />
                                    <FilterDropdown
                                        aria-label="Date range"
                                        value={dateRange}
                                        onChange={(v) => setDateRange(v)}
                                        options={[
                                            { label: "Last 30 days", value: "30d" },
                                            { label: "Last 7 days", value: "7d" },
                                            { label: "Last 90 days", value: "90d" },
                                            { label: "This year", value: "year" },
                                            { label: "All time", value: "all" },
                                        ]}
                                    />
                                </div>
                            </div>

                            <Table
                                aria-label="Campaigns List"
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                                className="bg-primary w-full"
                            >
                                <Table.Header className="bg-secondary_subtle">
                                    <Table.Head id="name" label="Campaign Name" allowsSorting isRowHeader className="w-full min-w-[220px]" />
                                    <Table.Head id="status" label="Status" allowsSorting className="min-w-[110px]" />
                                    <Table.Head id="audience" label="Audience" allowsSorting className="min-w-[120px]" />
                                    <Table.Head id="emailsSent" label="Emails Sent" allowsSorting className="min-w-[110px]" />
                                    <Table.Head id="openRate" label="Open Rate" allowsSorting className="min-w-[100px]" />
                                    <Table.Head id="clickRate" label="Click Rate" allowsSorting className="min-w-[100px]" />
                                    <Table.Head id="replies" label="Replies" allowsSorting className="min-w-[80px]" />
                                    <Table.Head id="meetings" label="Meetings" allowsSorting className="min-w-[90px]" />
                                    <Table.Head id="actions" label="Actions" className="w-[60px]" />
                                </Table.Header>

                                <Table.Body items={filteredCampaigns}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <span className="font-medium text-primary whitespace-nowrap">{item.name}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <BadgeWithDot size="sm" type="pill-color" color={statusBadge[item.status].color}>
                                                    {statusBadge[item.status].label}
                                                </BadgeWithDot>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary whitespace-nowrap">{item.audience} contacts</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary">{item.emailsSent.toLocaleString()}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary">{item.openRate}%</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary">{item.clickRate}%</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary">{item.replies}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-secondary">{item.meetings}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <ButtonUtility size="sm" icon={DotsVertical} aria-label="Actions" onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} />
                                                    {openMenu === item.id && (
                                                        <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                            {getActions(item.status).map((action) => (
                                                                <button key={action.label} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                                    <action.icon className="w-4 h-4" />
                                                                    {action.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                        </TableCard.Root>
                    </Tabs.Panel>

                    {/* Drafts Tab */}
                    <Tabs.Panel id="drafts" className="pt-6">
                        <div className="flex flex-col gap-4">
                            {draftCampaigns.length === 0 ? (
                                <div className="rounded-xl border border-secondary bg-primary p-12 text-center">
                                    <p className="text-md text-tertiary">No draft campaigns</p>
                                </div>
                            ) : (
                                draftCampaigns.map((draft) => (
                                    <div
                                        key={draft.id}
                                        className="rounded-xl border border-secondary bg-primary p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-md font-semibold text-primary">{draft.name}</span>
                                                <BadgeWithDot size="sm" type="pill-color" color="blue">Draft</BadgeWithDot>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-tertiary">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" /> Created Jan 15, 2026
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users01 className="w-4 h-4" /> {draft.audience} contacts
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Mail01 className="w-4 h-4" /> 5-step cadence
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" color="primary" iconLeading={Edit05}>
                                                Continue Editing
                                            </Button>
                                            <Button size="sm" color="tertiary-destructive" iconLeading={Trash01}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Tabs.Panel>

                    {/* Needs Approval Tab */}
                    <Tabs.Panel id="approval" className="pt-6">
                        <div className="flex flex-col gap-4">
                            {approvalItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-4"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-md font-semibold text-primary">{item.campaign}</span>
                                                <Badge size="sm" type="color" color="brand">Step {item.step}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-tertiary">
                                                <span>To:</span>
                                                <span className="font-medium text-secondary">{item.recipient.name}</span>
                                                <span>({item.recipient.title}, {item.recipient.company})</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-tertiary">Subject:</span>
                                                <span className="font-medium text-secondary">{item.subject}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button size="sm" color="primary" iconLeading={CheckCircle}>
                                                Approve & Send
                                            </Button>
                                            <Button size="sm" color="secondary" iconLeading={Edit05}>
                                                Edit
                                            </Button>
                                            <Button size="sm" color="tertiary" iconLeading={XCircle}>
                                                Skip
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedApproval(expandedApproval === item.id ? null : item.id)}
                                            className="flex items-center gap-1 text-sm font-medium text-brand-secondary cursor-pointer hover:text-brand-secondary_hover transition"
                                        >
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform ${expandedApproval === item.id ? "rotate-180" : ""}`}
                                            />
                                            {expandedApproval === item.id ? "Hide preview" : "Show preview"}
                                        </button>
                                        {expandedApproval === item.id && (
                                            <div className="mt-3 rounded-lg border border-secondary bg-secondary_subtle p-4 text-sm text-secondary leading-relaxed">
                                                {item.preview}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Tabs.Panel>

                    {/* Templates Tab */}
                    <Tabs.Panel id="templates" className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((tpl) => (
                                <div
                                    key={tpl.id}
                                    className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-4"
                                >
                                    <div className="flex flex-col gap-2">
                                        <span className="text-md font-semibold text-primary">{tpl.name}</span>
                                        <div className="flex items-center gap-1.5 text-sm text-tertiary">
                                            <Zap className="w-4 h-4 text-warning-500" />
                                            <span>Trigger: {tpl.trigger}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1.5 text-secondary">
                                            <BarChart01 className="w-4 h-4 text-tertiary" />
                                            <span>{tpl.openRate}% avg open</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-secondary">
                                            <MessageChatCircle className="w-4 h-4 text-tertiary" />
                                            <span>Used {tpl.usedCount} times</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-secondary">
                                        <Button size="sm" color="primary">
                                            Use Template
                                        </Button>
                                        <Button size="sm" color="secondary" iconLeading={Edit05}>
                                            Edit
                                        </Button>
                                        <Button size="sm" color="tertiary" iconLeading={Copy06}>
                                            Duplicate
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Tabs.Panel>
                </Tabs>
            </div>
        </div>
    );
}
