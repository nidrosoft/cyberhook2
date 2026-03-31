"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Calendar,
    CheckCircle,
    CreditCard02,
    DownloadCloud01,
    Mail01,
    SearchLg,
    Settings01,
    Target05,
    Zap,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTokens } from "@/hooks/use-tokens";

const PLAN_DISPLAY_NAMES: Record<string, string> = {
    starter: "Starter Plan",
    growth: "Growth Plan",
    enterprise: "Enterprise Plan",
};

const PLAN_PRICES: Record<string, string> = {
    starter: "$299",
    growth: "$599",
    enterprise: "$1,250",
};

const planFeatures = [
    "Unlimited AI Email Campaigns",
    "Custom Knowledge Base Uploads (Up to 50GB)",
    "CRM Integrations (Salesforce, HubSpot)",
    "Ransomware & Dark Web Monitoring",
    "Dedicated Success Manager",
];

// Placeholder invoices — will be replaced once Stripe billing is connected
const invoices = [
    { id: "INV-2026-006", date: "Mar 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2026-005", date: "Feb 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2026-004", date: "Jan 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-003", date: "Dec 01, 2025", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-002", date: "Nov 01, 2025", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-001", date: "Oct 01, 2025", amount: "$599.00", plan: "Growth", status: "Paid" },
];

function formatNumber(n: number): string {
    return n.toLocaleString("en-US");
}

function getStatusBadgeColor(status: string | undefined): "success" | "warning" | "error" | "gray" {
    switch (status) {
        case "active":
            return "success";
        case "trial":
            return "warning";
        case "past_due":
            return "error";
        case "cancelled":
            return "error";
        default:
            return "gray";
    }
}

function getStatusLabel(status: string | undefined): string {
    switch (status) {
        case "active":
            return "Active";
        case "trial":
            return "Trial";
        case "past_due":
            return "Past Due";
        case "cancelled":
            return "Cancelled";
        case "pending_approval":
            return "Pending";
        default:
            return "—";
    }
}

function getProgressBarColor(status: "healthy" | "warning" | "critical"): string {
    switch (status) {
        case "healthy":
            return "bg-success-500";
        case "warning":
            return "bg-warning-500";
        case "critical":
            return "bg-error-500";
    }
}

function generateSparklineData(total: number, points: number = 6): { value: number }[] {
    if (total === 0) return Array.from({ length: points }, () => ({ value: 0 }));
    const step = total / points;
    return Array.from({ length: points }, (_, i) => ({
        value: Math.round(step * (i + 1) * (0.7 + Math.random() * 0.6)),
    }));
}

export default function BillingPage() {
    const { companyId } = useCurrentUser();
    const {
        tokensRemaining,
        tokenAllocation,
        tokensUsed,
        tokenPercentage,
        tokenStatus,
        daysUntilReset,
        resetDisplayText,
        isLoading: isTokensLoading,
    } = useTokens();

    const userWithCompany = useQuery(api.users.getCurrentUserWithCompany);
    const company = userWithCompany?.company;

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

    const [invoiceSort, setInvoiceSort] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });

    const isLoading =
        userWithCompany === undefined ||
        isTokensLoading ||
        searchStats === undefined ||
        campaignStats === undefined ||
        eventStats === undefined;

    const planId = company?.planId ?? "enterprise";
    const planDisplayName = PLAN_DISPLAY_NAMES[planId] ?? `${planId.charAt(0).toUpperCase()}${planId.slice(1)} Plan`;
    const planPrice = PLAN_PRICES[planId] ?? "—";
    const planStatus = company?.planStatus ?? company?.status;

    const usedPercent = tokenAllocation > 0
        ? ((tokensUsed / tokenAllocation) * 100).toFixed(1)
        : "0";

    const renewalDate = company?.tokenResetDate
        ? new Date(company.tokenResetDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : undefined;

    const usageMetrics = [
        {
            name: "Live Searches",
            value: formatNumber(searchStats?.last30Days ?? 0),
            change: `${searchStats?.last7Days ?? 0}`,
            trend: "positive" as const,
            description: "this month",
            chartColor: "text-brand-500",
            data: generateSparklineData(searchStats?.last30Days ?? 0),
        },
        {
            name: "AI Emails Sent",
            value: formatNumber(campaignStats?.totalEmailsSent ?? 0),
            change: `${campaignStats?.active ?? 0} active`,
            trend: "positive" as const,
            description: "total sent",
            chartColor: "text-success-500",
            data: generateSparklineData(campaignStats?.totalEmailsSent ?? 0),
        },
        {
            name: "Appointments",
            value: formatNumber(eventStats?.byType?.appointment ?? 0),
            change: `${eventStats?.thisWeek ?? 0}`,
            trend: "positive" as const,
            description: "this month",
            chartColor: "text-warning-500",
            data: generateSparklineData(eventStats?.byType?.appointment ?? 0),
        },
        {
            name: "Events Attended",
            value: formatNumber(eventStats?.total ?? 0),
            change: `${eventStats?.upcoming ?? 0}`,
            trend: "positive" as const,
            description: "all time",
            chartColor: "text-error-500",
            data: generateSparklineData(eventStats?.total ?? 0),
        },
    ];

    if (isLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                    <p className="text-sm text-tertiary">Loading billing data…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-8 pb-12 w-full">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-5 px-4 lg:px-8">
                    <div className="relative flex flex-col gap-4 border-b border-secondary pb-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-xl font-semibold text-primary lg:text-display-sm">Billing & Usage</h1>
                                <p className="text-md text-tertiary">
                                    Manage your subscription, monitor usage, and view billing history.
                                </p>
                            </div>
                            <Button color="secondary" size="md" iconLeading={Settings01}>
                                Manage
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Current Plan + Token Usage */}
                <div className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-3 lg:px-8">
                    {/* Plan Card */}
                    <div className="flex flex-col gap-6 rounded-2xl border border-secondary bg-secondary_subtle p-6 lg:col-span-2">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-lg font-semibold text-primary">{planDisplayName}</h2>
                                    <Badge color={getStatusBadgeColor(planStatus)} size="sm">
                                        {getStatusLabel(planStatus)}
                                    </Badge>
                                </div>
                                {renewalDate && (
                                    <p className="text-sm text-tertiary">Renews on {renewalDate}</p>
                                )}
                            </div>
                            <h3 className="text-2xl font-semibold text-primary sm:text-display-sm">
                                {planPrice}<span className="text-md font-normal text-tertiary">/mo</span>
                            </h3>
                        </div>

                        <div className="flex flex-col gap-3">
                            {planFeatures.map((feature) => (
                                <div key={feature} className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 shrink-0 text-brand-secondary" />
                                    <span className="text-sm text-secondary">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 border-t border-secondary pt-5">
                            <Button color="primary" size="md" iconLeading={Zap}>
                                Upgrade Plan
                            </Button>
                            <Button color="secondary" size="md">
                                Cancel Subscription
                            </Button>
                        </div>
                    </div>

                    {/* Token Usage Card */}
                    <div className="flex flex-col gap-6 rounded-2xl border border-secondary bg-primary p-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold text-primary">Live Search Tokens</h3>
                                <BadgeWithIcon size="sm" color="gray" iconLeading={Zap}>
                                    {resetDisplayText}
                                </BadgeWithIcon>
                            </div>
                            <p className="text-sm text-tertiary">Used for Live Search queries</p>
                        </div>

                        <div className="flex flex-col gap-3 mt-auto">
                            <div className="flex items-end justify-between">
                                <span className="text-display-xs font-semibold text-primary">
                                    {formatNumber(tokensUsed)}
                                </span>
                                <span className="pb-1 text-sm font-medium text-tertiary">
                                    / {formatNumber(tokenAllocation)}
                                </span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full border border-secondary bg-secondary_subtle">
                                <div
                                    className={`h-full rounded-full transition-all ${getProgressBarColor(tokenStatus)}`}
                                    style={{ width: `${usedPercent}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-tertiary">
                                <span>{formatNumber(tokensUsed)} used</span>
                                <span>{formatNumber(tokensRemaining)} remaining</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage History Metrics */}
                <div className="flex flex-col gap-4 px-4 lg:px-8">
                    <h2 className="text-lg font-semibold text-primary">Usage This Month</h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                        {usageMetrics.map((metric) => (
                            <MetricsChart04
                                key={metric.name}
                                className="bg-primary rounded-xl"
                                title={metric.value}
                                subtitle={metric.name}
                                type="trend"
                                change={`${metric.trend === "positive" ? "+" : "-"}${metric.change}`}
                                changeTrend={metric.trend}
                                changeDescription={metric.description}
                                chartColor={metric.chartColor}
                                chartData={metric.data}
                            />
                        ))}
                    </div>
                </div>

                {/* Billing History Table — placeholder until Stripe integration is connected */}
                <div className="px-4 lg:px-8">
                    <TableCard.Root className="rounded-xl">
                        <TableCard.Header title="Billing History" />
                        <div className="overflow-x-auto">
                        <Table
                            aria-label="Billing History"
                            sortDescriptor={invoiceSort}
                            onSortChange={setInvoiceSort}
                        >
                            <Table.Header>
                                <Table.Head id="id" label="Invoice" isRowHeader allowsSorting className="w-full" />
                                <Table.Head id="date" label="Date" allowsSorting />
                                <Table.Head id="amount" label="Amount" allowsSorting />
                                <Table.Head id="plan" label="Plan" allowsSorting />
                                <Table.Head id="status" label="Status" allowsSorting />
                                <Table.Head id="actions" />
                            </Table.Header>
                            <Table.Body items={invoices}>
                                {(item) => (
                                    <Table.Row id={item.id}>
                                        <Table.Cell>
                                            <span className="font-medium text-primary">{item.id}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="whitespace-nowrap text-secondary">{item.date}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="font-medium text-secondary">{item.amount}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-secondary">{item.plan}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color="success" size="sm">
                                                {item.status}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <ButtonUtility
                                                size="sm"
                                                color="tertiary"
                                                tooltip="Download Invoice"
                                                icon={DownloadCloud01}
                                            />
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                        </div>
                        <div className="border-t border-secondary px-5 py-3">
                            <p className="text-xs text-tertiary">
                                Invoice history will appear once Stripe is connected.
                            </p>
                        </div>
                    </TableCard.Root>
                </div>

                {/* Payment Method — placeholder until Stripe integration is connected */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-5 rounded-2xl border border-secondary bg-secondary_subtle p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-primary">Payment Method</h2>
                            <Button color="secondary" size="md" iconLeading={CreditCard02}>
                                Update Payment Method
                            </Button>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl border border-secondary bg-primary p-4">
                            <div className="flex h-11 w-16 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                <CreditCard02 className="h-6 w-6 text-tertiary" />
                            </div>
                            <div className="flex flex-1 flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary">•••• •••• •••• 4242</span>
                                    <Badge color="gray" size="sm">Visa</Badge>
                                </div>
                                <span className="text-sm text-tertiary">Expires 12/2027</span>
                            </div>
                        </div>

                        <p className="text-xs text-tertiary">
                            Payment method management will be available once Stripe is connected.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
