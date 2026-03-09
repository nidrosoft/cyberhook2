"use client";

import React, { useState } from "react";
import {
    Plus,
    SearchLg,
    File04,
    Folder,
    DownloadCloud01,
    DotsVertical,
    File05,
    CheckDone01,
    Copy01,
    Award01,
    UploadCloud02,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { InputBase } from "@/components/base/input/input";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";

const mockRfps = [
    { id: "1", client: "Global Finance Bank", dueDate: "2026-03-10", status: "In Progress", completion: "75%", owner: "Sarah Jenkins", value: "$125,000", deadline: "soon" },
    { id: "2", client: "Stark Industries", dueDate: "2026-02-28", status: "Submitted", completion: "100%", owner: "Mike Ross", value: "$200,000", deadline: "overdue" },
    { id: "3", client: "Wayne Enterprises", dueDate: "2026-03-20", status: "Review", completion: "90%", owner: "Sarah Jenkins", value: "$175,000", deadline: "ontrack" },
];

const mockUseCases = [
    { id: "1", title: "Healthcare Provider – Ransomware Recovery", industry: "Healthcare", headcount: "250 employees", headcountRange: "201-500", status: "Approved" },
    { id: "2", title: "Construction Co – Network Overhaul", industry: "Construction", headcount: "100 employees", headcountRange: "51-200", status: "Approved" },
    { id: "3", title: "Financial Services – Compliance Automation", industry: "Finance", headcount: "500 employees", headcountRange: "201-500", status: "Pending" },
    { id: "4", title: "Manufacturing – IoT Security", industry: "Manufacturing", headcount: "1,000 employees", headcountRange: "501+", status: "Approved" },
    { id: "5", title: "Retail Chain – POS Breach Response", industry: "Retail", headcount: "350 employees", headcountRange: "201-500", status: "Approved" },
    { id: "6", title: "Government Agency – Zero Trust Migration", industry: "Government", headcount: "2,000 employees", headcountRange: "501+", status: "Approved" },
    { id: "7", title: "Law Firm – Client Data Protection", industry: "Legal", headcount: "45 employees", headcountRange: "1-50", status: "Pending" },
    { id: "8", title: "Logistics Co – Supply Chain Security", industry: "Logistics", headcount: "180 employees", headcountRange: "51-200", status: "Approved" },
    { id: "9", title: "Education District – Student Data Privacy", industry: "Education", headcount: "400 employees", headcountRange: "201-500", status: "Denied" },
    { id: "10", title: "Energy Provider – SCADA Network Hardening", industry: "Energy", headcount: "600 employees", headcountRange: "501+", status: "Approved" },
    { id: "11", title: "Insurance Firm – Cyber Policy Assessment", industry: "Insurance", headcount: "90 employees", headcountRange: "51-200", status: "Pending" },
    { id: "12", title: "Tech Startup – Cloud Security Audit", industry: "Technology", headcount: "30 employees", headcountRange: "1-50", status: "Approved" },
];

const mockCertifications = [
    { id: "1", name: "SOC 2 Type II", category: "Certification", status: "Active", expiry: "Dec 2026", note: "" },
    { id: "2", name: "ISO 27001", category: "Certification", status: "Active", expiry: "Jun 2027", note: "" },
    { id: "3", name: "HIPAA Compliance", category: "Compliance", status: "Active", expiry: "No Expiry", note: "" },
    { id: "4", name: "FedRAMP", category: "Accreditation", status: "Pending", expiry: "Applied Mar 2026", note: "" },
    { id: "5", name: "Cyber Insurance", category: "Insurance", status: "Active", expiry: "Jan 2027", note: "⚠️ Renewing Soon" },
    { id: "6", name: "Veteran Owned Business", category: "Accreditation", status: "Active", expiry: "No Expiry", note: "" },
];

const mockAnswerBank = [
    {
        id: "1", category: "Security", question: "Describe your incident response procedures",
        answer: "Our incident response follows a 4-phase NIST framework: Preparation, Detection & Analysis, Containment/Eradication/Recovery, and Post-Incident Activity. Our SOC operates 24/7/365 with an average response time under 15 minutes for critical alerts.",
    },
    {
        id: "2", category: "Compliance", question: "What compliance certifications do you hold?",
        answer: "We maintain SOC 2 Type II, ISO 27001, and HIPAA compliance certifications. Our FedRAMP authorization is currently pending. All certifications are audited annually by independent third parties.",
    },
    {
        id: "3", category: "SLA", question: "What are your guaranteed response times?",
        answer: "Critical (P1): 15-minute response, 4-hour resolution. High (P2): 1-hour response, 8-hour resolution. Medium (P3): 4-hour response, 24-hour resolution. Low (P4): Next business day response.",
    },
    {
        id: "4", category: "Technical", question: "Describe your backup and disaster recovery approach",
        answer: "We implement a 3-2-1 backup strategy with immutable backups stored across geographically separated data centers. RPO is 1 hour and RTO is 4 hours. Full disaster recovery tests are conducted quarterly.",
    },
    {
        id: "5", category: "Company", question: "Provide company background and history",
        answer: "Founded in 2015, we are a veteran-owned MSSP serving over 200 clients across healthcare, finance, and manufacturing. Our team of 85+ certified professionals holds CISSP, CISM, and CEH certifications.",
    },
];

const mockDownloads = [
    { id: "1", name: "Capabilities Deck", type: "PDF", size: "2.4 MB" },
    { id: "2", name: "Security Whitepaper", type: "PDF", size: "1.8 MB" },
    { id: "3", name: "Compliance Evidence Pack", type: "ZIP", size: "12.5 MB" },
    { id: "4", name: "Insurance Certificates", type: "PDF", size: "0.8 MB" },
    { id: "5", name: "Case Studies Collection", type: "PDF", size: "5.2 MB" },
    { id: "6", name: "Partner Program Overview", type: "PDF", size: "1.1 MB" },
];

export default function RfpHubPage() {
    const [rfpSort, setRfpSort] = useState<SortDescriptor>({ column: "dueDate", direction: "ascending" });
    const [useCaseSort, setUseCaseSort] = useState<SortDescriptor>({ column: "title", direction: "ascending" });
    const [certSort, setCertSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [industryFilter, setIndustryFilter] = useState("all");
    const [headcountFilter, setHeadcountFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [useCaseSearch, setUseCaseSearch] = useState("");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Submitted": return <Badge color="success" size="sm">Submitted</Badge>;
            case "In Progress": return <Badge color="brand" size="sm">In Progress</Badge>;
            case "Review": return <Badge color="warning" size="sm">Review</Badge>;
            default: return <Badge color="gray" size="sm">{status}</Badge>;
        }
    };

    const getDeadlineIndicator = (deadline: string) => {
        switch (deadline) {
            case "overdue": return <span title="Overdue">🔴</span>;
            case "soon": return <span title="Due within 3 days">🟡</span>;
            case "ontrack": return <span title="On track">🟢</span>;
            default: return null;
        }
    };

    const handleCopyAnswer = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-display-sm font-semibold text-primary">RFP Hub</h1>
                                <BadgeWithIcon color="success" size="sm" iconLeading={CheckDone01}>3 Active RFPs</BadgeWithIcon>
                            </div>
                            <p className="text-md text-tertiary">
                                Generate proposals, track responses, and manage your asset library.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button size="md" color="secondary" iconLeading={Folder}>Asset Library</Button>
                            <Button size="md" color="primary" iconLeading={Plus}>New Proposal</Button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <Tabs className="w-full">
                        <Tabs.List size="sm" type="button-border" className="mb-6" items={[
                            { id: "use-cases", label: "Use Cases" },
                            { id: "certifications", label: "Certifications" },
                            { id: "tracker", label: "RFP Tracker" },
                            { id: "answer-bank", label: "Answer Bank" },
                            { id: "downloads", label: "Quick Downloads" },
                        ]}>
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        {/* Use Cases Tab */}
                        <Tabs.Panel id="use-cases">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                                        <div className="min-w-0 flex-1">
                                            <InputBase type="text" size="sm" placeholder="Search use cases..." icon={SearchLg} value={useCaseSearch} onChange={(v: string) => setUseCaseSearch(v)} />
                                        </div>
                                        <div className="h-8 w-px shrink-0 bg-secondary" />
                                        <FilterDropdown
                                            aria-label="Industry"
                                            value={industryFilter}
                                            onChange={setIndustryFilter}
                                            options={[
                                                { label: "Industry: All", value: "all" },
                                                ...Array.from(new Set(mockUseCases.map((u) => u.industry))).sort().map((ind) => ({ label: ind, value: ind })),
                                            ]}
                                        />
                                        <FilterDropdown
                                            aria-label="Headcount"
                                            value={headcountFilter}
                                            onChange={setHeadcountFilter}
                                            options={[
                                                { label: "Headcount: All", value: "all" },
                                                { label: "1–50", value: "1-50" },
                                                { label: "51–200", value: "51-200" },
                                                { label: "201–500", value: "201-500" },
                                                { label: "501+", value: "501+" },
                                            ]}
                                        />
                                        <FilterDropdown
                                            aria-label="Status"
                                            value={statusFilter}
                                            onChange={setStatusFilter}
                                            options={[
                                                { label: "Status: All", value: "all" },
                                                { label: "Approved", value: "Approved" },
                                                { label: "Pending", value: "Pending" },
                                                { label: "Denied", value: "Denied" },
                                            ]}
                                        />
                                    </div>
                                    <Button size="md" color="primary" iconLeading={Plus}>New Use Case</Button>
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Use Case Library" badge={`${mockUseCases.length} Total`} />
                                    <Table aria-label="Use Cases" sortDescriptor={useCaseSort} onSortChange={setUseCaseSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="title" isRowHeader allowsSorting>Title</Table.Head>
                                                <Table.Head id="industry" allowsSorting>Industry</Table.Head>
                                                <Table.Head id="headcount" allowsSorting>Headcount</Table.Head>
                                                <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                <Table.Head id="actions" className="w-12"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={mockUseCases}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <Folder className="w-5 h-5 text-tertiary" />
                                                            <span className="font-medium text-primary">{item.title}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge size="sm" color="gray">{item.industry}</Badge></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.headcount}</span></Table.Cell>
                                                    <Table.Cell>
                                                        {item.status === "Approved" ? (
                                                            <Badge color="success" size="sm">Approved Reference</Badge>
                                                        ) : item.status === "Denied" ? (
                                                            <Badge color="error" size="sm">Denied</Badge>
                                                        ) : (
                                                            <Badge color="warning" size="sm">Pending Approval</Badge>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* Certifications Tab */}
                        <Tabs.Panel id="certifications">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search certifications..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <Button size="md" color="primary" iconLeading={Plus}>Add Certification</Button>
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Certifications & Compliance" badge={`${mockCertifications.length} Total`} />
                                    <Table aria-label="Certifications" sortDescriptor={certSort} onSortChange={setCertSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Name</Table.Head>
                                                <Table.Head id="category" allowsSorting>Category</Table.Head>
                                                <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                <Table.Head id="expiry" allowsSorting>Expiry Date</Table.Head>
                                                <Table.Head id="actions" className="w-12"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={mockCertifications}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <Award01 className="w-5 h-5 text-tertiary" />
                                                            <span className="font-medium text-primary">{item.name}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><Badge size="sm" color="brand">{item.category}</Badge></Table.Cell>
                                                    <Table.Cell>
                                                        {item.status === "Active" ? (
                                                            <Badge color="success" size="sm">Active</Badge>
                                                        ) : item.status === "Pending" ? (
                                                            <Badge color="warning" size="sm">Pending</Badge>
                                                        ) : (
                                                            <Badge color="error" size="sm">Expired</Badge>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary">
                                                            {item.expiry}
                                                            {item.note && <span className="ml-2 text-warning">{item.note}</span>}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* RFP Tracker Tab */}
                        <Tabs.Panel id="tracker">
                            <div className="flex flex-col gap-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04 title="3" subtitle="Total Active RFPs" change="1" changeTrend="positive" changeDescription="new this week" />
                                    <MetricsChart04 title="5" subtitle="Won This Quarter" change="$450K" changeTrend="positive" changeDescription="total value" />
                                    <MetricsChart04 title="2" subtitle="Lost This Quarter" change="2" changeTrend="negative" changeDescription="total" chartColor="text-fg-error-secondary" />
                                    <MetricsChart04 title="71%" subtitle="Win Rate" change="5%" changeTrend="positive" changeDescription="vs last quarter" />
                                </div>

                                {/* Search */}
                                <div className="flex items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search active proposals..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                </div>

                                {/* Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Active Proposals" badge="3 Total" />
                                    <Table aria-label="RFP Tracker" sortDescriptor={rfpSort} onSortChange={setRfpSort}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="client" isRowHeader allowsSorting>Client / Opportunity</Table.Head>
                                                <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                <Table.Head id="value" allowsSorting>Est. Value</Table.Head>
                                                <Table.Head id="completion" allowsSorting>Completion</Table.Head>
                                                <Table.Head id="dueDate" allowsSorting>Due Date</Table.Head>
                                                <Table.Head id="owner" allowsSorting>Owner</Table.Head>
                                                <Table.Head id="actions" className="w-12"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={mockRfps}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <File05 className="w-5 h-5 text-tertiary" />
                                                            <span className="font-medium text-primary">{item.client}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>{getStatusBadge(item.status)}</Table.Cell>
                                                    <Table.Cell><span className="text-secondary font-medium">{item.value}</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.completion}</span></Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            {getDeadlineIndicator(item.deadline)}
                                                            <span className="text-secondary">{item.dueDate}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.owner}</span></Table.Cell>
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* Answer Bank Tab */}
                        <Tabs.Panel id="answer-bank">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search questions or answers..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <Button size="md" color="primary" iconLeading={Plus}>Add Answer</Button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {mockAnswerBank.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-3 p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge size="sm" color={
                                                            item.category === "Security" ? "error" :
                                                            item.category === "Compliance" ? "brand" :
                                                            item.category === "SLA" ? "warning" :
                                                            item.category === "Technical" ? "blue" :
                                                            "gray"
                                                        }>{item.category}</Badge>
                                                    </div>
                                                    <h3 className="text-md font-semibold text-primary">{item.question}</h3>
                                                    <p className="text-sm text-secondary leading-relaxed">{item.answer}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    iconLeading={Copy01}
                                                    onClick={() => handleCopyAnswer(item.id, item.answer)}
                                                    className="shrink-0"
                                                >
                                                    {copiedId === item.id ? "Copied!" : "Copy"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Tabs.Panel>

                        {/* Quick Downloads Tab */}
                        <Tabs.Panel id="downloads">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Quick Downloads</h2>
                                        <p className="text-sm text-tertiary">Downloadable documents and assets for sales and compliance.</p>
                                    </div>
                                    <Button size="md" color="primary" iconLeading={UploadCloud02}>Upload File</Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {mockDownloads.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-4 p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle shrink-0">
                                                    <File04 className="w-5 h-5 text-tertiary" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-primary">{item.name}</span>
                                                    <span className="text-sm text-tertiary">{item.type} · {item.size}</span>
                                                </div>
                                            </div>
                                            <Button size="sm" color="secondary" iconLeading={DownloadCloud01} className="w-full">Download</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
