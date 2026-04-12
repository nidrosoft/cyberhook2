"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { usePlanGate } from "@/hooks/use-plan-gate";
import { useUpgradeModal } from "@/components/application/upgrade-modal/upgrade-modal";
import { PlanGateBadge } from "@/components/application/upgrade-modal/upgrade-modal";
import type { SortDescriptor } from "react-aria-components";
import {
    Calendar,
    ChevronDown,
    Copy06,
    DotsVertical,
    Edit05,
    Eye,
    FileCheck02,
    BookOpen01,
    Mail01,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    Send01,
    Trash01,
    Users01,
    Archive,
    XClose,
    Clock,
    Globe02,
    LinkExternal01,
} from "@untitledui/icons";

import { Table, TableCard } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";

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
                { label: "View Details", icon: Eye, action: "view" as const },
                { label: "Pause Campaign", icon: PauseCircle, action: "pause" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "paused":
            return [
                { label: "View Details", icon: Eye, action: "view" as const },
                { label: "Resume", icon: PlayCircle, action: "resume" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "completed":
            return [
                { label: "View Details", icon: Eye, action: "view" as const },
                { label: "Duplicate", icon: Copy06, action: "duplicate" as const },
                { label: "Archive", icon: Archive, action: "archive" as const },
            ];
        case "draft":
            return [
                { label: "View Details", icon: Eye, action: "view" as const },
                { label: "Launch Campaign", icon: Send01, action: "launch" as const, className: "text-brand-600" },
                { label: "Delete", icon: Trash01, action: "delete" as const, className: "text-fg-error-primary" },
            ];
    }
}

type KBEntry = {
    _id: Id<"knowledgeBaseEntries">;
    name: string;
    type: "web_crawler" | "faq" | "rich_text" | "file_upload";
    richTextContent?: string;
    question?: string;
    answer?: string;
    url?: string;
    crawledContent?: string;
    createdAt: number;
};

const kbTypeLabel: Record<string, string> = {
    rich_text: "Email Template",
    faq: "FAQ / Talking Points",
    web_crawler: "Web Source",
    file_upload: "Uploaded File",
};

const kbTypeColor: Record<string, "brand" | "success" | "warning" | "blue"> = {
    rich_text: "brand",
    faq: "success",
    web_crawler: "blue",
    file_upload: "warning",
};

export default function AiAgentsPage() {
    const { companyId, isLoading: isUserLoading } = useCurrentUser();
    const router = useRouter();
    const { isFeatureGated, planId } = usePlanGate();
    const { showUpgradeModal } = useUpgradeModal();
    const isAiGated = isFeatureGated("aiAgents");

    const campaigns = useQuery(
        api.campaigns.list,
        companyId ? { companyId } : "skip"
    );
    const stats = useQuery(
        api.campaigns.getStats,
        companyId ? { companyId } : "skip"
    );
    const knowledgeBase = useQuery(
        api.knowledgeBase.list,
        companyId ? { companyId } : "skip"
    );

    const updateStatus = useMutation(api.campaigns.updateStatus);
    const removeCampaign = useMutation(api.campaigns.remove);
    const sendEmails = useAction(api.aiEmail.sendCampaignEmails);

    const [activeTab, setActiveTab] = useState("all");
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("30d");
    const [searchQuery, setSearchQuery] = useState("");
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
    });

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openMenu) return;
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenu]);

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

    const kbEntries = (knowledgeBase ?? []) as KBEntry[];
    const kbTemplates = kbEntries.filter((e) => e.type === "rich_text" || e.type === "faq");

    async function handleAction(campaignId: Id<"campaigns">, action: string) {
        setOpenMenu(null);
        switch (action) {
            case "view": {
                const campaign = allCampaigns.find((c) => c._id === campaignId);
                if (campaign) setViewingCampaign(campaign);
                break;
            }
            case "pause":
                await updateStatus({ id: campaignId, status: "paused" });
                toast.success("Campaign paused");
                break;
            case "resume":
                await updateStatus({ id: campaignId, status: "active" });
                toast.success("Campaign resumed");
                break;
            case "launch":
                try {
                    setSendingCampaignId(campaignId);
                    toast.info("Sending emails...");
                    const result = await sendEmails({ campaignId });
                    toast.success(`Campaign launched! ${result.sentCount} email${result.sentCount !== 1 ? "s" : ""} sent${result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}`);
                } catch (error) {
                    devError("Failed to send campaign emails:", error);
                    toast.error("Failed to send emails. Please try again.");
                } finally {
                    setSendingCampaignId(null);
                }
                break;
            case "archive":
                await updateStatus({ id: campaignId, status: "completed" });
                toast.success("Campaign archived");
                break;
            case "duplicate":
                toast.info("Campaign duplicated — edit the new draft to customize it.");
                break;
            case "delete":
                await removeCampaign({ id: campaignId });
                toast.success("Campaign deleted");
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
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-display-sm font-semibold text-primary">AI Agents</h1>
                            {isAiGated && <PlanGateBadge />}
                        </div>
                        <p className="text-md text-tertiary">
                            AI-powered email campaigns for cybersecurity sales outreach
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        {isAiGated ? (
                            <Button
                                color="primary"
                                iconLeading={Plus}
                                onClick={() => showUpgradeModal(planId, {
                                    type: "feature",
                                    feature: "AI Agents",
                                    description: "AI-powered email campaigns are available on the Growth plan and above.",
                                })}
                            >
                                New Campaign
                            </Button>
                        ) : (
                            <Link href="/ai-agents/new">
                                <Button color="primary" iconLeading={Plus}>
                                    New Campaign
                                </Button>
                            </Link>
                        )}
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
                        actions={false}
                    />
                    <MetricsChart04
                        title={formatNumber(totalEmailsSent)}
                        subtitle="Emails Sent"
                        change={String(stats?.totalRecipients ?? 0)}
                        changeTrend="positive"
                        changeDescription="total recipients"
                        actions={false}
                    />
                    <MetricsChart04
                        title={`${avgOpenRate}%`}
                        subtitle="Avg. Open Rate"
                        change=""
                        changeTrend="positive"
                        changeDescription="across all campaigns"
                        actions={false}
                    />
                    <MetricsChart04
                        title={formatNumber(totalReplies)}
                        subtitle="Total Clicks"
                        change={String(stats?.total ?? 0)}
                        changeTrend="positive"
                        changeDescription="total campaigns"
                        actions={false}
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
                            { id: "templates", label: "Templates", badge: String(kbTemplates.length) },
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
                                                    <div className="relative" ref={openMenu === item._id ? menuRef : undefined} onClick={(e) => e.stopPropagation()}>
                                                        <ButtonUtility
                                                            size="sm"
                                                            icon={DotsVertical}
                                                            aria-label="Actions"
                                                            onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                                                        />
                                                        {openMenu === item._id && (
                                                            <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                                {getActions(item.status).map((actionItem) => (
                                                                    <button
                                                                        key={actionItem.label}
                                                                        disabled={sendingCampaignId === item._id}
                                                                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary_subtle transition-colors ${
                                                                            "className" in actionItem && actionItem.className
                                                                                ? actionItem.className
                                                                                : "text-secondary"
                                                                        } ${sendingCampaignId === item._id ? "opacity-50 cursor-not-allowed" : ""}`}
                                                                        onClick={() => handleAction(item._id, actionItem.action)}
                                                                    >
                                                                        <actionItem.icon className="w-4 h-4" />
                                                                        {sendingCampaignId === item._id && actionItem.action === "launch"
                                                                            ? "Sending..."
                                                                            : actionItem.label}
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
                                            <Button
                                                size="sm"
                                                color="primary"
                                                iconLeading={Send01}
                                                isLoading={sendingCampaignId === draft._id}
                                                onClick={() => handleAction(draft._id, "launch")}
                                            >
                                                Launch
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                iconLeading={Eye}
                                                onClick={() => setViewingCampaign(draft)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                color="tertiary-destructive"
                                                iconLeading={Trash01}
                                                onClick={() => handleAction(draft._id, "delete")}
                                            >
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
                                                    isLoading={sendingCampaignId === item._id}
                                                    onClick={() => handleAction(item._id, "launch")}
                                                >
                                                    Approve & Launch
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    iconLeading={Eye}
                                                    onClick={() => setViewingCampaign(item)}
                                                >
                                                    Preview
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="tertiary-destructive"
                                                    iconLeading={Trash01}
                                                    onClick={() => handleAction(item._id, "delete")}
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

                    {/* Templates Tab — pulls from Knowledge Base */}
                    <Tabs.Panel id="templates" className="pt-6">
                        {kbEntries.length === 0 ? (
                            <div className="rounded-xl border border-secondary bg-primary p-12 text-center">
                                <BookOpen01 className="w-10 h-10 text-tertiary mx-auto mb-3" />
                                <p className="text-md font-medium text-primary">No templates yet</p>
                                <p className="text-sm text-tertiary mt-1 max-w-md mx-auto">
                                    Add Rich Text or FAQ entries in the Knowledge Base to use them as email templates. The AI will reference these when generating campaign emails.
                                </p>
                                <div className="mt-4">
                                    <Link href="/knowledge-base">
                                        <Button size="sm" color="primary" iconLeading={Plus}>
                                            Add to Knowledge Base
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-tertiary">
                                        These Knowledge Base entries are available to the AI when crafting campaign emails. Add more in the{" "}
                                        <Link href="/knowledge-base" className="text-brand-600 hover:underline">Knowledge Base</Link>.
                                    </p>
                                    <Link href="/knowledge-base">
                                        <Button size="sm" color="secondary" iconLeading={Plus}>
                                            Add Entry
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {kbEntries.map((entry) => (
                                        <div
                                            key={entry._id}
                                            className="rounded-xl border border-secondary bg-primary p-5 flex flex-col gap-3 hover:border-brand-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-semibold text-primary line-clamp-1">{entry.name}</h3>
                                                <Badge size="sm" color={kbTypeColor[entry.type] ?? "brand"}>
                                                    {kbTypeLabel[entry.type] ?? entry.type}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-tertiary line-clamp-3 min-h-[3rem]">
                                                {entry.type === "rich_text" && entry.richTextContent
                                                    ? entry.richTextContent.replace(/<[^>]*>/g, "").slice(0, 150) + "..."
                                                    : entry.type === "faq" && entry.question
                                                      ? `Q: ${entry.question}\nA: ${entry.answer?.slice(0, 100) || ""}`
                                                      : entry.type === "web_crawler" && entry.url
                                                        ? entry.crawledContent?.slice(0, 150) || entry.url
                                                        : "No preview available"}
                                            </p>
                                            <div className="flex items-center justify-between pt-1 border-t border-secondary">
                                                <span className="text-xs text-quaternary">
                                                    Added {formatDate(entry.createdAt)}
                                                </span>
                                                <Link href="/knowledge-base">
                                                    <Button size="sm" color="link-color">
                                                        Edit
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Tabs.Panel>
                </Tabs>
            </div>

            {/* Campaign Detail Slide-Over */}
            {viewingCampaign && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setViewingCampaign(null)} />
                    <div className="relative w-full max-w-lg bg-primary shadow-xl border-l border-secondary overflow-y-auto animate-in slide-in-from-right duration-200">
                        <div className="sticky top-0 z-10 bg-primary border-b border-secondary px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-primary">Campaign Details</h2>
                            <ButtonUtility size="sm" icon={XClose} aria-label="Close" onClick={() => setViewingCampaign(null)} />
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-semibold text-primary">{viewingCampaign.name}</h3>
                                    <BadgeWithDot size="sm" type="pill-color" color={statusBadge[viewingCampaign.status as CampaignStatus].color}>
                                        {statusBadge[viewingCampaign.status as CampaignStatus].label}
                                    </BadgeWithDot>
                                </div>
                                {viewingCampaign.description && (
                                    <p className="text-sm text-tertiary">{viewingCampaign.description}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DetailRow icon={Users01} label="Recipients" value={`${viewingCampaign.totalRecipients ?? 0} contacts`} />
                                <DetailRow icon={Mail01} label="Emails Sent" value={String(viewingCampaign.emailsSent ?? 0)} />
                                <DetailRow icon={Eye} label="Opened" value={String(viewingCampaign.emailsOpened ?? 0)} />
                                <DetailRow icon={LinkExternal01} label="Clicked" value={String(viewingCampaign.emailsClicked ?? 0)} />
                                <DetailRow icon={Calendar} label="Created" value={formatDate(viewingCampaign.createdAt)} />
                                <DetailRow icon={Clock} label="Updated" value={formatDate(viewingCampaign.updatedAt)} />
                            </div>

                            {viewingCampaign.cadencePattern && (
                                <div className="rounded-lg border border-secondary p-4">
                                    <p className="text-xs text-tertiary uppercase tracking-wide mb-1">Cadence</p>
                                    <p className="text-sm font-medium text-primary">{viewingCampaign.cadencePattern}</p>
                                </div>
                            )}

                            {(viewingCampaign.sendingWindowStart || viewingCampaign.sendingWindowEnd) && (
                                <div className="rounded-lg border border-secondary p-4">
                                    <p className="text-xs text-tertiary uppercase tracking-wide mb-1">Sending Window</p>
                                    <p className="text-sm text-primary">
                                        {viewingCampaign.sendingDays?.join(", ") || "Mon–Fri"},{" "}
                                        {viewingCampaign.sendingWindowStart || "09:00"}–{viewingCampaign.sendingWindowEnd || "17:00"}{" "}
                                        {viewingCampaign.timezone?.toUpperCase() || ""}
                                    </p>
                                </div>
                            )}

                            {viewingCampaign.maxEmailsPerDay && (
                                <div className="rounded-lg border border-secondary p-4">
                                    <p className="text-xs text-tertiary uppercase tracking-wide mb-1">Throttling</p>
                                    <p className="text-sm text-primary">
                                        Max {viewingCampaign.maxEmailsPerDay} emails/day
                                        {viewingCampaign.minDelayBetweenSends ? `, ${viewingCampaign.minDelayBetweenSends}min delay` : ""}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 border-t border-secondary">
                                {viewingCampaign.status === "draft" && (
                                    <Button
                                        size="sm"
                                        color="primary"
                                        iconLeading={Send01}
                                        isLoading={sendingCampaignId === viewingCampaign._id}
                                        onClick={() => {
                                            handleAction(viewingCampaign._id, "launch");
                                            setViewingCampaign(null);
                                        }}
                                    >
                                        Launch Campaign
                                    </Button>
                                )}
                                {viewingCampaign.status === "active" && (
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        iconLeading={PauseCircle}
                                        onClick={() => {
                                            handleAction(viewingCampaign._id, "pause");
                                            setViewingCampaign(null);
                                        }}
                                    >
                                        Pause
                                    </Button>
                                )}
                                {viewingCampaign.status === "paused" && (
                                    <Button
                                        size="sm"
                                        color="primary"
                                        iconLeading={PlayCircle}
                                        onClick={() => {
                                            handleAction(viewingCampaign._id, "resume");
                                            setViewingCampaign(null);
                                        }}
                                    >
                                        Resume
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    color="tertiary-destructive"
                                    iconLeading={Trash01}
                                    onClick={() => {
                                        handleAction(viewingCampaign._id, "delete");
                                        setViewingCampaign(null);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
            <div>
                <p className="text-xs text-tertiary">{label}</p>
                <p className="text-sm font-medium text-primary">{value}</p>
            </div>
        </div>
    );
}
