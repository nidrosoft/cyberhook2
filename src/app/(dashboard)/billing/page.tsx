"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
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
import { usePlanGate } from "@/hooks/use-plan-gate";
import { getPlan, getUpgradeTarget, PLANS, PLAN_ORDER, formatLimit, type PlanTier } from "@/lib/plans";

// Placeholder invoices — used as fallback when no Stripe data exists
const placeholderInvoices = [
    { id: "INV-2026-006", date: "Mar 01, 2026", amount: "$299.00", plan: "Growth", status: "Paid" },
    { id: "INV-2026-005", date: "Feb 01, 2026", amount: "$299.00", plan: "Growth", status: "Paid" },
    { id: "INV-2026-004", date: "Jan 01, 2026", amount: "$299.00", plan: "Growth", status: "Paid" },
    { id: "INV-2025-003", date: "Dec 01, 2025", amount: "$299.00", plan: "Growth", status: "Paid" },
    { id: "INV-2025-002", date: "Nov 01, 2025", amount: "$299.00", plan: "Growth", status: "Paid" },
    { id: "INV-2025-001", date: "Oct 01, 2025", amount: "$99.00", plan: "Solo", status: "Paid" },
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

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
    const isUnlimited = limit === -1;
    const pct = isUnlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const status: "healthy" | "warning" | "critical" = pct >= 90 ? "critical" : pct >= 70 ? "warning" : "healthy";
    const barColor = status === "critical" ? "bg-error-500" : status === "warning" ? "bg-warning-500" : "bg-success-500";

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary">{label}</span>
                <span className="text-xs font-semibold text-primary">
                    {formatNumber(used)} / {isUnlimited ? "∞" : formatNumber(limit)}
                </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary_subtle">
                <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: isUnlimited ? "0%" : `${pct}%` }}
                />
            </div>
            {!isUnlimited && pct >= 80 && (
                <span className="text-xs text-warning-primary">
                    {pct >= 100 ? "Limit reached" : "Approaching limit"}
                </span>
            )}
        </div>
    );
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

    // Stripe data queries
    const stripeSubscriptions = useQuery(api.stripe.getUserSubscriptions);
    const stripePayments = useQuery(api.stripe.getUserPayments);
    const createPortalSession = useAction(api.stripe.createPortalSession);

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

    const { planId: gatePlanId, plan: gatePlan, searches, reports, watchlist, activeUsers, userLimit } = usePlanGate();

    // Sync plan from Stripe subscription if available
    const activeSub = stripeSubscriptions?.find(
        (s: { status: string }) => s.status === "active" || s.status === "trialing"
    ) as { status: string; metadata?: Record<string, string>; currentPeriodEnd?: number } | undefined;
    const syncedPlanId = activeSub?.metadata?.planId ?? company?.planId ?? "growth";
    const plan = getPlan(syncedPlanId);
    const planDisplayName = `${plan.name} Plan`;
    const planPrice = plan.priceLabel;
    const upgradeTarget = getUpgradeTarget(plan.id);
    const planStatus = activeSub
        ? (activeSub.status === "trialing" ? "trial" : activeSub.status === "active" ? "active" : company?.planStatus ?? company?.status)
        : (company?.planStatus ?? company?.status);

    // Build invoices from Stripe payments or fallback to placeholders
    const invoiceData = (stripePayments && stripePayments.length > 0)
        ? stripePayments.map((p: { stripePaymentIntentId?: string; created?: number; amount?: number; status?: string }, i: number) => ({
            id: p.stripePaymentIntentId ? `INV-${p.stripePaymentIntentId.slice(-6).toUpperCase()}` : `INV-${i + 1}`,
            date: p.created ? new Date(p.created).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "\u2014",
            amount: p.amount ? `$${(p.amount / 100).toFixed(2)}` : "\u2014",
            plan: planDisplayName.replace(" Plan", ""),
            status: p.status === "succeeded" ? "Paid" : p.status === "pending" ? "Pending" : (p.status ?? "Unknown"),
        }))
        : placeholderInvoices;

    const handleManageSubscription = useCallback(async () => {
        try {
            const { url } = await createPortalSession({
                returnUrl: window.location.href,
            });
            if (url) window.location.href = url;
        } catch {
            toast.error("Unable to open billing portal. Please try again.");
        }
    }, [createPortalSession]);

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
                            <Button color="secondary" size="md" iconLeading={Settings01} onClick={handleManageSubscription}>
                                Manage Subscription
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
                                    {plan.badge && <Badge color="brand" size="sm">{plan.badge}</Badge>}
                                </div>
                                {renewalDate && (
                                    <p className="text-sm text-tertiary">Renews on {renewalDate}</p>
                                )}
                                <p className="text-sm text-tertiary mt-1">{plan.tagline}</p>
                            </div>
                            <h3 className="text-2xl font-semibold text-primary sm:text-display-sm">
                                {planPrice}<span className="text-md font-normal text-tertiary">/mo</span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {plan.features.map((feature) => (
                                <div key={feature} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 shrink-0 text-brand-secondary" />
                                    <span className="text-sm text-secondary">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 border-t border-secondary pt-5">
                            {upgradeTarget && (
                                <Button color="primary" size="md" iconLeading={Zap} onClick={handleManageSubscription}>
                                    Upgrade to {getPlan(upgradeTarget).name}
                                </Button>
                            )}
                            <Button color="secondary" size="md" onClick={handleManageSubscription}>
                                {upgradeTarget ? "Manage Subscription" : "Manage Subscription"}
                            </Button>
                        </div>
                    </div>

                    {/* Usage Overview Card */}
                    <div className="flex flex-col gap-5 rounded-2xl border border-secondary bg-primary p-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold text-primary">Usage Overview</h3>
                                <BadgeWithIcon size="sm" color="gray" iconLeading={Zap}>
                                    {resetDisplayText}
                                </BadgeWithIcon>
                            </div>
                            <p className="text-sm text-tertiary">Monthly plan limits</p>
                        </div>

                        <div className="flex flex-col gap-4 mt-auto">
                            {/* Searches */}
                            <UsageMeter label="Searches" used={searches.used} limit={searches.limit} />
                            {/* Reports */}
                            <UsageMeter label="Reports" used={reports.used} limit={reports.limit} />
                            {/* Watchlist */}
                            <UsageMeter label="Watchlist Domains" used={watchlist.used} limit={watchlist.limit} />
                            {/* Users */}
                            <UsageMeter label="Team Members" used={activeUsers} limit={userLimit} />
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

                {/* Billing History Table */}
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
                            <Table.Body items={invoiceData}>
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
                                {stripePayments && stripePayments.length > 0
                                    ? `Showing ${stripePayments.length} payment${stripePayments.length === 1 ? "" : "s"} from Stripe.`
                                    : "Invoice history will sync automatically when Stripe billing is active."
                                }
                            </p>
                        </div>
                    </TableCard.Root>
                </div>

                {/* Payment Method */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-5 rounded-2xl border border-secondary bg-secondary_subtle p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-primary">Payment Method</h2>
                            <Button color="secondary" size="md" iconLeading={CreditCard02} onClick={handleManageSubscription}>
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
                            {stripeSubscriptions && stripeSubscriptions.length > 0
                                ? "Manage your payment method via the Stripe billing portal."
                                : "Payment method management will be available once Stripe is connected."
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
