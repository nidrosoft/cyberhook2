"use client";

import { useState } from "react";
import {
    CreditCard02,
    DownloadCloud01,
    DotsVertical,
    BarChartSquare02,
    CheckCircle,
    FilterLines,
    Link01,
    Mail01,
    Plus,
    SearchLg,
    Settings01 as Settings01Icon,
    Shield01,
    UploadCloud02,
    User01,
    Users01,
    Zap,
} from "@untitledui/icons";
import type { FileListItemProps } from "@/components/application/file-upload/file-upload-base";
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

const mockUsers = [
    { id: "1", name: "Sarah Jenkins", email: "sarah@acme.com", role: "Sales Admin", status: "Active", lastActive: "Just now" },
    { id: "2", name: "Mike Ross", email: "mike@acme.com", role: "Sales Rep", status: "Active", lastActive: "2 hours ago" },
    { id: "3", name: "Jessica Pearson", email: "jessica@acme.com", role: "Billing", status: "Invited", lastActive: "Never" }
];

const mockInvoices = [
    { id: "INV-2024-003", date: "Mar 01, 2024", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2024-002", date: "Feb 01, 2024", amount: "$1,250.00", plan: "Enterprise", status: "Paid" },
    { id: "INV-2024-001", date: "Jan 01, 2024", amount: "$1,250.00", plan: "Enterprise", status: "Paid" }
];

const placeholderFiles: FileListItemProps[] = [
    { name: "Tech design requirements.pdf", type: "pdf", size: 200 * 1024, progress: 100 },
];

const integrationCategories = [
    {
        label: "EMAIL",
        items: [
            { name: "Outlook", description: "Sync emails and contacts from Microsoft Outlook", icon: "📧", connected: false },
            { name: "Gmail", description: "Sync emails and contacts from Google Workspace", icon: "📧", connected: false },
        ],
    },
    {
        label: "CALENDAR",
        items: [
            { name: "Outlook Calendar", description: "Sync meetings and events from Outlook Calendar", icon: "📅", connected: false },
            { name: "Google Calendar", description: "Sync meetings and events from Google Calendar", icon: "📅", connected: false },
        ],
    },
    {
        label: "CRM",
        items: [
            { name: "HubSpot", description: "Two-way sync contacts, deals, and activities", icon: "🔶", connected: false },
            { name: "GoHighLevel", description: "Sync leads and pipeline data with GHL", icon: "🟢", connected: false },
        ],
    },
    {
        label: "MESSAGING",
        items: [
            { name: "Microsoft Teams", description: "Send notifications and alerts to Teams channels", icon: "💬", connected: false },
            { name: "Slack", description: "Send notifications and alerts to Slack channels", icon: "💬", connected: false },
        ],
    },
    {
        label: "SOCIAL",
        items: [
            { name: "LinkedIn", description: "Enrich leads and automate outreach via LinkedIn", icon: "🔗", connected: false },
        ],
    },
    {
        label: "PAYMENTS",
        items: [
            { name: "Stripe", description: "Process payments and manage subscriptions", icon: "💳", connected: true },
        ],
    },
];

const mockAuditLogs = [
    { id: "1", event: "User Login", user: "Sarah Jenkins", details: "Successful login", ip: "192.168.1.1", date: "Mar 7, 2026 10:30 AM" },
    { id: "2", event: "Live Search", user: "Mike Ross", details: "Searched: acmecorp.com", ip: "192.168.1.2", date: "Mar 7, 2026 10:15 AM" },
    { id: "3", event: "Lead Created", user: "Sarah Jenkins", details: "Created lead: Acme Corp", ip: "192.168.1.1", date: "Mar 7, 2026 09:45 AM" },
    { id: "4", event: "Campaign Launched", user: "Jessica Pearson", details: "Campaign: Q4 Outreach", ip: "192.168.1.3", date: "Mar 6, 2026 04:00 PM" },
    { id: "5", event: "User Invited", user: "Sarah Jenkins", details: "Invited: john@company.com (Sales Rep)", ip: "192.168.1.1", date: "Mar 6, 2026 02:30 PM" },
    { id: "6", event: "Integration Connected", user: "Sarah Jenkins", details: "Connected: HubSpot", ip: "192.168.1.1", date: "Mar 5, 2026 11:00 AM" },
    { id: "7", event: "Settings Updated", user: "Sarah Jenkins", details: "Updated company profile", ip: "192.168.1.1", date: "Mar 5, 2026 10:00 AM" },
    { id: "8", event: "Report Generated", user: "Mike Ross", details: "PDF report for globallogistics.com", ip: "192.168.1.2", date: "Mar 4, 2026 03:45 PM" },
];

export default function SettingsPage() {
    const [selectedTab, setSelectedTab] = useState<string>("profile");
    const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);

    const [userSort, setUserSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [invoiceSort, setInvoiceSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });
    const [auditSort, setAuditSort] = useState<SortDescriptor>({ column: "date", direction: "descending" });

    const handleAvatarUpload = (file: File) => {
        setUploadedAvatar(URL.createObjectURL(file));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Active": return <Badge color="success" size="sm">Active</Badge>;
            case "Invited": return <Badge color="gray" size="sm">Invited</Badge>;
            default: return <Badge color="gray" size="sm">{status}</Badge>;
        }
    };

    return (
        <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-5 px-4 lg:px-8 max-w-[1600px] mx-auto w-full">
                    {/* Page header */}
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
                    <div className="-mx-4 -my-1 scrollbar-hide flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
                        <Tabs className="hidden md:flex xl:w-full border-b border-secondary pb-px" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                            <TabList type="button-minimal" className="w-full gap-4" items={tabs} />
                        </Tabs>
                    </div>

                    <div className="mt-4">
                        {/* Profile Tab */}
                        {selectedTab === "profile" && (
                            <Form
                                className="flex flex-col gap-6"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const data = Object.fromEntries(new FormData(e.currentTarget));
                                    console.log("Form data:", data);
                                }}
                            >
                                <div>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-secondary">
                                        <div className="flex flex-1 flex-col justify-center gap-1 self-stretch">
                                            <h2 className="text-lg font-semibold text-primary">Personal info</h2>
                                            <p className="text-sm text-tertiary">Update your photo and personal details here.</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                            <Button color="secondary" size="md">Cancel</Button>
                                            <Button type="submit" color="primary" size="md">Save</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="max-lg:hidden">
                                            <Label>Name <span className="text-brand-tertiary">*</span></Label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                                            <TextField isRequired name="firstName" defaultValue="Liron">
                                                <Label className="lg:hidden">First name</Label>
                                                <InputBase size="md" />
                                            </TextField>
                                            <TextField isRequired name="lastName" defaultValue="">
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
                                        <TextField isRequired name="email" type="email" defaultValue="liron@cyberhook.com">
                                            <Label className="lg:hidden">Email address</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                    </div>
                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                        <div className="flex flex-col gap-1">
                                            <Label>Your photo <span className="text-brand-tertiary">*</span></Label>
                                            <p className="text-sm text-tertiary">This will be displayed on your profile.</p>
                                        </div>
                                        <div className="flex flex-col gap-5 lg:flex-row">
                                            <Avatar size="2xl" src={uploadedAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"} />
                                            <FileUpload.DropZone className="w-full" onDropFiles={(files) => handleAvatarUpload(files[0])} />
                                        </div>
                                    </div>
                                </div>
                            </Form>
                        )}

                        {/* Company Settings Tab (V2) */}
                        {selectedTab === "company" && (
                            <Form
                                className="flex flex-col gap-8"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const data = Object.fromEntries(new FormData(e.currentTarget));
                                    console.log("Company Form data:", data);
                                }}
                            >
                                {/* Header */}
                                <div>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-secondary">
                                        <div className="flex flex-1 flex-col justify-center gap-1 self-stretch">
                                            <h2 className="text-lg font-semibold text-primary">Company Profile</h2>
                                            <p className="text-sm text-tertiary">Manage your company's general and contact information.</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                            <Button color="secondary" size="md">Cancel</Button>
                                            <Button type="submit" color="primary" size="md">Save Changes</Button>
                                        </div>
                                    </div>
                                </div>

                                {/* GENERAL INFORMATION */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">GENERAL INFORMATION</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="companyName" defaultValue="TechCo MSP">
                                            <Label>Company Name</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="locationId" defaultValue="LOC-9821">
                                            <Label>Location ID</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <Select name="companyType" label="Company Type" defaultSelectedKey="msp">
                                            <Select.Item id="msp">MSP/MSSP</Select.Item>
                                            <Select.Item id="var">Value Added Reseller</Select.Item>
                                            <Select.Item id="vendor">Vendor</Select.Item>
                                        </Select>
                                        <TextField name="website" defaultValue="https://techcomsp.com">
                                            <Label>Website</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="phone" defaultValue="+1 (555) 000-0000">
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
                                        <TextField name="supportEmail" type="email" defaultValue="support@techcomsp.com">
                                            <Label>Support Email</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                        <TextField name="supportPhone" defaultValue="+1 (555) 123-4567">
                                            <Label>Support Phone</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="salesEmail" type="email" defaultValue="sales@techcomsp.com">
                                            <Label>Sales Email</Label>
                                            <InputBase size="md" icon={Mail01} />
                                        </TextField>
                                        <TextField name="salesPhone" defaultValue="+1 (555) 987-6543">
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
                                        <Select name="revenue" label="Annual Revenue" defaultSelectedKey="10-24">
                                            <Select.Item id="0-1">Under $1M</Select.Item>
                                            <Select.Item id="1-10">$1M - $10M</Select.Item>
                                            <Select.Item id="10-24">$10M - $24M</Select.Item>
                                            <Select.Item id="25+">$25M+</Select.Item>
                                        </Select>
                                        <Select name="companySize" label="Company Size" defaultSelectedKey="51-100">
                                            <Select.Item id="1-10">1-10 Employees</Select.Item>
                                            <Select.Item id="11-50">11-50 Employees</Select.Item>
                                            <Select.Item id="51-100">51-100 Employees</Select.Item>
                                            <Select.Item id="101+">101+ Employees</Select.Item>
                                        </Select>
                                        <Select name="salesTeamSize" label="Sales Team Size" defaultSelectedKey="2-5">
                                            <Select.Item id="1">1 Person</Select.Item>
                                            <Select.Item id="2-5">2-5 People</Select.Item>
                                            <Select.Item id="6-10">6-10 People</Select.Item>
                                            <Select.Item id="11+">11+ People</Select.Item>
                                        </Select>
                                        <TextField name="geographicCoverage" defaultValue="North America">
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
                                        {/* Mock Location 1 */}
                                        <div className="flex items-center justify-between p-4 border border-secondary rounded-lg bg-secondary_subtle">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-primary">HQ</span>
                                                    <Badge size="sm" color="brand">Primary</Badge>
                                                </div>
                                                <span className="text-sm text-tertiary">123 Main St, Houston, TX 77002, US</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" color="secondary">Edit</Button>
                                                <Button size="sm" color="secondary">Remove</Button>
                                            </div>
                                        </div>
                                        {/* Mock Location 2 */}
                                        <div className="flex items-center justify-between p-4 border border-secondary rounded-lg bg-secondary_subtle">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-primary">West Coast Office</span>
                                                <span className="text-sm text-tertiary">456 Oak Ave, Los Angeles, CA 90001, US</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" color="secondary">Edit</Button>
                                                <Button size="sm" color="secondary">Remove</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                {/* TARGETS */}
                                <div className="flex flex-col gap-5">
                                    <h3 className="text-sm font-semibold text-primary mb-2">TARGETS & DEFAULTS</h3>
                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                                        <TextField name="mrrTarget" type="number" defaultValue="50000">
                                            <Label>MRR Target ($)</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                        <TextField name="appointmentTarget" type="number" defaultValue="20">
                                            <Label>Monthly Appointment Target</Label>
                                            <InputBase size="md" />
                                        </TextField>
                                    </div>
                                </div>

                            </Form>
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

                                <TableCard.Root>
                                    <TableCard.Header title="Platform Users" badge="3 Seats in Use" />
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
                                        <Table.Body items={mockUsers}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar size="sm" alt={item.name} />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-primary">{item.name}</span>
                                                                <span className="text-sm text-tertiary">{item.email}</span>
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge size="sm" color="gray">{item.role}</Badge></Table.Cell>
                                                    <Table.Cell>{getStatusBadge(item.status)}</Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.lastActive}</span></Table.Cell>
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        )}

                        {/* Plan & Billing Tab */}
                        {selectedTab === "plan" && (
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
                                                <h3 className="text-lg font-semibold text-primary">Enterprise Plan</h3>
                                                <p className="text-sm border-tertiary">Billed annually on January 1st.</p>
                                            </div>
                                            <h3 className="text-display-sm font-semibold text-primary">$1,250<span className="text-md text-tertiary font-normal">/mo</span></h3>
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
                                                <BadgeWithIcon size="sm" color="gray" iconLeading={Zap}>Resets in 12 days</BadgeWithIcon>
                                            </div>
                                            <p className="text-sm text-tertiary">Used for Live Search and Web Scanning.</p>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-4">
                                            <div className="flex items-end justify-between">
                                                <span className="text-3xl font-semibold text-primary">842</span>
                                                <span className="text-sm font-medium text-tertiary pb-1">/ 1,000</span>
                                            </div>
                                            <div className="w-full bg-secondary_subtle rounded-full h-2.5 overflow-hidden border border-secondary">
                                                <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: "84.2%" }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mt-4">
                                    <TableCard.Root>
                                        <TableCard.Header title="Billing History" />
                                        <Table aria-label="Invoices" sortDescriptor={invoiceSort} onSortChange={setInvoiceSort}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.Head id="id" isRowHeader allowsSorting>Invoice Number</Table.Head>
                                                    <Table.Head id="date" allowsSorting>Date</Table.Head>
                                                    <Table.Head id="amount" allowsSorting>Amount</Table.Head>
                                                    <Table.Head id="plan" allowsSorting>Plan</Table.Head>
                                                    <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                    <Table.Head id="actions" className="w-12"></Table.Head>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body items={mockInvoices}>
                                                {(item) => (
                                                    <Table.Row id={item.id}>
                                                        <Table.Cell><span className="font-medium text-primary">{item.id}</span></Table.Cell>
                                                        <Table.Cell><span className="text-secondary">{item.date}</span></Table.Cell>
                                                        <Table.Cell><span className="text-secondary font-medium">{item.amount}</span></Table.Cell>
                                                        <Table.Cell><span className="text-secondary">{item.plan}</span></Table.Cell>
                                                        <Table.Cell><Badge color="success" size="sm">{item.status}</Badge></Table.Cell>
                                                        <Table.Cell><ButtonUtility size="sm" icon={DownloadCloud01} aria-label="Download PDF" /></Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                    </TableCard.Root>
                                </div>
                            </div>
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
                                            {category.items.map((item) => (
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
                                                                {item.connected ? (
                                                                    <Badge color="success" size="sm">Connected ✓</Badge>
                                                                ) : (
                                                                    <Badge color="gray" size="sm">Not Connected</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-tertiary">{item.description}</p>
                                                    <div className="mt-auto pt-2">
                                                        {item.connected ? (
                                                            <Button size="sm" color="secondary" className="w-full">Disconnect</Button>
                                                        ) : (
                                                            <Button size="sm" color="primary" className="w-full" iconLeading={Link01}>Connect</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
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

                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search audit events..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <InputBase type="date" size="md" className="w-auto shadow-sm" />
                                        <Button size="md" color="secondary" iconLeading={FilterLines}>Filters</Button>
                                    </div>
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Activity Log" badge={`${mockAuditLogs.length} Events`} />
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
                                        <Table.Body items={mockAuditLogs}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <Badge size="sm" color={
                                                            item.event === "User Login" ? "brand" :
                                                            item.event === "Live Search" ? "blue" :
                                                            item.event === "Lead Created" ? "success" :
                                                            item.event === "Campaign Launched" ? "purple" :
                                                            item.event === "User Invited" ? "orange" :
                                                            item.event === "Integration Connected" ? "success" :
                                                            "gray"
                                                        }>{item.event}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar size="xs" initials={item.user.charAt(0)} />
                                                            <span className="text-secondary">{item.user}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.details}</span></Table.Cell>
                                                    <Table.Cell><span className="text-tertiary font-mono text-sm">{item.ip}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.date}</span></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </main>
    );
}
