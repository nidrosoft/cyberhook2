"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser, useCompany, useTokens } from "@/hooks";
import {
    CreditCard02,
    DownloadCloud01,
    DotsVertical,
    CheckCircle,
    FilterLines,
    Link01,
    Mail01,
    Plus,
    SearchLg,
    Zap,
} from "@untitledui/icons";
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
];

const integrationCategories = [
    {
        label: "EMAIL",
        items: [
            { name: "Outlook", description: "Sync emails and contacts from Microsoft Outlook", icon: "📧", provider: "outlook_email" as const },
            { name: "Gmail", description: "Sync emails and contacts from Google Workspace", icon: "📧", provider: "gmail" as const },
        ],
    },
    {
        label: "CALENDAR",
        items: [
            { name: "Outlook Calendar", description: "Sync meetings and events from Outlook Calendar", icon: "📅", provider: "outlook_calendar" as const },
            { name: "Google Calendar", description: "Sync meetings and events from Google Calendar", icon: "📅", provider: "google_calendar" as const },
        ],
    },
    {
        label: "CRM",
        items: [
            { name: "HubSpot", description: "Two-way sync contacts, deals, and activities", icon: "🔶", provider: "hubspot" as const },
            { name: "GoHighLevel", description: "Sync leads and pipeline data with GHL", icon: "🟢", provider: "ghl" as const },
        ],
    },
    {
        label: "MESSAGING",
        items: [
            { name: "Microsoft Teams", description: "Send notifications and alerts to Teams channels", icon: "💬", provider: "teams" as const },
            { name: "Slack", description: "Send notifications and alerts to Slack channels", icon: "💬", provider: "slack" as const },
        ],
    },
    {
        label: "SOCIAL",
        items: [
            { name: "LinkedIn", description: "Enrich leads and automate outreach via LinkedIn", icon: "🔗", provider: "linkedin" as const },
        ],
    },
    {
        label: "PAYMENTS",
        items: [
            { name: "Stripe", description: "Process payments and manage subscriptions", icon: "💳", provider: "stripe" as const },
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
    const [selectedTab, setSelectedTab] = useState<string>("profile");
    const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [userSort, setUserSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [auditSort, setAuditSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });

    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();
    const { company, isLoading: isCompanyLoading } = useCompany();
    const { tokensRemaining, tokenAllocation, tokenPercentage, resetDisplayText } = useTokens();

    const updateUser = useMutation(api.users.update);
    const updateCompany = useMutation(api.companies.update);

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

    const handleAvatarUpload = (file: File) => {
        setUploadedAvatar(URL.createObjectURL(file));
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
                locationId: data.locationId as string,
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
            });
        } finally {
            setIsSaving(false);
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

    const planLabel = company?.planId ?? "Enterprise";
    const planPrice = company?.planId === "starter" ? "$99" : company?.planId === "pro" ? "$499" : "$1,250";

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
                        <Tabs className="hidden md:flex xl:w-full border-b border-secondary pb-px" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                            <TabList type="button-minimal" className="w-full gap-4 min-w-max" items={tabs} />
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
                                        <div className="flex flex-col gap-5 lg:flex-row">
                                            <Avatar size="2xl" src={uploadedAvatar || user?.imageUrl || undefined} initials={user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : undefined} />
                                            <FileUpload.DropZone className="w-full" onDropFiles={(files) => handleAvatarUpload(files[0])} />
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
                                        <TextField name="locationId" defaultValue={company?.locationId ?? ""}>
                                            <Label>Location ID</Label>
                                            <InputBase size="md" />
                                        </TextField>
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

                                {/* OFFICE LOCATIONS */}
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-primary mb-2">OFFICE LOCATIONS</h3>
                                        <Button size="sm" color="secondary" iconLeading={Plus}>Add Location</Button>
                                    </div>
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
                                                            {[loc.address, loc.city, loc.state, loc.zipCode, loc.country].filter(Boolean).join(", ")}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <Button size="sm" color="secondary">Edit</Button>
                                                        <Button size="sm" color="secondary">Remove</Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 border border-dashed border-secondary rounded-lg text-center">
                                                <p className="text-sm text-tertiary">No office locations added yet. Click "Add Location" to get started.</p>
                                            </div>
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
                                    <Button size="md" color="primary" iconLeading={Plus}>Invite User</Button>
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
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                                )}
                            </div>
                        )}

                        {/* Plan & Billing Tab */}
                        {selectedTab === "plan" && (
                            isCompanyLoading ? <LoadingSpinner /> : (
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Current Plan</h2>
                                        <p className="text-sm text-tertiary">Manage your platform subscription and view limits.</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                        <Button size="md" color="secondary" iconLeading={CreditCard02}>Update Payment Method</Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-6 p-6 border border-secondary rounded-2xl bg-secondary_subtle lg:col-span-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-lg font-semibold text-primary capitalize">{planLabel} Plan</h3>
                                                <p className="text-sm border-tertiary">
                                                    {company?.planStatus === "trialing"
                                                        ? `Trial ends ${company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : "soon"}`
                                                        : "Billed annually"
                                                    }
                                                </p>
                                            </div>
                                            <h3 className="text-display-sm font-semibold text-primary">{planPrice}<span className="text-md text-tertiary font-normal">/mo</span></h3>
                                        </div>

                                        <div className="flex flex-col gap-3 mt-4">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-brand-secondary" />
                                                <span className="text-secondary">Unlimited AI Email Campaigns</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-brand-secondary" />
                                                <span className="text-secondary">Custom Knowledge Base Uploads (Up to 50GB)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-brand-secondary" />
                                                <span className="text-secondary">CRM Integrations (Salesforce, HubSpot)</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-secondary">
                                            <Button size="md" color="primary" iconLeading={Zap}>Upgrade Plan</Button>
                                            <Button size="md" color="secondary">Cancel Subscription</Button>
                                        </div>
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
                                        <h2 className="text-lg font-semibold text-primary">Connected Integrations</h2>
                                        <p className="text-sm text-tertiary">Manage your third-party connections for email, CRM, calendar, and more.</p>
                                    </div>
                                </div>

                                {integrationCategories.map((category) => (
                                    <div key={category.label} className="flex flex-col gap-4">
                                        <h3 className="text-xs font-semibold text-tertiary tracking-wider uppercase">{category.label}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {category.items.map((item) => {
                                                const isConnected = item.provider === "stripe" && !!company?.stripeCustomerId;
                                                return (
                                                    <div
                                                        key={item.name}
                                                        className="flex flex-col gap-4 p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle text-lg">
                                                                    {item.icon}
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-semibold text-primary">{item.name}</span>
                                                                    {isConnected ? (
                                                                        <Badge color="success" size="sm">Connected</Badge>
                                                                    ) : (
                                                                        <Badge color="gray" size="sm">Not Connected</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-tertiary">{item.description}</p>
                                                        <div className="mt-auto pt-2">
                                                            {isConnected ? (
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
                                        <InputBase type="text" size="md" placeholder="Search audit events..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <InputBase type="date" size="md" className="w-full sm:w-auto shadow-sm" />
                                        <Button size="md" color="secondary" iconLeading={FilterLines}>Filters</Button>
                                    </div>
                                </div>

                                {auditLogs === undefined ? <LoadingSpinner /> : (
                                <TableCard.Root>
                                    <TableCard.Header title="Activity Log" badge={`${auditLogs.length} Event${auditLogs.length === 1 ? "" : "s"}`} />
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
                                        <Table.Body items={auditLogs.map((log) => ({ ...log, id: log._id }))}>
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
        </main>
    );
}
