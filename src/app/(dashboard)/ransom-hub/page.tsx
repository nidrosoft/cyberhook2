"use client";

import { useState } from "react";
import {
    Activity,
    Calendar,
    DownloadCloud01,
    Eye,
    FilterLines,
    Mail01,
    Plus,
    SearchLg,
    Shield01,
    DotsVertical,
    Building02,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Toggle } from "@/components/base/toggle/toggle";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { MetricsChart04 } from "@/components/application/metrics/metrics";

const mockIncidents = [
    {
        id: "inc-1",
        group: "LockBit 3.0",
        company: "Acme Healthcare",
        industry: "Healthcare",
        date: "Mar 6, 2026",
        severity: "Critical",
        status: "Active",
        incidentType: "Data Breach",
        source: "HHS OCR",
        individualsAffected: 125000,
        breachVector: "Email/Phishing",
    },
    {
        id: "inc-2",
        group: "BlackCat",
        company: "TechForward Inc",
        industry: "Technology",
        date: "Mar 5, 2026",
        severity: "High",
        status: "Active",
        incidentType: "Ransomware",
        source: "ransomware.live",
        individualsAffected: 0,
        breachVector: "Unpatched Vuln",
    },
    {
        id: "inc-3",
        group: "Clop",
        company: "GlobalBank Finance",
        industry: "Finance",
        date: "Mar 3, 2026",
        severity: "Critical",
        status: "Active",
        incidentType: "Data Breach",
        source: "CA AG",
        individualsAffected: 450000,
        breachVector: "Stolen Credentials",
    },
    {
        id: "inc-4",
        group: "Royal",
        company: "SecureManufacturing",
        industry: "Manufacturing",
        date: "Mar 1, 2026",
        severity: "Medium",
        status: "Contained",
        incidentType: "Ransomware",
        source: "ransomware.live",
        individualsAffected: 0,
        breachVector: "Email/Phishing",
    },
    {
        id: "inc-5",
        group: "LockBit 3.0",
        company: "EduCorp University",
        industry: "Education",
        date: "Feb 28, 2026",
        severity: "High",
        status: "Contained",
        incidentType: "Data Breach",
        source: "HHS OCR",
        individualsAffected: 87000,
        breachVector: "Unpatched Vuln",
    },
    {
        id: "inc-6",
        group: "Play",
        company: "RetailMax",
        industry: "Retail",
        date: "Feb 25, 2026",
        severity: "Low",
        status: "Resolved",
        incidentType: "Ransomware",
        source: "ransomware.live",
        individualsAffected: 0,
        breachVector: "Stolen Credentials",
    },
    {
        id: "inc-7",
        group: "BlackCat",
        company: "CityGov Systems",
        industry: "Government",
        date: "Feb 22, 2026",
        severity: "Critical",
        status: "Active",
        incidentType: "Data Breach",
        source: "Privacy Rights",
        individualsAffected: 1200000,
        breachVector: "Email/Phishing",
    },
    {
        id: "inc-8",
        group: "Clop",
        company: "HealthFirst Clinic",
        industry: "Healthcare",
        date: "Feb 20, 2026",
        severity: "High",
        status: "Resolved",
        incidentType: "Data Breach",
        source: "HHS OCR",
        individualsAffected: 340000,
        breachVector: "Unpatched Vuln",
    },
];

const mockBreachNotifications = [
    {
        id: "bn-1",
        organization: "Acme Healthcare",
        industry: "Healthcare",
        regulation: "HIPAA",
        individualsAffected: 125000,
        filedDate: "Filed Mar 6, 2026",
        source: "HHS OCR",
    },
    {
        id: "bn-2",
        organization: "FinFirst Credit Union",
        industry: "Finance",
        regulation: "GLBA",
        individualsAffected: 45000,
        filedDate: "Filed Mar 4, 2026",
        source: "CA AG",
    },
    {
        id: "bn-3",
        organization: "MedPlus Pharmacy",
        industry: "Healthcare",
        regulation: "HIPAA",
        individualsAffected: 200000,
        filedDate: "Filed Mar 2, 2026",
        source: "HHS OCR",
    },
    {
        id: "bn-4",
        organization: "DataCorp Solutions",
        industry: "Technology",
        regulation: "CCPA",
        individualsAffected: 500000,
        filedDate: "Filed Feb 28, 2026",
        source: "CA AG",
    },
    {
        id: "bn-5",
        organization: "Senior Care Services",
        industry: "Healthcare",
        regulation: "HIPAA",
        individualsAffected: 78000,
        filedDate: "Filed Feb 25, 2026",
        source: "HHS OCR",
    },
    {
        id: "bn-6",
        organization: "Pacific Insurance Co",
        industry: "Insurance",
        regulation: "HIPAA",
        individualsAffected: 320000,
        filedDate: "Filed Feb 22, 2026",
        source: "Privacy Rights",
    },
];

function severityColor(severity: string) {
    switch (severity) {
        case "Critical": return "error";
        case "High": return "warning";
        case "Medium": return "gray";
        case "Low": return "success";
        default: return "gray";
    }
}

function statusColor(status: string) {
    switch (status) {
        case "Active": return "error";
        case "Contained": return "warning";
        case "Resolved": return "success";
        default: return "gray";
    }
}

function typeColor(type: string) {
    return type === "Data Breach" ? "purple" : "blue";
}

function sourceColor(source: string) {
    switch (source) {
        case "HHS OCR": return "purple";
        case "CA AG": return "blue";
        case "Privacy Rights": return "orange";
        default: return "gray";
    }
}

function formatNumber(n: number) {
    return n === 0 ? "—" : n.toLocaleString();
}

export default function RansomHubPage() {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });
    const [breachSortDescriptor, setBreachSortDescriptor] = useState<SortDescriptor>({
        column: "filedDate",
        direction: "descending",
    });

    const [timePeriod, setTimePeriod] = useState("all");
    const [region, setRegion] = useState("all");
    const [threatGroup, setThreatGroup] = useState("all");
    const [severity, setSeverity] = useState("all");
    const [status, setStatus] = useState("all");

    const [breachRegulation, setBreachRegulation] = useState("all");
    const [breachSource, setBreachSource] = useState("all");

    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    const [hhsActive, setHhsActive] = useState(true);
    const [privacyRightsActive, setPrivacyRightsActive] = useState(true);
    const [caAgActive, setCaAgActive] = useState(true);

    const tabItems = [
        { id: "ransomware", label: "Ransomware Attacks", badge: "2,847" },
        { id: "breaches", label: "Breach Notifications", badge: "6" },
    ];

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto" onClick={() => openMenu && setOpenMenu(null)}>
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-display-sm font-semibold text-primary">Ransom Hub</h1>
                            <BadgeWithIcon color="error" size="sm" iconLeading={Activity}>Live Feed</BadgeWithIcon>
                        </div>
                        <p className="text-md text-tertiary">
                            Real-time monitoring of ransomware leak sites, dark web extortion operations, and regulatory breach filings.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <Button color="secondary" iconLeading={DownloadCloud01}>
                            Export CSV
                        </Button>
                        <Button color="primary" iconLeading={FilterLines} onClick={() => setShowFilterPanel((p) => !p)}>
                            Filters
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs>
                    <TabList items={tabItems} type="underline" size="md">
                        {(item) => <Tab key={item.id} id={item.id} label={item.label} badge={item.badge} />}
                    </TabList>

                    {/* Ransomware Attacks Tab */}
                    <TabPanel id="ransomware" className="pt-6 flex flex-col gap-6">
                        {/* Filters Row */}
                        <div className="flex flex-wrap items-end gap-3">
                            <FilterDropdown
                                aria-label="Time Period"
                                value={timePeriod}
                                onChange={(v) => setTimePeriod(v)}
                                options={[
                                    { label: "All Time", value: "all" },
                                    { label: "Last 7 Days", value: "7d" },
                                    { label: "Last 30 Days", value: "30d" },
                                    { label: "Last 90 Days", value: "90d" },
                                ]}
                            />
                            <FilterDropdown
                                aria-label="Region"
                                value={region}
                                onChange={(v) => setRegion(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "North America", value: "na" },
                                    { label: "Europe", value: "eu" },
                                    { label: "Asia", value: "asia" },
                                    { label: "South America", value: "sa" },
                                ]}
                            />
                            <FilterDropdown
                                aria-label="Threat Group"
                                value={threatGroup}
                                onChange={(v) => setThreatGroup(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "LockBit 3.0", value: "lockbit" },
                                    { label: "BlackCat", value: "blackcat" },
                                    { label: "Clop", value: "clop" },
                                    { label: "Royal", value: "royal" },
                                    { label: "Play", value: "play" },
                                ]}
                            />
                            <FilterDropdown
                                aria-label="Severity"
                                value={severity}
                                onChange={(v) => setSeverity(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "Critical", value: "critical" },
                                    { label: "High", value: "high" },
                                    { label: "Medium", value: "medium" },
                                    { label: "Low", value: "low" },
                                ]}
                            />
                            <FilterDropdown
                                aria-label="Status"
                                value={status}
                                onChange={(v) => setStatus(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "Active", value: "active" },
                                    { label: "Contained", value: "contained" },
                                    { label: "Resolved", value: "resolved" },
                                ]}
                            />
                        </div>

                        {/* Summary Stats Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <MetricsChart04 title="2,847" subtitle="Total Incidents" change="12%" changeTrend="positive" changeDescription="all time" />
                            <MetricsChart04 title="342" subtitle="Active Threats" change="18" changeTrend="negative" changeDescription="new today" chartColor="text-fg-error-secondary" />
                            <MetricsChart04 title="47" subtitle="This Week" change="8%" changeTrend="negative" changeDescription="vs last week" chartColor="text-fg-warning-secondary" />
                            <MetricsChart04 title="23" subtitle="Your Industry" change="3" changeTrend="negative" changeDescription="new" chartColor="text-fg-brand-secondary" />
                        </div>

                        {/* Incidents Table */}
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-secondary p-4 sm:px-6 sm:py-5">
                                <div className="flex w-full items-center gap-3 flex-wrap">
                                    <InputBase
                                        size="sm"
                                        type="search"
                                        aria-label="Search incidents"
                                        placeholder="Search by company or group..."
                                        icon={SearchLg}
                                        className="w-full sm:max-w-[320px]"
                                    />
                                </div>
                            </div>

                            <Table
                                aria-label="Ransomware Incidents List"
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                                className="bg-primary w-full"
                            >
                                <Table.Header className="bg-secondary_subtle">
                                    <Table.Head id="group" label="Threat Group" allowsSorting isRowHeader className="min-w-[150px]" />
                                    <Table.Head id="company" label="Victim" allowsSorting className="min-w-[180px]" />
                                    <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[130px]" />
                                    <Table.Head id="date" label="Date" allowsSorting className="min-w-[130px]" />
                                    <Table.Head id="severity" label="Severity" allowsSorting className="min-w-[100px]" />
                                    <Table.Head id="status" label="Status" allowsSorting className="min-w-[100px]" />
                                    <Table.Head id="type" label="Type" allowsSorting className="min-w-[120px]" />
                                    <Table.Head id="source" label="Source" className="min-w-[130px]" />
                                    <Table.Head id="affected" label="Individuals" className="min-w-[120px]" />
                                    <Table.Head id="vector" label="Breach Vector" className="min-w-[150px]" />
                                    <Table.Head id="actions" className="w-[80px]" />
                                </Table.Header>

                                <Table.Body items={mockIncidents}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Shield01 className="w-4 h-4 text-error-500" />
                                                    <span className="font-medium text-primary whitespace-nowrap">{item.group}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="font-medium text-secondary whitespace-nowrap">{item.company}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color="gray" size="sm">{item.industry}</Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary whitespace-nowrap">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{item.date}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={severityColor(item.severity) as any} size="sm">
                                                    {item.severity}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={statusColor(item.status) as any} size="sm">
                                                    {item.status}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={typeColor(item.incidentType) as any} size="sm">
                                                    {item.incidentType}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-sm text-secondary">{item.source}</span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-sm text-secondary font-medium">
                                                    {formatNumber(item.individualsAffected)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-sm text-secondary whitespace-nowrap">{item.breachVector}</span>
                                            </Table.Cell>
                                            <Table.Cell className="px-4">
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <ButtonUtility
                                                        size="sm"
                                                        icon={DotsVertical}
                                                        aria-label="Actions"
                                                        onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                                                    />
                                                    {openMenu === item.id && (
                                                        <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                                <Plus className="w-4 h-4" /> Add to Leads
                                                            </button>
                                                            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                                <Eye className="w-4 h-4" /> View Details
                                                            </button>
                                                            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                                <Shield01 className="w-4 h-4" /> Add to Watchlist
                                                            </button>
                                                            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                                <Mail01 className="w-4 h-4" /> Start Campaign
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>

                            <div className="px-5 border-t border-secondary">
                                <PaginationCardMinimal page={1} total={12} />
                            </div>
                        </TableCard.Root>
                    </TabPanel>

                    {/* Breach Notifications Tab */}
                    <TabPanel id="breaches" className="pt-6 flex flex-col gap-6">
                        {/* Sources with toggles */}
                        <div className="p-5 border border-secondary rounded-xl bg-primary">
                            <h3 className="text-md font-semibold text-primary mb-4">Monitored Sources</h3>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex items-start gap-3 p-3 border border-secondary rounded-lg flex-1">
                                    <Toggle
                                        size="sm"
                                        isSelected={hhsActive}
                                        onChange={setHhsActive}
                                        label="HHS OCR Breach Portal"
                                        hint="Healthcare"
                                    />
                                    {hhsActive && <Badge color="success" size="sm">Active</Badge>}
                                </div>
                                <div className="flex items-start gap-3 p-3 border border-secondary rounded-lg flex-1">
                                    <Toggle
                                        size="sm"
                                        isSelected={privacyRightsActive}
                                        onChange={setPrivacyRightsActive}
                                        label="Privacy Rights Clearinghouse"
                                    />
                                    {privacyRightsActive && <Badge color="success" size="sm">Active</Badge>}
                                </div>
                                <div className="flex items-start gap-3 p-3 border border-secondary rounded-lg flex-1">
                                    <Toggle
                                        size="sm"
                                        isSelected={caAgActive}
                                        onChange={setCaAgActive}
                                        label="California AG Breach List"
                                    />
                                    {caAgActive && <Badge color="success" size="sm">Active</Badge>}
                                </div>
                            </div>
                        </div>

                        {/* Breach Filters */}
                        <div className="flex flex-wrap items-end gap-3">
                            <FilterDropdown
                                aria-label="Regulation"
                                value={breachRegulation}
                                onChange={(v) => setBreachRegulation(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "HIPAA", value: "hipaa" },
                                    { label: "CCPA", value: "ccpa" },
                                    { label: "GLBA", value: "glba" },
                                ]}
                            />
                            <FilterDropdown
                                aria-label="Source"
                                value={breachSource}
                                onChange={(v) => setBreachSource(v)}
                                options={[
                                    { label: "All", value: "all" },
                                    { label: "HHS OCR", value: "hhs" },
                                    { label: "CA AG", value: "caag" },
                                    { label: "Privacy Rights", value: "privacy" },
                                ]}
                            />
                        </div>

                        {/* Breach Notifications Table */}
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-secondary p-4 sm:px-6 sm:py-5">
                                <div className="flex w-full items-center gap-3 flex-wrap">
                                    <InputBase
                                        size="sm"
                                        type="search"
                                        aria-label="Search breach notifications"
                                        placeholder="Search by organization..."
                                        icon={SearchLg}
                                        className="w-full sm:max-w-[320px]"
                                    />
                                </div>
                            </div>

                            <Table
                                aria-label="Breach Notifications List"
                                sortDescriptor={breachSortDescriptor}
                                onSortChange={setBreachSortDescriptor}
                                className="bg-primary w-full"
                            >
                                <Table.Header className="bg-secondary_subtle">
                                    <Table.Head id="organization" label="Organization" allowsSorting isRowHeader className="min-w-[200px]" />
                                    <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[130px]" />
                                    <Table.Head id="regulation" label="Regulation" allowsSorting className="min-w-[120px]" />
                                    <Table.Head id="affected" label="Individuals Affected" allowsSorting className="min-w-[170px]" />
                                    <Table.Head id="filedDate" label="Filed Date" allowsSorting className="min-w-[160px]" />
                                    <Table.Head id="source" label="Source" className="min-w-[140px]" />
                                </Table.Header>

                                <Table.Body items={mockBreachNotifications}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Building02 className="w-4 h-4 text-tertiary" />
                                                    <span className="font-medium text-primary">{item.organization}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color="gray" size="sm">{item.industry}</Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge
                                                    color={
                                                        item.regulation === "HIPAA" ? "purple" :
                                                        item.regulation === "CCPA" ? "blue" :
                                                        item.regulation === "GLBA" ? "orange" : "gray"
                                                    }
                                                    size="sm"
                                                >
                                                    {item.regulation}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-sm font-medium text-primary">
                                                    {item.individualsAffected.toLocaleString()}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{item.filedDate}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={sourceColor(item.source) as any} size="sm">
                                                    {item.source}
                                                </Badge>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>

                            <div className="px-5 border-t border-secondary">
                                <PaginationCardMinimal page={1} total={1} />
                            </div>
                        </TableCard.Root>
                    </TabPanel>
                </Tabs>
            </div>
        </div>
    );
}
