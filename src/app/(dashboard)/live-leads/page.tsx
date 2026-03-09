"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Activity,
    AlertCircle,
    Building01,
    Download01,
    FilterLines,
    Globe01,
    Grid01,
    List,
    Mail01,
    Plus,
    SearchLg,
    Upload01,
    Users01,
    DotsVertical,
    XClose,
    BookmarkCheck,
    Send01,
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

type ExposureSeverity = "Critical" | "High" | "Medium" | "Low" | "Clean";

interface Lead {
    id: string;
    company: string;
    domain: string;
    industry: string;
    location: string;
    employees: number;
    revenue: string;
    exposures: number;
    severity: ExposureSeverity;
    lastScanned: string;
}

const mockLeads: Lead[] = [
    { id: "ld-1", company: "Powerful Electric Inc.", domain: "powerfulelectric.com", industry: "Construction", location: "Los Angeles, CA", employees: 100, revenue: "$10M-$24M", exposures: 7, severity: "Critical", lastScanned: "Mar 7, 2026" },
    { id: "ld-2", company: "Acme Healthcare", domain: "acmehealthcare.com", industry: "Healthcare", location: "Chicago, IL", employees: 500, revenue: "$50M-$99M", exposures: 12, severity: "Critical", lastScanned: "Mar 7, 2026" },
    { id: "ld-3", company: "TechNexus Solutions", domain: "technexus.io", industry: "Technology", location: "Austin, TX", employees: 250, revenue: "$25M-$49M", exposures: 3, severity: "Medium", lastScanned: "Mar 6, 2026" },
    { id: "ld-4", company: "GlobalLogistics Corp", domain: "globallogistics.com", industry: "Logistics", location: "Miami, FL", employees: 1200, revenue: "$100M-$249M", exposures: 15, severity: "Critical", lastScanned: "Mar 6, 2026" },
    { id: "ld-5", company: "SecureHealth Group", domain: "securehealth.org", industry: "Healthcare", location: "Boston, MA", employees: 800, revenue: "$50M-$99M", exposures: 0, severity: "Clean", lastScanned: "Mar 5, 2026" },
    { id: "ld-6", company: "FinServe Capital", domain: "finserve.com", industry: "Finance", location: "New York, NY", employees: 350, revenue: "$50M-$99M", exposures: 5, severity: "High", lastScanned: "Mar 5, 2026" },
    { id: "ld-7", company: "EduCorp University", domain: "educorp.edu", industry: "Education", location: "Seattle, WA", employees: 2000, revenue: "$100M-$249M", exposures: 8, severity: "Critical", lastScanned: "Mar 4, 2026" },
    { id: "ld-8", company: "RetailMax Inc", domain: "retailmax.com", industry: "Retail", location: "Dallas, TX", employees: 150, revenue: "$10M-$24M", exposures: 1, severity: "Low", lastScanned: "Mar 4, 2026" },
    { id: "ld-9", company: "CityGov Systems", domain: "citygov.org", industry: "Government", location: "Washington, DC", employees: 450, revenue: "$25M-$49M", exposures: 20, severity: "Critical", lastScanned: "Mar 3, 2026" },
    { id: "ld-10", company: "Pacific Insurance", domain: "pacificinsurance.com", industry: "Insurance", location: "San Francisco, CA", employees: 600, revenue: "$50M-$99M", exposures: 4, severity: "Medium", lastScanned: "Mar 3, 2026" },
    { id: "ld-11", company: "MedPlus Pharmacy", domain: "medplus.com", industry: "Healthcare", location: "Phoenix, AZ", employees: 75, revenue: "$5M-$9M", exposures: 2, severity: "Medium", lastScanned: "Mar 2, 2026" },
    { id: "ld-12", company: "DataCorp Solutions", domain: "datacorp.io", industry: "Technology", location: "Denver, CO", employees: 300, revenue: "$25M-$49M", exposures: 9, severity: "Critical", lastScanned: "Mar 1, 2026" },
];

const industryOptions = ["All", "Healthcare", "Finance", "Technology", "Construction", "Manufacturing", "Education", "Retail", "Government"];
const employeeSizeOptions = ["All", "1-50", "51-200", "201-500", "501-1000", "1000+"];
const revenueOptions = ["All", "<$1M", "$1M-$5M", "$5M-$10M", "$10M-$50M", "$50M+"];
const exposureStatusOptions = ["All", "Has Exposures", "No Exposures", "Critical Only"];
const regionOptions = ["All", "Northeast", "Southeast", "Midwest", "West", "International"];

function getSeverityIndicator(severity: ExposureSeverity) {
    const colors: Record<ExposureSeverity, { dot: string; color: "error" | "warning" | "success"; label: string }> = {
        Critical: { dot: "bg-error-500", color: "error", label: "Critical" },
        High: { dot: "bg-warning-500", color: "warning", label: "High" },
        Medium: { dot: "bg-warning-400", color: "warning", label: "Medium" },
        Low: { dot: "bg-success-500", color: "success", label: "Low" },
        Clean: { dot: "bg-success-500", color: "success", label: "Clean" },
    };
    return colors[severity];
}

const addLeadIndustryOptions = ["Healthcare", "Finance", "Technology", "Construction", "Manufacturing", "Education", "Retail", "Government"];
const addLeadEmployeeOptions = ["1-50", "51-200", "201-500", "501-1000", "1000+"];
const addLeadRevenueOptions = ["<$1M", "$1M-$5M", "$5M-$10M", "$10M-$50M", "$50M+"];

export default function LiveLeadsPage() {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "lastScanned",
        direction: "descending",
    });
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [industry, setIndustry] = useState("All");
    const [employeeSize, setEmployeeSize] = useState("All");
    const [revenue, setRevenue] = useState("All");
    const [exposureStatus, setExposureStatus] = useState("All");
    const [region, setRegion] = useState("All");
    const [viewMode, setViewMode] = useState<Set<string>>(new Set(["list"]));
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState("10");

    // Add Lead slideout state
    const [leadCompany, setLeadCompany] = useState("");
    const [leadDomain, setLeadDomain] = useState("");
    const [leadIndustry, setLeadIndustry] = useState("");
    const [leadLocation, setLeadLocation] = useState("");
    const [leadEmployees, setLeadEmployees] = useState("");
    const [leadRevenue, setLeadRevenue] = useState("");
    const [leadNotes, setLeadNotes] = useState("");

    const handleAddLead = (close: () => void) => {
        // Mock implementation - reset fields
        setLeadCompany("");
        setLeadDomain("");
        setLeadIndustry("");
        setLeadLocation("");
        setLeadEmployees("");
        setLeadRevenue("");
        setLeadNotes("");
        close();
    };

    const hasActiveFilters = industry !== "All" || employeeSize !== "All" || revenue !== "All" || exposureStatus !== "All" || region !== "All";

    const clearFilters = () => {
        setIndustry("All");
        setEmployeeSize("All");
        setRevenue("All");
        setExposureStatus("All");
        setRegion("All");
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
                            <BadgeWithIcon color="success" size="sm" iconLeading={Users01}>1,204 Active</BadgeWithIcon>
                        </div>
                        <p className="text-md text-tertiary">
                            1,204 companies with breach exposure data
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
                                                    isRequired
                                                />
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="block text-sm font-medium text-secondary">
                                                        Industry <span className="text-error-primary">*</span>
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
                                                <Input
                                                    label="Location"
                                                    placeholder="e.g. Los Angeles, CA"
                                                    value={leadLocation}
                                                    onChange={setLeadLocation}
                                                />
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="block text-sm font-medium text-secondary">Employee Count</label>
                                                    <NativeSelect
                                                        aria-label="Employee Count"
                                                        value={leadEmployees}
                                                        onChange={(e) => setLeadEmployees(e.target.value)}
                                                        options={[
                                                            { label: "Select range", value: "" },
                                                            ...addLeadEmployeeOptions.map((opt) => ({ label: opt, value: opt })),
                                                        ]}
                                                        className="w-full"
                                                        selectClassName="text-sm"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="block text-sm font-medium text-secondary">Revenue Range</label>
                                                    <NativeSelect
                                                        aria-label="Revenue Range"
                                                        value={leadRevenue}
                                                        onChange={(e) => setLeadRevenue(e.target.value)}
                                                        options={[
                                                            { label: "Select range", value: "" },
                                                            ...addLeadRevenueOptions.map((opt) => ({ label: opt, value: opt })),
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
                                                <Button color="primary" onClick={() => handleAddLead(close)}>Add Lead</Button>
                                            </div>
                                        </SlideoutMenu.Footer>
                                    </>
                                )}
                            </SlideoutMenu>
                        </SlideoutMenu.Trigger>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 flex-1">
                        <InputBase
                            size="sm"
                            type="search"
                            aria-label="Search leads"
                            placeholder="Search by name or domain..."
                            icon={SearchLg}
                        />
                    </div>
                    <div className="h-8 w-px shrink-0 bg-secondary" />
                    <FilterDropdown
                        aria-label="Industry"
                        value={industry}
                        onChange={(v) => setIndustry(v)}
                        options={industryOptions.map((opt) => ({ label: opt === "All" ? "Industry: All" : opt, value: opt }))}
                    />
                    <FilterDropdown
                        aria-label="Employee Size"
                        value={employeeSize}
                        onChange={(v) => setEmployeeSize(v)}
                        options={employeeSizeOptions.map((opt) => ({ label: opt === "All" ? "Employees: All" : opt, value: opt }))}
                    />
                    <FilterDropdown
                        aria-label="Revenue"
                        value={revenue}
                        onChange={(v) => setRevenue(v)}
                        options={revenueOptions.map((opt) => ({ label: opt === "All" ? "Revenue: All" : opt, value: opt }))}
                    />
                    <FilterDropdown
                        aria-label="Exposure Status"
                        value={exposureStatus}
                        onChange={(v) => setExposureStatus(v)}
                        options={exposureStatusOptions.map((opt) => ({ label: opt === "All" ? "Exposure: All" : opt, value: opt }))}
                    />
                    <FilterDropdown
                        aria-label="Region"
                        value={region}
                        onChange={(v) => setRegion(v)}
                        options={regionOptions.map((opt) => ({ label: opt === "All" ? "Region: All" : opt, value: opt }))}
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
                    <div className="flex items-center gap-4 rounded-xl border border-brand-300 bg-brand-25 px-5 py-3 shadow-sm">
                        <span className="text-sm font-semibold text-brand-700">{selectedCount} selected</span>
                        <div className="h-5 w-px bg-brand-200" />
                        <div className="flex items-center gap-2">
                            <Button color="secondary" size="sm" iconLeading={BookmarkCheck}>Add to Watchlist</Button>
                            <Button color="secondary" size="sm" iconLeading={Send01}>Start Campaign</Button>
                            <Button color="secondary" size="sm" iconLeading={Download01}>Export Selected</Button>
                        </div>
                    </div>
                )}

                {/* Main Table - List View */}
                {Array.from(viewMode).includes("list") && (
                <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                    <Table
                        aria-label="Live Leads List"
                        selectionMode="multiple"
                        selectedKeys={selectedKeys}
                        onSelectionChange={(keys) => setSelectedKeys(keys === "all" ? new Set(mockLeads.map((l) => l.id)) : new Set(keys as Set<string>))}
                        sortDescriptor={sortDescriptor}
                        onSortChange={setSortDescriptor}
                        className="bg-primary w-full"
                    >
                        <Table.Header className="bg-secondary_subtle">
                            <Table.Head id="company" label="Company" allowsSorting isRowHeader className="w-full min-w-[220px]" />
                            <Table.Head id="domain" label="Domain" allowsSorting className="min-w-[160px]" />
                            <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[120px]" />
                            <Table.Head id="location" label="Location" allowsSorting className="min-w-[150px]" />
                            <Table.Head id="employees" label="Employees" allowsSorting className="min-w-[100px]" />
                            <Table.Head id="revenue" label="Revenue" allowsSorting className="min-w-[120px]" />
                            <Table.Head id="exposures" label="Exposures" allowsSorting className="min-w-[150px]" />
                            <Table.Head id="lastScanned" label="Last Scanned" allowsSorting className="min-w-[130px]" />
                            <Table.Head id="actions" className="w-[80px]" />
                        </Table.Header>

                        <Table.Body items={mockLeads}>
                            {(item) => {
                                const sev = getSeverityIndicator(item.severity);
                                return (
                                    <Table.Row id={item.id}>
                                        <Table.Cell>
                                            <Link href={`/live-leads/${item.id}`} className="flex items-center gap-3 group/link">
                                                <div className="w-8 h-8 rounded border border-secondary bg-secondary_subtle flex items-center justify-center shrink-0">
                                                    <Building01 className="w-4 h-4 text-tertiary" />
                                                </div>
                                                <span className="font-medium text-primary group-hover/link:text-brand-600 transition-colors whitespace-nowrap">
                                                    {item.company}
                                                </span>
                                            </Link>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-tertiary whitespace-nowrap">{item.domain}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color="gray" size="sm">{item.industry}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-secondary whitespace-nowrap">{item.location}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-secondary">{item.employees.toLocaleString()}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-secondary">{item.revenue}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${sev.dot}`} />
                                                <Badge color={sev.color} size="sm">
                                                    {item.exposures} {sev.label}
                                                </Badge>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-tertiary">{item.lastScanned}</span>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <div className="relative">
                                                <ButtonUtility
                                                    size="sm"
                                                    icon={DotsVertical}
                                                    aria-label="Actions"
                                                    onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                                                />
                                                {openMenu === item.id && (
                                                    <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-secondary bg-primary py-1 shadow-lg">
                                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                            View Details
                                                        </button>
                                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                            Add to Watchlist
                                                        </button>
                                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                            Start Campaign
                                                        </button>
                                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                            Push to CRM
                                                        </button>
                                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-secondary_subtle" onClick={() => setOpenMenu(null)}>
                                                            Generate Report
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

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-secondary px-5 py-3.5">
                        <span className="text-sm text-tertiary">
                            Showing <span className="font-medium text-secondary">1-12</span> of <span className="font-medium text-secondary">1,204</span> leads
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`flex size-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                                            currentPage === p
                                                ? "bg-brand-50 text-brand-700"
                                                : "text-quaternary hover:bg-primary_hover hover:text-secondary"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <span className="px-1 text-sm text-quaternary">...</span>
                                <button
                                    onClick={() => setCurrentPage(101)}
                                    className={`flex size-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                                        currentPage === 101
                                            ? "bg-brand-50 text-brand-700"
                                            : "text-quaternary hover:bg-primary_hover hover:text-secondary"
                                    }`}
                                >
                                    101
                                </button>
                            </div>
                        </div>
                        <FilterDropdown
                            aria-label="Items per page"
                            value={perPage}
                            onChange={(v) => setPerPage(v)}
                            options={[
                                { label: "10 per page", value: "10" },
                                { label: "25 per page", value: "25" },
                                { label: "50 per page", value: "50" },
                                { label: "100 per page", value: "100" },
                            ]}
                        />
                    </div>
                </TableCard.Root>
                )}

                {/* Grid View */}
                {Array.from(viewMode).includes("grid") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mockLeads.map((lead) => {
                            const indicator = getSeverityIndicator(lead.severity);
                            return (
                                <div key={lead.id} className="rounded-xl border border-secondary bg-primary p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                                                {lead.company.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-primary text-sm">{lead.company}</p>
                                                <p className="text-xs text-tertiary">{lead.domain}</p>
                                            </div>
                                        </div>
                                        <Badge color={indicator.color} size="sm">{indicator.label}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-tertiary">Industry:</span> <span className="text-secondary">{lead.industry}</span></div>
                                        <div><span className="text-tertiary">Location:</span> <span className="text-secondary">{lead.location}</span></div>
                                        <div><span className="text-tertiary">Employees:</span> <span className="text-secondary">{lead.employees.toLocaleString()}</span></div>
                                        <div><span className="text-tertiary">Revenue:</span> <span className="text-secondary">{lead.revenue}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-secondary">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-block w-2 h-2 rounded-full ${indicator.dot}`} />
                                            <span className="text-sm text-secondary">{lead.exposures} exposures</span>
                                        </div>
                                        <Button size="sm" color="secondary">View Details</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
