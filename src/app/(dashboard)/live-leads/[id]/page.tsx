"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Building01,
    CheckCircle,
    Copy01,
    Globe01,
    LinkExternal01,
    Mail01,
    Phone01,
    Plus,
    Shield01,
    Star01,
    Target05,
    Users01,
    AlertCircle,
    BarChartSquare02,
    CreditCard02,
    Calendar,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Table, TableCard } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";

const companyData = {
    name: "Powerful Electric Inc.",
    initials: "PE",
    domain: "powerfulelectric.com",
    industry: "Construction",
    location: "Los Angeles, CA",
    employees: "100",
    revenue: "$10M–$24M",
    headquarters: "Los Angeles, CA, US",
    website: "powerfulelectric.com",
    linkedin: "linkedin.com/company/powerful-electric",
};

const offices = [
    { type: "HQ", address: "123 Main St, Los Angeles, CA 90001" },
    { type: "Branch", address: "456 Oak Ave, San Diego, CA 92101" },
];

const contacts = [
    { id: "c1", name: "John Smith", title: "CEO", linkedin: "linkedin.com/in/johnsmith" },
    { id: "c2", name: "Sarah Johnson", title: "CFO", linkedin: "linkedin.com/in/sarahjohnson" },
    { id: "c3", name: "Robert Wilson", title: "COO", linkedin: "linkedin.com/in/robertwilson" },
    { id: "c4", name: "Emily Chen", title: "CIO", linkedin: "linkedin.com/in/emilychen" },
    { id: "c5", name: "Michael Torres", title: "CISO", linkedin: "linkedin.com/in/michaeltorres" },
    { id: "c6", name: "David Kim", title: "IT Manager", linkedin: "linkedin.com/in/davidkim" },
];

const exposures = [
    { id: "e1", type: "Credential Leak", source: "Dark Web Forum", risk: "Critical", date: "Feb 10, 2026" },
    { id: "e2", type: "Email Compromise", source: "Paste Site", risk: "High", date: "Feb 8, 2026" },
    { id: "e3", type: "Domain Spoofing", source: "DNS Monitor", risk: "Medium", date: "Feb 5, 2026" },
    { id: "e4", type: "Data Breach", source: "Breach Database", risk: "Critical", date: "Feb 3, 2026" },
    { id: "e5", type: "Exposed API Key", source: "GitHub Scan", risk: "High", date: "Jan 28, 2026" },
];

const activities = [
    { label: "Lead created from Live Search", date: "Feb 12, 2026" },
    { label: "Exposure report generated", date: "Feb 13, 2026" },
    { label: "Added to Watchlist", date: "Feb 14, 2026" },
    { label: "Campaign email sent to John Smith", date: "Feb 15, 2026" },
    { label: "Email opened by John Smith", date: "Feb 15, 2026" },
    { label: "Follow-up task created", date: "Feb 16, 2026" },
];

function getRiskColor(risk: string) {
    switch (risk) {
        case "Critical":
            return "error";
        case "High":
            return "warning";
        case "Medium":
            return "brand";
        case "Low":
            return "success";
        default:
            return "gray";
    }
}

function OverviewTab() {
    return (
        <div className="flex flex-col gap-8">
            {/* Company Info */}
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow icon={Building01} label="Headquarters" value={companyData.headquarters} />
                    <InfoRow icon={Target05} label="Industry" value={companyData.industry} />
                    <InfoRow icon={Users01} label="Employee Count" value={companyData.employees} />
                    <InfoRow icon={CreditCard02} label="Revenue Range" value={companyData.revenue} />
                    <div className="flex items-start gap-3">
                        <Globe01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-sm text-tertiary">Website</span>
                            <a
                                href={`https://${companyData.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-brand-secondary hover:underline inline-flex items-center gap-1"
                            >
                                {companyData.website}
                                <LinkExternal01 className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Users01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-sm text-tertiary">LinkedIn</span>
                            <a
                                href={`https://${companyData.linkedin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-brand-secondary hover:underline inline-flex items-center gap-1"
                            >
                                {companyData.linkedin}
                                <LinkExternal01 className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Office Locations */}
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Office Locations</h3>
                <div className="flex flex-col gap-3">
                    {offices.map((office, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-secondary bg-secondary_subtle px-4 py-3">
                            <Badge color="gray" size="sm">{office.type}</Badge>
                            <span className="text-sm text-secondary">{office.address}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Exposure Summary */}
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Exposure Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-fg-error-primary" />
                            <span className="text-display-xs font-semibold text-primary">7</span>
                        </div>
                        <span className="text-sm text-tertiary">Exposures Found</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-tertiary" />
                            <span className="text-display-xs font-semibold text-primary">5 days ago</span>
                        </div>
                        <span className="text-sm text-tertiary">Last Detection</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Shield01 className="w-5 h-5 text-fg-error-primary" />
                            <span className="text-display-xs font-semibold text-error-primary">HIGH</span>
                        </div>
                        <span className="text-sm text-tertiary">Severity Level</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
            <div className="flex flex-col">
                <span className="text-sm text-tertiary">{label}</span>
                <span className="text-sm font-medium text-primary">{value}</span>
            </div>
        </div>
    );
}

function KeyContactsTab() {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                    <div key={contact.id} className="rounded-xl border border-secondary bg-primary p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-solid flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                {contact.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-primary truncate">{contact.name}</span>
                                <span className="text-sm text-tertiary">{contact.title}</span>
                            </div>
                        </div>
                        <a
                            href={`https://${contact.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-secondary hover:underline inline-flex items-center gap-1"
                        >
                            <LinkExternal01 className="w-3.5 h-3.5" />
                            LinkedIn Profile
                        </a>
                        <div className="flex flex-col gap-2">
                            <Button color="secondary" size="sm" iconLeading={Mail01} className="w-full">
                                Reveal Email 💰
                            </Button>
                            <Button color="secondary" size="sm" iconLeading={Phone01} className="w-full">
                                Reveal Phone 💰
                            </Button>
                            <Button color="primary" size="sm" iconLeading={Plus} className="w-full">
                                Add to Campaign
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="rounded-lg border border-secondary bg-secondary_subtle px-4 py-3">
                <span className="text-sm text-tertiary">
                    <span className="font-medium text-secondary">Target Roles:</span> CEO, CFO, COO, CIO, CISO, IT Manager
                </span>
            </div>
        </div>
    );
}

function ExposuresTab() {
    return (
        <div className="flex flex-col gap-4">
            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                <Table aria-label="Exposures" className="bg-primary w-full">
                    <Table.Header className="bg-secondary_subtle">
                        <Table.Head id="type" label="Type" isRowHeader className="min-w-[180px]" />
                        <Table.Head id="source" label="Source" className="min-w-[160px]" />
                        <Table.Head id="risk" label="Risk Level" className="min-w-[130px]" />
                        <Table.Head id="date" label="Date Detected" className="min-w-[140px]" />
                    </Table.Header>
                    <Table.Body items={exposures}>
                        {(item) => (
                            <Table.Row id={item.id}>
                                <Table.Cell>
                                    <div className="flex items-center gap-2">
                                        <Shield01 className="w-4 h-4 text-tertiary" />
                                        <span className="font-medium text-primary">{item.type}</span>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <span className="text-secondary">{item.source}</span>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge color={getRiskColor(item.risk) as any} size="sm">
                                        {item.risk}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <span className="text-secondary">{item.date}</span>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
            <div className="flex justify-end">
                <Button color="secondary" size="sm" iconLeading={Target05}>
                    Re-run Search (1 token)
                </Button>
            </div>
        </div>
    );
}

function ActivityTab() {
    return (
        <div className="rounded-xl border border-secondary bg-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-6">Activity Timeline</h3>
            <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border-secondary" />
                <div className="flex flex-col gap-6">
                    {activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-4 relative">
                            <div className="w-6 h-6 rounded-full border-2 border-secondary bg-primary flex items-center justify-center z-10 shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-fg-success-primary" />
                            </div>
                            <div className="flex flex-col gap-0.5 pt-0.5">
                                <span className="text-sm font-medium text-primary">{activity.label}</span>
                                <span className="text-xs text-tertiary">{activity.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const tabItems = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Key Contacts" },
    { id: "exposures", label: "Exposures" },
    { id: "activity", label: "Activity" },
];

export default function LeadDetailPage() {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Back Link */}
                <Link
                    href="/live-leads"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-secondary transition-colors w-max"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Live-Leads
                </Link>

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-secondary pb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-brand-solid flex items-center justify-center text-white text-xl font-bold shrink-0">
                            {companyData.initials}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-display-sm font-semibold text-primary">{companyData.name}</h1>
                            <p className="text-sm text-tertiary flex items-center gap-1.5 flex-wrap">
                                <span>{companyData.domain}</span>
                                <span className="text-quaternary">•</span>
                                <span>{companyData.industry}</span>
                            </p>
                            <p className="text-sm text-tertiary flex items-center gap-1.5 flex-wrap">
                                <span>📍 {companyData.location}</span>
                                <span className="text-quaternary">•</span>
                                <span>{companyData.employees} employees</span>
                            </p>
                            <p className="text-sm text-tertiary flex items-center gap-1.5">
                                <BarChartSquare02 className="w-4 h-4" />
                                <span>Revenue: {companyData.revenue}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-4 sm:mt-0">
                        <Button color="secondary" size="sm" iconLeading={Star01}>
                            Add to Watchlist
                        </Button>
                        <Button color="secondary" size="sm" iconLeading={Target05}>
                            Start Campaign
                        </Button>
                        <Button color="secondary" size="sm" iconLeading={Copy01}>
                            Push to CRM
                        </Button>
                        <Button color="primary" size="sm" iconLeading={BarChartSquare02}>
                            Generate Report
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
                    <Tabs.List items={tabItems} type="underline" size="sm">
                        {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                    </Tabs.List>

                    <div className="mt-6">
                        <Tabs.Panel id="overview">
                            <OverviewTab />
                        </Tabs.Panel>
                        <Tabs.Panel id="contacts">
                            <KeyContactsTab />
                        </Tabs.Panel>
                        <Tabs.Panel id="exposures">
                            <ExposuresTab />
                        </Tabs.Panel>
                        <Tabs.Panel id="activity">
                            <ActivityTab />
                        </Tabs.Panel>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
