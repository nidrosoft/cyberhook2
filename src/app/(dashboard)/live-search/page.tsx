"use client";

import { useState } from "react";
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
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { MetricsChart04 } from "@/components/application/metrics/metrics";

type SearchState = "idle" | "searching" | "results";

const recentSearches = [
    { domain: "acmecorp.com", exposures: 7, date: "Mar 7, 2026" },
    { domain: "globallogistics.com", exposures: 12, date: "Mar 6, 2026" },
    { domain: "techforward.io", exposures: 3, date: "Mar 5, 2026" },
];

interface MockResult {
    id: string;
    type: string;
    email: string;
    emailUnmasked: string;
    dataExposed: string;
    dataExposedUnmasked: string;
    source: string;
    date: string;
    severity: string;
}

const mockResults: MockResult[] = [
    {
        id: "r-1",
        type: "Credential Leak",
        email: "j***@acmecorp.com",
        emailUnmasked: "john.doe@acmecorp.com",
        dataExposed: "p******",
        dataExposedUnmasked: "p@ssw0rd123!",
        source: "Dark Web Forum",
        date: "Mar 3, 2026",
        severity: "Critical",
    },
    {
        id: "r-2",
        type: "Session Cookie",
        email: "s.j***@acmecorp.com",
        emailUnmasked: "s.jones@acmecorp.com",
        dataExposed: "[masked]",
        dataExposedUnmasked: "sess_a8f2c9e1b3d4...",
        source: "Paste Site",
        date: "Mar 2, 2026",
        severity: "High",
    },
    {
        id: "r-3",
        type: "Credential Leak",
        email: "r.w***@acmecorp.com",
        emailUnmasked: "r.williams@acmecorp.com",
        dataExposed: "p******",
        dataExposedUnmasked: "Winter2026!",
        source: "Breach Database",
        date: "Feb 28, 2026",
        severity: "High",
    },
    {
        id: "r-4",
        type: "API Key Exposed",
        email: "ak_***8f2d",
        emailUnmasked: "ak_live_7b3c4e2a8f2d",
        dataExposed: "n/a",
        dataExposedUnmasked: "n/a",
        source: "GitHub",
        date: "Feb 25, 2026",
        severity: "Critical",
    },
    {
        id: "r-5",
        type: "PII Exposure",
        email: "e.c***@acmecorp.com",
        emailUnmasked: "e.chen@acmecorp.com",
        dataExposed: "SSN: ***-**-4521",
        dataExposedUnmasked: "SSN: 482-37-4521",
        source: "Dark Web Market",
        date: "Feb 20, 2026",
        severity: "Critical",
    },
    {
        id: "r-6",
        type: "Credential Leak",
        email: "m.t***@acmecorp.com",
        emailUnmasked: "m.taylor@acmecorp.com",
        dataExposed: "p******",
        dataExposedUnmasked: "Qwerty456",
        source: "Combo List",
        date: "Feb 15, 2026",
        severity: "Medium",
    },
    {
        id: "r-7",
        type: "Email/Password Combo",
        email: "d.k***@acmecorp.com",
        emailUnmasked: "d.kim@acmecorp.com",
        dataExposed: "p******",
        dataExposedUnmasked: "SecurePass1!",
        source: "Breach Database",
        date: "Feb 10, 2026",
        severity: "Medium",
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

function typeColor(type: string) {
    switch (type) {
        case "Credential Leak": return "error";
        case "Session Cookie": return "warning";
        case "API Key Exposed": return "error";
        case "PII Exposure": return "purple";
        case "Email/Password Combo": return "orange";
        default: return "gray";
    }
}

export default function LiveSearchPage() {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "date",
        direction: "descending",
    });

    const [searchState, setSearchState] = useState<SearchState>("idle");
    const [domain, setDomain] = useState("acmecorp.com");
    const [unmaskedRows, setUnmaskedRows] = useState<Set<string>>(new Set());

    const tokensRemaining = 941;
    const tokensTotal = 1000;
    const progressPercent = (tokensRemaining / tokensTotal) * 100;

    function handleSearch() {
        if (!domain.trim()) return;
        setSearchState("searching");
        setTimeout(() => setSearchState("results"), 2000);
    }

    function toggleUnmask(id: string) {
        setUnmaskedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
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
                                    {tokensRemaining.toLocaleString()} / {tokensTotal.toLocaleString()} Tokens Remaining
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

                        <div className="flex w-full items-center gap-3">
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
                                isDisabled={searchState === "searching"}
                            >
                                Search (1 Token)
                            </Button>
                        </div>

                        {domain && (
                            <div className="flex items-center gap-2 text-sm text-tertiary">
                                <Building02 className="w-4 h-4" />
                                <span>Company: <span className="font-medium text-secondary">{domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)}</span></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Idle State - Recent Searches */}
                {searchState === "idle" && (
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-primary">Recent Searches</h3>
                        <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                            <Table
                                aria-label="Recent Searches"
                                className="bg-primary w-full"
                            >
                                <Table.Header className="bg-secondary_subtle">
                                    <Table.Head id="domain" label="Domain" isRowHeader className="min-w-[200px]" />
                                    <Table.Head id="exposures" label="Exposures Found" className="min-w-[150px]" />
                                    <Table.Head id="date" label="Search Date" className="min-w-[150px]" />
                                    <Table.Head id="action" label="" className="w-[120px]" />
                                </Table.Header>
                                <Table.Body items={recentSearches.map((s, i) => ({ ...s, id: `rs-${i}` }))}>
                                    {(item) => (
                                        <Table.Row id={item.id}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Globe01 className="w-4 h-4 text-tertiary" />
                                                    <span className="font-medium text-primary">{item.domain}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge color={item.exposures > 5 ? "error" : "warning"} size="sm">
                                                    {item.exposures} exposures
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1.5 text-secondary">
                                                    <Calendar className="w-4 h-4 text-tertiary" />
                                                    <span>{item.date}</span>
                                                </div>
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
                        <div className="flex items-center gap-4 text-sm text-tertiary">
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
                                        <span className="flex items-center gap-1"><ShieldOff className="w-4 h-4 text-error-500" /> 7 Exposures Found</span>
                                        <span>•</span>
                                        <span>Last scanned: Just now</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <MetricsChart04 title="7" subtitle="Total Exposures" change="3" changeTrend="negative" changeDescription="new this month" chartColor="text-fg-error-secondary" />
                            <MetricsChart04 title="4" subtitle="Compromised Accounts" change="2" changeTrend="negative" changeDescription="active" chartColor="text-fg-warning-secondary" />
                            <MetricsChart04 title="5 days" subtitle="Last Breach" change="Recent" changeTrend="negative" changeDescription="activity detected" chartColor="text-fg-error-secondary" />
                        </div>

                        {/* Results Table */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-primary">Detailed Findings</h3>
                            <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                                <Table
                                    aria-label="Exposure Results"
                                    sortDescriptor={sortDescriptor}
                                    onSortChange={setSortDescriptor}
                                    className="bg-primary w-full"
                                >
                                    <Table.Header className="bg-secondary_subtle">
                                        <Table.Head id="type" label="Type" allowsSorting isRowHeader className="min-w-[160px]" />
                                        <Table.Head id="email" label="Email / Account" allowsSorting className="min-w-[200px]" />
                                        <Table.Head id="data" label="Data Exposed" className="min-w-[160px]" />
                                        <Table.Head id="source" label="Source" allowsSorting className="min-w-[150px]" />
                                        <Table.Head id="date" label="Date Detected" allowsSorting className="min-w-[140px]" />
                                        <Table.Head id="severity" label="Severity" allowsSorting className="min-w-[100px]" />
                                        <Table.Head id="actions" label="Actions" className="min-w-[280px]" />
                                    </Table.Header>

                                    <Table.Body items={mockResults}>
                                        {(item) => {
                                            const isUnmasked = unmaskedRows.has(item.id);
                                            return (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <Badge color={typeColor(item.type) as any} size="sm">
                                                            {item.type}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="font-mono text-sm text-primary">
                                                            {isUnmasked ? item.emailUnmasked : item.email}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="font-mono text-sm text-secondary">
                                                            {isUnmasked ? item.dataExposedUnmasked : item.dataExposed}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-secondary">{item.source}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1.5 text-secondary">
                                                            <Calendar className="w-4 h-4 text-tertiary" />
                                                            <span className="text-sm">{item.date}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={severityColor(item.severity) as any} size="sm">
                                                            {item.severity}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                color={isUnmasked ? "secondary" : "primary"}
                                                                iconLeading={Eye}
                                                                onClick={() => toggleUnmask(item.id)}
                                                            >
                                                                {isUnmasked ? "Mask" : "Unmask"}
                                                            </Button>
                                                            <Button size="sm" color="secondary" iconLeading={BookmarkCheck}>
                                                                Watchlist
                                                            </Button>
                                                            <Button size="sm" color="secondary" iconLeading={Plus}>
                                                                Lead
                                                            </Button>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </Table.Body>
                                </Table>

                                <div className="px-5 border-t border-secondary">
                                    <PaginationCardMinimal page={1} total={1} />
                                </div>
                            </TableCard.Root>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 p-4 border border-secondary rounded-xl bg-secondary_subtle">
                            <Button color="secondary" iconLeading={DownloadCloud01}>
                                Download Report (PDF)
                            </Button>
                            <Button color="secondary" iconLeading={BookmarkCheck}>
                                Add {domain} to Watchlist
                            </Button>
                            <Button color="secondary" iconLeading={Plus}>
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
