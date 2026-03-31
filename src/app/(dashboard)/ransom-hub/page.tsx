"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
    Activity,
    Calendar,
    DownloadCloud01,
    Eye,
    FilterLines,
    Loading02,
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatSourceLabel(source: string): string {
    switch (source) {
        case "ransomware_live": return "ransomware.live";
        case "hhs_ocr": return "HHS OCR";
        case "privacy_rights": return "Privacy Rights";
        case "california_ag": return "CA AG";
        default: return source;
    }
}

function formatIncidentType(type: string): string {
    switch (type) {
        case "ransomware": return "Ransomware";
        case "breach_notification": return "Data Breach";
        default: return type;
    }
}

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
    return type === "breach_notification" || type === "Data Breach" ? "purple" : "blue";
}

function sourceColor(source: string) {
    switch (source) {
        case "hhs_ocr":
        case "HHS OCR": return "purple";
        case "california_ag":
        case "CA AG": return "blue";
        case "privacy_rights":
        case "Privacy Rights": return "orange";
        case "ransomware_live": return "gray";
        default: return "gray";
    }
}

function formatNumber(n: number) {
    return n === 0 ? "—" : n.toLocaleString();
}

export default function RansomHubPage() {
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // Compute date range for time period filter
    const [timePeriod, setTimePeriod] = useState("all");
    const dateFrom = useMemo(() => {
        if (timePeriod === "7d") return Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (timePeriod === "30d") return Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (timePeriod === "90d") return Date.now() - 90 * 24 * 60 * 60 * 1000;
        return undefined;
    }, [timePeriod]);

    // Fetch ransomware incidents
    const ransomwareIncidents = useQuery(api.ransomHub.list, {
        incidentType: "ransomware",
        ...(dateFrom ? { dateFrom } : {}),
    });

    // Fetch breach notifications
    const breachIncidents = useQuery(api.ransomHub.list, {
        incidentType: "breach_notification",
    });

    // Stats
    const stats = useQuery(api.ransomHub.getStats, {});

    // Mutations for adding to leads/watchlist
    const createLead = useMutation(api.leads.create);
    const addToWatchlist = useMutation(api.watchlist.add);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });
    const [breachSortDescriptor, setBreachSortDescriptor] = useState<SortDescriptor>({
        column: "filedDate",
        direction: "descending",
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [breachSearchQuery, setBreachSearchQuery] = useState("");
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

    // Filter ransomware incidents locally
    const filteredRansomware = useMemo(() => {
        if (!ransomwareIncidents) return [];
        return ransomwareIncidents.filter((inc) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!inc.companyName.toLowerCase().includes(q) &&
                    !inc.ransomwareGroup?.toLowerCase().includes(q)) {
                    return false;
                }
            }
            if (threatGroup !== "all" && inc.ransomwareGroup?.toLowerCase() !== threatGroup) return false;
            if (region !== "all" && inc.region !== region) return false;
            return true;
        });
    }, [ransomwareIncidents, searchQuery, threatGroup, region]);

    // Filter breach notifications locally
    const filteredBreaches = useMemo(() => {
        if (!breachIncidents) return [];
        return breachIncidents.filter((inc) => {
            if (breachSearchQuery) {
                const q = breachSearchQuery.toLowerCase();
                if (!inc.companyName.toLowerCase().includes(q)) return false;
            }
            if (breachSource !== "all" && inc.source !== breachSource) return false;
            return true;
        });
    }, [breachIncidents, breachSearchQuery, breachSource]);

    async function handleAddToLeads(companyName: string, domain?: string) {
        if (!companyId || !user) return;
        try {
            await createLead({
                companyId,
                createdByUserId: user._id,
                name: companyName,
                domain: domain || companyName.toLowerCase().replace(/\s+/g, "") + ".com",
                source: "ransom_hub",
            });
            alert(`${companyName} added to leads!`);
        } catch (error) {
            console.error("Failed to add to leads:", error);
            alert(error instanceof Error ? error.message : "Failed to add to leads");
        }
    }

    async function handleAddToWatchlist(domain: string, companyName: string) {
        if (!companyId || !user || !domain) return;
        try {
            await addToWatchlist({
                companyId,
                userId: user._id,
                domain: domain.toLowerCase(),
                companyName,
            });
            alert(`${domain} added to watchlist!`);
        } catch (error) {
            console.error("Failed to add to watchlist:", error);
            alert(error instanceof Error ? error.message : "Failed to add to watchlist");
        }
    }

    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    const tabItems = [
        { id: "ransomware", label: "Ransomware Attacks", badge: String(stats?.ransomware ?? 0) },
        { id: "breaches", label: "Breach Notifications", badge: String(stats?.breachNotifications ?? 0) },
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
                            <MetricsChart04 title={String(stats?.total ?? 0)} subtitle="Total Incidents" change="—" changeTrend="positive" changeDescription="all time" />
                            <MetricsChart04 title={String(stats?.ransomware ?? 0)} subtitle="Ransomware" change="—" changeTrend="negative" changeDescription="attacks" chartColor="text-fg-error-secondary" />
                            <MetricsChart04 title={String(stats?.last7Days ?? 0)} subtitle="This Week" change="—" changeTrend="negative" changeDescription="last 7 days" chartColor="text-fg-warning-secondary" />
                            <MetricsChart04 title={String(stats?.last30Days ?? 0)} subtitle="Last 30 Days" change="—" changeTrend="negative" changeDescription="incidents" chartColor="text-fg-brand-secondary" />
                        </div>

                        {/* Incidents Table */}
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-secondary p-4 sm:px-6 sm:py-5">
                                <div className="flex w-full items-center gap-3 flex-wrap">
                                    <InputBase
                                        size="sm"
                                        type="search"
                                        aria-label="Search incidents"
                                        placeholder="Search by company or group..."
                                        icon={SearchLg}
                                        className="w-full sm:max-w-[320px]"
                                        value={searchQuery}
                                        onChange={(value: string) => setSearchQuery(value)}
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
                                    <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[130px] hidden lg:table-cell" />
                                    <Table.Head id="date" label="Date" allowsSorting className="min-w-[130px]" />
                                    <Table.Head id="type" label="Type" allowsSorting className="min-w-[120px] hidden lg:table-cell" />
                                    <Table.Head id="source" label="Source" className="min-w-[130px] hidden xl:table-cell" />
                                    <Table.Head id="affected" label="Individuals" className="min-w-[120px] hidden lg:table-cell" />
                                    <Table.Head id="vector" label="Breach Vector" className="min-w-[150px] hidden xl:table-cell" />
                                    <Table.Head id="actions" className="w-[80px]" />
                                </Table.Header>

                                <Table.Body items={filteredRansomware.map((i) => ({ ...i, id: i._id }))}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Shield01 className="w-4 h-4 text-error-500" />
                                                    <span className="font-medium text-primary whitespace-nowrap">{item.ransomwareGroup || "Unknown"}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="font-medium text-secondary whitespace-nowrap">{item.companyName}</span>
                                            </Table.Cell>
                                            <Table.Cell className="hidden lg:table-cell">
                                                <Badge color="gray" size="sm">{item.industry || "Unknown"}</Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary whitespace-nowrap">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{formatDate(item.attackDate)}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="hidden lg:table-cell">
                                                <Badge color={typeColor(item.incidentType) as any} size="sm">
                                                    {formatIncidentType(item.incidentType)}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell className="hidden xl:table-cell">
                                                <Badge color={sourceColor(item.source) as any} size="sm">
                                                    {formatSourceLabel(item.source)}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell className="hidden lg:table-cell">
                                                <span className="text-sm text-secondary font-medium">
                                                    {formatNumber(item.individualsAffected ?? 0)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell className="hidden xl:table-cell">
                                                <span className="text-sm text-secondary whitespace-nowrap">{item.breachVector || "—"}</span>
                                            </Table.Cell>
                                            <Table.Cell className="px-4">
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <ButtonUtility
                                                        size="sm"
                                                        icon={DotsVertical}
                                                        aria-label="Actions"
                                                        onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                                                    />
                                                    {openMenu === item._id && (
                                                        <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                            <button 
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                onClick={() => {
                                                                    handleAddToLeads(item.companyName, item.domain);
                                                                    setOpenMenu(null);
                                                                }}
                                                            >
                                                                <Plus className="w-4 h-4" /> Add to Leads
                                                            </button>
                                                            {item.domain && (
                                                                <button 
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                    onClick={() => {
                                                                        handleAddToWatchlist(item.domain!, item.companyName);
                                                                        setOpenMenu(null);
                                                                    }}
                                                                >
                                                                    <Shield01 className="w-4 h-4" /> Add to Watchlist
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>

                            {filteredRansomware.length === 0 && (
                                <div className="px-5 py-8 text-center text-sm text-tertiary">
                                    {ransomwareIncidents?.length === 0
                                        ? "No ransomware incidents recorded yet."
                                        : "No incidents match your filters."
                                    }
                                </div>
                            )}
                            <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                                <span className="text-sm text-tertiary">
                                    Showing <span className="font-medium text-secondary">{filteredRansomware.length}</span> of <span className="font-medium text-secondary">{ransomwareIncidents?.length ?? 0}</span> incidents
                                </span>
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
                                    { label: "HHS OCR", value: "hhs_ocr" },
                                    { label: "CA AG", value: "california_ag" },
                                    { label: "Privacy Rights", value: "privacy_rights" },
                                ]}
                            />
                        </div>

                        {/* Breach Notifications Table */}
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-secondary p-4 sm:px-6 sm:py-5">
                                <div className="flex w-full items-center gap-3 flex-wrap">
                                    <InputBase
                                        size="sm"
                                        type="search"
                                        aria-label="Search breach notifications"
                                        placeholder="Search by organization..."
                                        icon={SearchLg}
                                        className="w-full sm:max-w-[320px]"
                                        value={breachSearchQuery}
                                        onChange={(value: string) => setBreachSearchQuery(value)}
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
                                    <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[130px] hidden lg:table-cell" />
                                    <Table.Head id="affected" label="Individuals Affected" allowsSorting className="min-w-[170px]" />
                                    <Table.Head id="filedDate" label="Filed Date" allowsSorting className="min-w-[160px]" />
                                    <Table.Head id="source" label="Source" className="min-w-[140px] hidden md:table-cell" />
                                    <Table.Head id="vector" label="Breach Vector" className="min-w-[140px] hidden lg:table-cell" />
                                    <Table.Head id="actions" className="w-[80px]" />
                                </Table.Header>

                                <Table.Body items={filteredBreaches.map((i) => ({ ...i, id: i._id }))}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Building02 className="w-4 h-4 text-tertiary" />
                                                    <span className="font-medium text-primary">{item.companyName}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="hidden lg:table-cell">
                                                <Badge color="gray" size="sm">{item.industry || "Unknown"}</Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-sm font-medium text-primary">
                                                    {formatNumber(item.individualsAffected ?? 0)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{item.filedDate ? formatDate(item.filedDate) : formatDate(item.attackDate)}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="hidden md:table-cell">
                                                <Badge color={sourceColor(item.source) as any} size="sm">
                                                    {formatSourceLabel(item.source)}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell className="hidden lg:table-cell">
                                                <span className="text-sm text-secondary whitespace-nowrap">{item.breachVector || "—"}</span>
                                            </Table.Cell>
                                            <Table.Cell className="px-4">
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <ButtonUtility
                                                        size="sm"
                                                        icon={DotsVertical}
                                                        aria-label="Actions"
                                                        onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                                                    />
                                                    {openMenu === item._id && (
                                                        <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                            <button 
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                onClick={() => {
                                                                    handleAddToLeads(item.companyName, item.domain);
                                                                    setOpenMenu(null);
                                                                }}
                                                            >
                                                                <Plus className="w-4 h-4" /> Add to Leads
                                                            </button>
                                                            {item.domain && (
                                                                <button 
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                    onClick={() => {
                                                                        handleAddToWatchlist(item.domain!, item.companyName);
                                                                        setOpenMenu(null);
                                                                    }}
                                                                >
                                                                    <Shield01 className="w-4 h-4" /> Add to Watchlist
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>

                            {filteredBreaches.length === 0 && (
                                <div className="px-5 py-8 text-center text-sm text-tertiary">
                                    {breachIncidents?.length === 0
                                        ? "No breach notifications recorded yet."
                                        : "No notifications match your filters."
                                    }
                                </div>
                            )}
                            <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                                <span className="text-sm text-tertiary">
                                    Showing <span className="font-medium text-secondary">{filteredBreaches.length}</span> of <span className="font-medium text-secondary">{breachIncidents?.length ?? 0}</span> notifications
                                </span>
                            </div>
                        </TableCard.Root>
                    </TabPanel>
                </Tabs>
            </div>
        </div>
    );
}
