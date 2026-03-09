"use client";

import { useState } from "react";
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

const usageMetrics = [
    {
        name: "Live Searches",
        value: "284",
        change: "12%",
        trend: "positive" as const,
        description: "this month",
        chartColor: "text-brand-500",
        data: [{ value: 42 }, { value: 88 }, { value: 134 }, { value: 195 }, { value: 250 }, { value: 284 }],
    },
    {
        name: "AI Emails Sent",
        value: "8,540",
        change: "24%",
        trend: "positive" as const,
        description: "this month",
        chartColor: "text-success-500",
        data: [{ value: 1200 }, { value: 2800 }, { value: 4500 }, { value: 6100 }, { value: 7800 }, { value: 8540 }],
    },
    {
        name: "Appointments",
        value: "44",
        change: "10%",
        trend: "positive" as const,
        description: "this month",
        chartColor: "text-warning-500",
        data: [{ value: 6 }, { value: 14 }, { value: 22 }, { value: 30 }, { value: 38 }, { value: 44 }],
    },
    {
        name: "Events Attended",
        value: "12",
        change: "3",
        trend: "positive" as const,
        description: "this quarter",
        chartColor: "text-error-500",
        data: [{ value: 3 }, { value: 5 }, { value: 7 }, { value: 9 }, { value: 11 }, { value: 12 }],
    },
];

const invoices = [
    { id: "INV-2026-006", date: "Mar 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2026-005", date: "Feb 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2026-004", date: "Jan 01, 2026", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-003", date: "Dec 01, 2025", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-002", date: "Nov 01, 2025", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2025-001", date: "Oct 01, 2025", amount: "$599.00", plan: "Growth", status: "Paid" },
];

const planFeatures = [
    "Unlimited AI Email Campaigns",
    "Custom Knowledge Base Uploads (Up to 50GB)",
    "CRM Integrations (Salesforce, HubSpot)",
    "Ransomware & Dark Web Monitoring",
    "Dedicated Success Manager",
];

export default function BillingPage() {
    const [invoiceSort, setInvoiceSort] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });

    return (
        <div className="pt-8 pb-12 w-full">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-5 px-4 lg:px-8">
                    <div className="relative flex flex-col gap-4 border-b border-secondary pb-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-display-sm font-semibold text-primary">Billing & Usage</h1>
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
                                    <h2 className="text-lg font-semibold text-primary">Enterprise Plan</h2>
                                    <Badge color="brand" size="sm">Active</Badge>
                                </div>
                                <p className="text-sm text-tertiary">Renews on April 1, 2026</p>
                            </div>
                            <h3 className="text-display-sm font-semibold text-primary">
                                $1,250<span className="text-md font-normal text-tertiary">/mo</span>
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
                                    Resets in 12 days
                                </BadgeWithIcon>
                            </div>
                            <p className="text-sm text-tertiary">Used for Live Search queries</p>
                        </div>

                        <div className="flex flex-col gap-3 mt-auto">
                            <div className="flex items-end justify-between">
                                <span className="text-display-xs font-semibold text-primary">842</span>
                                <span className="pb-1 text-sm font-medium text-tertiary">/ 1,000</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full border border-secondary bg-secondary_subtle">
                                <div
                                    className="h-full rounded-full bg-success-500 transition-all"
                                    style={{ width: "84.2%" }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-tertiary">
                                <span>842 used</span>
                                <span>158 remaining</span>
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

                {/* Billing History Table */}
                <div className="px-4 lg:px-8">
                    <TableCard.Root className="rounded-xl">
                        <TableCard.Header title="Billing History" />
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
                    </TableCard.Root>
                </div>

                {/* Payment Method */}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
