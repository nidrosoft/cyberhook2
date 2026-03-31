"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import type { SortDescriptor } from "react-aria-components";
import {
    Calendar,
    ChevronDown,
    Copy06,
    DotsVertical,
    Edit05,
    Eye,
    FileCheck02,
    Mail01,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    Send01,
    Trash01,
    Users01,
    Archive,
} from "@untitledui/icons";

import { Table, TableCard } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type CampaignStatus = "active" | "paused" | "completed" | "draft";

const statusBadge: Record<CampaignStatus, { color: "success" | "warning" | "gray" | "blue"; label: string }> = {
    active: { color: "success", label: "Active" },
    paused: { color: "warning", label: "Paused" },
    completed: { color: "gray", label: "Completed" },
    draft: { color: "blue", label: "Draft" },
};

function formatNumber(n: number): string {
    return n.toLocaleString();
}

function calcRate(numerator: number | undefined, denominator: number | undefined): string {
    if (!denominator || denominator === 0) return "0";
    return ((numerator ?? 0) / denominator * 100).toFixed(1);
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getActions(status: CampaignStatus) {
    switch (status) {
        case "active":
            return [
                { label: "View", icon: Eye, action: "view" as const },
                { label: "Pause", icon: PauseCircle, action: "pause" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "paused":
            return [
                { label: "View", icon: Eye, action: "view" as const },
                { label: "Resume", icon: PlayCircle, action: "resume" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "completed":
            return [
                { label: "View", icon: Eye, action: "view" as const },
                { label: "Duplicate", icon: Copy06, action: "duplicate" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "draft":
            return [
                { label: "Edit", icon: Edit05, action: "edit" as const },
                { label: "Launch", icon: Send01, action: "launch" as const },
                { label: "Delete", icon: Trash01, action: "delete" as const },
            ];
    }
}

export default function AiAgentsPage() {
    const { companyId, isLoading: isUserLoading } = useCurrentUser();

    const campaigns = useQuery(
        api.campaigns.list,
        companyId ? { companyId } : "skip"
    );
    const stats = useQuery(
        api.campaigns.getStats,
        companyId ? { companyId } : "skip"
    );

    const updateStatus = useMutation(api.campaigns.updateStatus);
    const removeCampaign = useMutation(api.campaigns.remove);

    const [activeTab, setActiveTab] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("30d");
    const [searchQuery, setSearchQuery] = useState("");
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
    });

    const isLoading = isUserLoading || campaigns === undefined || stats === undefined;

    const allCampaigns = campaigns ?? [];

    const filteredCampaigns = allCampaigns.filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const draftCampaigns = allCampaigns.filter((c) => c.status === "draft");

    const totalEmailsSent = stats?.totalEmailsSent ?? 0;
    const activeCampaigns = stats?.active ?? 0;
    const totalReplies = allCampaigns.reduce((sum, c) => sum + (c.emailsClicked ?? 0), 0);
    const avgOpenRate = totalEmailsSent > 0
        ? (allCampaigns.reduce((sum, c) => sum + (c.emailsOpened ?? 0), 0) / totalEmailsSent * 100).toFixed(1)
        : "0";

    async function handleAction(campaignId: Id<"campaigns">, action: string) {
        setOpenMenu(null);
        switch (action) {
            case "pause":
                await updateStatus({ id: campaignId, status: "paused" });
                break;
            case "resume":
            case "launch":
                await updateStatus({ id: campaignId, status: "active" });
                break;
            case "archive":
                await updateStatus({ id: campaignId, status: "completed" });
                break;
            case "delete":
                await removeCampaign({ id: campaignId });
                break;
        }
    }

    if (isLoading) {
        return (
            <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
                <div className="flex flex-col gap-8 animate-pulse">
                    <div className="h-8 w-48 rounded bg-quaternary" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-28 rounded-xl bg-quaternary" />
                        ))}
                    </div>
                    <div className="h-96 rounded-xl bg-quaternary" />
                </div>
            </div>
        );
    }

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
                    <MetricsChart04
                        title={String(activeCampaigns)}
                        subtitle="Active Campaigns"
                        change={String(stats?.draft ?? 0)}
                        changeTrend="positive"
                        changeDescription="drafts pending"
                    />
                    <MetricsChart04
                        title={formatNumber(totalEmailsSent)}
                        subtitle="Emails Sent"
                        change={String(stats?.totalRecipients ?? 0)}
                        changeTrend="positive"
                        changeDescription="total recipients"
                    />
                    <MetricsChart04
                        title={`${avgOpenRate}%`}
                        subtitle="Avg. Open Rate"
                        change=""
                        changeTrend="positive"
                        changeDescription="across all campaigns"
                    />
                    <MetricsChart04
                        title={formatNumber(totalReplies)}
                        subtitle="Total Clicks"
                        change={String(stats?.total ?? 0)}
                        changeTrend="positive"
                        changeDescription="total campaigns"
                    />
                </div>

                {/* Tabs */}
                <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
                    <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                    <Tabs.List
                        type="underline"
                        size="sm"
                        items={[
                            { id: "all", label: "All Campaigns", badge: String(allCampaigns.length) },
                            { id: "drafts", label: "Drafts", badge: String(draftCampaigns.length) },
                            { id: "approval", label: "Needs Approval", badge: String(draftCampaigns.length) },
                            { id: "templates", label: "Templates", badge: "0" },
                        ]}
                    />
                    </div>

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
                                        value={searchQuery}
                                        onChange={(value: string) => setSearchQuery(value)}
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

                            {filteredCampaigns.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-md text-tertiary">
                                        {searchQuery || statusFilter !== "all"
                                            ? "No campaigns match your filters"
                                            : "No campaigns yet. Create your first campaign to get started."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
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
                                        <Table.Head id="audience" label="Recipients" allowsSorting className="min-w-[120px]" />
                                        <Table.Head id="emailsSent" label="Emails Sent" allowsSorting className="min-w-[110px]" />
                                        <Table.Head id="openRate" label="Open Rate" allowsSorting className="min-w-[100px]" />
                                        <Table.Head id="clickRate" label="Click Rate" allowsSorting className="min-w-[100px]" />
                                        <Table.Head id="actions" label="Actions" className="w-[60px]" />
                                    </Table.Header>

                                    <Table.Body items={filteredCampaigns}>
                                        {(item) => (
                                            <Table.Row id={item._id}>
                                                <Table.Cell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-primary whitespace-nowrap">{item.name}</span>
                                                        {item.description && (
                                                            <span className="text-xs text-tertiary truncate max-w-[200px]">{item.description}</span>
                                                        )}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <BadgeWithDot size="sm" type="pill-color" color={statusBadge[item.status].color}>
                                                        {statusBadge[item.status].label}
                                                    </BadgeWithDot>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-secondary whitespace-nowrap">{item.totalRecipients ?? 0} contacts</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-secondary">{formatNumber(item.emailsSent ?? 0)}</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-secondary">{calcRate(item.emailsOpened, item.emailsSent)}%</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-secondary">{calcRate(item.emailsClicked, item.emailsSent)}%</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                        <ButtonUtility size="sm" icon={DotsVertical} aria-label="Actions" onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)} />
                                                        {openMenu === item._id && (
                                                            <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                                {getActions(item.status).map((actionItem) => (
                                                                    <button
                                                                        key={actionItem.label}
                                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle"
                                                                        onClick={() => handleAction(item._id, actionItem.action)}
                                                                    >
                                                                        <actionItem.icon className="w-4 h-4" />
                                                                        {actionItem.label}
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
                                </div>
                            )}
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
                                        key={draft._id}
                                        className="rounded-xl border border-secondary bg-primary p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-md font-semibold text-primary">{draft.name}</span>
                                                <BadgeWithDot size="sm" type="pill-color" color="blue">Draft</BadgeWithDot>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-tertiary">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" /> Created {formatDate(draft.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users01 className="w-4 h-4" /> {draft.totalRecipients ?? 0} contacts
                                                </span>
                                                {draft.cadencePattern && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Mail01 className="w-4 h-4" /> {draft.cadencePattern}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" color="primary" iconLeading={Edit05}>
                                                Continue Editing
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="tertiary-destructive"
                                                iconLeading={Trash01}
                                                onClick={() => removeCampaign({ id: draft._id })}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Tabs.Panel>

                    {/* Needs Approval Tab — shows draft campaigns as needing review */}
                    <Tabs.Panel id="approval" className="pt-6">
                        <div className="flex flex-col gap-4">
                            {draftCampaigns.length === 0 ? (
                                <div className="rounded-xl border border-secondary bg-primary p-12 text-center">
                                    <FileCheck02 className="w-10 h-10 text-tertiary mx-auto mb-3" />
                                    <p className="text-md font-medium text-primary">All caught up</p>
                                    <p className="text-sm text-tertiary mt-1">No campaigns need approval right now.</p>
                                </div>
                            ) : (
                                draftCampaigns.map((item) => (
                                    <div
                                        key={item._id}
                                        className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-4"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-md font-semibold text-primary">{item.name}</span>
                                                    <BadgeWithDot size="sm" type="pill-color" color="blue">Draft</BadgeWithDot>
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-tertiary">{item.description}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-tertiary">
                                                    <span className="flex items-center gap-1.5">
                                                        <Users01 className="w-4 h-4" /> {item.totalRecipients ?? 0} recipients
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" /> Created {formatDate(item.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    color="primary"
                                                    iconLeading={Send01}
                                                    onClick={() => updateStatus({ id: item._id, status: "active" })}
                                                >
                                                    Approve & Launch
                                                </Button>
                                                <Button size="sm" color="secondary" iconLeading={Edit05}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="tertiary-destructive"
                                                    iconLeading={Trash01}
                                                    onClick={() => removeCampaign({ id: item._id })}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Tabs.Panel>

                    {/* Templates Tab — placeholder empty state */}
                    <Tabs.Panel id="templates" className="pt-6">
                        <div className="rounded-xl border border-secondary bg-primary p-12 text-center">
                            <FileCheck02 className="w-10 h-10 text-tertiary mx-auto mb-3" />
                            <p className="text-md font-medium text-primary">Templates coming soon</p>
                            <p className="text-sm text-tertiary mt-1 max-w-md mx-auto">
                                Email templates will be available here once the templates module is built. You can configure campaign templates through the Knowledge Base in the meantime.
                            </p>
                            <div className="mt-4">
                                <Link href="/knowledge-base">
                                    <Button size="sm" color="secondary">
                                        Go to Knowledge Base
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </Tabs.Panel>
                </Tabs>
            </div>
        </div>
    );
}
