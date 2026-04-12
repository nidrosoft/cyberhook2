"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
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
    CheckCircle,
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
import { generateExposureReport } from "@/lib/pdf-report";
import { ensureProtocol } from "@/utils/sanitize-url";
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
const sizeOptions = ["All", "1-50", "51-200", "201-500", "501-1000", "1000+"];
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

const addLeadIndustryOptions = [
    "Accounting", "Airlines/Aviation", "Architecture & Planning", "Automotive", "Banking",
    "Biotechnology", "Building Materials", "Capital Markets", "Chemicals", "Civil Engineering",
    "Computer Hardware", "Computer Networking", "Computer Software", "Construction",
    "Consumer Electronics", "Consumer Goods", "Defense & Space", "E-Learning",
    "Education Management", "Electrical & Electronic Manufacturing", "Environmental Services",
    "Events Services", "Financial Services", "Food & Beverages", "Government",
    "Health, Wellness & Fitness", "Higher Education", "Hospital & Health Care", "Hospitality",
    "Human Resources", "Import & Export", "Information Services", "Information Technology",
    "Insurance", "Internet", "Investment Management", "Law Enforcement", "Law Practice",
    "Legal Services", "Logistics & Supply Chain", "Management Consulting", "Manufacturing",
    "Maritime", "Marketing & Advertising", "Mechanical & Industrial Engineering",
    "Media Production", "Medical Devices", "Mining & Metals", "Motion Pictures",
    "Museums & Institutions", "Music", "Nanotechnology", "Nonprofit", "Oil & Energy",
    "Online Media", "Outsourcing", "Packaging", "Pharmaceuticals", "Photography",
    "Political Organization", "Primary/Secondary Education", "Printing",
    "Professional Training & Coaching", "Public Relations", "Publishing", "Real Estate",
    "Renewables & Environment", "Research", "Restaurants", "Retail",
    "Security & Investigations", "Semiconductors", "Staffing & Recruiting", "Supermarkets",
    "Telecommunications", "Textiles", "Think Tanks", "Translation & Localization",
    "Transportation", "Utilities", "Venture Capital & Private Equity", "Veterinary",
    "Warehousing", "Wholesale", "Wine & Spirits", "Wireless",
];
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
    const [activeTab, setActiveTab] = useState<"my-leads" | "discover">("discover");

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
    const [sizeFilter, setSizeFilter] = useState("All");
    const [viewMode, setViewMode] = useState<Set<string>>(new Set(["list"]));
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // Pagination
    const [myLeadsPage, setMyLeadsPage] = useState(1);
    const [discoverPage, setDiscoverPage] = useState(1);
    const pageSize = 25;

    // Auto-load flag
    const hasAutoLoaded = useRef(false);

    useEffect(() => {
        if (!openMenu) return;
        function handleClick() { setOpenMenu(null); }
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [openMenu]);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importParsedRows, setImportParsedRows] = useState<Array<Record<string, string>>>([]);
    const [importHeaders, setImportHeaders] = useState<string[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const [importTotal, setImportTotal] = useState(0);
    const [importSuccessCount, setImportSuccessCount] = useState(0);
    const [importErrorCount, setImportErrorCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function resetImport() {
        setImportStep("upload");
        setImportFile(null);
        setImportParsedRows([]);
        setImportHeaders([]);
        setImportProgress(0);
        setImportTotal(0);
        setImportSuccessCount(0);
        setImportErrorCount(0);
    }

    function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportFile(file);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (!text) return;
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                toast.error("CSV file must have a header row and at least one data row.");
                return;
            }
            const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
            setImportHeaders(headers);

            const rows: Array<Record<string, string>> = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].match(/(".*?"|[^",]+|(?<=,)(?=,))/g)?.map(v => v.replace(/^"|"$/g, "").trim()) || [];
                const row: Record<string, string> = {};
                headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
                rows.push(row);
            }
            setImportParsedRows(rows);
            setImportStep("preview");
        };
        reader.readAsText(file);
    }

    async function handleImportConfirm() {
        if (!companyId || !user || importParsedRows.length === 0) return;
        setImportStep("importing");
        setImportTotal(importParsedRows.length);
        setImportProgress(0);
        setImportSuccessCount(0);
        setImportErrorCount(0);

        let successCount = 0;
        let errorCount = 0;

        const nameCol = importHeaders.find(h => /company|name/i.test(h)) || importHeaders[0];
        const domainCol = importHeaders.find(h => /domain|website|url/i.test(h));
        const industryCol = importHeaders.find(h => /industry|sector/i.test(h));
        const countryCol = importHeaders.find(h => /country|location/i.test(h));
        const contactCol = importHeaders.find(h => /contact.*name|poc/i.test(h));
        const emailCol = importHeaders.find(h => /email/i.test(h));
        const phoneCol = importHeaders.find(h => /phone/i.test(h));

        for (let i = 0; i < importParsedRows.length; i++) {
            const row = importParsedRows[i];
            const companyName = row[nameCol] || "";
            if (!companyName.trim()) { errorCount++; setImportProgress(i + 1); setImportErrorCount(errorCount); continue; }

            try {
                await createLead({
                    companyId,
                    createdByUserId: user._id,
                    name: companyName.trim(),
                    domain: (domainCol ? row[domainCol] : "").trim() || companyName.trim().toLowerCase().replace(/\s+/g, "") + ".com",
                    industry: industryCol ? row[industryCol]?.trim() || undefined : undefined,
                    country: countryCol ? row[countryCol]?.trim() || undefined : undefined,
                    contactName: contactCol ? row[contactCol]?.trim() || undefined : undefined,
                    contactEmail: emailCol ? row[emailCol]?.trim() || undefined : undefined,
                    contactPhone: phoneCol ? row[phoneCol]?.trim() || undefined : undefined,
                    source: "csv_import",
                });
                successCount++;
            } catch {
                errorCount++;
            }
            setImportProgress(i + 1);
            setImportSuccessCount(successCount);
            setImportErrorCount(errorCount);
        }

        setImportStep("done");
    }

    // Add Lead slideout state
    const [leadCompany, setLeadCompany] = useState("");
    const [leadDomain, setLeadDomain] = useState("");
    const [leadIndustry, setLeadIndustry] = useState("");
    const [leadNotes, setLeadNotes] = useState("");
    const [leadContactName, setLeadContactName] = useState("");
    const [leadContactEmail, setLeadContactEmail] = useState("");
    const [leadContactPhone, setLeadContactPhone] = useState("");
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
            devError("Failed to load countries:", e);
        }
    }, [companyId, countriesLoaded, fetchCountries]);

    useEffect(() => {
        if (activeTab === "discover") {
            loadCountries();
            if (!hasAutoLoaded.current && companyId && discoveredLeads.length === 0 && !isDiscovering) {
                hasAutoLoaded.current = true;
                handleDiscover();
            }
        }
    }, [activeTab, loadCountries, companyId]);

    async function handleCountryChange(country: string) {
        setDiscoverCountry(country);
        setDiscoverRegion("");
        setRegionsList([]);
        if (country && companyId) {
            try {
                const result = await fetchRegions({ companyId, country });
                if (result.success) setRegionsList(result.regions);
            } catch (e) {
                devError("Failed to load regions:", e);
            }
        }
    }

    function friendlyError(raw: string): string {
        if (/authentication failed|401|unauthorized/i.test(raw))
            return "Unable to connect to the data provider. Please check your API credentials in Settings or try again later.";
        if (/token.*expired/i.test(raw))
            return "Your session with the data provider has expired. Please try again.";
        if (/credentials not configured/i.test(raw))
            return "API credentials have not been configured yet. Please add them in Settings > Integrations.";
        if (/timeout|timed out/i.test(raw))
            return "The request took too long. Please try again with a narrower search.";
        if (/network|fetch failed|ECONNREFUSED/i.test(raw))
            return "Network error — unable to reach the data provider. Please check your connection.";
        return raw;
    }

    async function handleDiscover() {
        if (!companyId) return;
        setIsDiscovering(true);
        setDiscoverError(null);
        setDiscoveredLeads([]);
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
                setDiscoverError(friendlyError(result.error || "Search failed. Please try again."));
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Discovery failed";
            setDiscoverError(friendlyError(msg));
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
            toast.success(`${company.name} saved to your leads!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save lead");
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
            // Size filter
            if (sizeFilter !== "All" && lead.employeeCount !== sizeFilter) {
                return false;
            }
            return true;
        });
    }, [leads, searchQuery, industry, exposureStatus, sizeFilter]);

    // Paginated slices
    const myLeadsTotalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const paginatedMyLeads = useMemo(() => {
        const start = (myLeadsPage - 1) * pageSize;
        return filteredLeads.slice(start, start + pageSize);
    }, [filteredLeads, myLeadsPage]);

    const discoverTotalPages = Math.max(1, Math.ceil(discoveredLeads.length / pageSize));
    const paginatedDiscoverLeads = useMemo(() => {
        const start = (discoverPage - 1) * pageSize;
        return discoveredLeads.slice(start, start + pageSize);
    }, [discoveredLeads, discoverPage]);

    // Reset page on filter change
    useEffect(() => { setMyLeadsPage(1); }, [searchQuery, industry, exposureStatus, sizeFilter]);
    useEffect(() => { setDiscoverPage(1); }, [discoveredLeads.length]);

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
                contactName: leadContactName.trim() || undefined,
                contactEmail: leadContactEmail.trim() || undefined,
                contactPhone: leadContactPhone.trim() || undefined,
            });
            setLeadCompany("");
            setLeadDomain("");
            setLeadIndustry("");
            setLeadNotes("");
            setLeadContactName("");
            setLeadContactEmail("");
            setLeadContactPhone("");
            close();
        } catch (error) {
            devError("Failed to create lead:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create lead");
        } finally {
            setIsCreating(false);
        }
    }

    const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"leads"> | null>(null);

    async function handleDelete(id: Id<"leads">) {
        try {
            await deleteLead({ id });
            toast.success("Lead deleted");
        } catch (error) {
            devError("Failed to delete lead:", error);
            toast.error("Failed to delete lead");
        }
    }

    function handleGenerateReport(lead: typeof filteredLeads[0]) {
        const domain = lead.domain?.trim() || lead.name.toLowerCase().replace(/\s+/g, "") + ".com";
        toast.info(`Generating report for ${lead.name}...`);
        try {
            generateExposureReport({
                domain,
                companyName: lead.name,
                credentials: [],
                isTrial: false,
                generatedAt: new Date(),
            });
            toast.success(`Report downloaded for ${lead.name}`);
        } catch (error) {
            toast.error("Failed to generate report");
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

    const hasActiveFilters = industry !== "All" || exposureStatus !== "All" || sizeFilter !== "All";

    const clearFilters = () => {
        setIndustry("All");
        setExposureStatus("All");
        setSizeFilter("All");
        setSearchQuery("");
    };

    const selectedCount = selectedKeys.size;

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-md font-semibold text-primary mb-2">Delete Lead</h3>
                        <p className="text-sm text-secondary mb-6">Are you sure you want to delete this lead? This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-3">
                            <Button color="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button color="primary-destructive" size="sm" onClick={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Import Leads</h3>
                                <p className="text-sm text-tertiary mt-0.5">
                                    {importStep === "upload" && "Upload a CSV file to import leads in bulk"}
                                    {importStep === "preview" && `Preview ${importParsedRows.length} leads from ${importFile?.name}`}
                                    {importStep === "importing" && "Importing leads..."}
                                    {importStep === "done" && "Import complete"}
                                </p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-tertiary hover:text-primary transition-colors">
                                <XClose className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {importStep === "upload" && (
                                <div className="flex flex-col items-center gap-5">
                                    <div
                                        className="w-full border-2 border-dashed border-secondary rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-brand-400 hover:bg-secondary_subtle transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                            <Upload01 className="w-6 h-6 text-brand-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-primary">Click to upload or drag & drop</p>
                                            <p className="text-xs text-tertiary mt-1">CSV files only (.csv)</p>
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleImportFileSelect}
                                    />
                                    <div className="w-full rounded-lg bg-secondary_subtle border border-secondary p-4">
                                        <p className="text-xs font-medium text-secondary mb-2">Expected CSV format:</p>
                                        <code className="text-xs text-tertiary block whitespace-pre-wrap">Company Name, Domain, Industry, Country, Contact Name, Email, Phone</code>
                                    </div>
                                </div>
                            )}

                            {importStep === "preview" && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <Badge color="brand" size="sm">{importParsedRows.length} rows</Badge>
                                        <Badge color="gray" size="sm">{importHeaders.length} columns</Badge>
                                        <span className="text-xs text-tertiary">{importFile?.name}</span>
                                    </div>
                                    <div className="rounded-lg border border-secondary overflow-x-auto max-h-[340px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-secondary_subtle sticky top-0">
                                                <tr>
                                                    <th className="text-left px-3 py-2 text-xs font-medium text-tertiary">#</th>
                                                    {importHeaders.map(h => (
                                                        <th key={h} className="text-left px-3 py-2 text-xs font-medium text-tertiary whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importParsedRows.slice(0, 50).map((row, i) => (
                                                    <tr key={i} className="border-t border-secondary">
                                                        <td className="px-3 py-2 text-xs text-quaternary">{i + 1}</td>
                                                        {importHeaders.map(h => (
                                                            <td key={h} className="px-3 py-2 text-xs text-secondary whitespace-nowrap max-w-[200px] truncate">{row[h] || "—"}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {importParsedRows.length > 50 && (
                                        <p className="text-xs text-tertiary text-center">Showing first 50 of {importParsedRows.length} rows</p>
                                    )}
                                </div>
                            )}

                            {importStep === "importing" && (
                                <div className="flex flex-col items-center gap-6 py-6">
                                    <Loading02 className="w-10 h-10 animate-spin text-brand-600" />
                                    <div className="w-full max-w-md">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-secondary">Importing leads...</span>
                                            <span className="text-sm text-tertiary">{importProgress} / {importTotal}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-600 rounded-full transition-all duration-300"
                                                style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-tertiary">
                                            <span className="text-success-600">{importSuccessCount} imported</span>
                                            {importErrorCount > 0 && <span className="text-error-600">{importErrorCount} failed</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {importStep === "done" && (
                                <div className="flex flex-col items-center gap-5 py-6">
                                    <div className="w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                                        <CheckCircle className="w-7 h-7 text-success-600" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="text-md font-semibold text-primary">Import Complete</h4>
                                        <p className="text-sm text-tertiary mt-1">
                                            Successfully imported <span className="font-semibold text-success-600">{importSuccessCount}</span> leads
                                            {importErrorCount > 0 && <> ({importErrorCount} failed)</>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-secondary px-6 py-4">
                            {importStep === "upload" && (
                                <Button color="secondary" size="md" onClick={() => setShowImportModal(false)}>Cancel</Button>
                            )}
                            {importStep === "preview" && (
                                <>
                                    <Button color="secondary" size="md" onClick={() => { resetImport(); }}>Back</Button>
                                    <Button color="primary" size="md" onClick={handleImportConfirm}>
                                        Import {importParsedRows.length} Leads
                                    </Button>
                                </>
                            )}
                            {importStep === "importing" && (
                                <Button color="secondary" size="md" isDisabled>Importing...</Button>
                            )}
                            {importStep === "done" && (
                                <Button color="primary" size="md" onClick={() => { setShowImportModal(false); setActiveTab("my-leads"); }}>
                                    View My Leads
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
                        <Button color="secondary" iconLeading={Download01} onClick={() => {
                            if (filteredLeads.length === 0) { toast.error("No leads to export"); return; }
                            const headers = ["Company Name", "Domain", "Industry", "Country", "Source", "Exposures"];
                            const rows = filteredLeads.map(l => [
                                l.name,
                                l.domain || "",
                                l.industry || "",
                                l.country || "",
                                l.source || "manual",
                                String(l.exposureCount ?? 0),
                            ]);
                            const csv = [headers, ...rows].map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            const dateStr = new Date().toISOString().slice(0, 10);
                            a.download = `CyberHook_All_Leads_Export_${dateStr}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success(`Exported ${filteredLeads.length} lead(s) to CSV`);
                        }}>
                            Export CSV
                        </Button>
                        <Button color="secondary" iconLeading={Upload01} onClick={() => { resetImport(); setShowImportModal(true); }}>
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
                                                    <label className="block text-sm font-medium text-secondary" htmlFor="lead-industry-input">
                                                        Industry
                                                    </label>
                                                    <input
                                                        id="lead-industry-input"
                                                        list="lead-industry-list"
                                                        className="w-full rounded-lg border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand-600"
                                                        placeholder="Type or select an industry"
                                                        value={leadIndustry}
                                                        onChange={(e) => setLeadIndustry(e.target.value)}
                                                    />
                                                    <datalist id="lead-industry-list">
                                                        {addLeadIndustryOptions.map((opt) => (
                                                            <option key={opt} value={opt} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <Input
                                                    label="Contact Name"
                                                    placeholder="e.g. Jane Smith"
                                                    value={leadContactName}
                                                    onChange={setLeadContactName}
                                                />
                                                <Input
                                                    label="Contact Email"
                                                    placeholder="e.g. jane@acme.com"
                                                    icon={Mail01}
                                                    value={leadContactEmail}
                                                    onChange={setLeadContactEmail}
                                                    hint="Optional — email for the primary contact"
                                                />
                                                <Input
                                                    label="Contact Phone"
                                                    placeholder="e.g. +1 555-123-4567"
                                                    value={leadContactPhone}
                                                    onChange={setLeadContactPhone}
                                                />
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
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "discover" ? "border-brand-600 text-brand-700" : "border-transparent text-tertiary hover:text-secondary"}`}
                        onClick={() => setActiveTab("discover")}
                    >
                        <Compass className="w-4 h-4" />
                        Discover New Leads
                    </button>
                    <button
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "my-leads" ? "border-brand-600 text-brand-700" : "border-transparent text-tertiary hover:text-secondary"}`}
                        onClick={() => setActiveTab("my-leads")}
                    >
                        My Leads ({leads?.length ?? 0})
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
                            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-4 xl:gap-5">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-tertiary">Time Range</label>
                                    <NativeSelect
                                        aria-label="Time range"
                                        value={discoverDays}
                                        onChange={(e) => setDiscoverDays(e.target.value)}
                                        options={daysOptions}
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-tertiary">Country</label>
                                    <NativeSelect
                                        aria-label="Country"
                                        value={discoverCountry}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        options={[
                                            { label: "All Countries", value: "" },
                                            ...(() => {
                                                const priority = countriesList.filter(c => 
                                                    c.val.toLowerCase() === "united states" || c.val.toLowerCase() === "canada"
                                                ).sort((a, b) => {
                                                    if (a.val.toLowerCase() === "united states") return -1;
                                                    if (b.val.toLowerCase() === "united states") return 1;
                                                    return 0;
                                                });
                                                const rest = countriesList
                                                    .filter(c => c.val.toLowerCase() !== "united states" && c.val.toLowerCase() !== "canada")
                                                    .sort((a, b) => a.val.localeCompare(b.val));
                                                return [...priority, ...rest].map(c => ({
                                                    label: c.val.charAt(0).toUpperCase() + c.val.slice(1).toLowerCase(),
                                                    value: c.val,
                                                }));
                                            })(),
                                        ]}
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-tertiary">Region</label>
                                    <NativeSelect
                                        aria-label="Region"
                                        value={discoverRegion}
                                        onChange={(e) => setDiscoverRegion(e.target.value)}
                                        options={[
                                            { label: "All Regions", value: "" },
                                            ...regionsList.map(r => ({ label: typeof r === "string" ? r : "", value: typeof r === "string" ? r : "" })),
                                        ]}
                                        selectClassName="text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-tertiary">City</label>
                                    <InputBase
                                        size="sm"
                                        type="text"
                                        placeholder="Any city"
                                        value={discoverCity}
                                        onChange={(value: string) => setDiscoverCity(value)}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button
                                        color="primary"
                                        size="md"
                                        iconLeading={SearchLg}
                                        onClick={handleDiscover}
                                        isDisabled={isDiscovering}
                                        className="shrink-0 whitespace-nowrap"
                                    >
                                        {isDiscovering ? "Searching..." : "Discover Leads"}
                                    </Button>
                                    {discoveredLeads.length > 0 && (
                                        <span className="text-sm text-tertiary whitespace-nowrap shrink-0">
                                            Found <span className="font-semibold text-secondary">{discoveredLeads.length}</span> companies
                                        </span>
                                    )}
                                </div>
                            </div>

                            {discoverError && (
                                <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 px-4 py-2.5 rounded-lg">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{discoverError}</span>
                                </div>
                            )}
                        </div>

                        {/* Loading state while discovering */}
                        {isDiscovering && (
                            <div className="flex flex-col items-center justify-center py-16 gap-5 rounded-xl border border-secondary bg-secondary_subtle">
                                <Loading02 className="w-10 h-10 animate-spin text-brand-600" />
                                <div className="text-center">
                                    <h3 className="text-md font-semibold text-primary">Scanning for leads...</h3>
                                    <p className="text-sm text-tertiary mt-1 max-w-md">
                                        Searching companies with recent breach exposures. This may take a moment.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Discovered Results Table */}
                        {!isDiscovering && discoveredLeads.length > 0 && (
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

                                    <Table.Body items={paginatedDiscoverLeads.map((c, i) => ({ ...c, id: c.id || `discover-${(discoverPage - 1) * pageSize + i}` }))}>
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
                                                                <a href={ensureProtocol(item.linkedin_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">LinkedIn</a>
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
                                        Showing <span className="font-medium text-secondary">{(discoverPage - 1) * pageSize + 1}–{Math.min(discoverPage * pageSize, discoveredLeads.length)}</span> of <span className="font-medium text-secondary">{discoveredLeads.length}</span> companies
                                    </span>
                                    {discoverTotalPages > 1 && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" color="secondary" isDisabled={discoverPage <= 1} onClick={() => setDiscoverPage((p) => p - 1)}>Previous</Button>
                                            <span className="text-sm text-tertiary">Page {discoverPage} of {discoverTotalPages}</span>
                                            <Button size="sm" color="secondary" isDisabled={discoverPage >= discoverTotalPages} onClick={() => setDiscoverPage((p) => p + 1)}>Next</Button>
                                        </div>
                                    )}
                                </div>
                            </TableCard.Root>
                        )}

                        {!isDiscovering && discoveredLeads.length === 0 && !discoverError && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-secondary bg-secondary_subtle">
                                <Compass className="w-12 h-12 text-tertiary" />
                                <div className="text-center">
                                    <h3 className="text-md font-semibold text-primary">No Leads Found</h3>
                                    <p className="text-sm text-tertiary mt-1 max-w-md">
                                        Try adjusting the filters above or expanding the time range to discover more companies with breach exposures.
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
                    <FilterDropdown
                        aria-label="Company Size"
                        value={sizeFilter}
                        onChange={(v) => setSizeFilter(v)}
                        options={sizeOptions.map((opt) => ({ label: opt === "All" ? "Size: All" : opt, value: opt }))}
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
                            <Button color="secondary" size="sm" iconLeading={BookmarkCheck} onClick={async () => {
                                if (!companyId || !user) return;
                                const selected = filteredLeads.filter(l => selectedKeys.has(l._id));
                                let added = 0;
                                for (const lead of selected) {
                                    if (lead.domain) {
                                        try {
                                            await addToWatchlist({
                                                companyId,
                                                userId: user._id,
                                                domain: lead.domain.toLowerCase(),
                                                companyName: lead.name,
                                            });
                                            added++;
                                        } catch (e) {
                                            devError("Failed to add to watchlist:", e);
                                        }
                                    }
                                }
                                toast.success(`${added} lead(s) added to watchlist!`);
                                setSelectedKeys(new Set());
                            }}>Add to Watchlist</Button>
                            <Button color="secondary" size="sm" iconLeading={Send01} onClick={() => {
                                const selected = filteredLeads.filter(l => selectedKeys.has(l._id));
                                if (selected.length === 0) return;
                                const ids = selected.map(l => l._id).join(",");
                                window.location.href = `/ai-agents/new?leads=${encodeURIComponent(ids)}`;
                            }}>Start Campaign</Button>
                            <Button color="secondary" size="sm" iconLeading={Download01} onClick={() => {
                                const selected = filteredLeads.filter(l => selectedKeys.has(l._id));
                                if (selected.length === 0) { toast.error("No leads selected"); return; }
                                const headers = ["Company Name", "Domain", "Industry", "Country", "Source", "Exposures"];
                                const rows = selected.map(l => [
                                    l.name,
                                    l.domain || "",
                                    l.industry || "",
                                    l.country || "",
                                    l.source || "manual",
                                    String(l.exposureCount ?? 0),
                                ]);
                                const csv = [headers, ...rows].map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
                                const blob = new Blob([csv], { type: "text/csv" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                const dateStr = new Date().toISOString().slice(0, 10);
                                a.download = `CyberHook_Leads_Export_${dateStr}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success(`Exported ${selected.length} lead(s) to CSV`);
                            }}>Export Selected</Button>
                        </div>
                    </div>
                )}

                {/* Main Table - List View */}
                {Array.from(viewMode).includes("list") && (
                <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-visible">
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

                        <Table.Body items={paginatedMyLeads.map((l) => ({ ...l, id: l._id }))}>
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
                                                {item.lastScanDate != null && (item.exposureCount ?? 0) > 0 ? (
                                                    <>
                                                        <span className={`inline-block w-2 h-2 rounded-full ${sev.dot}`} />
                                                        <Badge color={sev.color} size="sm">
                                                            {item.exposureCount} {sev.label}
                                                        </Badge>
                                                    </>
                                                ) : item.lastScanDate != null && (item.exposureCount ?? 0) === 0 ? (
                                                    <>
                                                        <span className="inline-block w-2 h-2 rounded-full bg-success-500" />
                                                        <span className="text-sm text-secondary">0 Exposures</span>
                                                        <span className="text-xs text-success-600">(Scanned)</span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-quaternary">Not Scanned</span>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="hidden lg:table-cell">
                                            <span className="text-sm text-secondary capitalize">{item.source || "manual"}</span>
                                        </Table.Cell>
                                        <Table.Cell className="hidden md:table-cell">
                                            <span className="text-sm text-tertiary">{formatDate(item.createdAt)}</span>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <div className="relative" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                                                <ButtonUtility
                                                    size="sm"
                                                    icon={DotsVertical}
                                                    aria-label="Actions"
                                                    onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                                                />
                                                {openMenu === item._id && (
                                                    <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleGenerateReport(item);
                                                                setOpenMenu(null);
                                                            }}
                                                        >
                                                            Generate Report
                                                        </button>
                                                        {item.domain && (
                                                            <button 
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddToWatchlist(item.domain!, item.name);
                                                                    setOpenMenu(null);
                                                                }}
                                                            >
                                                                Add to Watchlist
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-secondary_subtle" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(item._id);
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
                            Showing <span className="font-medium text-secondary">{filteredLeads.length > 0 ? (myLeadsPage - 1) * pageSize + 1 : 0}–{Math.min(myLeadsPage * pageSize, filteredLeads.length)}</span> of <span className="font-medium text-secondary">{filteredLeads.length}</span> leads
                        </span>
                        {myLeadsTotalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" color="secondary" isDisabled={myLeadsPage <= 1} onClick={() => setMyLeadsPage((p) => p - 1)}>Previous</Button>
                                <span className="text-sm text-tertiary">Page {myLeadsPage} of {myLeadsTotalPages}</span>
                                <Button size="sm" color="secondary" isDisabled={myLeadsPage >= myLeadsTotalPages} onClick={() => setMyLeadsPage((p) => p + 1)}>Next</Button>
                            </div>
                        )}
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
                        {paginatedMyLeads.map((lead) => {
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
                                            <span className="text-sm text-secondary">
                                                {lead.lastScanDate != null
                                                    ? `${lead.exposureCount ?? 0} Exposures Scanned`
                                                    : "Not Scanned"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" color="secondary" onClick={() => handleGenerateReport(lead)}>Report</Button>
                                            {lead.domain && (
                                                <Button size="sm" color="secondary" onClick={() => handleAddToWatchlist(lead.domain!, lead.name)}>Watch</Button>
                                            )}
                                            <Button size="sm" color="secondary-destructive" onClick={() => setConfirmDeleteId(lead._id)}>Delete</Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {paginatedMyLeads.length === 0 && (
                            <div className="col-span-full text-center py-12 text-sm text-tertiary">
                                {leads?.length === 0 ? "No leads yet." : "No leads match your filters."}
                            </div>
                        )}
                    </div>
                )}
                {Array.from(viewMode).includes("grid") && myLeadsTotalPages > 1 && (
                    <div className="flex items-center justify-between rounded-xl border border-secondary bg-primary px-5 py-3.5">
                        <span className="text-sm text-tertiary">
                            Showing {(myLeadsPage - 1) * pageSize + 1}–{Math.min(myLeadsPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button size="sm" color="secondary" isDisabled={myLeadsPage <= 1} onClick={() => setMyLeadsPage((p) => p - 1)}>Previous</Button>
                            <span className="text-sm text-tertiary">Page {myLeadsPage} of {myLeadsTotalPages}</span>
                            <Button size="sm" color="secondary" isDisabled={myLeadsPage >= myLeadsTotalPages} onClick={() => setMyLeadsPage((p) => p + 1)}>Next</Button>
                        </div>
                    </div>
                )}

                </>}
            </div>
        </div>
    );
}
