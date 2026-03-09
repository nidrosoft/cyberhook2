"use client";

import { useState } from "react";
import {
    Activity,
    AlertCircle,
    Bell01,
    CheckCircle,
    Clock,
    Eye,
    Globe01,
    Hash01,
    Mail01,
    MessageSquare01,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    Settings01,
    Shield01,
    Trash01,
    XClose,
    DotsVertical,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input, InputBase } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { MetricsChart04 } from "@/components/application/metrics/metrics";

type AlertLevel = "Critical" | "Warning" | "Normal" | "Clean" | "Paused";

interface WatchlistDomain {
    id: string;
    domain: string;
    company: string;
    industry: string;
    status: "Active" | "Paused";
    exposuresPrev: number;
    exposuresCurr: number;
    changeLabel: string;
    lastChange: string;
    alertLevel: AlertLevel;
}

const mockWatchlist: WatchlistDomain[] = [
    { id: "wl-1", domain: "acmecorp.com", company: "Acme Corp", industry: "Technology", status: "Active", exposuresPrev: 7, exposuresCurr: 9, changeLabel: "+2 new", lastChange: "2 hours ago", alertLevel: "Critical" },
    { id: "wl-2", domain: "globallogistics.com", company: "GlobalLogistics", industry: "Logistics", status: "Active", exposuresPrev: 15, exposuresCurr: 15, changeLabel: "no change", lastChange: "1 day ago", alertLevel: "Normal" },
    { id: "wl-3", domain: "finserve.com", company: "FinServe Capital", industry: "Finance", status: "Active", exposuresPrev: 5, exposuresCurr: 7, changeLabel: "+2 new", lastChange: "4 hours ago", alertLevel: "Warning" },
    { id: "wl-4", domain: "securehealth.org", company: "SecureHealth", industry: "Healthcare", status: "Active", exposuresPrev: 0, exposuresCurr: 0, changeLabel: "clean", lastChange: "3 days ago", alertLevel: "Clean" },
    { id: "wl-5", domain: "educorp.edu", company: "EduCorp", industry: "Education", status: "Paused", exposuresPrev: 8, exposuresCurr: 8, changeLabel: "", lastChange: "5 days ago", alertLevel: "Paused" },
    { id: "wl-6", domain: "retailmax.com", company: "RetailMax", industry: "Retail", status: "Active", exposuresPrev: 1, exposuresCurr: 3, changeLabel: "+2 new", lastChange: "6 hours ago", alertLevel: "Warning" },
    { id: "wl-7", domain: "citygov.org", company: "CityGov", industry: "Government", status: "Active", exposuresPrev: 20, exposuresCurr: 22, changeLabel: "+2 new", lastChange: "1 hour ago", alertLevel: "Critical" },
    { id: "wl-8", domain: "techforward.io", company: "TechForward", industry: "Technology", status: "Active", exposuresPrev: 3, exposuresCurr: 3, changeLabel: "no change", lastChange: "2 days ago", alertLevel: "Normal" },
];

function getAlertBadge(level: AlertLevel) {
    switch (level) {
        case "Critical": return { dot: "🔴", color: "error" as const };
        case "Warning": return { dot: "🟡", color: "warning" as const };
        case "Normal": return { dot: "🟢", color: "success" as const };
        case "Clean": return { dot: "🟢", color: "success" as const };
        case "Paused": return { dot: "⏸", color: "gray" as const };
    }
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                enabled ? "bg-brand-600" : "bg-gray-200"
            }`}
        >
            <span
                className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    enabled ? "translate-x-4" : "translate-x-0"
                }`}
            />
        </button>
    );
}

export default function WatchlistPage() {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "domain",
        direction: "ascending",
    });
    const [newDomain, setNewDomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [monitorWindow, setMonitorWindow] = useState<"7" | "30" | "90">("30");
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [alertThreshold, setAlertThreshold] = useState("Any Change");

    const [filterStatus, setFilterStatus] = useState("all");
    const [filterAlertLevel, setFilterAlertLevel] = useState("all");
    const [filterIndustry, setFilterIndustry] = useState("all");
    const [domainSearch, setDomainSearch] = useState("");

    const [emailNotif, setEmailNotif] = useState(true);
    const [inAppNotif, setInAppNotif] = useState(true);
    const [slackNotif, setSlackNotif] = useState(false);
    const [teamsNotif, setTeamsNotif] = useState(false);
    const [alertFrequency, setAlertFrequency] = useState("Instant");
    const [criticalOnly, setCriticalOnly] = useState(false);

    const stats = {
        monitored: 8,
        newAlerts: 4,
        criticalAlerts: 2,
    };

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-display-sm font-semibold text-primary">Watchlist</h1>
                        </div>
                        <p className="text-md text-tertiary">
                            Monitor domains for new breach activity
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <SlideoutMenu.Trigger>
                            <Button color="primary" iconLeading={Plus}>Add Domain</Button>
                            <SlideoutMenu>
                                {({ close }) => (
                                    <>
                                        <SlideoutMenu.Header onClose={close}>
                                            <h2 className="text-lg font-semibold text-primary">Add Domain to Watchlist</h2>
                                            <p className="text-sm text-tertiary mt-1">Monitor a domain for new breach activity</p>
                                        </SlideoutMenu.Header>
                                        <SlideoutMenu.Content>
                                            <div className="flex flex-col gap-4">
                                                <Input
                                                    size="sm"
                                                    label="Domain"
                                                    type="text"
                                                    placeholder="e.g. example.com"
                                                    icon={Globe01}
                                                    value={newDomain}
                                                    onChange={setNewDomain}
                                                    className="max-w-md"
                                                />
                                                <Input
                                                    size="sm"
                                                    label="Company Name"
                                                    type="text"
                                                    placeholder="e.g. Acme Corp"
                                                    value={companyName}
                                                    onChange={setCompanyName}
                                                    className="max-w-md"
                                                />
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Monitoring Window</label>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="window"
                                                                checked={monitorWindow === "7"}
                                                                onChange={() => setMonitorWindow("7")}
                                                                className="size-4 accent-brand-600"
                                                            />
                                                            <span className="text-sm text-secondary">7 days</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="window"
                                                                checked={monitorWindow === "30"}
                                                                onChange={() => setMonitorWindow("30")}
                                                                className="size-4 accent-brand-600"
                                                            />
                                                            <span className="text-sm text-secondary">30 days</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="window"
                                                                checked={monitorWindow === "90"}
                                                                onChange={() => setMonitorWindow("90")}
                                                                className="size-4 accent-brand-600"
                                                            />
                                                            <span className="text-sm text-secondary">90 days</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Checkbox
                                                        label="Email Notifications"
                                                        isSelected={emailAlerts}
                                                        onChange={setEmailAlerts}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Alert Threshold</label>
                                                    <NativeSelect
                                                        aria-label="Alert Threshold"
                                                        value={alertThreshold}
                                                        onChange={(e) => setAlertThreshold(e.target.value)}
                                                        options={[
                                                            { label: "Any Change", value: "Any Change" },
                                                            { label: "Critical Only", value: "Critical Only" },
                                                            { label: "High & Critical", value: "High & Critical" },
                                                        ]}
                                                        className="w-full"
                                                        selectClassName="text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <div className="flex items-center justify-end gap-3">
                                                <Button color="secondary" onClick={close}>Cancel</Button>
                                                <Button
                                                    color="primary"
                                                    onClick={() => {
                                                        setNewDomain("");
                                                        setCompanyName("");
                                                        close();
                                                    }}
                                                >
                                                    Add to Watchlist
                                                </Button>
                                            </div>
                                        </SlideoutMenu.Footer>
                                    </>
                                )}
                            </SlideoutMenu>
                        </SlideoutMenu.Trigger>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MetricsChart04 title="8" subtitle="Monitored Domains" change="2" changeTrend="positive" changeDescription="added this week" />
                    <MetricsChart04 title="4" subtitle="New Alerts This Week" change="33%" changeTrend="negative" changeDescription="vs last week" chartColor="text-fg-warning-secondary" />
                    <MetricsChart04 title="2" subtitle="Critical Alerts" change="2" changeTrend="negative" changeDescription="require attention" chartColor="text-fg-error-secondary" />
                </div>

                {/* Filter Bar */}
                <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 flex-1">
                        <InputBase
                            size="sm"
                            type="search"
                            aria-label="Search watchlist"
                            placeholder="Search domains..."
                            icon={SearchLg}
                            value={domainSearch}
                            onChange={(value: string) => setDomainSearch(value)}
                        />
                    </div>
                    <div className="h-8 w-px shrink-0 bg-secondary" />
                    <FilterDropdown
                        aria-label="Status"
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { label: "Status: All", value: "all" },
                            { label: "Active", value: "Active" },
                            { label: "Paused", value: "Paused" },
                        ]}
                    />
                    <FilterDropdown
                        aria-label="Alert Level"
                        value={filterAlertLevel}
                        onChange={setFilterAlertLevel}
                        options={[
                            { label: "Alert Level: All", value: "all" },
                            { label: "Critical", value: "Critical" },
                            { label: "Warning", value: "Warning" },
                            { label: "Normal", value: "Normal" },
                            { label: "Clean", value: "Clean" },
                        ]}
                    />
                    <FilterDropdown
                        aria-label="Industry"
                        value={filterIndustry}
                        onChange={setFilterIndustry}
                        options={[
                            { label: "Industry: All", value: "all" },
                            ...Array.from(new Set(mockWatchlist.map((d) => d.industry))).sort().map((ind) => ({ label: ind, value: ind })),
                        ]}
                    />
                </div>

                {/* Watchlist Table */}
                <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                    <TableCard.Header title="Monitored Domains" badge={`${mockWatchlist.length} domains`} />

                    <Table
                        aria-label="Watchlist Domains"
                        selectionMode="multiple"
                        sortDescriptor={sortDescriptor}
                        onSortChange={setSortDescriptor}
                        className="bg-primary w-full"
                    >
                        <Table.Header className="bg-secondary_subtle">
                            <Table.Head id="domain" label="Domain" allowsSorting isRowHeader className="min-w-[180px]" />
                            <Table.Head id="company" label="Company" allowsSorting className="min-w-[140px]" />
                            <Table.Head id="industry" label="Industry" allowsSorting className="min-w-[110px]" />
                            <Table.Head id="status" label="Status" allowsSorting className="min-w-[150px]" />
                            <Table.Head id="exposures" label="Exposures" allowsSorting className="min-w-[160px]" />
                            <Table.Head id="lastChange" label="Last Change" allowsSorting className="min-w-[120px]" />
                            <Table.Head id="alertLevel" label="Alert Level" allowsSorting className="min-w-[120px]" />
                            <Table.Head id="actions" label="Actions" className="min-w-[160px]" />
                        </Table.Header>

                        <Table.Body items={mockWatchlist}>
                            {(item) => {
                                const alert = getAlertBadge(item.alertLevel);
                                return (
                                    <Table.Row id={item.id}>
                                        <Table.Cell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded border border-secondary bg-secondary_subtle flex items-center justify-center shrink-0">
                                                    <Globe01 className="w-4 h-4 text-tertiary" />
                                                </div>
                                                <span className="font-medium text-primary">{item.domain}</span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-secondary">{item.company}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color="gray" size="sm">{item.industry}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-2">
                                                {item.status === "Active" ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 text-success-500" />
                                                        <span className="text-sm text-success-700">Active Monitoring ✅</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PauseCircle className="w-4 h-4 text-warning-500" />
                                                        <span className="text-sm text-warning-700">Paused ⏸</span>
                                                    </>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {item.status === "Paused" ? (
                                                <span className="text-sm text-tertiary">{item.exposuresCurr}</span>
                                            ) : item.changeLabel === "clean" ? (
                                                <span className="text-sm text-success-700">0 → 0 (clean)</span>
                                            ) : item.changeLabel === "no change" ? (
                                                <span className="text-sm text-tertiary">
                                                    {item.exposuresPrev} → {item.exposuresCurr} (no change)
                                                </span>
                                            ) : (
                                                <span className="text-sm">
                                                    <span className="text-secondary">{item.exposuresPrev} → {item.exposuresCurr}</span>{" "}
                                                    <span className="text-error-600 font-medium">({item.changeLabel})</span>
                                                </span>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-tertiary">{item.lastChange}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs leading-none">{alert.dot}</span>
                                                <Badge color={alert.color} size="sm">{item.alertLevel}</Badge>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-1">
                                                <Button color="link-gray" size="sm" iconLeading={Eye}>View</Button>
                                                {item.status === "Active" ? (
                                                    <Button color="link-gray" size="sm" iconLeading={PauseCircle}>Pause</Button>
                                                ) : (
                                                    <Button color="link-gray" size="sm" iconLeading={PlayCircle}>Resume</Button>
                                                )}
                                                <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Remove" />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }}
                        </Table.Body>
                    </Table>
                </TableCard.Root>

                {/* Alert Preferences */}
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-primary mb-6">Alert Preferences</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-5">
                            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">Notification Channels</h3>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Mail01 className="w-5 h-5 text-tertiary" />
                                    <span className="text-sm text-secondary">Email notifications</span>
                                </div>
                                <Toggle enabled={emailNotif} onToggle={() => setEmailNotif(!emailNotif)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bell01 className="w-5 h-5 text-tertiary" />
                                    <span className="text-sm text-secondary">In-app notifications</span>
                                </div>
                                <Toggle enabled={inAppNotif} onToggle={() => setInAppNotif(!inAppNotif)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Hash01 className="w-5 h-5 text-tertiary" />
                                    <span className="text-sm text-secondary">Slack notifications</span>
                                </div>
                                <Toggle enabled={slackNotif} onToggle={() => setSlackNotif(!slackNotif)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare01 className="w-5 h-5 text-tertiary" />
                                    <span className="text-sm text-secondary">Teams notifications</span>
                                </div>
                                <Toggle enabled={teamsNotif} onToggle={() => setTeamsNotif(!teamsNotif)} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-5">
                            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">Preferences</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-secondary">Alert frequency</span>
                                <NativeSelect
                                    aria-label="Alert frequency"
                                    value={alertFrequency}
                                    onChange={(e) => setAlertFrequency(e.target.value)}
                                    options={[
                                        { label: "Instant", value: "Instant" },
                                        { label: "Daily", value: "Daily" },
                                        { label: "Weekly", value: "Weekly" },
                                    ]}
                                    className="w-auto"
                                    selectClassName="text-sm py-1.5"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-secondary">Critical alerts only</span>
                                <Toggle enabled={criticalOnly} onToggle={() => setCriticalOnly(!criticalOnly)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
