"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser, useCompany, useTokens, useFileUpload, usePlanGate } from "@/hooks";
import { useUpgradeModal } from "@/components/application/upgrade-modal/upgrade-modal";
import { PlanGateBadge } from "@/components/application/upgrade-modal/upgrade-modal";
import { getPlan } from "@/lib/plans";
import {
    CreditCard02,
    Copy06,
    DownloadCloud01,
    DotsVertical,
    CheckCircle,
    Edit05,
    FilterLines,
    Link01,
    Mail01,
    Plus,
    SearchLg,
    Trash01,
    XClose,
    Zap,
} from "@untitledui/icons";
import PricingCards from "@/components/ui/pricing-cards";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Form } from "@/components/base/form/form";
import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { NativeSelect } from "@/components/base/select/select-native";
import { Table, TableCard } from "@/components/application/table/table";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import type { SortDescriptor } from "react-aria-components";

const tabs = [
    { id: "profile", label: "My details" },
    { id: "company", label: "Company Settings" },
    { id: "team", label: "Team" },
    { id: "plan", label: "Plan & Billing" },
    { id: "integrations", label: "Integrations" },
    { id: "audit", label: "Audit Log" },
    { id: "usage", label: "Usage" },
];

const integrationCategories = [
    {
        label: "PAYMENTS",
        items: [
            { name: "Stripe", description: "Process payments and manage subscriptions", logo: "💳", logoColor: "bg-indigo-500", provider: "stripe" as const, available: true },
        ],
    },
    {
        label: "EMAIL",
        items: [
            { name: "Outlook", description: "Sync emails and contacts from Microsoft Outlook", logo: "📧", logoColor: "bg-blue-600", provider: "outlook_email" as const, available: false },
            { name: "Gmail", description: "Sync emails and contacts from Google Workspace", logo: "✉️", logoColor: "bg-red-500", provider: "gmail" as const, available: false },
        ],
    },
    {
        label: "CALENDAR",
        items: [
            { name: "Outlook Calendar", description: "Sync meetings and events from Outlook Calendar", logo: "📅", logoColor: "bg-blue-500", provider: "outlook_calendar" as const, available: false },
            { name: "Google Calendar", description: "Sync meetings and events from Google Calendar", logo: "📆", logoColor: "bg-green-500", provider: "google_calendar" as const, available: false },
        ],
    },
    {
        label: "CRM",
        items: [
            { name: "HubSpot", description: "Two-way sync contacts, deals, and activities", logo: "🔶", logoColor: "bg-orange-500", provider: "hubspot" as const, available: false },
            { name: "GoHighLevel", description: "Sync leads and pipeline data with GHL", logo: "🟢", logoColor: "bg-green-600", provider: "ghl" as const, available: false },
        ],
    },
    {
        label: "MESSAGING",
        items: [
            { name: "Microsoft Teams", description: "Send notifications and alerts to Teams channels", logo: "💬", logoColor: "bg-indigo-600", provider: "teams" as const, available: false },
            { name: "Slack", description: "Send notifications and alerts to Slack channels", logo: "💜", logoColor: "bg-purple-500", provider: "slack" as const, available: false },
        ],
    },
    {
        label: "SOCIAL",
        items: [
            { name: "LinkedIn", description: "Enrich leads and automate outreach via LinkedIn", logo: "🔗", logoColor: "bg-blue-700", provider: "linkedin" as const, available: false },
        ],
    },
    {
        label: "PSA / RMM",
        items: [
            { name: "ConnectWise", description: "Sync tickets, contacts, and companies with ConnectWise Manage", logo: "⚙️", logoColor: "bg-cyan-600", provider: "connectwise" as const, available: false },
        ],
    },
];

function formatRole(role: string): string {
    switch (role) {
        case "sales_admin": return "Sales Admin";
        case "sales_rep": return "Sales Rep";
        case "billing": return "Billing";
        default: return role;
    }
}

function formatStatus(status: string): string {
    switch (status) {
        case "approved": return "Active";
        case "pending": return "Invited";
        case "deactivated": return "Deactivated";
        case "rejected": return "Rejected";
        default: return status;
    }
}

function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function getAuditEventColor(action: string): "brand" | "blue" | "success" | "purple" | "orange" | "gray" {
    if (action.startsWith("user.login") || action.startsWith("user.logout")) return "brand";
    if (action.startsWith("search.")) return "blue";
    if (action.startsWith("lead.")) return "success";
    if (action.startsWith("campaign.")) return "purple";
    if (action.startsWith("user.")) return "orange";
    if (action.startsWith("integration.")) return "success";
    return "gray";
}

function getAuditEventLabel(action: string): string {
    const labels: Record<string, string> = {
        "user.login": "User Login",
        "user.logout": "User Logout",
        "user.created": "User Created",
        "user.updated": "User Updated",
        "user.deactivated": "User Deactivated",
        "user.approved": "User Approved",
        "user.rejected": "User Rejected",
        "company.updated": "Company Updated",
        "company.settings_changed": "Settings Updated",
        "lead.created": "Lead Created",
        "lead.updated": "Lead Updated",
        "lead.deleted": "Lead Deleted",
        "lead.status_changed": "Lead Status Changed",
        "search.performed": "Live Search",
        "watchlist.item_added": "Watchlist Added",
        "watchlist.item_removed": "Watchlist Removed",
        "campaign.created": "Campaign Created",
        "campaign.started": "Campaign Launched",
        "campaign.paused": "Campaign Paused",
        "campaign.completed": "Campaign Completed",
        "integration.connected": "Integration Connected",
        "integration.disconnected": "Integration Disconnected",
        "subscription.created": "Subscription Created",
        "subscription.updated": "Subscription Updated",
        "payment.succeeded": "Payment Succeeded",
        "payment.failed": "Payment Failed",
        "kb.entry_created": "KB Entry Created",
        "rfp.created": "RFP Created",
        "settings.updated": "Settings Updated",
        "tokens.consumed": "Token Consumed",
    };
    return labels[action] ?? action;
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-secondary border-t-fg-brand-primary" />
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-secondary border-t-fg-brand-primary" />
            </div>
        }>
            <SettingsPageContent />
        </Suspense>
    );
}

function SettingsPageContent() {
    const searchParams = useSearchParams();
    const validTabs = ["profile", "company", "team", "plan", "integrations", "audit", "usage"];
    const tabFromUrl = searchParams.get("tab");
    const [selectedTab, setSelectedTab] = useState<string>(
        tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "profile"
    );

    // Sync tab when URL params change (e.g. returning from Stripe)
    useEffect(() => {
        if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== selectedTab) {
            setSelectedTab(tabFromUrl);
        }
    }, [tabFromUrl]);
    const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
    const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { upload: uploadFile, isUploading: isFileUploading } = useFileUpload({
        onError: (msg) => toast.error(`Upload failed: ${msg}`),
    });

    const [userSort, setUserSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [auditSort, setAuditSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });

    const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
    const [editingRole, setEditingRole] = useState<{ userId: string; role: string } | null>(null);

    const [auditSearch, setAuditSearch] = useState("");
    const [auditDateFilter, setAuditDateFilter] = useState("");

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviteRole, setInviteRole] = useState<"sales_rep" | "sales_admin" | "billing">("sales_rep");
    const [isInviting, setIsInviting] = useState(false);

    // Location management
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
    const [locLabel, setLocLabel] = useState("");
    const [locAddress, setLocAddress] = useState("");
    const [locCity, setLocCity] = useState("");
    const [locState, setLocState] = useState("");
    const [locCountry, setLocCountry] = useState("");
    const [locZip, setLocZip] = useState("");
    const [locIsHQ, setLocIsHQ] = useState(false);

    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();
    const { company, isLoading: isCompanyLoading } = useCompany();
    const { tokensRemaining, tokenAllocation, tokenPercentage, resetDisplayText } = useTokens();
    const { isFeatureGated, planId } = usePlanGate();
    const { showUpgradeModal } = useUpgradeModal();
    const isIntegrationsGated = isFeatureGated("integrations");

    const updateUser = useMutation(api.users.update);
    const updateCompany = useMutation(api.companies.update);
    const createInvitation = useMutation(api.invitations.create);
    const cancelInvitation = useMutation(api.invitations.cancel);
    const createAuditLog = useMutation(api.audit.create);
    const openPortal = useAction(api.stripe.createPortalSession);
    const invitations = useQuery(api.invitations.list, companyId ? { companyId } : "skip");

    const teamMembers = useQuery(
        api.users.getByCompanyId,
        companyId ? { companyId } : "skip"
    );

    const auditLogs = useQuery(
        api.audit.list,
        companyId ? { companyId, limit: 50 } : "skip"
    );

    const auditUserMap = useQuery(
        api.users.getByCompanyId,
        companyId ? { companyId } : "skip"
    );

    const handleAvatarUpload = async (file: File) => {
        if (!user) return;
        setUploadedAvatar(URL.createObjectURL(file));
        const url = await uploadFile(file);
        if (url) {
            await updateUser({ id: user._id, imageUrl: url });
            toast.success("Profile image saved");
        }
    };

    const handleLogoUpload = async (file: File) => {
        if (!company) return;
        setUploadedLogo(URL.createObjectURL(file));
        const url = await uploadFile(file);
        if (url) {
            await updateCompany({ id: company._id, logoUrl: url });
            toast.success("Company logo saved");
        }
    };

    const handleLogoDelete = async () => {
        if (!company) return;
        try {
            await updateCompany({ id: company._id, logoUrl: "" });
            setUploadedLogo(null);
            toast.success("Company logo removed");
        } catch {
            toast.error("Failed to remove logo");
        }
    };

    const resetLocationForm = () => {
        setLocLabel("");
        setLocAddress("");
        setLocCity("");
        setLocState("");
        setLocCountry("");
        setLocZip("");
        setLocIsHQ(false);
        setEditingLocationId(null);
        setShowLocationForm(false);
    };

    const handleOpenAddLocation = () => {
        resetLocationForm();
        setShowLocationForm(true);
    };

    const handleOpenEditLocation = (loc: { id: string; label: string; address?: string; city?: string; state?: string; country?: string; zipCode?: string; isHeadquarters: boolean }) => {
        setEditingLocationId(loc.id);
        setLocLabel(loc.label);
        setLocAddress(loc.address ?? "");
        setLocCity(loc.city ?? "");
        setLocState(loc.state ?? "");
        setLocCountry(loc.country ?? "");
        setLocZip(loc.zipCode ?? "");
        setLocIsHQ(loc.isHeadquarters);
        setShowLocationForm(true);
    };

    const handleSaveLocation = async () => {
        if (!company || !locLabel.trim()) {
            toast.error("Location label is required");
            return;
        }
        const existingLocations = company.locations ?? [];
        const newLoc = {
            id: editingLocationId ?? `loc_${Date.now()}`,
            label: locLabel.trim(),
            address: locAddress.trim() || undefined,
            city: locCity.trim() || undefined,
            state: locState.trim() || undefined,
            country: locCountry.trim() || undefined,
            zipCode: locZip.trim() || undefined,
            isHeadquarters: locIsHQ,
        };

        let updated;
        if (editingLocationId) {
            updated = existingLocations.map((l) => l.id === editingLocationId ? newLoc : l);
        } else {
            updated = [...existingLocations, newLoc];
        }

        // If this one is HQ, unset others
        if (newLoc.isHeadquarters) {
            updated = updated.map((l) => l.id === newLoc.id ? l : { ...l, isHeadquarters: false });
        }

        try {
            await updateCompany({ id: company._id, locations: updated });
            toast.success(editingLocationId ? "Location updated" : "Location added");
            resetLocationForm();
        } catch {
            toast.error("Failed to save location");
        }
    };

    const handleRemoveLocation = async (locationId: string) => {
        if (!company) return;
        const updated = (company.locations ?? []).filter((l) => l.id !== locationId);
        try {
            await updateCompany({ id: company._id, locations: updated });
            toast.success("Location removed");
        } catch {
            toast.error("Failed to remove location");
        }
    };

    const getStatusBadge = (status: string) => {
        const display = formatStatus(status);
        switch (display) {
            case "Active": return <Badge color="success" size="sm">Active</Badge>;
            case "Invited": return <Badge color="gray" size="sm">Invited</Badge>;
            case "Deactivated": return <Badge color="error" size="sm">Deactivated</Badge>;
            case "Rejected": return <Badge color="error" size="sm">Rejected</Badge>;
            default: return <Badge color="gray" size="sm">{display}</Badge>;
        }
    };

    const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            await updateUser({
                id: user._id,
                firstName: data.firstName as string,
                lastName: data.lastName as string,
            });
            if (companyId) {
                await createAuditLog({ companyId, userId: user._id, action: "user.updated", entityType: "user", entityId: user._id, details: "Profile updated" });
            }
            toast.success("Profile saved");
        } catch (err) {
            toast.error("Failed to save profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCompanySave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!company) return;
        setIsSaving(true);
        try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            await updateCompany({
                id: company._id,
                name: data.companyName as string,
                companyType: data.companyType as string,
                website: data.website as string,
                phone: data.phone as string,
                supportEmail: data.supportEmail as string,
                supportPhone: data.supportPhone as string,
                salesEmail: data.salesEmail as string,
                salesPhone: data.salesPhone as string,
                annualRevenue: data.revenue as string,
                totalEmployees: data.companySize as string,
                salesTeamSize: data.salesTeamSize as string,
                mrrTarget: data.mrrTarget ? Number(data.mrrTarget) : undefined,
                appointmentTarget: data.appointmentTarget ? Number(data.appointmentTarget) : undefined,
                brandPrimaryColor: (data.brandPrimaryColor as string) || undefined,
                brandSecondaryColor: (data.brandSecondaryColor as string) || undefined,
                serviceArea: (data.serviceArea as string)?.trim()
                    ? (data.serviceArea as string).split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                geographicCoverage: (data.geographicCoverage as string)?.trim()
                    ? (data.geographicCoverage as string).split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                associations: (data.associations as string)?.trim()
                    ? (data.associations as string).split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                programs: (data.programs as string)?.trim()
                    ? (data.programs as string).split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
            });
            if (companyId && user) {
                await createAuditLog({ companyId, userId: user._id, action: "company.updated", entityType: "company", entityId: company._id, details: "Company settings updated" });
            }
            toast.success("Company settings saved");
        } catch (err) {
            toast.error("Failed to save company settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInviteUser = async () => {
        if (!companyId || !user || !inviteEmail.trim()) return;
        setIsInviting(true);
        try {
            await createInvitation({
                companyId,
                invitedByUserId: user._id,
                email: inviteEmail.trim(),
                role: inviteRole,
            });
            await createAuditLog({ companyId, userId: user._id, action: "user.created", entityType: "invitation", details: `Invited ${inviteEmail.trim()} as ${formatRole(inviteRole)}` });
            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
            setInviteName("");
            setInviteRole("sales_rep");
            setShowInviteModal(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("already pending")) {
                toast.error("An invitation has already been sent to this email address.");
            } else if (msg.includes("Forbidden")) {
                toast.error("You don't have permission to send invitations.");
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        } finally {
            setIsInviting(false);
        }
    };

    const handleCancelInvitation = async (id: string) => {
        try {
            await cancelInvitation({ id: id as Parameters<typeof cancelInvitation>[0]["id"] });
            toast.success("Invitation cancelled");
        } catch {
            toast.error("Failed to cancel invitation");
        }
    };

    const getUserName = (userId: string): string => {
        const u = auditUserMap?.find((m) => m._id === userId);
        return u ? `${u.firstName} ${u.lastName}` : "Unknown User";
    };

    const getUserInitial = (userId: string): string => {
        const u = auditUserMap?.find((m) => m._id === userId);
        return u?.firstName?.charAt(0) ?? "?";
    };

    const settingsPlan = getPlan(company?.planId);
    const planLabel = settingsPlan.name;
    const planPrice = settingsPlan.priceLabel;

    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenUserMenu(null);
                setEditingRole(null);
            }
        }
        if (openUserMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [openUserMenu]);

    const handleRoleChange = async (userId: string, newRole: "sales_rep" | "sales_admin" | "billing") => {
        if (user && userId === user._id) {
            toast.error("You cannot change your own role");
            return;
        }
        try {
            await updateUser({ id: userId as Parameters<typeof updateUser>[0]["id"], role: newRole });
            if (companyId && user) {
                await createAuditLog({ companyId, userId: user._id, action: "user.updated", entityType: "user", entityId: userId, details: `Role changed to ${formatRole(newRole)}` });
            }
            toast.success(`Role updated to ${formatRole(newRole)}`);
        } catch {
            toast.error("Failed to update role");
        }
        setEditingRole(null);
        setOpenUserMenu(null);
    };

    const handleToggleStatus = async (userId: string, currentStatus: string) => {
        if (user && userId === user._id) {
            toast.error("You cannot deactivate your own account");
            return;
        }
        const newStatus: "approved" | "deactivated" = currentStatus === "deactivated" ? "approved" : "deactivated";
        try {
            await updateUser({ id: userId as Parameters<typeof updateUser>[0]["id"], status: newStatus });
            if (companyId && user) {
                await createAuditLog({ companyId, userId: user._id, action: newStatus === "deactivated" ? "user.deactivated" : "user.approved", entityType: "user", entityId: userId, details: newStatus === "deactivated" ? "User deactivated" : "User reactivated" });
            }
            toast.success(newStatus === "deactivated" ? "User deactivated" : "User reactivated");
        } catch {
            toast.error("Failed to update user status");
        }
        setOpenUserMenu(null);
    };

    const filteredAuditLogs = useMemo(() => {
        if (!auditLogs) return [];
        let filtered = [...auditLogs];
        if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            filtered = filtered.filter((log) => {
                const eventLabel = getAuditEventLabel(log.action).toLowerCase();
                const userName = getUserName(log.userId).toLowerCase();
                const details = (log.details ?? "").toLowerCase();
                return eventLabel.includes(q) || userName.includes(q) || details.includes(q) || log.action.toLowerCase().includes(q);
            });
        }
        if (auditDateFilter) {
            const filterDate = new Date(auditDateFilter);
            filtered = filtered.filter((log) => {
                const logDate = new Date(log.createdAt);
                return logDate.getFullYear() === filterDate.getFullYear() &&
                    logDate.getMonth() === filterDate.getMonth() &&
                    logDate.getDate() === filterDate.getDate();
            });
        }
        return filtered;
    }, [auditLogs, auditSearch, auditDateFilter, auditUserMap]);

    return (
        <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-5 px-4 lg:px-8 max-w-[1600px] mx-auto w-full">
                    <div className="relative flex flex-col gap-5">
                        <div className="flex flex-col gap-0.5 lg:gap-1">
                            <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Settings</h1>
                            <p className="text-md text-tertiary">Manage your team, billing, integrations, and platform configurations.</p>
                        </div>
                    </div>

                    <NativeSelect
                        aria-label="Page tabs"
                        className="md:hidden"
                        value={selectedTab}
                        onChange={(event) => setSelectedTab(event.target.value)}
                        options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
                    />
                    <div className="-mx-4 -my-1 scrollbar-hide flex overflow-x-auto px-4 py-1 lg:-mx-8 lg:px-8">
                        <Tabs className="hidden md:flex xl:w-full" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                            <TabList type="underline" className="w-full gap-4 min-w-max" items={tabs} />
                        </Tabs>
                    </div>

                    <div className="mt-4">
                        {/* Profile Tab */}
                        {selectedTab === "profile" && (
                            isUserLoading ? <LoadingSpinner /> : (
                            <Form
                                className="flex flex-col gap-6"
                                onSubmit={handleProfileSave}
                            >
                                <div>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-secondary">
                                        <div className="flex flex-1 flex-col justify-center gap-1 self-stretch">
                                            <h2 className="text-lg font-semibold text-primary">Personal info</h2>
                                            <p className="text-sm text-tertiary">Update your photo and personal details here.</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                            <Button color="secondary" size="md">Cancel</Button>
                                            <Button type="submit" color="primary" size="md" isLoading={isSaving}>Save</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="max-lg:hidden">
                                            <Label>Name <span className="text-brand-tertiary">*</span></Label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                                            <TextField isRequired name="firstName" defaultValue={user?.firstName ?? ""}>
                                                <Label className="lg:hidden">First name</Label>
                                                <InputBase size="md" />
                                            </TextField>
                                            <TextField isRequired name="lastName" defaultValue={user?.lastName ?? ""}>
                                                <Label className="lg:hidden">Last name</Label>
                                                <InputBase size="md" />
                                            </TextField>
                                        </div>
                                    </div>
                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="max-lg:hidden">
                                            <Label>Email address <span className="text-brand-tertiary">*</span></Label>
                                        </div>
                                        <TextField isRequired name="email" type="email" defaultValue={user?.email ?? ""} isDisabled>
                                            <Label className="lg:hidden">Email address</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                    </div>
                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="max-lg:hidden">
                                            <Label>Role</Label>
                                        </div>
                                        <div className="flex items-center">
                                            <Badge size="md" color="brand">{formatRole(user?.role ?? "")}</Badge>
                                        </div>
                                    </div>
                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="flex flex-col gap-1">
                                            <Label>Your photo <span className="text-brand-tertiary">*</span></Label>
                                            <p className="text-sm text-tertiary">This will be displayed on your profile.</p>
                                        </div>
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                                            <div className="relative group shrink-0">
                                                <Avatar size="2xl" src={uploadedAvatar || user?.imageUrl || undefined} initials={user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : undefined} />
                                                {(uploadedAvatar || user?.imageUrl) && (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!user) return;
                                                            try {
                                                                await updateUser({ id: user._id, imageUrl: "" });
                                                                setUploadedAvatar(null);
                                                                toast.success("Profile photo removed");
                                                            } catch {
                                                                toast.error("Failed to remove photo");
                                                            }
                                                        }}
                                                        className="absolute -top-1 -right-1 flex items-center justify-center size-5 rounded-full bg-error-primary text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                                        title="Remove photo"
                                                    >
                                                        <XClose className="size-3" />
                                                    </button>
                                                )}
                                            </div>
                                            <FileUpload.DropZone className="w-full" accept="image/*" allowsMultiple={false} hint="SVG, PNG or JPG (max. 2MB)" maxSize={2 * 1024 * 1024} onDropFiles={(files) => handleAvatarUpload(files[0])} />
                                        </div>
                                    </div>
                                </div>
                            </Form>
                            )
                        )}

                        {/* Company Settings Tab */}
                        {selectedTab === "company" && (
                            isCompanyLoading ? <LoadingSpinner /> : (
                            <Form
                                className="flex flex-col gap-8"
                                onSubmit={handleCompanySave}
                            >
                                <div>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-secondary">
                                        <div className="flex flex-1 flex-col justify-center gap-1 self-stretch">
                                            <h2 className="text-lg font-semibold text-primary">Company Profile</h2>
                                            <p className="text-sm text-tertiary">Manage your company's general and contact information.</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                            <Button color="secondary" size="md">Cancel</Button>
                                            <Button type="submit" color="primary" size="md" isLoading={isSaving}>Save Changes</Button>
                                        </div>
                                    </div>
                                </div>

                                {/* GENERAL INFORMATION */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">GENERAL INFORMATION</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="companyName" defaultValue={company?.name ?? ""}>
                                            <Label>Company Name</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Location ID</Label>
                                            <div className="flex items-center gap-2">
                                                <InputBase size="md" value={company?.locationId || `LOC-${(company?._id as string)?.slice(-6).toUpperCase() || "000000"}`} isDisabled className="flex-1" />
                                                <Button
                                                    color="secondary"
                                                    size="md"
                                                    onClick={() => {
                                                        const locId = company?.locationId || `LOC-${(company?._id as string)?.slice(-6).toUpperCase() || "000000"}`;
                                                        navigator.clipboard.writeText(locId);
                                                        toast.success("Location ID copied!");
                                                    }}
                                                >
                                                    <Copy06 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <Select name="companyType" label="Company Type" defaultSelectedKey={company?.companyType ?? company?.primaryBusinessModel ?? "msp"}>
                                            <Select.Item id="msp">MSP/MSSP</Select.Item>
                                            <Select.Item id="var">Value Added Reseller</Select.Item>
                                            <Select.Item id="vendor">Vendor</Select.Item>
                                        </Select>
                                        <TextField name="website" defaultValue={company?.website ?? ""}>
                                            <Label>Website</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="phone" defaultValue={company?.phone ?? ""}>
                                            <Label>Main Phone</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                    </div>

                                    {/* Company Logo */}
                                    <div className="flex flex-col gap-2 pt-4">
                                        <Label>Company Logo</Label>
                                        <p className="text-sm text-tertiary">Upload your company logo. This will appear across the platform.</p>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                            {(uploadedLogo || company?.logoUrl) ? (
                                                <div className="relative group shrink-0">
                                                    <img
                                                        src={uploadedLogo || company?.logoUrl}
                                                        alt="Company logo"
                                                        className="h-16 w-16 rounded-lg border border-secondary object-contain bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleLogoDelete}
                                                        className="absolute -top-2 -right-2 flex items-center justify-center size-5 rounded-full bg-error-primary text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                                        title="Remove logo"
                                                    >
                                                        <XClose className="size-3" />
                                                    </button>
                                                </div>
                                            ) : null}
                                            <FileUpload.DropZone
                                                className="flex-1"
                                                accept="image/*"
                                                allowsMultiple={false}
                                                hint="SVG, PNG or JPG (max. 2MB)"
                                                maxSize={2 * 1024 * 1024}
                                                onDropFiles={(files) => handleLogoUpload(files[0])}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* CONTACT INFORMATION */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">CONTACT INFORMATION</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="supportEmail" type="email" defaultValue={company?.supportEmail ?? ""}>
                                            <Label>Support Email</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                        <TextField name="supportPhone" defaultValue={company?.supportPhone ?? ""}>
                                            <Label>Support Phone</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="salesEmail" type="email" defaultValue={company?.salesEmail ?? ""}>
                                            <Label>Sales Email</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                        <TextField name="salesPhone" defaultValue={company?.salesPhone ?? ""}>
                                            <Label>Sales Phone</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* BUSINESS DETAILS */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">BUSINESS DETAILS</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <Select name="revenue" label="Annual Revenue" defaultSelectedKey={company?.annualRevenue ?? ""}>
                                            <Select.Item id="0-1">Under $1M</Select.Item>
                                            <Select.Item id="1-10">$1M - $10M</Select.Item>
                                            <Select.Item id="10-24">$10M - $24M</Select.Item>
                                            <Select.Item id="25+">$25M+</Select.Item>
                                        </Select>
                                        <Select name="companySize" label="Company Size" defaultSelectedKey={company?.totalEmployees ?? ""}>
                                            <Select.Item id="1-10">1-10 Employees</Select.Item>
                                            <Select.Item id="11-50">11-50 Employees</Select.Item>
                                            <Select.Item id="51-100">51-100 Employees</Select.Item>
                                            <Select.Item id="101+">101+ Employees</Select.Item>
                                        </Select>
                                        <Select name="salesTeamSize" label="Sales Team Size" defaultSelectedKey={company?.salesTeamSize ?? company?.totalSalesPeople ?? ""}>
                                            <Select.Item id="1">1 Person</Select.Item>
                                            <Select.Item id="2-5">2-5 People</Select.Item>
                                            <Select.Item id="6-10">6-10 People</Select.Item>
                                            <Select.Item id="11+">11+ People</Select.Item>
                                        </Select>
                                        <TextField name="geographicCoverage" defaultValue={company?.geographicCoverage?.join(", ") ?? ""}>
                                            <Label>Geographic Coverage</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* BRAND COLORS */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">BRAND COLORS</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-secondary">Primary Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    name="brandPrimaryColor"
                                                    defaultValue={company?.brandPrimaryColor || "#6941C6"}
                                                    className="h-10 w-12 cursor-pointer rounded-lg border border-secondary bg-primary p-1"
                                                />
                                                <InputBase size="md" name="brandPrimaryColorHex" defaultValue={company?.brandPrimaryColor || "#6941C6"} className="flex-1" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-secondary">Secondary Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    name="brandSecondaryColor"
                                                    defaultValue={company?.brandSecondaryColor || "#3538CD"}
                                                    className="h-10 w-12 cursor-pointer rounded-lg border border-secondary bg-primary p-1"
                                                />
                                                <InputBase size="md" name="brandSecondaryColorHex" defaultValue={company?.brandSecondaryColor || "#3538CD"} className="flex-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* SERVICE AREA */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">SERVICE AREA</h3>
                                    <p className="text-sm text-tertiary -mt-3">Define the regions or areas your company serves (comma-separated).</p>
                                    <TextField name="serviceArea" defaultValue={company?.serviceArea?.join(", ") ?? ""}>
                                        <Label>Service Regions</Label>
                                        <InputBase size="md" placeholder="e.g. Northeast US, Midwest US, Canada" />
                                    </TextField>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* ASSOCIATIONS & PROGRAMS */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">ASSOCIATIONS & PROGRAMS</h3>
                                    <p className="text-sm text-tertiary -mt-3">Industry associations and vendor programs your company participates in (comma-separated).</p>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="associations" defaultValue={company?.associations?.join(", ") ?? ""}>
                                            <Label>Associations</Label>
                                            <InputBase size="md" placeholder="e.g. CompTIA, ISACA, (ISC)²" />
                                        </TextField>
                                        <TextField name="programs" defaultValue={company?.programs?.join(", ") ?? ""}>
                                            <Label>Programs</Label>
                                            <InputBase size="md" placeholder="e.g. Microsoft Partner, AWS Partner" />
                                        </TextField>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* OFFICE LOCATIONS */}
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-primary mb-2">OFFICE LOCATIONS</h3>
                                        <Button size="sm" color="secondary" iconLeading={Plus} onClick={handleOpenAddLocation}>Add Location</Button>
                                    </div>

                                    {/* Add / Edit Location Form */}
                                    {showLocationForm && (
                                        <div className="flex flex-col gap-4 p-4 border border-brand-secondary rounded-lg bg-brand-primary_alt">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-primary">{editingLocationId ? "Edit Location" : "New Location"}</h4>
                                                <button type="button" onClick={resetLocationForm} className="text-tertiary hover:text-primary transition-colors cursor-pointer">
                                                    <XClose className="size-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">Label *</label>
                                                    <input type="text" value={locLabel} onChange={(e) => setLocLabel(e.target.value)} placeholder="e.g. Headquarters" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">Address</label>
                                                    <input type="text" value={locAddress} onChange={(e) => setLocAddress(e.target.value)} placeholder="Street address" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">City</label>
                                                    <input type="text" value={locCity} onChange={(e) => setLocCity(e.target.value)} placeholder="City" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">State / Province</label>
                                                    <input type="text" value={locState} onChange={(e) => setLocState(e.target.value)} placeholder="State" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">Country</label>
                                                    <input type="text" value={locCountry} onChange={(e) => setLocCountry(e.target.value)} placeholder="Country" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-secondary">ZIP / Postal Code</label>
                                                    <input type="text" value={locZip} onChange={(e) => setLocZip(e.target.value)} placeholder="ZIP code" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={locIsHQ} onChange={(e) => setLocIsHQ(e.target.checked)} className="rounded border-secondary text-brand-secondary focus:ring-brand-secondary" />
                                                <span className="text-sm text-secondary">Set as primary / headquarters</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" color="primary" onClick={handleSaveLocation}>{editingLocationId ? "Update" : "Add"}</Button>
                                                <Button size="sm" color="secondary" onClick={resetLocationForm}>Cancel</Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        {company?.locations && company.locations.length > 0 ? (
                                            company.locations.map((loc) => (
                                                <div key={loc.id} className="flex flex-col gap-3 p-4 border border-secondary rounded-lg bg-secondary_subtle sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-primary">{loc.label}</span>
                                                            {loc.isHeadquarters && <Badge size="sm" color="brand">Primary</Badge>}
                                                        </div>
                                                        <span className="text-sm text-tertiary break-words">
                                                            {[loc.address, loc.city, loc.state, loc.zipCode, loc.country].filter(Boolean).join(", ") || "No address details"}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <Button size="sm" color="secondary" iconLeading={Edit05} onClick={() => handleOpenEditLocation(loc)}>Edit</Button>
                                                        <Button size="sm" color="secondary" iconLeading={Trash01} onClick={() => handleRemoveLocation(loc.id)}>Remove</Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            !showLocationForm && (
                                                <div className="p-6 border border-dashed border-secondary rounded-lg text-center">
                                                    <p className="text-sm text-tertiary">No office locations added yet. Click &quot;Add Location&quot; to get started.</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* TARGETS */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">TARGETS & DEFAULTS</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="mrrTarget" type="number" defaultValue={company?.mrrTarget?.toString() ?? ""}>
                                            <Label>MRR Target ($)</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="appointmentTarget" type="number" defaultValue={company?.appointmentTarget?.toString() ?? ""}>
                                            <Label>Monthly Appointment Target</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                    </div>
                                </div>

                            </Form>
                            )
                        )}

                        {/* Team Tab */}
                        {selectedTab === "team" && (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search users..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <Button size="md" color="primary" iconLeading={Plus} onClick={() => setShowInviteModal(true)}>Invite User</Button>
                                </div>

                                {teamMembers === undefined ? <LoadingSpinner /> : (
                                <TableCard.Root>
                                    <TableCard.Header title="Platform Users" badge={`${teamMembers.length} Seat${teamMembers.length === 1 ? "" : "s"} in Use`} />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Users Table" sortDescriptor={userSort} onSortChange={setUserSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>User</Table.Head>
                                                <Table.Head id="role" allowsSorting>Role</Table.Head>
                                                <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                <Table.Head id="lastActive" allowsSorting>Last Active</Table.Head>
                                                <Table.Head id="actions" className="w-12"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={teamMembers.map((m) => ({ ...m, id: m._id }))}>
                                            {(item) => (
                                                <Table.Row id={item._id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar size="sm" alt={`${item.firstName} ${item.lastName}`} src={item.imageUrl || undefined} initials={`${item.firstName.charAt(0)}${item.lastName.charAt(0)}`} />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-primary">{item.firstName} {item.lastName}</span>
                                                                <span className="text-sm text-tertiary">{item.email}</span>
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge size="sm" color="gray">{formatRole(item.role)}</Badge></Table.Cell>
                                                    <Table.Cell>{getStatusBadge(item.status)}</Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{formatRelativeTime(item.lastAccessedAt)}</span></Table.Cell>
                                                    <Table.Cell>
                                                        <div className="relative" ref={openUserMenu === item._id ? menuRef : undefined}>
                                                            <ButtonUtility
                                                                size="sm"
                                                                icon={DotsVertical}
                                                                aria-label="Row actions"
                                                                onClick={(e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    setOpenUserMenu(openUserMenu === item._id ? null : item._id);
                                                                }}
                                                            />
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                                )}

                                {/* Pending Invitations */}
                                {invitations && invitations.filter((inv) => inv.status === "pending").length > 0 && (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <h3 className="text-sm font-semibold text-tertiary uppercase">Pending Invitations</h3>
                                        {invitations.filter((inv) => inv.status === "pending").map((inv) => (
                                            <div key={inv._id} className="flex items-center justify-between p-4 border border-secondary rounded-lg bg-secondary_subtle">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium text-primary">{inv.email}</span>
                                                    <span className="text-xs text-tertiary">Role: {formatRole(inv.role)} &middot; Invited {new Date(inv.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge size="sm" color="warning">Pending</Badge>
                                                    <Button size="sm" color="secondary" onClick={() => handleCancelInvitation(inv._id)}>Cancel</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Plan & Billing Tab */}
                        {selectedTab === "plan" && (
                            isCompanyLoading ? <LoadingSpinner /> : (
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Plan & Billing</h2>
                                        <p className="text-sm text-tertiary">Choose the plan that fits your team. Upgrade or downgrade anytime.</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                        <Button size="md" color="secondary" iconLeading={CreditCard02} onClick={async () => {
                                            try {
                                                const result = await openPortal({
                                                    returnUrl: `${window.location.origin}/settings?tab=plan`,
                                                });
                                                if (result?.url && (result.url.startsWith("https://checkout.stripe.com") || result.url.startsWith("https://billing.stripe.com"))) {
                                                    window.location.href = result.url;
                                                }
                                            } catch (err) {
                                                if (process.env.NODE_ENV === "development") console.error(err);
                                                toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
                                            }
                                        }}>Update Payment Method</Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                                    <div className="xl:col-span-3">
                                        <PricingCards currentPlanId={company?.planId ?? "growth"} onManagePlan={async () => {
                                            try {
                                                const result = await openPortal({
                                                    returnUrl: `${window.location.origin}/settings?tab=plan`,
                                                });
                                                if (result?.url && (result.url.startsWith("https://checkout.stripe.com") || result.url.startsWith("https://billing.stripe.com"))) {
                                                    window.location.href = result.url;
                                                }
                                            } catch (err) {
                                                toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
                                            }
                                        }} />
                                    </div>

                                    <div className="flex flex-col gap-6 p-6 border border-secondary rounded-2xl bg-primary">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-md font-semibold text-primary">Live Search Tokens</h3>
                                                <BadgeWithIcon size="sm" color="gray" iconLeading={Zap}>{resetDisplayText}</BadgeWithIcon>
                                            </div>
                                            <p className="text-sm text-tertiary">Used for Live Search and Web Scanning.</p>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-4">
                                            <div className="flex items-end justify-between">
                                                <span className="text-3xl font-semibold text-primary">{tokensRemaining.toLocaleString()}</span>
                                                <span className="text-sm font-medium text-tertiary pb-1">/ {tokenAllocation.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-secondary_subtle rounded-full h-2.5 overflow-hidden border border-secondary">
                                                <div className="bg-brand-secondary h-2.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(tokenPercentage, 100)}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-secondary">
                                            <p className="text-xs text-tertiary">Tokens reset on a monthly billing cycle. Contact support for additional tokens or custom allocations.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mt-4">
                                    <div className="p-6 border border-dashed border-secondary rounded-xl text-center">
                                        <p className="text-sm text-tertiary">Billing history is managed through your payment provider. Contact support for invoices.</p>
                                    </div>
                                </div>
                            </div>
                            )
                        )}

                        {/* Integrations Tab */}
                        {selectedTab === "integrations" && (
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-5">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-semibold text-primary">Connected Integrations</h2>
                                            {isIntegrationsGated && <PlanGateBadge />}
                                        </div>
                                        <p className="text-sm text-tertiary">
                                            {isIntegrationsGated
                                                ? "Integrations are available on the Growth plan and above."
                                                : "Manage your third-party connections for email, CRM, calendar, and more."
                                            }
                                        </p>
                                    </div>
                                    {isIntegrationsGated && (
                                        <Button
                                            color="primary"
                                            size="md"
                                            onClick={() => showUpgradeModal(planId, {
                                                type: "feature",
                                                feature: "Integrations",
                                                description: "Third-party integrations are available on the Growth plan and above.",
                                            })}
                                        >
                                            Upgrade to Unlock
                                        </Button>
                                    )}
                                </div>

                                {integrationCategories.map((category) => (
                                    <div key={category.label} className="flex flex-col gap-4">
                                        <h3 className="text-xs font-semibold text-tertiary tracking-wider uppercase">{category.label}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {category.items.map((item) => {
                                                const isConnected = item.provider === "stripe" && !!company?.stripeCustomerId;
                                                const comingSoon = !item.available;
                                                return (
                                                    <div
                                                        key={item.name}
                                                        className={`flex flex-col gap-4 p-5 border rounded-xl transition-colors ${comingSoon ? "border-secondary bg-secondary_subtle opacity-75" : "border-secondary bg-primary hover:border-brand-secondary"}`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${item.logoColor}`}>
                                                                    {item.logo}
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-semibold text-primary">{item.name}</span>
                                                                    {comingSoon ? (
                                                                        <Badge color="warning" size="sm">Coming Soon</Badge>
                                                                    ) : isConnected ? (
                                                                        <Badge color="success" size="sm">Connected</Badge>
                                                                    ) : (
                                                                        <Badge color="gray" size="sm">Not Connected</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-tertiary">{item.description}</p>
                                                        <div className="mt-auto pt-2">
                                                            {comingSoon ? (
                                                                <Button size="sm" color="secondary" className="w-full" isDisabled>Coming Soon</Button>
                                                            ) : isIntegrationsGated ? (
                                                                <Button size="sm" color="secondary" className="w-full" isDisabled>Upgrade Required</Button>
                                                            ) : isConnected ? (
                                                                <Button size="sm" color="secondary" className="w-full">Disconnect</Button>
                                                            ) : (
                                                                <Button size="sm" color="primary" className="w-full" iconLeading={Link01}>Connect</Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Usage Tab */}
                        {selectedTab === "usage" && (
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-5">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Usage & Consumption</h2>
                                        <p className="text-sm text-tertiary">Monitor your token usage, searches, and feature consumption.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-6 p-6 border border-secondary rounded-2xl bg-secondary_subtle lg:col-span-2">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-md font-semibold text-primary">Live Search Tokens</h3>
                                            <p className="text-sm text-tertiary">Used for Live Search and Web Scanning.</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-end justify-between">
                                                <span className="text-3xl font-semibold text-primary">{tokensRemaining.toLocaleString()}</span>
                                                <span className="text-sm font-medium text-tertiary pb-1">/ {tokenAllocation.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-secondary_subtle rounded-full h-2.5 overflow-hidden border border-secondary">
                                                <div className="bg-brand-secondary h-2.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(tokenPercentage, 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="border-t border-secondary pt-4">
                                            <p className="text-xs text-tertiary">Tokens reset on a monthly billing cycle ({resetDisplayText}). Contact support for additional tokens.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4 p-6 border border-secondary rounded-2xl bg-primary">
                                        <h3 className="text-md font-semibold text-primary">Current Plan</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-display-xs font-semibold text-primary">{planPrice}</span>
                                            <span className="text-sm text-tertiary">/mo</span>
                                        </div>
                                        <Badge size="md" color="brand">{planLabel}</Badge>
                                        <div className="mt-auto pt-3 border-t border-secondary">
                                            <Button size="sm" color="secondary" className="w-full" onClick={() => setSelectedTab("plan")}>
                                                Manage Plan
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Audit Tab */}
                        {selectedTab === "audit" && (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-5">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">System Audit Log</h2>
                                        <p className="text-sm text-tertiary">Track all login activity, searches, and data exports performed by team members.</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase
                                            type="text"
                                            size="md"
                                            placeholder="Search audit events..."
                                            className="w-full shadow-sm"
                                            icon={SearchLg}
                                            value={auditSearch}
                                            onChange={(value: string) => setAuditSearch(value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <InputBase
                                            type="date"
                                            size="md"
                                            className="w-full sm:w-auto shadow-sm"
                                            value={auditDateFilter}
                                            onChange={(value: string) => setAuditDateFilter(value)}
                                        />
                                        <Button
                                            size="md"
                                            color="secondary"
                                            iconLeading={FilterLines}
                                            onClick={() => { setAuditSearch(""); setAuditDateFilter(""); }}
                                        >
                                            {auditSearch || auditDateFilter ? "Clear" : "Filters"}
                                        </Button>
                                    </div>
                                </div>

                                {auditLogs === undefined ? <LoadingSpinner /> : (
                                <TableCard.Root>
                                    <TableCard.Header title="Activity Log" badge={`${filteredAuditLogs.length} Event${filteredAuditLogs.length === 1 ? "" : "s"}`} />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Audit Log" sortDescriptor={auditSort} onSortChange={setAuditSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="event" isRowHeader allowsSorting>Event</Table.Head>
                                                <Table.Head id="user" allowsSorting>User</Table.Head>
                                                <Table.Head id="details">Details</Table.Head>
                                                <Table.Head id="ip">IP Address</Table.Head>
                                                <Table.Head id="date" allowsSorting>Date</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={filteredAuditLogs.map((log) => ({ ...log, id: log._id }))}>
                                            {(item) => (
                                                <Table.Row id={item._id}>
                                                    <Table.Cell>
                                                        <Badge size="sm" color={getAuditEventColor(item.action)}>
                                                            {getAuditEventLabel(item.action)}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar size="xs" initials={getUserInitial(item.userId)} />
                                                            <span className="text-secondary">{getUserName(item.userId)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.details ?? "—"}</span></Table.Cell>
                                                    <Table.Cell><span className="text-tertiary font-mono text-sm">{item.ipAddress ?? "—"}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{formatDate(item.createdAt)}</span></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Floating dropdown for team member actions */}
            {openUserMenu && (() => {
                const member = teamMembers?.find((m) => m._id === openUserMenu);
                if (!member) return null;
                return (
                    <div className="fixed inset-0 z-[60]" onClick={() => { setOpenUserMenu(null); setEditingRole(null); }}>
                        <div
                            ref={menuRef}
                            className="fixed right-16 w-52 rounded-lg border border-secondary bg-primary shadow-xl"
                            style={{ top: "50%", transform: "translateY(-50%)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {editingRole?.userId === member._id ? (
                                <div className="flex flex-col p-1">
                                    <span className="px-3 py-1.5 text-xs font-semibold text-tertiary">Select Role</span>
                                    {(["sales_rep", "sales_admin", "billing"] as const).map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary_hover transition-colors ${member.role === role ? "text-brand-secondary font-medium" : "text-secondary"}`}
                                            onClick={() => handleRoleChange(member._id, role)}
                                        >
                                            {member.role === role && <CheckCircle className="size-4 text-brand-secondary" />}
                                            <span className={member.role === role ? "" : "pl-6"}>{formatRole(role)}</span>
                                        </button>
                                    ))}
                                    <button type="button" className="mt-1 border-t border-secondary px-3 py-2 text-left text-sm text-tertiary hover:bg-secondary_hover rounded-b-md transition-colors" onClick={() => setEditingRole(null)}>Cancel</button>
                                </div>
                            ) : (
                                <div className="flex flex-col p-1">
                                    <button type="button" className="rounded-md px-3 py-2 text-left text-sm text-secondary hover:bg-secondary_hover transition-colors" onClick={() => setEditingRole({ userId: member._id, role: member.role })}>Change Role</button>
                                    <button
                                        type="button"
                                        className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${member.status === "deactivated" ? "text-success-primary hover:bg-success-secondary" : "text-error-primary hover:bg-error-secondary"}`}
                                        onClick={() => handleToggleStatus(member._id, member.status)}
                                    >
                                        {member.status === "deactivated" ? "Reactivate User" : "Deactivate User"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Invite User Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-primary mb-1">Invite Team Member</h3>
                        <p className="text-sm text-tertiary mb-6">Send an invitation to join your team on CyberHook.</p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder="Full name"
                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1.5">Email *</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1.5">Role</label>
                                <NativeSelect
                                    aria-label="Role"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                                    options={[
                                        { label: "Sales Rep", value: "sales_rep" },
                                        { label: "Sales Admin", value: "sales_admin" },
                                        { label: "Billing", value: "billing" },
                                    ]}
                                    className="w-full"
                                    selectClassName="text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <Button color="secondary" size="md" onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteName(""); }}>Cancel</Button>
                            <Button color="primary" size="md" onClick={handleInviteUser} isDisabled={!inviteEmail.trim() || isInviting} isLoading={isInviting}>
                                Send Invite
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
