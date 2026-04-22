"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
import {
    AlertCircle,
    BookmarkCheck,
    Building02,
    Calendar,
    Clock,
    DownloadCloud01,
    Eye,
    Globe01,
    Plus,
    SearchLg,
    ShieldOff,
    Loading02,
    Lock01,
    Mail01,
    Monitor01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/hooks/use-company";
import { usePlanGate } from "@/hooks/use-plan-gate";
import { useUpgradeModal } from "@/components/application/upgrade-modal/upgrade-modal";
import { generateExposureReport } from "@/lib/pdf-report";
import { api } from "../../../../convex/_generated/api";
import type { RedrokSearchResult } from "../../../../convex/redrokApi";

type SearchState = "idle" | "searching" | "results";

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatApiDate(dateStr: string): string {
    if (!dateStr) return "Unknown";
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function maskValue(value: string): string {
    if (!value || value.length < 4) return "••••";
    return value.slice(0, 2) + "•".repeat(Math.min(value.length - 2, 8));
}

function getSeverityBadge(severity: number): { color: "error" | "warning" | "success" | "gray"; label: string } {
    if (severity >= 8) return { color: "error", label: "Critical" };
    if (severity >= 5) return { color: "warning", label: "High" };
    if (severity >= 3) return { color: "warning", label: "Medium" };
    if (severity >= 1) return { color: "success", label: "Low" };
    return { color: "gray", label: "Info" };
}


export default function LiveSearchPage() {
    const { user, companyId } = useCurrentUser();
    const { company: companyData, tokensRemaining, tokenAllocation, isLoading: isCompanyLoading } = useCompany();
    const { searches, canPerformAction, planId } = usePlanGate();
    const { showUpgradeModal } = useUpgradeModal();
    const isTrial = companyData?.status === "trial";

    // Fetch recent searches from Convex
    const recentSearches = useQuery(
        api.searches.getRecent,
        companyId ? { companyId, limit: 10 } : "skip"
    );

    // Mutations & Actions
    const createSearch = useMutation(api.searches.create);
    const redrokLiveSearch = useAction(api.redrokApi.liveSearch);
    const addToWatchlist = useMutation(api.watchlist.add);
    const createLead = useMutation(api.leads.create);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });

    const [searchState, setSearchState] = useState<SearchState>("idle");
    const [domain, setDomain] = useState("");
    const [searchError, setSearchError] = useState<string | null>(null);
    const [currentSearchResults, setCurrentSearchResults] = useState<RedrokSearchResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<RedrokSearchResult | null>(null);

    // Yellow item 10.4 — Watchlist "Rescan" navigates here with `?domain=…`
    // and (optional) `&autoSubmit=1`. Pre-fill the input and kick off the
    // search once per navigation so the user lands directly on results.
    const searchParams = useSearchParams();
    const autoSubmitHandled = useRef(false);
    useEffect(() => {
        if (autoSubmitHandled.current) return;
        const qDomain = searchParams.get("domain");
        if (!qDomain) return;
        setDomain(qDomain);
        if (searchParams.get("autoSubmit") === "1" && companyId && user) {
            autoSubmitHandled.current = true;
            // Next tick so React has applied the setDomain state.
            setTimeout(() => {
                handleSearch();
            }, 0);
        } else {
            autoSubmitHandled.current = true;
        }
        // We intentionally run once per mount when auth & company are ready.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, user?._id]);


    const tokensTotal = tokenAllocation ?? 0;
    const tokensLeft = tokensRemaining ?? 0;
    const progressPercent = tokensTotal > 0 ? (tokensLeft / tokensTotal) * 100 : 0;

    async function handleSearch() {
        if (!domain.trim()) return;
        if (!companyId || !user) {
            setSearchError("Please log in to perform searches");
            return;
        }
        if (tokensLeft < 1) {
            setSearchError("Insufficient tokens. Please purchase more tokens to continue.");
            return;
        }

        if (!canPerformAction("searches")) {
            showUpgradeModal(planId, {
                type: "usage",
                resource: "Searches",
                message: `You've used all ${searches.limit} searches this month. Upgrade to get more.`,
            });
            return;
        }

        setSearchError(null);

        // Strip protocol and trailing slashes, extract domain only
        let searchDomain = domain.trim().toLowerCase();
        searchDomain = searchDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

        // Validate domain format (e.g. acme.com, acme.com.br)
        const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
        if (!domainRegex.test(searchDomain)) {
            setSearchError("Please enter a valid domain (e.g. acme.com). Do not include http:// or paths.");
            return;
        }

        setSearchState("searching");

        try {

            // Create search record in Convex (this also deducts a token)
            const searchId = await createSearch({
                companyId,
                userId: user._id,
                domain: searchDomain,
            });

            // Call Redrok LiveSearch API via Convex action
            const result = await redrokLiveSearch({
                companyId,
                userId: user._id,
                domain: searchDomain,
                searchId,
            });

            if (result.success && result.data.length > 0) {
                setCurrentSearchResults(result.data);
                setSearchState("results");
            } else if (result.success && result.data.length === 0) {
                setSearchError("No compromised credentials found for this domain.");
                setSearchState("idle");
            } else {
                setSearchError(result.error || "Search returned no results.");
                setSearchState("idle");
            }
        } catch (error) {
            devError("Search failed:", error);
            setSearchError(error instanceof Error ? error.message : "Search failed. Please try again.");
            setSearchState("idle");
        }
    }

    async function handleAddToWatchlist() {
        if (!companyId || !user || !domain.trim()) return;
        try {
            await addToWatchlist({
                companyId,
                userId: user._id,
                domain: domain.trim().toLowerCase(),
                companyName: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1),
            });
            toast.success(`${domain} added to watchlist!`);
        } catch (error) {
            devError("Failed to add to watchlist:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add to watchlist");
        }
    }

    async function handleCreateLead() {
        if (!companyId || !user || !domain.trim()) return;
        try {
            const companyName = currentSearchResults[0]?.companyName || 
                (domain.includes(".") ? domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1) : domain);
            const maxSeverity = Math.max(...currentSearchResults.map(r => r.severity || 0), 0);
            const severityLabel = maxSeverity >= 8 ? "critical" : maxSeverity >= 5 ? "high" : maxSeverity >= 3 ? "medium" : "low";

            await createLead({
                companyId,
                createdByUserId: user._id,
                name: companyName,
                domain: domain.trim().toLowerCase(),
                source: "live_search",
                exposureCount: currentSearchResults.length,
                exposureSeverity: severityLabel,
                industry: currentSearchResults[0]?.industry || undefined,
                country: currentSearchResults[0]?.country || undefined,
            });
            toast.success(`Lead created for ${companyName}!`);
        } catch (error) {
            devError("Failed to create lead:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create lead");
        }
    }

    if (isCompanyLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }


    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto relative">
            <div className="flex flex-col gap-8">
                {/* Token Display Bar */}
                <div className="p-5 border border-secondary rounded-xl bg-primary">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                                <SearchLg className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <span className="text-lg font-semibold text-primary">
                                    {tokensLeft.toLocaleString()} / {tokensTotal.toLocaleString()} Tokens Remaining
                                </span>
                                <p className="text-sm text-tertiary">Each search costs 1 token</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                        <div
                            className="h-full bg-success-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Search Form */}
                <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-12 border border-secondary rounded-2xl bg-secondary_subtle relative overflow-hidden">
                    <div className="max-w-2xl w-full flex flex-col items-center text-center gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-display-md font-semibold text-primary">Target Intelligence Search</h1>
                            <p className="text-lg text-tertiary">
                                Enter a company domain to scan dark web databases, breach records, and threat intelligence feeds.
                            </p>
                        </div>

                        <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <InputBase
                                type="text"
                                size="md"
                                placeholder="Enter domain (e.g. acmecorp.com or app.acmecorp.com)"
                                className="w-full shadow-sm"
                                icon={Globe01}
                                value={domain}
                                onChange={(value: string) => setDomain(value)}
                                onBlur={() => {
                                    // Live normalize on blur so the user sees the cleaned
                                    // domain before they click Search (orange item 8.1).
                                    if (!domain.trim()) return;
                                    const cleaned = domain
                                        .trim()
                                        .toLowerCase()
                                        .replace(/^https?:\/\//, "")
                                        .replace(/^www\./, "")
                                        .replace(/\/.*$/, "")
                                        .replace(/[?#].*$/, "");
                                    if (cleaned !== domain) setDomain(cleaned);
                                }}
                            />
                            <Button
                                size="lg"
                                color="primary"
                                onClick={handleSearch}
                                isDisabled={searchState === "searching" || tokensLeft < 1}
                                className="shrink-0"
                            >
                                {searchState === "searching" ? "Searching..." : "Search (1 Token)"}
                            </Button>
                        </div>

                        {typeof domain === "string" && domain.includes(".") && (
                            <div className="flex items-center gap-2 text-sm text-tertiary">
                                <Building02 className="w-4 h-4" />
                                <span>Company: <span className="font-medium text-secondary">{domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)}</span></span>
                            </div>
                        )}

                        {searchError && (
                            <div className="flex items-center gap-2 text-sm text-error-600 bg-error-50 px-4 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                <span>{searchError}</span>
                            </div>
                        )}

                        {tokensLeft < 1 && (
                            <div className="flex items-center gap-2 text-sm text-warning-600 bg-warning-50 px-4 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                <span>You have no tokens remaining. Please purchase more to continue searching.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Idle State - Recent Searches */}
                {searchState === "idle" && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-primary">Recent Searches</h3>
                            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                                <Table
                                aria-label="Recent Searches"
                                className="bg-primary w-full"
                            >
                                <Table.Header className="bg-secondary_subtle">
                                    <Table.Head id="domain" label="Domain" isRowHeader className="min-w-[200px]" />
                                    <Table.Head id="exposures" label="Exposures Found" className="min-w-[150px]" />
                                    <Table.Head id="date" label="Search Date" className="min-w-[150px]" />
                                    <Table.Head id="status" label="Status" className="min-w-[100px]" />
                                    <Table.Head id="action" label="" className="w-[120px]" />
                                </Table.Header>
                                <Table.Body items={(recentSearches ?? []).map((s) => ({ ...s, id: s._id }))}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Globe01 className="w-4 h-4 text-tertiary" />
                                                    <span className="font-medium text-primary">{item.domain}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={(item.totalExposures ?? 0) > 5 ? "error" : (item.totalExposures ?? 0) > 0 ? "warning" : "success"} size="sm">
                                                    {item.totalExposures ?? 0} exposures
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{formatDate(item.createdAt)}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge 
                                                    color={item.status === "success" ? "success" : item.status === "failed" ? "error" : "warning"} 
                                                    size="sm"
                                                >
                                                    {item.status}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    onClick={() => {
                                                        setDomain(item.domain);
                                                        handleSearch();
                                                    }}
                                                >
                                                    Re-scan
                                                </Button>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                            {(!recentSearches || recentSearches.length === 0) && (
                                <div className="px-5 py-8 text-center text-sm text-tertiary">
                                    No searches yet. Enter a domain above to get started.
                                </div>
                            )}
                        </TableCard.Root>
                    </div>
                )}

                {/* Searching State */}
                {searchState === "searching" && (
                    <div className="flex flex-col items-center justify-center py-16 gap-6">
                        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center animate-pulse">
                            <SearchLg className="w-8 h-8 text-brand-600 animate-spin" />
                        </div>
                        <div className="text-center flex flex-col gap-2">
                            <h3 className="text-lg font-semibold text-primary">Scanning in progress...</h3>
                            <p className="text-md text-tertiary max-w-md">
                                Scanning dark web databases, breach records, and threat intelligence feeds for <span className="font-medium text-primary">{domain}</span>...
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-tertiary">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Checking breach databases...</span>
                            <span className="flex items-center gap-1.5"><ShieldOff className="w-4 h-4" /> Scanning dark web forums...</span>
                            <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Querying threat feeds...</span>
                        </div>
                    </div>
                )}

                {/* Results State */}
                {searchState === "results" && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-secondary">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center border border-secondary">
                                    <Building02 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-display-xs font-semibold text-primary">{domain}</h2>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <div className="flex items-center gap-3 text-sm text-tertiary">
                                            <span className="flex items-center gap-1">
                                                <ShieldOff className="w-4 h-4 text-error-500" />
                                                {currentSearchResults.length >= 15 ? "15+" : currentSearchResults.length} Compromised Credentials
                                            </span>
                                            <span>•</span>
                                            <span>Last scanned: Just now</span>
                                        </div>
                                        {currentSearchResults.length >= 15 && (
                                            <span className="text-xs text-tertiary">Showing sample records. Actual count may be higher.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                            <MetricsChart04 
                                title={currentSearchResults.length >= 15 ? "15+" : currentSearchResults.length.toString()} 
                                subtitle="Compromised Credentials" 
                                change={new Set(currentSearchResults.map(r => r.source).filter(Boolean)).size.toString()} 
                                changeTrend="negative" 
                                changeDescription="data sources" 
                                chartColor="text-fg-error-secondary" 
                                actions={false}
                            />
                            <MetricsChart04 
                                title={new Set(currentSearchResults.map(r => r.username).filter(Boolean)).size.toString()} 
                                subtitle="Unique Accounts" 
                                change={currentSearchResults.filter(r => r.stealer).length.toString()} 
                                changeTrend="negative" 
                                changeDescription="via infostealers" 
                                chartColor="text-fg-warning-secondary" 
                                actions={false}
                            />
                            <MetricsChart04 
                                title="Just now" 
                                subtitle="Last Scan" 
                                change="Live" 
                                changeTrend="negative" 
                                changeDescription="Dark Web Intelligence" 
                                chartColor="text-fg-error-secondary" 
                                actions={false}
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 p-4 border border-secondary rounded-xl bg-secondary_subtle">
                            <Button 
                                color="secondary" 
                                iconLeading={DownloadCloud01}
                                onClick={() => {
                                    const companyName = currentSearchResults[0]?.companyName || 
                                        (domain.includes(".") ? domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1) : domain);
                                    generateExposureReport({
                                        domain: domain.trim().toLowerCase(),
                                        companyName,
                                        credentials: currentSearchResults.map(r => ({
                                            username: r.username || "",
                                            password: r.password || "",
                                            url: r.url || "",
                                            source: r.source || "",
                                            severity: r.severity || 0,
                                            timestamp: r.timestamp || r.infectedAt || "",
                                            stealer: r.stealer,
                                            breachName: r.breachName,
                                            country: r.country,
                                            computerName: r.computerName,
                                            operatingSystem: r.operatingSystem,
                                        })),
                                        isTrial,
                                        generatedAt: new Date(),
                                    });
                                }}
                            >
                                Download Report (PDF)
                            </Button>
                            <Button color="secondary" iconLeading={BookmarkCheck} onClick={handleAddToWatchlist}>
                                Add {domain} to Watchlist
                            </Button>
                            <Button color="secondary" iconLeading={Plus} onClick={handleCreateLead}>
                                Create Lead from Results
                            </Button>
                            <Button color="primary" iconLeading={SearchLg} onClick={handleSearch}>
                                Re-scan (1 Token)
                            </Button>
                        </div>

                        {/* Results Table */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-primary">Compromised Credentials</h3>
                            {isTrial && (
                                <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 border border-warning-200 px-4 py-2.5 rounded-lg">
                                    <Lock01 className="w-4 h-4 shrink-0" />
                                    <span>You&apos;re on a trial plan. Upgrade to access credentials.</span>
                                </div>
                            )}
                            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                                <Table
                                    aria-label="Search Results"
                                    sortDescriptor={sortDescriptor}
                                    onSortChange={setSortDescriptor}
                                    className="bg-primary w-full"
                                >
                                    <Table.Header className="bg-secondary_subtle">
                                        <Table.Head id="username" label="Username / Email" isRowHeader className="min-w-[200px]" />
                                        <Table.Head id="password" label="Password" className="min-w-[120px]" />
                                        <Table.Head id="url" label="URL" className="min-w-[180px]" />
                                        <Table.Head id="source" label="Source" className="min-w-[120px]" />
                                        <Table.Head id="severity" label="Severity" className="min-w-[100px]" />
                                        <Table.Head id="date" label="Date" className="min-w-[120px]" />
                                        <Table.Head id="actions" label="" className="min-w-[120px]" />
                                    </Table.Header>

                                    <Table.Body items={currentSearchResults.map((r, i) => ({ ...r, id: r.docId || `result-${i}` }))}>
                                        {(item) => {
                                            const sev = getSeverityBadge(item.severity);
                                            return (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Mail01 className="w-4 h-4 text-tertiary shrink-0" />
                                                            <span className="font-medium text-primary text-sm truncate max-w-[180px]">
                                                                {isTrial ? maskValue(item.username) : item.username}
                                                            </span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1.5">
                                                            <Lock01 className="w-3.5 h-3.5 text-tertiary" />
                                                            <span className="text-sm text-secondary font-mono">
                                                                {isTrial ? maskValue(item.password) : item.password}
                                                            </span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-tertiary truncate max-w-[160px] block">
                                                            {item.url ? (isTrial ? maskValue(item.url) : item.url) : "—"}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={item.stealer ? "warning" : "gray"} size="sm">
                                                            {item.stealer || item.source || "Unknown"}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={sev.color} size="sm">{sev.label}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-tertiary">
                                                            {formatApiDate(item.timestamp || item.infectedAt)}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            iconLeading={Eye}
                                                            onClick={() => setSelectedResult(item)}
                                                        >
                                                            Details
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </Table.Body>
                                </Table>

                                {currentSearchResults.length === 0 && (
                                    <div className="px-5 py-8 text-center text-sm text-tertiary">
                                        No compromised credentials found for &quot;{domain}&quot;.
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                                    <span className="text-sm text-tertiary">
                                        Showing <span className="font-medium text-secondary">{currentSearchResults.length}</span> results from Dark Web Intelligence
                                    </span>
                                </div>
                            </TableCard.Root>
                        </div>

                    </div>
                )}
            </div>

            {/* Details Side Panel */}
            <SlideoutMenu
                isOpen={selectedResult !== null}
                onOpenChange={(isOpen) => { if (!isOpen) setSelectedResult(null); }}
            >
                {({ close }) => {
                    const r = selectedResult;
                    if (!r) return null;

                    const detailRows: { label: string; value: string; masked?: boolean }[] = [
                        { label: "Username / Email", value: r.username, masked: true },
                        { label: "Password", value: r.password, masked: true },
                        { label: "URL", value: r.url, masked: true },
                        { label: "Source", value: r.source },
                        { label: "Severity", value: r.severity != null ? `${r.severity} — ${getSeverityBadge(r.severity).label}` : "" },
                        { label: "Date", value: formatApiDate(r.timestamp || r.infectedAt) },
                        { label: "Computer Name", value: r.computerName },
                        { label: "Operating System", value: r.operatingSystem },
                        { label: "Country", value: r.country },
                        { label: "Location", value: r.location },
                        { label: "Breach Name", value: r.breachName },
                        { label: "Stealer", value: r.stealer },
                        { label: "Application", value: r.application },
                        { label: "IP Address", value: r.ip },
                        { label: "Domain", value: r.domain },
                        { label: "Industry", value: r.industry },
                        { label: "Infected File", value: r.infectedFileLocation },
                        { label: "Local User", value: r.localUser },
                        { label: "Computer CPU", value: r.computerCPU },
                        { label: "Computer GPU", value: r.computerGPU },
                        { label: "Computer RAM", value: r.computerRAM },
                        { label: "Antivirus", value: r.computerAV },
                        { label: "Screen Size", value: r.screenSize },
                    ];

                    return (
                        <>
                            <SlideoutMenu.Header onClose={close}>
                                <div className="flex items-center gap-3 pr-8">
                                    <div className="w-10 h-10 rounded-lg bg-error-50 flex items-center justify-center">
                                        <ShieldOff className="w-5 h-5 text-error-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-primary">Credential Details</h2>
                                        <p className="text-sm text-tertiary">{r.domain || domain}</p>
                                    </div>
                                </div>
                            </SlideoutMenu.Header>

                            <SlideoutMenu.Content>
                                {isTrial && (
                                    <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 border border-warning-200 px-3 py-2 rounded-lg">
                                        <Lock01 className="w-4 h-4 shrink-0" />
                                        <span>Trial plan — some values are masked.</span>
                                    </div>
                                )}
                                <div className="flex flex-col divide-y divide-secondary">
                                    {detailRows.map((row) => {
                                        if (!row.value) return null;
                                        const displayValue = row.masked && isTrial ? maskValue(row.value) : row.value;
                                        return (
                                            <div key={row.label} className="flex flex-col gap-0.5 py-3">
                                                <span className="text-xs font-medium text-tertiary uppercase tracking-wide">{row.label}</span>
                                                <span className="text-sm text-primary font-mono break-all">{displayValue}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SlideoutMenu.Content>

                            <SlideoutMenu.Footer>
                                <Button color="secondary" className="w-full" onClick={close}>
                                    Close
                                </Button>
                            </SlideoutMenu.Footer>
                        </>
                    );
                }}
            </SlideoutMenu>
        </div>
    );
}
