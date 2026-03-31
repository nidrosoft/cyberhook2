"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
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
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/hooks/use-company";
import { api } from "../../../../convex/_generated/api";

type SearchState = "idle" | "searching" | "results";

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

interface VictimResult {
    id: string;
    post_title: string;
    group_name: string;
    discovered: string;
    description: string;
    website: string;
    published: string;
    country: string;
    activity: string;
    screenshot: string;
    infostealer: any;
    permalink: string;
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


export default function LiveSearchPage() {
    const { user, companyId } = useCurrentUser();
    const { tokensRemaining, tokenAllocation, isLoading: isCompanyLoading } = useCompany();

    // Fetch recent searches from Convex
    const recentSearches = useQuery(
        api.searches.getRecent,
        companyId ? { companyId, limit: 10 } : "skip"
    );

    // Mutations & Actions
    const createSearch = useMutation(api.searches.create);
    const searchVictims = useAction(api.ransomwareLiveApi.searchVictims);
    const addToWatchlist = useMutation(api.watchlist.add);
    const createLead = useMutation(api.leads.create);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });

    const [searchState, setSearchState] = useState<SearchState>("idle");
    const [domain, setDomain] = useState("");
    const [searchError, setSearchError] = useState<string | null>(null);
    const [currentSearchResults, setCurrentSearchResults] = useState<VictimResult[]>([]);

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

        setSearchError(null);
        setSearchState("searching");

        try {
            // Create search record in Convex (this also deducts a token)
            const searchId = await createSearch({
                companyId,
                userId: user._id,
                domain: domain.trim().toLowerCase(),
            });

            // Call ransomware.live PRO API via Convex action
            const result = await searchVictims({
                query: domain.trim().toLowerCase(),
                searchId,
                companyId,
                userId: user._id,
            });

            if (result.success) {
                setCurrentSearchResults(result.victims as VictimResult[]);
                setSearchState("results");
            } else {
                setSearchError(result.error || "Search returned no results.");
                setSearchState("idle");
            }
        } catch (error) {
            console.error("Search failed:", error);
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
            alert(`${domain} added to watchlist!`);
        } catch (error) {
            console.error("Failed to add to watchlist:", error);
            alert(error instanceof Error ? error.message : "Failed to add to watchlist");
        }
    }

    async function handleCreateLead() {
        if (!companyId || !user || !domain.trim()) return;
        try {
            await createLead({
                companyId,
                createdByUserId: user._id,
                name: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1),
                domain: domain.trim().toLowerCase(),
                source: "live_search",
                exposureCount: currentSearchResults.length,
                exposureSeverity: currentSearchResults.length > 3 ? "critical" : "high",
            });
            alert(`Lead created for ${domain}!`);
        } catch (error) {
            console.error("Failed to create lead:", error);
            alert(error instanceof Error ? error.message : "Failed to create lead");
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
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
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
                                placeholder="Enter domain to search (e.g., acmecorp.com)"
                                className="w-full shadow-sm"
                                icon={Globe01}
                                value={domain}
                                onChange={(value: string) => setDomain(value)}
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
                                    <div className="flex items-center gap-3 text-sm text-tertiary mt-1">
                                        <span className="flex items-center gap-1"><ShieldOff className="w-4 h-4 text-error-500" /> {currentSearchResults.length} Victims Found</span>
                                        <span>•</span>
                                        <span>Last scanned: Just now</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <MetricsChart04 
                                title={currentSearchResults.length.toString()} 
                                subtitle="Ransomware Victims" 
                                change={new Set(currentSearchResults.map(r => r.group_name)).size.toString()} 
                                changeTrend="negative" 
                                changeDescription="threat groups" 
                                chartColor="text-fg-error-secondary" 
                            />
                            <MetricsChart04 
                                title={new Set(currentSearchResults.map(r => r.activity).filter(Boolean)).size.toString()} 
                                subtitle="Industries Affected" 
                                change={currentSearchResults.filter(r => r.infostealer && typeof r.infostealer === "object" && (r.infostealer.employees > 0 || r.infostealer.users > 0)).length.toString()} 
                                changeTrend="negative" 
                                changeDescription="with infostealers" 
                                chartColor="text-fg-warning-secondary" 
                            />
                            <MetricsChart04 
                                title="Just now" 
                                subtitle="Last Scan" 
                                change="Live" 
                                changeTrend="negative" 
                                changeDescription="ransomware.live PRO" 
                                chartColor="text-fg-error-secondary" 
                            />
                        </div>

                        {/* Results Table */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-primary">Detailed Findings</h3>
                            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                                <Table
                                    aria-label="Victim Results"
                                    sortDescriptor={sortDescriptor}
                                    onSortChange={setSortDescriptor}
                                    className="bg-primary w-full"
                                >
                                    <Table.Header className="bg-secondary_subtle">
                                        <Table.Head id="victim" label="Victim" allowsSorting isRowHeader className="min-w-[200px]" />
                                        <Table.Head id="group" label="Threat Group" allowsSorting className="min-w-[150px]" />
                                        <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[140px]" />
                                        <Table.Head id="country" label="Country" className="min-w-[100px]" />
                                        <Table.Head id="date" label="Date" allowsSorting className="min-w-[140px]" />
                                        <Table.Head id="infostealer" label="Infostealer" className="min-w-[120px]" />
                                        <Table.Head id="actions" label="Actions" className="min-w-[200px]" />
                                    </Table.Header>

                                    <Table.Body items={currentSearchResults}>
                                        {(item) => {
                                            const hasInfostealer = item.infostealer && typeof item.infostealer === "object" && (item.infostealer.employees > 0 || item.infostealer.users > 0);
                                            return (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-primary">{item.post_title}</span>
                                                            {item.website && (
                                                                <span className="text-xs text-tertiary">{item.website}</span>
                                                            )}
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color="error" size="sm">
                                                            {item.group_name}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color="gray" size="sm">
                                                            {item.activity || "Unknown"}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-secondary">{item.country || "—"}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1.5 text-secondary">
                                                            <Calendar className="w-4 h-4 text-tertiary" />
                                                            <span className="text-sm">{formatApiDate(item.discovered)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {hasInfostealer ? (
                                                            <Badge color="warning" size="sm">
                                                                {item.infostealer.employees + item.infostealer.users} compromised
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-sm text-tertiary">—</span>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            {item.permalink && (
                                                                <Button
                                                                    size="sm"
                                                                    color="secondary"
                                                                    iconLeading={Eye}
                                                                    onClick={() => window.open(item.permalink, "_blank")}
                                                                >
                                                                    Details
                                                                </Button>
                                                            )}
                                                            {item.website && (
                                                                <Button
                                                                    size="sm"
                                                                    color="secondary"
                                                                    iconLeading={BookmarkCheck}
                                                                    onClick={async () => {
                                                                        if (!companyId || !user) return;
                                                                        try {
                                                                            await addToWatchlist({
                                                                                companyId,
                                                                                userId: user._id,
                                                                                domain: item.website.replace(/^www\./, ""),
                                                                                companyName: item.post_title,
                                                                            });
                                                                            alert(`${item.post_title} added to watchlist!`);
                                                                        } catch (e) {
                                                                            alert(e instanceof Error ? e.message : "Failed");
                                                                        }
                                                                    }}
                                                                >
                                                                    Watch
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                color="secondary"
                                                                iconLeading={Plus}
                                                                onClick={async () => {
                                                                    if (!companyId || !user) return;
                                                                    try {
                                                                        await createLead({
                                                                            companyId,
                                                                            createdByUserId: user._id,
                                                                            name: item.post_title,
                                                                            domain: item.website ? item.website.replace(/^www\./, "") : item.post_title.toLowerCase().replace(/\s+/g, "-") + ".com",
                                                                            source: "live_search",
                                                                            industry: item.activity !== "Not Found" ? item.activity : undefined,
                                                                            country: item.country || undefined,
                                                                        });
                                                                        alert(`Lead created for ${item.post_title}!`);
                                                                    } catch (e) {
                                                                        alert(e instanceof Error ? e.message : "Failed");
                                                                    }
                                                                }}
                                                            >
                                                                Lead
                                                            </Button>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </Table.Body>
                                </Table>

                                {currentSearchResults.length === 0 && (
                                    <div className="px-5 py-8 text-center text-sm text-tertiary">
                                        No victims found matching &quot;{domain}&quot; in ransomware.live database.
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-secondary px-5 py-3.5">
                                    <span className="text-sm text-tertiary">
                                        Showing <span className="font-medium text-secondary">{currentSearchResults.length}</span> results from ransomware.live PRO API
                                    </span>
                                </div>
                            </TableCard.Root>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 p-4 border border-secondary rounded-xl bg-secondary_subtle">
                            <Button color="secondary" iconLeading={DownloadCloud01}>
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
                    </div>
                )}
            </div>
        </div>
    );
}
