"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
    ArrowLeft,
    Building01,
    CheckCircle,
    Copy01,
    Globe01,
    LinkExternal01,
    Mail01,
    Phone01,
    Plus,
    Shield01,
    Star01,
    Target05,
    Users01,
    AlertCircle,
    BarChartSquare02,
    CreditCard02,
    Calendar,
    Loading02,
    SearchLg,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Tabs } from "@/components/application/tabs/tabs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getStatusColor(status?: string) {
    switch (status) {
        case "new":
            return "blue" as const;
        case "contacted":
            return "brand" as const;
        case "qualified":
            return "success" as const;
        case "proposal":
        case "negotiation":
            return "warning" as const;
        case "closed_won":
            return "success" as const;
        case "closed_lost":
            return "error" as const;
        default:
            return "gray" as const;
    }
}

function getSeverityColor(severity?: string) {
    switch (severity?.toLowerCase()) {
        case "critical":
            return "error" as const;
        case "high":
            return "warning" as const;
        case "medium":
            return "brand" as const;
        case "low":
            return "success" as const;
        default:
            return "gray" as const;
    }
}

function formatDate(timestamp?: number) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function timeAgo(timestamp?: number) {
    if (!timestamp) return "—";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
            <div className="flex flex-col">
                <span className="text-sm text-tertiary">{label}</span>
                <span className="text-sm font-medium text-primary">{value}</span>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Loading02 className="w-8 h-8 text-tertiary animate-spin" />
                <p className="text-sm text-tertiary">Loading lead details...</p>
            </div>
        </div>
    );
}

function NotFoundState() {
    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-12 h-12 rounded-full bg-error-secondary flex items-center justify-center">
                    <SearchLg className="w-6 h-6 text-fg-error-primary" />
                </div>
                <h2 className="text-lg font-semibold text-primary">Lead not found</h2>
                <p className="text-sm text-tertiary">This lead may have been deleted or you don&apos;t have access.</p>
                <Link href="/live-leads">
                    <Button color="secondary" size="sm" iconLeading={ArrowLeft}>
                        Back to Live-Leads
                    </Button>
                </Link>
            </div>
        </div>
    );
}

interface LeadData {
    _id: Id<"leads">;
    name: string;
    domain: string;
    industry?: string;
    website?: string;
    country?: string;
    region?: string;
    city?: string;
    employeeCount?: string;
    revenueRange?: string;
    linkedinUrl?: string;
    exposureCount?: number;
    lastExposureDate?: number;
    exposureSeverity?: string;
    enrichmentData?: {
        headquarters?: string;
        foundedYear?: number;
        description?: string;
        logoUrl?: string;
        linkedinUrl?: string;
        twitterUrl?: string;
        facebookUrl?: string;
        techStack?: string[];
        officeLocations?: {
            address?: string;
            city?: string;
            state?: string;
            country?: string;
        }[];
    };
    source?: string;
    status?: string;
    createdAt: number;
    updatedAt: number;
}

interface ContactData {
    _id: Id<"contacts">;
    firstName: string;
    lastName: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    emailRevealed?: boolean;
    phoneRevealed?: boolean;
}

function OverviewTab({ lead }: { lead: LeadData }) {
    const location = [lead.city, lead.region, lead.country].filter(Boolean).join(", ");
    const headquarters = lead.enrichmentData?.headquarters || location || "—";
    const websiteUrl = lead.website || lead.domain;
    const linkedinUrl = lead.enrichmentData?.linkedinUrl || lead.linkedinUrl;
    const officeLocations = lead.enrichmentData?.officeLocations;

    return (
        <div className="flex flex-col gap-8">
            {/* Company Info */}
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow icon={Building01} label="Headquarters" value={headquarters} />
                    <InfoRow icon={Target05} label="Industry" value={lead.industry || "—"} />
                    <InfoRow icon={Users01} label="Employee Count" value={lead.employeeCount || "—"} />
                    <InfoRow icon={CreditCard02} label="Revenue Range" value={lead.revenueRange || "—"} />
                    <div className="flex items-start gap-3">
                        <Globe01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-sm text-tertiary">Website</span>
                            {websiteUrl ? (
                                <a
                                    href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-brand-secondary hover:underline inline-flex items-center gap-1"
                                >
                                    {websiteUrl}
                                    <LinkExternal01 className="w-3.5 h-3.5" />
                                </a>
                            ) : (
                                <span className="text-sm font-medium text-primary">—</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Users01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-sm text-tertiary">LinkedIn</span>
                            {linkedinUrl ? (
                                <a
                                    href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-brand-secondary hover:underline inline-flex items-center gap-1"
                                >
                                    {linkedinUrl.replace(/^https?:\/\//, "")}
                                    <LinkExternal01 className="w-3.5 h-3.5" />
                                </a>
                            ) : (
                                <span className="text-sm font-medium text-primary">—</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Office Locations */}
            {officeLocations && officeLocations.length > 0 && (
                <div className="rounded-xl border border-secondary bg-primary p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">Office Locations</h3>
                    <div className="flex flex-col gap-3">
                        {officeLocations.map((office, i) => {
                            const addr = [office.address, office.city, office.state, office.country].filter(Boolean).join(", ");
                            return (
                                <div key={i} className="flex items-center gap-3 rounded-lg border border-secondary bg-secondary_subtle px-4 py-3">
                                    <Badge color="gray" size="sm">{i === 0 ? "HQ" : "Branch"}</Badge>
                                    <span className="text-sm text-secondary">{addr || "—"}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Exposure Summary */}
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Exposure Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-fg-error-primary" />
                            <span className="text-display-xs font-semibold text-primary">{lead.exposureCount ?? 0}</span>
                        </div>
                        <span className="text-sm text-tertiary">Exposures Found</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-tertiary" />
                            <span className="text-display-xs font-semibold text-primary">
                                {lead.lastExposureDate ? timeAgo(lead.lastExposureDate) : "—"}
                            </span>
                        </div>
                        <span className="text-sm text-tertiary">Last Detection</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Shield01 className="w-5 h-5 text-fg-error-primary" />
                            <span className={`text-display-xs font-semibold ${lead.exposureSeverity ? "text-error-primary" : "text-tertiary"}`}>
                                {lead.exposureSeverity?.toUpperCase() || "—"}
                            </span>
                        </div>
                        <span className="text-sm text-tertiary">Severity Level</span>
                    </div>
                </div>
            </div>

            {/* Enrichment Details */}
            {lead.enrichmentData?.description && (
                <div className="rounded-xl border border-secondary bg-primary p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">About</h3>
                    <p className="text-sm text-secondary leading-relaxed">{lead.enrichmentData.description}</p>
                    {lead.enrichmentData.foundedYear && (
                        <p className="text-sm text-tertiary mt-3">Founded: {lead.enrichmentData.foundedYear}</p>
                    )}
                    {lead.enrichmentData.techStack && lead.enrichmentData.techStack.length > 0 && (
                        <div className="mt-4">
                            <span className="text-sm font-medium text-secondary">Tech Stack</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {lead.enrichmentData.techStack.map((tech) => (
                                    <Badge key={tech} color="gray" size="sm">{tech}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function KeyContactsTab({ contacts }: { contacts: ContactData[] }) {
    if (contacts.length === 0) {
        return (
            <div className="rounded-xl border border-secondary bg-primary p-12 flex flex-col items-center justify-center gap-3">
                <Users01 className="w-8 h-8 text-tertiary" />
                <p className="text-sm font-medium text-secondary">No contacts found</p>
                <p className="text-sm text-tertiary">Contacts will appear here once they are added to this lead.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {contacts.map((contact) => {
                    const fullName = `${contact.firstName} ${contact.lastName}`;
                    return (
                        <div key={contact._id} className="rounded-xl border border-secondary bg-primary p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-solid flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                    {getInitials(fullName)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-primary truncate">{fullName}</span>
                                    <span className="text-sm text-tertiary">{contact.title || "—"}</span>
                                </div>
                            </div>
                            {contact.linkedinUrl && (
                                <a
                                    href={contact.linkedinUrl.startsWith("http") ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-brand-secondary hover:underline inline-flex items-center gap-1"
                                >
                                    <LinkExternal01 className="w-3.5 h-3.5" />
                                    LinkedIn Profile
                                </a>
                            )}
                            <div className="flex flex-col gap-2">
                                {contact.emailRevealed && contact.email ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-secondary bg-secondary_subtle px-3 py-2">
                                        <Mail01 className="w-4 h-4 text-tertiary" />
                                        <span className="text-sm text-primary">{contact.email}</span>
                                    </div>
                                ) : (
                                    <Button color="secondary" size="sm" iconLeading={Mail01} className="w-full">
                                        Reveal Email
                                    </Button>
                                )}
                                {contact.phoneRevealed && contact.phone ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-secondary bg-secondary_subtle px-3 py-2">
                                        <Phone01 className="w-4 h-4 text-tertiary" />
                                        <span className="text-sm text-primary">{contact.phone}</span>
                                    </div>
                                ) : (
                                    <Button color="secondary" size="sm" iconLeading={Phone01} className="w-full">
                                        Reveal Phone
                                    </Button>
                                )}
                                <Button color="primary" size="sm" iconLeading={Plus} className="w-full">
                                    Add to Campaign
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ExposuresTab({ lead }: { lead: LeadData }) {
    if (!lead.exposureCount || lead.exposureCount === 0) {
        return (
            <div className="rounded-xl border border-secondary bg-primary p-12 flex flex-col items-center justify-center gap-3">
                <Shield01 className="w-8 h-8 text-tertiary" />
                <p className="text-sm font-medium text-secondary">No exposures detected</p>
                <p className="text-sm text-tertiary">Run a search to check for security exposures.</p>
                <Button color="secondary" size="sm" iconLeading={Target05}>
                    Run Search
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-secondary bg-primary p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Exposure Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-fg-error-primary" />
                            <span className="text-display-xs font-semibold text-primary">{lead.exposureCount}</span>
                        </div>
                        <span className="text-sm text-tertiary">Total Exposures</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-tertiary" />
                            <span className="text-sm font-semibold text-primary">
                                {formatDate(lead.lastExposureDate)}
                            </span>
                        </div>
                        <span className="text-sm text-tertiary">Last Detection</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-secondary bg-secondary_subtle p-5 gap-2">
                        <div className="flex items-center gap-2">
                            <Shield01 className="w-5 h-5 text-fg-error-primary" />
                            <Badge color={getSeverityColor(lead.exposureSeverity)} size="sm">
                                {lead.exposureSeverity?.toUpperCase() || "UNKNOWN"}
                            </Badge>
                        </div>
                        <span className="text-sm text-tertiary">Severity</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button color="secondary" size="sm" iconLeading={Target05}>
                    Re-run Search (1 token)
                </Button>
            </div>
        </div>
    );
}

function ActivityTab({ lead }: { lead: LeadData }) {
    const events = [
        { label: "Lead created", date: formatDate(lead.createdAt) },
        ...(lead.updatedAt !== lead.createdAt
            ? [{ label: "Lead updated", date: formatDate(lead.updatedAt) }]
            : []),
        ...(lead.lastExposureDate
            ? [{ label: "Last exposure detected", date: formatDate(lead.lastExposureDate) }]
            : []),
        ...(lead.enrichmentData
            ? [{ label: "Lead data enriched", date: "—" }]
            : []),
    ];

    if (events.length === 0) {
        return (
            <div className="rounded-xl border border-secondary bg-primary p-12 flex flex-col items-center justify-center gap-3">
                <CheckCircle className="w-8 h-8 text-tertiary" />
                <p className="text-sm font-medium text-secondary">No activity yet</p>
                <p className="text-sm text-tertiary">Activity events will appear here as actions are taken on this lead.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-secondary bg-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-6">Activity Timeline</h3>
            <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border-secondary" />
                <div className="flex flex-col gap-6">
                    {events.map((activity, i) => (
                        <div key={i} className="flex items-start gap-4 relative">
                            <div className="w-6 h-6 rounded-full border-2 border-secondary bg-primary flex items-center justify-center z-10 shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-fg-success-primary" />
                            </div>
                            <div className="flex flex-col gap-0.5 pt-0.5">
                                <span className="text-sm font-medium text-primary">{activity.label}</span>
                                <span className="text-xs text-tertiary">{activity.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const tabItems = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Key Contacts" },
    { id: "exposures", label: "Exposures" },
    { id: "activity", label: "Activity" },
];

export default function LeadDetailPage() {
    const params = useParams();
    const leadId = params.id as Id<"leads">;
    const [activeTab, setActiveTab] = useState("overview");

    const lead = useQuery(api.leads.getById, { id: leadId });
    const contacts = useQuery(api.contacts.getByLeadId, { leadId });

    if (lead === undefined) {
        return <LoadingState />;
    }

    if (lead === null) {
        return <NotFoundState />;
    }

    const typedLead = lead as LeadData;
    const typedContacts = (contacts ?? []) as ContactData[];

    const location = [typedLead.city, typedLead.region, typedLead.country].filter(Boolean).join(", ");

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Back Link */}
                <Link
                    href="/live-leads"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-secondary transition-colors w-max"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Live-Leads
                </Link>

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-secondary pb-6">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-solid flex items-center justify-center text-white text-lg sm:text-xl font-bold shrink-0">
                            {getInitials(typedLead.name)}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h1 className="text-xl sm:text-display-sm font-semibold text-primary break-words">{typedLead.name}</h1>
                                <Badge color={getStatusColor(typedLead.status)} size="sm">
                                    {(typedLead.status || "new").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Badge>
                            </div>
                            <p className="text-sm text-tertiary flex items-center gap-1.5 flex-wrap">
                                <span>{typedLead.domain}</span>
                                {typedLead.industry && (
                                    <>
                                        <span className="text-quaternary">•</span>
                                        <span>{typedLead.industry}</span>
                                    </>
                                )}
                            </p>
                            {location && (
                                <p className="text-sm text-tertiary flex items-center gap-1.5 flex-wrap">
                                    <span>📍 {location}</span>
                                    {typedLead.employeeCount && (
                                        <>
                                            <span className="text-quaternary">•</span>
                                            <span>{typedLead.employeeCount} employees</span>
                                        </>
                                    )}
                                </p>
                            )}
                            {typedLead.revenueRange && (
                                <p className="text-sm text-tertiary flex items-center gap-1.5">
                                    <BarChartSquare02 className="w-4 h-4" />
                                    <span>Revenue: {typedLead.revenueRange}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-4 sm:mt-0">
                        <Button color="secondary" size="sm" iconLeading={Star01}>
                            Add to Watchlist
                        </Button>
                        <Button color="secondary" size="sm" iconLeading={Target05}>
                            Start Campaign
                        </Button>
                        <Button color="secondary" size="sm" iconLeading={Copy01}>
                            Push to CRM
                        </Button>
                        <Button color="primary" size="sm" iconLeading={BarChartSquare02}>
                            Generate Report
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
                    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                        <Tabs.List items={tabItems} type="underline" size="sm">
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>
                    </div>

                    <div className="mt-6">
                        <Tabs.Panel id="overview">
                            <OverviewTab lead={typedLead} />
                        </Tabs.Panel>
                        <Tabs.Panel id="contacts">
                            <KeyContactsTab contacts={typedContacts} />
                        </Tabs.Panel>
                        <Tabs.Panel id="exposures">
                            <ExposuresTab lead={typedLead} />
                        </Tabs.Panel>
                        <Tabs.Panel id="activity">
                            <ActivityTab lead={typedLead} />
                        </Tabs.Panel>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
