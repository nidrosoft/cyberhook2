"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
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
    Building02,
    LinkExternal01,
    AlertCircle,
    CheckCircle,
    XClose,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Toggle } from "@/components/base/toggle/toggle";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { useCurrentUser } from "@/hooks/use-current-user";
import { sanitizeUrl } from "@/utils/sanitize-url";
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

function exportRansomCSV(incidents: Array<{ ransomwareGroup?: string; companyName: string; country?: string; region?: string; attackDate: number; source: string }>) {
    const headers = ["Group", "Victim", "Country", "Posted Date", "Source"];
    const rows = incidents.map(i => [
        i.ransomwareGroup || "Unknown",
        i.companyName,
        i.country || i.region || "",
        formatDate(i.attackDate),
        formatSourceLabel(i.source),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `CyberHook_RansomHub_Export_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

    const [breachRegulation, setBreachRegulation] = useState("all");
    const [breachSource, setBreachSource] = useState("all");

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
            if (threatGroup !== "all" && !inc.ransomwareGroup?.toLowerCase().includes(threatGroup)) return false;
            if (region !== "all" && inc.region !== region) return false;
            return true;
        });
    }, [ransomwareIncidents, searchQuery, threatGroup, region]);

    const regulationSourceMap: Record<string, string[]> = {
        hipaa: ["hhs_ocr"],
        ccpa: ["california_ag"],
        glba: ["privacy_rights"],
    };

    // Filter breach notifications locally
    const filteredBreaches = useMemo(() => {
        if (!breachIncidents) return [];
        return breachIncidents.filter((inc) => {
            if (breachSearchQuery) {
                const q = breachSearchQuery.toLowerCase();
                if (!inc.companyName.toLowerCase().includes(q)) return false;
            }
            if (breachSource !== "all" && inc.source !== breachSource) return false;
            if (breachRegulation !== "all") {
                const allowedSources = regulationSourceMap[breachRegulation];
                if (allowedSources && !allowedSources.includes(inc.source)) return false;
            }
            return true;
        });
    }, [breachIncidents, breachSearchQuery, breachSource, breachRegulation]);

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
            toast.success(`${companyName} added to leads!`);
        } catch (error) {
            devError("Failed to add to leads:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add to leads");
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
            toast.success(`${domain} added to watchlist!`);
        } catch (error) {
            devError("Failed to add to watchlist:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add to watchlist");
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
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
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
                        <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                        <div className="flex items-center gap-3">
                            <Button color="secondary" iconLeading={DownloadCloud01} onClick={() => exportRansomCSV(filteredRansomware)}>
                                Export CSV
                            </Button>
                            <Button color={showFilterPanel ? "primary" : "secondary"} iconLeading={FilterLines} onClick={() => setShowFilterPanel((p) => !p)}>
                                Filters
                            </Button>
                        </div>
                        <span className="text-xs text-tertiary">
                            Last updated: {ransomwareIncidents && ransomwareIncidents.length > 0
                                ? new Date(Math.max(...ransomwareIncidents.map(i => i.updatedAt ?? i.createdAt))).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
                                : "No data yet"
                            }
                        </span>
                    </div>
                </div>

                {/* Global Filter Panel */}
                {showFilterPanel && (
                    <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-md font-semibold text-primary">Advanced Filters</h3>
                            <button
                                onClick={() => setShowFilterPanel(false)}
                                className="rounded-md p-1 text-quaternary hover:text-secondary hover:bg-secondary_subtle transition"
                            >
                                <XClose className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-secondary">Time Period</label>
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
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-secondary">Region</label>
                                <FilterDropdown
                                    aria-label="Region"
                                    value={region}
                                    onChange={(v) => setRegion(v)}
                                    options={[
                                        { label: "All Regions", value: "all" },
                                        { label: "North America", value: "na" },
                                        { label: "Europe", value: "eu" },
                                        { label: "Asia", value: "asia" },
                                        { label: "South America", value: "sa" },
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-secondary">Threat Group</label>
                                <FilterDropdown
                                    aria-label="Threat Group"
                                    value={threatGroup}
                                    onChange={(v) => setThreatGroup(v)}
                                    options={[
                                        { label: "All Groups", value: "all" },
                                        { label: "LockBit 3.0", value: "lockbit" },
                                        { label: "BlackCat", value: "blackcat" },
                                        { label: "Clop", value: "clop" },
                                        { label: "Royal", value: "royal" },
                                        { label: "Play", value: "play" },
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-secondary">Data Source</label>
                                <FilterDropdown
                                    aria-label="Source"
                                    value={breachSource}
                                    onChange={(v) => setBreachSource(v)}
                                    options={[
                                        { label: "All Sources", value: "all" },
                                        { label: "HHS OCR", value: "hhs_ocr" },
                                        { label: "CA AG", value: "california_ag" },
                                        { label: "Privacy Rights", value: "privacy_rights" },
                                    ]}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-secondary">
                            <span className="text-sm text-tertiary">
                                {filteredRansomware.length + filteredBreaches.length} result{filteredRansomware.length + filteredBreaches.length !== 1 ? "s" : ""} matching
                            </span>
                            <Button
                                size="sm"
                                color="secondary"
                                onClick={() => {
                                    setTimePeriod("all");
                                    setRegion("all");
                                    setThreatGroup("all");
                                    setBreachSource("all");
                                    setBreachRegulation("all");
                                    setSearchQuery("");
                                    setBreachSearchQuery("");
                                    toast.success("All filters cleared");
                                }}
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    </div>
                )}

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
                        </div>

                        {/* Summary Stats Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
                            <MetricsChart04 title={String(stats?.total ?? 0)} subtitle="Total Incidents" change="—" changeTrend="positive" changeDescription="all time" actions={false} />
                            <MetricsChart04 title={String(stats?.ransomware ?? 0)} subtitle="Ransomware" change="—" changeTrend="negative" changeDescription="attacks" chartColor="text-fg-error-secondary" actions={false} />
                            <MetricsChart04 title={String(stats?.last7Days ?? 0)} subtitle="This Week" change="—" changeTrend="negative" changeDescription="last 7 days" chartColor="text-fg-warning-secondary" actions={false} />
                            <MetricsChart04 title={String(stats?.last30Days ?? 0)} subtitle="Last 30 Days" change="—" changeTrend="negative" changeDescription="incidents" chartColor="text-fg-brand-secondary" actions={false} />
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
                                    <Table.Head id="country" label="Country" className="min-w-[120px] hidden md:table-cell" />
                                    <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[130px] hidden lg:table-cell" />
                                    <Table.Head id="date" label="Posted Date" allowsSorting className="min-w-[130px]" />
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
                                            <Table.Cell className="hidden md:table-cell">
                                                <span className="text-sm text-secondary whitespace-nowrap">{item.country || item.region || "—"}</span>
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
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={sanitizeUrl(item.sourceUrl || "https://ransomware.live")}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-secondary transition duration-100 ease-linear"
                                                        aria-label="View on ransomware.live"
                                                        title="View source"
                                                    >
                                                        <LinkExternal01 className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-brand-600 transition duration-100 ease-linear"
                                                        aria-label="Add to Leads"
                                                        title="Add to Leads"
                                                        onClick={(e) => { e.stopPropagation(); handleAddToLeads(item.companyName, item.domain); }}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    {item.domain && (
                                                        <button
                                                            className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-success-600 transition duration-100 ease-linear"
                                                            aria-label="Add to Watchlist"
                                                            title="Add to Watchlist"
                                                            onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(item.domain!, item.companyName); }}
                                                        >
                                                            <Shield01 className="w-4 h-4" />
                                                        </button>
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
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-brand-600 transition duration-100 ease-linear"
                                                        aria-label="Add to Leads"
                                                        title="Add to Leads"
                                                        onClick={(e) => { e.stopPropagation(); handleAddToLeads(item.companyName, item.domain); }}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    {item.domain && (
                                                        <button
                                                            className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-success-600 transition duration-100 ease-linear"
                                                            aria-label="Add to Watchlist"
                                                            title="Add to Watchlist"
                                                            onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(item.domain!, item.companyName); }}
                                                        >
                                                            <Shield01 className="w-4 h-4" />
                                                        </button>
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
