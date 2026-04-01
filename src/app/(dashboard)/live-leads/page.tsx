"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import {
    Activity,
    AlertCircle,
    Building01,
    Download01,
    FilterLines,
    Globe01,
    Grid01,
    List,
    Loading02,
    Mail01,
    Plus,
    SearchLg,
    Trash01,
    Upload01,
    Users01,
    DotsVertical,
    XClose,
    BookmarkCheck,
    Send01,
    Compass,
    RefreshCw01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Input } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { RedrokCompany } from "../../../../convex/redrokApi";

type ExposureSeverity = "critical" | "high" | "medium" | "low" | "clean";

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getSeverityFromCount(count: number, severity?: string): ExposureSeverity {
    if (severity) return severity as ExposureSeverity;
    if (count === 0) return "clean";
    if (count >= 10) return "critical";
    if (count >= 5) return "high";
    if (count >= 2) return "medium";
    return "low";
}

const industryOptions = ["All", "Healthcare", "Finance", "Technology", "Construction", "Manufacturing", "Education", "Retail", "Government"];
const exposureStatusOptions = ["All", "Has Exposures", "No Exposures", "Critical Only"];
const daysOptions = [
    { label: "Last 24 hours", value: "1" },
    { label: "Last 3 days", value: "3" },
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
];

function getSeverityIndicator(severity: ExposureSeverity) {
    const colors: Record<ExposureSeverity, { dot: string; color: "error" | "warning" | "success"; label: string }> = {
        critical: { dot: "bg-error-500", color: "error", label: "Critical" },
        high: { dot: "bg-warning-500", color: "warning", label: "High" },
        medium: { dot: "bg-warning-400", color: "warning", label: "Medium" },
        low: { dot: "bg-success-500", color: "success", label: "Low" },
        clean: { dot: "bg-success-500", color: "success", label: "Clean" },
    };
    return colors[severity] || colors.medium;
}

const addLeadIndustryOptions = ["Healthcare", "Finance", "Technology", "Construction", "Manufacturing", "Education", "Retail", "Government"];
const addLeadEmployeeOptions = ["1-50", "51-200", "201-500", "501-1000", "1000+"];
const addLeadRevenueOptions = ["<$1M", "$1M-$5M", "$5M-$10M", "$10M-$50M", "$50M+"];

export default function LiveLeadsPage() {
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // Fetch leads from Convex
    const leads = useQuery(
        api.leads.list,
        companyId ? { companyId } : "skip"
    );
    const leadsStats = useQuery(
        api.leads.getStats,
        companyId ? { companyId } : "skip"
    );

    // Mutations & Actions
    const createLead = useMutation(api.leads.create);
    const deleteLead = useMutation(api.leads.remove);
    const addToWatchlist = useMutation(api.watchlist.add);
    const fetchLiveLeads = useAction(api.redrokApi.liveLeads);
    const fetchCountries = useAction(api.redrokApi.getCountries);
    const fetchRegions = useAction(api.redrokApi.getRegions);

    // Tab: "my-leads" or "discover"
    const [activeTab, setActiveTab] = useState<"my-leads" | "discover">("my-leads");

    // Discover state
    const [discoverDays, setDiscoverDays] = useState("7");
    const [discoverCountry, setDiscoverCountry] = useState("");
    const [discoverRegion, setDiscoverRegion] = useState("");
    const [discoverCity, setDiscoverCity] = useState("");
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredLeads, setDiscoveredLeads] = useState<RedrokCompany[]>([]);
    const [discoverError, setDiscoverError] = useState<string | null>(null);
    const [countriesList, setCountriesList] = useState<Array<{ val: string; regions: boolean }>>([]);
    const [regionsList, setRegionsList] = useState<string[]>([]);
    const [countriesLoaded, setCountriesLoaded] = useState(false);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "lastScanned",
        direction: "descending",
    });
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [industry, setIndustry] = useState("All");
    const [exposureStatus, setExposureStatus] = useState("All");
    const [viewMode, setViewMode] = useState<Set<string>>(new Set(["list"]));
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // Add Lead slideout state
    const [leadCompany, setLeadCompany] = useState("");
    const [leadDomain, setLeadDomain] = useState("");
    const [leadIndustry, setLeadIndustry] = useState("");
    const [leadNotes, setLeadNotes] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Load countries when discover tab opens
    const loadCountries = useCallback(async () => {
        if (countriesLoaded || !companyId) return;
        try {
            const result = await fetchCountries({ companyId });
            if (result.success) {
                setCountriesList(result.countries);
                setCountriesLoaded(true);
            }
        } catch (e) {
            console.error("Failed to load countries:", e);
        }
    }, [companyId, countriesLoaded, fetchCountries]);

    useEffect(() => {
        if (activeTab === "discover") loadCountries();
    }, [activeTab, loadCountries]);

    async function handleCountryChange(country: string) {
        setDiscoverCountry(country);
        setDiscoverRegion("");
        setRegionsList([]);
        if (country && companyId) {
            try {
                const result = await fetchRegions({ companyId, country });
                if (result.success) setRegionsList(result.regions);
            } catch (e) {
                console.error("Failed to load regions:", e);
            }
        }
    }

    async function handleDiscover() {
        if (!companyId) return;
        setIsDiscovering(true);
        setDiscoverError(null);
        try {
            const result = await fetchLiveLeads({
                companyId,
                days: parseInt(discoverDays),
                country: discoverCountry,
                region: discoverRegion,
                city: discoverCity,
            });
            if (result.success) {
                setDiscoveredLeads(result.companies);
                if (result.companies.length === 0) {
                    setDiscoverError("No leads found for the selected criteria. Try expanding your search.");
                }
            } else {
                setDiscoverError(result.error || "Search failed. Please try again.");
            }
        } catch (error) {
            setDiscoverError(error instanceof Error ? error.message : "Discovery failed");
        } finally {
            setIsDiscovering(false);
        }
    }

    async function handleSaveDiscoveredLead(company: RedrokCompany) {
        if (!companyId || !user) return;
        try {
            await createLead({
                companyId,
                createdByUserId: user._id,
                name: company.name,
                domain: company.website || "",
                industry: company.industry || undefined,
                country: company.country || undefined,
                region: company.region || undefined,
                employeeCount: company.size || undefined,
                linkedinUrl: company.linkedin_url || undefined,
                source: "live_leads",
            });
            alert(`${company.name} saved to your leads!`);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to save lead");
        }
    }

    // Filter leads
    const filteredLeads = useMemo(() => {
        if (!leads) return [];
        return leads.filter((lead) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!lead.name.toLowerCase().includes(query) && 
                    !lead.domain?.toLowerCase().includes(query)) {
                    return false;
                }
            }
            // Industry filter
            if (industry !== "All" && lead.industry !== industry) {
                return false;
            }
            // Exposure status filter
            if (exposureStatus !== "All") {
                const hasExposures = (lead.exposureCount ?? 0) > 0;
                if (exposureStatus === "Has Exposures" && !hasExposures) return false;
                if (exposureStatus === "No Exposures" && hasExposures) return false;
                if (exposureStatus === "Critical Only" && lead.exposureSeverity !== "critical") return false;
            }
            return true;
        });
    }, [leads, searchQuery, industry, exposureStatus]);

    async function handleAddLead(close: () => void) {
        if (!leadCompany.trim() || !companyId || !user) return;
        setIsCreating(true);
        try {
            await createLead({
                companyId,
                createdByUserId: user._id,
                name: leadCompany.trim(),
                domain: leadDomain.trim() || leadCompany.trim().toLowerCase().replace(/\s+/g, "") + ".com",
                industry: leadIndustry || undefined,
                source: "manual",
            });
            setLeadCompany("");
            setLeadDomain("");
            setLeadIndustry("");
            setLeadNotes("");
            close();
        } catch (error) {
            console.error("Failed to create lead:", error);
            alert(error instanceof Error ? error.message : "Failed to create lead");
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(id: Id<"leads">) {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead({ id });
        } catch (error) {
            console.error("Failed to delete lead:", error);
        }
    }

    async function handleAddToWatchlist(domain: string, name: string) {
        if (!companyId || !user || !domain) return;
        try {
            await addToWatchlist({
                companyId,
                userId: user._id,
                domain: domain.toLowerCase(),
                companyName: name,
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

    const hasActiveFilters = industry !== "All" || exposureStatus !== "All";

    const clearFilters = () => {
        setIndustry("All");
        setExposureStatus("All");
        setSearchQuery("");
    };

    const selectedCount = selectedKeys.size;

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-display-sm font-semibold text-primary">Live-Leads</h1>
                            <BadgeWithIcon color="success" size="sm" iconLeading={Users01}>
                                {leadsStats?.total ?? 0} Active
                            </BadgeWithIcon>
                        </div>
                        <p className="text-md text-tertiary">
                            Discover and manage companies with breach exposure data
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <Button color="secondary" iconLeading={Download01}>
                            Export CSV
                        </Button>
                        <Button color="secondary" iconLeading={Upload01}>
                            Import
                        </Button>
                        <SlideoutMenu.Trigger>
                            <Button color="primary" iconLeading={Plus}>
                                Add Lead
                            </Button>
                            <SlideoutMenu>
                                {({ close }) => (
                                    <>
                                        <SlideoutMenu.Header onClose={close}>
                                            <h2 className="text-lg font-semibold text-primary">Add New Lead</h2>
                                            <p className="text-sm text-tertiary mt-1">Manually add a company to your leads</p>
                                        </SlideoutMenu.Header>
                                        <SlideoutMenu.Content>
                                            <div className="flex flex-col gap-4">
                                                <Input
                                                    label="Company Name"
                                                    placeholder="e.g. Acme Corp"
                                                    value={leadCompany}
                                                    onChange={setLeadCompany}
                                                    isRequired
                                                />
                                                <Input
                                                    label="Domain/Website"
                                                    placeholder="e.g. acme.com"
                                                    icon={Globe01}
                                                    value={leadDomain}
                                                    onChange={setLeadDomain}
                                                />
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="block text-sm font-medium text-secondary">
                                                        Industry
                                                    </label>
                                                    <NativeSelect
                                                        aria-label="Industry"
                                                        value={leadIndustry}
                                                        onChange={(e) => setLeadIndustry(e.target.value)}
                                                        options={[
                                                            { label: "Select industry", value: "" },
                                                            ...addLeadIndustryOptions.map((opt) => ({ label: opt, value: opt })),
                                                        ]}
                                                        className="w-full"
                                                        selectClassName="text-sm"
                                                    />
                                                </div>
                                                <TextArea
                                                    label="Notes"
                                                    placeholder="Optional notes about this lead"
                                                    value={leadNotes}
                                                    onChange={setLeadNotes}
                                                    rows={4}
                                                />
                                            </div>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <div className="flex items-center justify-end gap-3">
                                                <Button color="secondary" onClick={close}>Cancel</Button>
                                                <Button 
                                                    color="primary" 
                                                    onClick={() => handleAddLead(close)}
                                                    isDisabled={!leadCompany.trim() || isCreating}
                                                >
                                                    {isCreating ? "Adding..." : "Add Lead"}
                                                </Button>
                                            </div>
                                        </SlideoutMenu.Footer>
                                    </>
                                )}
                            </SlideoutMenu>
                        </SlideoutMenu.Trigger>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-secondary">
                    <button
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "my-leads" ? "border-brand-600 text-brand-700" : "border-transparent text-tertiary hover:text-secondary"}`}
                        onClick={() => setActiveTab("my-leads")}
                    >
                        My Leads ({leads?.length ?? 0})
                    </button>
                    <button
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "discover" ? "border-brand-600 text-brand-700" : "border-transparent text-tertiary hover:text-secondary"}`}
                        onClick={() => setActiveTab("discover")}
                    >
                        <Compass className="w-4 h-4" />
                        Discover New Leads
                    </button>
                </div>

                {/* ── DISCOVER TAB ─────────────────────────────────────── */}
                {activeTab === "discover" && (
                    <div className="flex flex-col gap-6">
                        {/* Discover Filters */}
                        <div className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Compass className="w-5 h-5 text-brand-600" />
                                <h3 className="text-md font-semibold text-primary">Discover Companies with Recent Exposures</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-secondary">Time Range</label>
                                    <NativeSelect
                                        aria-label="Time range"
                                        value={discoverDays}
                                        onChange={(e) => setDiscoverDays(e.target.value)}
                                        options={daysOptions}
                                        className="w-full"
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-secondary">Country</label>
                                    <NativeSelect
                                        aria-label="Country"
                                        value={discoverCountry}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        options={[
                                            { label: "All Countries", value: "" },
                                            ...countriesList.map(c => ({ label: c.val.charAt(0).toUpperCase() + c.val.slice(1), value: c.val })),
                                        ]}
                                        className="w-full"
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-secondary">Region</label>
                                    <NativeSelect
                                        aria-label="Region"
                                        value={discoverRegion}
                                        onChange={(e) => setDiscoverRegion(e.target.value)}
                                        options={[
                                            { label: "All Regions", value: "" },
                                            ...regionsList.map(r => ({ label: typeof r === "string" ? r : "", value: typeof r === "string" ? r : "" })),
                                        ]}
                                        className="w-full"
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-secondary">City</label>
                                    <InputBase
                                        size="sm"
                                        type="text"
                                        placeholder="Any city"
                                        value={discoverCity}
                                        onChange={(value: string) => setDiscoverCity(value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    color="primary"
                                    iconLeading={SearchLg}
                                    onClick={handleDiscover}
                                    isDisabled={isDiscovering}
                                >
                                    {isDiscovering ? "Searching..." : "Discover Leads"}
                                </Button>
                                {discoveredLeads.length > 0 && (
                                    <span className="text-sm text-tertiary">
                                        Found <span className="font-semibold text-secondary">{discoveredLeads.length}</span> companies
                                    </span>
                                )}
                            </div>

                            {discoverError && (
                                <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 px-4 py-2.5 rounded-lg">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{discoverError}</span>
                                </div>
                            )}
                        </div>

                        {/* Discovered Results Table */}
                        {discoveredLeads.length > 0 && (
                            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                                <Table
                                    aria-label="Discovered Leads"
                                    className="bg-primary w-full"
                                >
                                    <Table.Header className="bg-secondary_subtle">
                                        <Table.Head id="name" label="Company" isRowHeader className="min-w-[200px]" />
                                        <Table.Head id="website" label="Website" className="min-w-[160px]" />
                                        <Table.Head id="industry" label="Industry" className="min-w-[140px]" />
                                        <Table.Head id="size" label="Size" className="min-w-[100px]" />
                                        <Table.Head id="country" label="Location" className="min-w-[140px]" />
                                        <Table.Head id="actions" label="" className="w-[160px]" />
                                    </Table.Header>

                                    <Table.Body items={discoveredLeads.map((c, i) => ({ ...c, id: c.id || `discover-${i}` }))}>
                                        {(item) => (
                                            <Table.Row id={item.id}>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded border border-secondary bg-secondary_subtle flex items-center justify-center shrink-0">
                                                            <Building01 className="w-4 h-4 text-tertiary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-primary text-sm">{item.name}</span>
                                                            {item.linkedin_url && (
                                                                <a href={item.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">LinkedIn</a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-sm text-tertiary">{item.website || "—"}</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {item.industry ? (
                                                        <Badge color="gray" size="sm">{item.industry}</Badge>
                                                    ) : (
                                                        <span className="text-sm text-quaternary">—</span>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-sm text-secondary">{item.size || "—"}</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-secondary capitalize">{item.country || "—"}</span>
                                                        {item.region && <span className="text-xs text-tertiary capitalize">{item.region}</span>}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            color="primary"
                                                            iconLeading={Plus}
                                                            onClick={() => handleSaveDiscoveredLead(item)}
                                                        >
                                                            Save
                                                        </Button>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        )}
                                    </Table.Body>
                                </Table>

                                <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                                    <span className="text-sm text-tertiary">
                                        Showing <span className="font-medium text-secondary">{discoveredLeads.length}</span> discovered companies
                                    </span>
                                </div>
                            </TableCard.Root>
                        )}

                        {!isDiscovering && discoveredLeads.length === 0 && !discoverError && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-secondary bg-secondary_subtle">
                                <Compass className="w-12 h-12 text-tertiary" />
                                <div className="text-center">
                                    <h3 className="text-md font-semibold text-primary">Discover New Leads</h3>
                                    <p className="text-sm text-tertiary mt-1 max-w-md">
                                        Use the filters above to find companies with recent dark web exposures. Select a time range and location to get started.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MY LEADS TAB ──────────────────────────────────── */}
                {activeTab === "my-leads" && <>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                        <InputBase
                            size="sm"
                            type="search"
                            aria-label="Search leads"
                            placeholder="Search by name or domain..."
                            icon={SearchLg}
                            value={searchQuery}
                            onChange={(value: string) => setSearchQuery(value)}
                        />
                    </div>
                    <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
                    <FilterDropdown
                        aria-label="Industry"
                        value={industry}
                        onChange={(v) => setIndustry(v)}
                        options={industryOptions.map((opt) => ({ label: opt === "All" ? "Industry: All" : opt, value: opt }))}
                    />
                    <FilterDropdown
                        aria-label="Exposure Status"
                        value={exposureStatus}
                        onChange={(v) => setExposureStatus(v)}
                        options={exposureStatusOptions.map((opt) => ({ label: opt === "All" ? "Exposure: All" : opt, value: opt }))}
                    />

                    {hasActiveFilters && (
                        <Button color="link-gray" size="sm" iconLeading={XClose} onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    )}

                    <div className="ml-auto">
                        <ButtonGroup selectedKeys={viewMode} onSelectionChange={(keys) => setViewMode(keys as Set<string>)} size="sm">
                            <ButtonGroupItem id="list" iconLeading={List}>List</ButtonGroupItem>
                            <ButtonGroupItem id="grid" iconLeading={Grid01}>Grid</ButtonGroupItem>
                        </ButtonGroup>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedCount > 0 && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-300 bg-brand-25 px-5 py-3 shadow-sm">
                        <span className="text-sm font-semibold text-brand-700">{selectedCount} selected</span>
                        <div className="hidden sm:block h-5 w-px bg-brand-200" />
                        <div className="flex flex-wrap items-center gap-2">
                            <Button color="secondary" size="sm" iconLeading={BookmarkCheck}>Add to Watchlist</Button>
                            <Button color="secondary" size="sm" iconLeading={Send01}>Start Campaign</Button>
                            <Button color="secondary" size="sm" iconLeading={Download01}>Export Selected</Button>
                        </div>
                    </div>
                )}

                {/* Main Table - List View */}
                {Array.from(viewMode).includes("list") && (
                <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                    <Table
                        aria-label="Live Leads List"
                        selectionMode="multiple"
                        selectedKeys={selectedKeys}
                        onSelectionChange={(keys) => setSelectedKeys(keys === "all" ? new Set(filteredLeads.map((l) => l._id)) : new Set(keys as Set<string>))}
                        sortDescriptor={sortDescriptor}
                        onSortChange={setSortDescriptor}
                        className="bg-primary w-full"
                    >
                        <Table.Header className="bg-secondary_subtle">
                            <Table.Head id="company" label="Company" allowsSorting isRowHeader className="w-full min-w-[220px]" />
                            <Table.Head id="domain" label="Domain" allowsSorting className="min-w-[160px]" />
                            <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[120px] hidden lg:table-cell" />
                            <Table.Head id="exposures" label="Exposures" allowsSorting className="min-w-[150px]" />
                            <Table.Head id="source" label="Source" className="min-w-[100px] hidden lg:table-cell" />
                            <Table.Head id="createdAt" label="Created" allowsSorting className="min-w-[130px] hidden md:table-cell" />
                            <Table.Head id="actions" className="w-[80px]" />
                        </Table.Header>

                        <Table.Body items={filteredLeads.map((l) => ({ ...l, id: l._id }))}>
                            {(item) => {
                                const severity = getSeverityFromCount(item.exposureCount ?? 0, item.exposureSeverity);
                                const sev = getSeverityIndicator(severity);
                                return (
                                    <Table.Row id={item.id}>
                                        <Table.Cell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded border border-secondary bg-secondary_subtle flex items-center justify-center shrink-0">
                                                    <Building01 className="w-4 h-4 text-tertiary" />
                                                </div>
                                                <span className="font-medium text-primary whitespace-nowrap">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-tertiary whitespace-nowrap">{item.domain || "—"}</span>
                                        </Table.Cell>
                                        <Table.Cell className="hidden lg:table-cell">
                                            {item.industry ? (
                                                <Badge color="gray" size="sm">{item.industry}</Badge>
                                            ) : (
                                                <span className="text-sm text-quaternary">—</span>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${sev.dot}`} />
                                                <Badge color={sev.color} size="sm">
                                                    {item.exposureCount ?? 0} {sev.label}
                                                </Badge>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="hidden lg:table-cell">
                                            <span className="text-sm text-secondary capitalize">{item.source || "manual"}</span>
                                        </Table.Cell>
                                        <Table.Cell className="hidden md:table-cell">
                                            <span className="text-sm text-tertiary">{formatDate(item.createdAt)}</span>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <div className="relative">
                                                <ButtonUtility
                                                    size="sm"
                                                    icon={DotsVertical}
                                                    aria-label="Actions"
                                                    onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                                                />
                                                {openMenu === item._id && (
                                                    <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                        {item.domain && (
                                                            <button 
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                onClick={() => {
                                                                    handleAddToWatchlist(item.domain!, item.name);
                                                                    setOpenMenu(null);
                                                                }}
                                                            >
                                                                Add to Watchlist
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-secondary_subtle" 
                                                            onClick={() => {
                                                                handleDelete(item._id);
                                                                setOpenMenu(null);
                                                            }}
                                                        >
                                                            Delete Lead
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }}
                        </Table.Body>
                    </Table>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                        <span className="text-sm text-tertiary">
                            Showing <span className="font-medium text-secondary">{filteredLeads.length}</span> of <span className="font-medium text-secondary">{leads?.length ?? 0}</span> leads
                        </span>
                    </div>
                    {filteredLeads.length === 0 && (
                        <div className="px-5 py-8 text-center text-sm text-tertiary">
                            {leads?.length === 0 
                                ? "No leads yet. Add a lead to get started."
                                : "No leads match your filters."
                            }
                        </div>
                    )}
                </TableCard.Root>
                )}

                {/* Grid View */}
                {Array.from(viewMode).includes("grid") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLeads.map((lead) => {
                            const severity = getSeverityFromCount(lead.exposureCount ?? 0, lead.exposureSeverity);
                            const indicator = getSeverityIndicator(severity);
                            return (
                                <div key={lead._id} className="rounded-xl border border-secondary bg-primary p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                                                {lead.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-primary text-sm">{lead.name}</p>
                                                <p className="text-xs text-tertiary">{lead.domain || "No domain"}</p>
                                            </div>
                                        </div>
                                        <Badge color={indicator.color} size="sm">{indicator.label}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-tertiary">Industry:</span> <span className="text-secondary">{lead.industry || "—"}</span></div>
                                        <div><span className="text-tertiary">Source:</span> <span className="text-secondary capitalize">{lead.source || "manual"}</span></div>
                                        <div><span className="text-tertiary">Exposures:</span> <span className="text-secondary">{lead.exposureCount ?? 0}</span></div>
                                        <div><span className="text-tertiary">Created:</span> <span className="text-secondary">{formatDate(lead.createdAt)}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-secondary">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-block w-2 h-2 rounded-full ${indicator.dot}`} />
                                            <span className="text-sm text-secondary">{lead.exposureCount ?? 0} exposures</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            color="secondary-destructive"
                                            onClick={() => handleDelete(lead._id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredLeads.length === 0 && (
                            <div className="col-span-full text-center py-12 text-sm text-tertiary">
                                {leads?.length === 0 ? "No leads yet." : "No leads match your filters."}
                            </div>
                        )}
                    </div>
                )}

                </>}
            </div>
        </div>
    );
}
