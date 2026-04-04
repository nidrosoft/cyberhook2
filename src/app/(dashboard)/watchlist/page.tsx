"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
import {
    Bell01,
    CheckCircle,
    Eye,
    Globe01,
    Hash01,
    Loading02,
    Mail01,
    MessageSquare01,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    Trash01,
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type AlertLevel = "Critical" | "Warning" | "Normal" | "Clean" | "Paused";

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
}

function getAlertLevelFromItem(item: { hasNewExposures?: boolean; exposureCount?: number; isPaused?: boolean }): AlertLevel {
    if (item.isPaused) return "Paused";
    if (item.hasNewExposures) return "Critical";
    if ((item.exposureCount ?? 0) === 0) return "Clean";
    if ((item.exposureCount ?? 0) > 5) return "Warning";
    return "Normal";
}

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
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // Fetch watchlist data from Convex
    const watchlistItems = useQuery(
        api.watchlist.list,
        companyId ? { companyId } : "skip"
    );
    const watchlistStats = useQuery(
        api.watchlist.getStats,
        companyId ? { companyId } : "skip"
    );

    // Mutations
    const addToWatchlist = useMutation(api.watchlist.add);
    const removeFromWatchlist = useMutation(api.watchlist.remove);
    const pauseWatchlist = useMutation(api.watchlist.pause);
    const resumeWatchlist = useMutation(api.watchlist.resume);
    const updateUser = useMutation(api.users.update);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "domain",
        direction: "ascending",
    });
    const [newDomain, setNewDomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [filterStatus, setFilterStatus] = useState("all");
    const [filterAlertLevel, setFilterAlertLevel] = useState("all");
    const [domainSearch, setDomainSearch] = useState("");

    const [emailNotif, setEmailNotif] = useState(user?.emailNotifications ?? true);
    const [inAppNotif, setInAppNotif] = useState(user?.inAppNotifications ?? true);
    const [slackNotif, setSlackNotif] = useState(user?.slackNotifications ?? false);
    const [teamsNotif, setTeamsNotif] = useState(user?.teamsNotifications ?? false);
    const [alertFrequency, setAlertFrequency] = useState(user?.notificationFrequency ?? "Instant");
    const [criticalOnly, setCriticalOnly] = useState(user?.criticalAlertsOnly ?? false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);

    const [confirmRemoveId, setConfirmRemoveId] = useState<Id<"watchlistItems"> | null>(null);

    async function handleSaveAlertPreferences() {
        if (!user) return;
        setIsSavingPrefs(true);
        try {
            await updateUser({
                id: user._id,
                emailNotifications: emailNotif,
                inAppNotifications: inAppNotif,
                slackNotifications: slackNotif,
                teamsNotifications: teamsNotif,
                notificationFrequency: alertFrequency,
                criticalAlertsOnly: criticalOnly,
            });
            toast.success("Alert preferences saved");
        } catch (error) {
            devError("Failed to save preferences:", error);
            toast.error("Failed to save preferences");
        } finally {
            setIsSavingPrefs(false);
        }
    }

    // Filter watchlist items
    const filteredItems = useMemo(() => {
        if (!watchlistItems) return [];
        return watchlistItems.filter((item) => {
            // Search filter
            if (domainSearch && !item.domain.toLowerCase().includes(domainSearch.toLowerCase())) {
                return false;
            }
            // Status filter
            if (filterStatus !== "all") {
                const isActive = !item.isPaused;
                if (filterStatus === "Active" && !isActive) return false;
                if (filterStatus === "Paused" && isActive) return false;
            }
            // Alert level filter
            if (filterAlertLevel !== "all") {
                const alertLevel = getAlertLevelFromItem(item);
                if (alertLevel !== filterAlertLevel) return false;
            }
            return true;
        });
    }, [watchlistItems, domainSearch, filterStatus, filterAlertLevel]);

    async function handleAddDomain(close: () => void) {
        if (!companyId || !user || !newDomain.trim()) return;
        setIsAdding(true);
        try {
            await addToWatchlist({
                companyId,
                userId: user._id,
                domain: newDomain.trim().toLowerCase(),
                companyName: companyName.trim() || newDomain.split(".")[0].charAt(0).toUpperCase() + newDomain.split(".")[0].slice(1),
                notifyByEmail: emailAlerts,
            });
            setNewDomain("");
            setCompanyName("");
            close();
        } catch (error) {
            devError("Failed to add domain:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add domain");
        } finally {
            setIsAdding(false);
        }
    }

    async function handleRemove(id: Id<"watchlistItems">) {
        try {
            await removeFromWatchlist({ id });
            toast.success("Domain removed from watchlist");
        } catch (error) {
            devError("Failed to remove:", error);
            toast.error("Failed to remove domain");
        }
    }

    async function handlePause(id: Id<"watchlistItems">) {
        try {
            await pauseWatchlist({ id });
            toast.success("Monitoring paused");
        } catch (error) {
            devError("Failed to pause:", error);
            toast.error("Failed to pause monitoring");
        }
    }

    async function handleResume(id: Id<"watchlistItems">) {
        try {
            await resumeWatchlist({ id });
            toast.success("Monitoring resumed");
        } catch (error) {
            devError("Failed to resume:", error);
            toast.error("Failed to resume monitoring");
        }
    }

    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto relative">
            {confirmRemoveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-md font-semibold text-primary mb-2">Remove Domain</h3>
                        <p className="text-sm text-secondary mb-6">Are you sure you want to remove this domain from your watchlist?</p>
                        <div className="flex items-center justify-end gap-3">
                            <Button color="secondary" size="sm" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                            <Button color="primary-destructive" size="sm" onClick={() => { handleRemove(confirmRemoveId); setConfirmRemoveId(null); }}>Remove</Button>
                        </div>
                    </div>
                </div>
            )}
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
                                                    <Checkbox
                                                        label="Email Notifications"
                                                        isSelected={emailAlerts}
                                                        onChange={setEmailAlerts}
                                                    />
                                                </div>
                                            </div>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <div className="flex items-center justify-end gap-3">
                                                <Button color="secondary" onClick={close}>Cancel</Button>
                                                <Button
                                                    color="primary"
                                                    onClick={() => handleAddDomain(close)}
                                                    isDisabled={!newDomain.trim() || isAdding}
                                                >
                                                    {isAdding ? "Adding..." : "Add to Watchlist"}
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
                    <MetricsChart04 
                        title={(watchlistStats?.total ?? 0).toString()} 
                        subtitle="Monitored Domains" 
                        change={(watchlistStats?.active ?? 0).toString()} 
                        changeTrend="positive" 
                        changeDescription="active"
                        actions={false}
                    />
                    <MetricsChart04 
                        title={(watchlistStats?.withAlerts ?? 0).toString()} 
                        subtitle="New Alerts" 
                        change={(watchlistStats?.withAlerts ?? 0).toString()} 
                        changeTrend={(watchlistStats?.withAlerts ?? 0) > 0 ? "negative" : "positive"} 
                        changeDescription="domains with new exposures" 
                        chartColor="text-fg-warning-secondary"
                        actions={false}
                    />
                    <MetricsChart04 
                        title={(watchlistStats?.paused ?? 0).toString()} 
                        subtitle="Paused" 
                        change={(watchlistStats?.paused ?? 0).toString()} 
                        changeTrend="positive" 
                        changeDescription="monitoring paused" 
                        chartColor="text-fg-error-secondary"
                        actions={false}
                    />
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 w-full sm:w-auto sm:flex-1">
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
                    <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
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
                </div>

                {/* Watchlist Table */}
                <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary overflow-x-auto">
                    <TableCard.Header title="Monitored Domains" badge={`${filteredItems.length} domains`} />

                    <Table
                        aria-label="Watchlist Domains"
                        selectionMode="multiple"
                        sortDescriptor={sortDescriptor}
                        onSortChange={setSortDescriptor}
                        className="bg-primary w-full"
                    >
                        <Table.Header className="bg-secondary_subtle">
                            <Table.Head id="domain" label="Domain" allowsSorting isRowHeader className="min-w-[180px]" />
                            <Table.Head id="company" label="Company" allowsSorting className="min-w-[140px] hidden lg:table-cell" />
                            <Table.Head id="status" label="Status" allowsSorting className="min-w-[150px]" />
                            <Table.Head id="exposures" label="Exposures" allowsSorting className="min-w-[160px]" />
                            <Table.Head id="lastChecked" label="Last Checked" allowsSorting className="min-w-[120px] hidden md:table-cell" />
                            <Table.Head id="alertLevel" label="Alert Level" allowsSorting className="min-w-[120px]" />
                            <Table.Head id="actions" label="Actions" className="min-w-[160px]" />
                        </Table.Header>

                        <Table.Body items={filteredItems.map((item) => ({ ...item, id: item._id }))}>
                            {(item) => {
                                const alertLevel = getAlertLevelFromItem(item);
                                const alert = getAlertBadge(alertLevel);
                                const isActive = !item.isPaused;
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
                                        <Table.Cell className="hidden lg:table-cell">
                                            <span className="text-sm text-secondary">{item.companyName || "-"}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-2">
                                                {isActive ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 text-success-500" />
                                                        <span className="text-sm text-success-700">Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PauseCircle className="w-4 h-4 text-warning-500" />
                                                        <span className="text-sm text-warning-700">Paused</span>
                                                    </>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-secondary">{item.exposureCount ?? 0}</span>
                                                {item.hasNewExposures && (
                                                    <Badge color="error" size="sm">New!</Badge>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="hidden md:table-cell">
                                            <span className="text-sm text-tertiary">
                                                {item.lastCheckedAt ? formatRelativeTime(item.lastCheckedAt) : "Never"}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs leading-none">{alert.dot}</span>
                                                <Badge color={alert.color} size="sm">{alertLevel}</Badge>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-1">
                                                <Button color="link-gray" size="sm" iconLeading={Eye}>View</Button>
                                                {isActive ? (
                                                    <Button 
                                                        color="link-gray" 
                                                        size="sm" 
                                                        iconLeading={PauseCircle}
                                                        onClick={() => handlePause(item._id)}
                                                    >
                                                        Pause
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        color="link-gray" 
                                                        size="sm" 
                                                        iconLeading={PlayCircle}
                                                        onClick={() => handleResume(item._id)}
                                                    >
                                                        Resume
                                                    </Button>
                                                )}
                                                <ButtonUtility 
                                                    size="sm" 
                                                    color="tertiary" 
                                                    icon={Trash01} 
                                                    aria-label="Remove"
                                                    onClick={() => setConfirmRemoveId(item._id)}
                                                />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }}
                        </Table.Body>
                    </Table>
                    {filteredItems.length === 0 && (
                        <div className="px-5 py-8 text-center text-sm text-tertiary">
                            {watchlistItems?.length === 0 
                                ? "No domains in your watchlist yet. Add a domain to start monitoring."
                                : "No domains match your filters."
                            }
                        </div>
                    )}
                </TableCard.Root>

                {/* Alert Preferences */}
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-primary">Alert Preferences</h2>
                        <div className="flex items-center gap-3">
                            <Button
                                color="primary"
                                size="sm"
                                onClick={handleSaveAlertPreferences}
                                isDisabled={isSavingPrefs}
                            >
                                {isSavingPrefs ? "Saving..." : "Save Preferences"}
                            </Button>
                        </div>
                    </div>
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
