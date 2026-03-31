"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
    Trash01,
    Loading02,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Input, InputBase } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Tabs } from "@/components/application/tabs/tabs";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDeadlineIndicator(deadline: number) {
    const now = Date.now();
    const diff = deadline - now;
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return <span title="Overdue">🔴</span>;
    if (days <= 3) return <span title="Due within 3 days">🟡</span>;
    return <span title="On track">🟢</span>;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

// Category definitions
const certCategories = ["certification", "insurance", "award", "accreditation", "compliance", "other"] as const;
const certStatuses = ["active", "expired", "pending", "renewal_required"] as const;
const rfpStatuses = ["draft", "in_progress", "submitted", "won", "lost", "no_bid"] as const;
const downloadCategories = ["capabilities_deck", "security_whitepaper", "compliance_evidence", "insurance_certificate", "case_studies", "partner_overview", "other"] as const;

const rfpStatusLabels: Record<string, string> = {
    draft: "Draft", in_progress: "In Progress", submitted: "Submitted",
    won: "Won", lost: "Lost", no_bid: "No Bid",
};

const certCategoryLabels: Record<string, string> = {
    certification: "Certification", insurance: "Insurance", award: "Award",
    accreditation: "Accreditation", compliance: "Compliance", other: "Other",
};

const certStatusLabels: Record<string, string> = {
    active: "Active", expired: "Expired", pending: "Pending", renewal_required: "Renewal Required",
};

const downloadCatLabels: Record<string, string> = {
    capabilities_deck: "Capabilities Deck", security_whitepaper: "Security Whitepaper",
    compliance_evidence: "Compliance Evidence", insurance_certificate: "Insurance Certificate",
    case_studies: "Case Studies", partner_overview: "Partner Overview", other: "Other",
};

export default function RfpHubPage() {
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // ─── Queries ─────────────────────────────────────────
    const useCases = useQuery(api.rfpHub.listUseCases, companyId ? { companyId } : "skip");
    const certifications = useQuery(api.rfpHub.listCertifications, companyId ? { companyId } : "skip");
    const rfpEntries = useQuery(api.rfpHub.listRfpEntries, companyId ? { companyId } : "skip");
    const rfpAnswers = useQuery(api.rfpHub.listRfpAnswers, companyId ? { companyId } : "skip");
    const rfpDownloads = useQuery(api.rfpHub.listRfpDownloads, companyId ? { companyId } : "skip");

    // ─── Mutations ───────────────────────────────────────
    const createUseCase = useMutation(api.rfpHub.createUseCase);
    const removeUseCase = useMutation(api.rfpHub.removeUseCase);
    const createCertification = useMutation(api.rfpHub.createCertification);
    const removeCertification = useMutation(api.rfpHub.removeCertification);
    const createRfpEntry = useMutation(api.rfpHub.createRfpEntry);
    const removeRfpEntry = useMutation(api.rfpHub.removeRfpEntry);
    const createRfpAnswer = useMutation(api.rfpHub.createRfpAnswer);
    const removeRfpAnswer = useMutation(api.rfpHub.removeRfpAnswer);
    const removeRfpDownload = useMutation(api.rfpHub.removeRfpDownload);

    // ─── Local state ─────────────────────────────────────
    const [rfpSort, setRfpSort] = useState<SortDescriptor>({ column: "submissionDeadline", direction: "ascending" });
    const [useCaseSort, setUseCaseSort] = useState<SortDescriptor>({ column: "title", direction: "ascending" });
    const [certSort, setCertSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filters
    const [industryFilter, setIndustryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [useCaseSearch, setUseCaseSearch] = useState("");
    const [certSearch, setCertSearch] = useState("");
    const [answerSearch, setAnswerSearch] = useState("");

    // Slideout form state — Use Case
    const [ucTitle, setUcTitle] = useState("");
    const [ucIndustry, setUcIndustry] = useState("");
    const [ucProblem, setUcProblem] = useState("");
    const [ucScope, setUcScope] = useState("");
    const [ucHelp, setUcHelp] = useState("");
    const [ucApproved, setUcApproved] = useState(false);
    const [isUcSubmitting, setIsUcSubmitting] = useState(false);

    // Slideout form state — Certification
    const [certName, setCertName] = useState("");
    const [certCategory, setCertCategory] = useState<typeof certCategories[number]>("certification");
    const [certStatus, setCertStatus] = useState<typeof certStatuses[number]>("active");
    const [certAuthority, setCertAuthority] = useState("");
    const [certDesc, setCertDesc] = useState("");
    const [isCertSubmitting, setIsCertSubmitting] = useState(false);

    // Slideout form state — RFP Entry
    const [rfpTitle, setRfpTitle] = useState("");
    const [rfpClient, setRfpClient] = useState("");
    const [rfpDeadline, setRfpDeadline] = useState("");
    const [rfpStatus, setRfpStatus] = useState<typeof rfpStatuses[number]>("draft");
    const [rfpValue, setRfpValue] = useState("");
    const [isRfpSubmitting, setIsRfpSubmitting] = useState(false);

    // Slideout form state — Answer Bank
    const [ansCategory, setAnsCategory] = useState("");
    const [ansAnswer, setAnsAnswer] = useState("");
    const [isAnsSubmitting, setIsAnsSubmitting] = useState(false);

    // ─── Filtered data ───────────────────────────────────
    const filteredUseCases = useMemo(() => {
        if (!useCases) return [];
        let items = [...useCases];
        if (industryFilter !== "all") items = items.filter((u) => u.industry === industryFilter);
        if (statusFilter !== "all") {
            if (statusFilter === "Approved") items = items.filter((u) => u.isApprovedReference);
            else if (statusFilter === "Pending") items = items.filter((u) => !u.isApprovedReference);
        }
        if (useCaseSearch.trim()) {
            const q = useCaseSearch.toLowerCase();
            items = items.filter((u) => u.title.toLowerCase().includes(q) || (u.industry && u.industry.toLowerCase().includes(q)));
        }
        return items;
    }, [useCases, industryFilter, statusFilter, useCaseSearch]);

    const industries = useMemo(() => {
        if (!useCases) return [];
        return Array.from(new Set(useCases.map((u) => u.industry).filter(Boolean))).sort() as string[];
    }, [useCases]);

    const filteredCerts = useMemo(() => {
        if (!certifications) return [];
        if (!certSearch.trim()) return certifications;
        const q = certSearch.toLowerCase();
        return certifications.filter((c) => c.name.toLowerCase().includes(q));
    }, [certifications, certSearch]);

    const filteredAnswers = useMemo(() => {
        if (!rfpAnswers) return [];
        if (!answerSearch.trim()) return rfpAnswers;
        const q = answerSearch.toLowerCase();
        return rfpAnswers.filter((a) =>
            a.questionCategory.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
        );
    }, [rfpAnswers, answerSearch]);

    // RFP stats
    const rfpStats = useMemo(() => {
        if (!rfpEntries) return { active: 0, won: 0, lost: 0, winRate: "0%" };
        const active = rfpEntries.filter((e) => ["draft", "in_progress"].includes(e.status)).length;
        const won = rfpEntries.filter((e) => e.status === "won").length;
        const lost = rfpEntries.filter((e) => e.status === "lost").length;
        const decided = won + lost;
        const winRate = decided > 0 ? `${Math.round((won / decided) * 100)}%` : "—";
        return { active, won, lost, winRate };
    }, [rfpEntries]);

    // ─── Handlers ────────────────────────────────────────
    const handleCopyAnswer = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    async function handleCreateUseCase(close: () => void) {
        if (!companyId || !user || !ucTitle.trim()) return;
        setIsUcSubmitting(true);
        try {
            await createUseCase({
                companyId, createdByUserId: user._id,
                title: ucTitle.trim(), industry: ucIndustry || undefined,
                problemStatement: ucProblem || undefined, scopeOfWork: ucScope || undefined,
                howWeHelp: ucHelp || undefined, isApprovedReference: ucApproved,
            });
            setUcTitle(""); setUcIndustry(""); setUcProblem(""); setUcScope(""); setUcHelp(""); setUcApproved(false);
            close();
        } catch (e) { console.error(e); } finally { setIsUcSubmitting(false); }
    }

    async function handleCreateCert(close: () => void) {
        if (!companyId || !user || !certName.trim()) return;
        setIsCertSubmitting(true);
        try {
            await createCertification({
                companyId, createdByUserId: user._id,
                name: certName.trim(), category: certCategory, status: certStatus,
                issuingAuthority: certAuthority || undefined, description: certDesc || undefined,
            });
            setCertName(""); setCertCategory("certification"); setCertStatus("active"); setCertAuthority(""); setCertDesc("");
            close();
        } catch (e) { console.error(e); } finally { setIsCertSubmitting(false); }
    }

    async function handleCreateRfpEntry(close: () => void) {
        if (!companyId || !user || !rfpTitle.trim() || !rfpClient.trim() || !rfpDeadline) return;
        setIsRfpSubmitting(true);
        try {
            await createRfpEntry({
                companyId, createdByUserId: user._id,
                title: rfpTitle.trim(), clientProspect: rfpClient.trim(),
                submissionDeadline: new Date(rfpDeadline).getTime(), status: rfpStatus,
                estimatedValue: rfpValue ? parseFloat(rfpValue) : undefined,
            });
            setRfpTitle(""); setRfpClient(""); setRfpDeadline(""); setRfpStatus("draft"); setRfpValue("");
            close();
        } catch (e) { console.error(e); } finally { setIsRfpSubmitting(false); }
    }

    async function handleCreateAnswer(close: () => void) {
        if (!companyId || !user || !ansCategory.trim() || !ansAnswer.trim()) return;
        setIsAnsSubmitting(true);
        try {
            await createRfpAnswer({
                companyId, createdByUserId: user._id,
                questionCategory: ansCategory.trim(), answer: ansAnswer.trim(),
            });
            setAnsCategory(""); setAnsAnswer("");
            close();
        } catch (e) { console.error(e); } finally { setIsAnsSubmitting(false); }
    }

    async function handleDeleteUseCase(id: Id<"useCases">) {
        if (!confirm("Delete this use case?")) return;
        try { await removeUseCase({ id }); } catch (e) { console.error(e); }
    }

    async function handleDeleteCert(id: Id<"certifications">) {
        if (!confirm("Delete this certification?")) return;
        try { await removeCertification({ id }); } catch (e) { console.error(e); }
    }

    async function handleDeleteRfp(id: Id<"rfpEntries">) {
        if (!confirm("Delete this RFP entry?")) return;
        try { await removeRfpEntry({ id }); } catch (e) { console.error(e); }
    }

    async function handleDeleteAnswer(id: Id<"rfpAnswers">) {
        if (!confirm("Delete this answer?")) return;
        try { await removeRfpAnswer({ id }); } catch (e) { console.error(e); }
    }

    async function handleDeleteDownload(id: Id<"rfpDownloads">) {
        if (!confirm("Delete this download?")) return;
        try { await removeRfpDownload({ id }); } catch (e) { console.error(e); }
    }

    // ─── Loading ─────────────────────────────────────────
    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    // ─── Slideout helper ─────────────────────────────────
    const formInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
        <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
            />
        </div>
    );

    const formTextarea = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
        <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
            />
        </div>
    );

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl font-semibold text-primary lg:text-display-sm">RFP Hub</h1>
                                <BadgeWithIcon color="success" size="sm" iconLeading={CheckDone01}>
                                    {rfpStats.active} Active RFPs
                                </BadgeWithIcon>
                            </div>
                            <p className="text-md text-tertiary">
                                Generate proposals, track responses, and manage your asset library.
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <Tabs className="w-full">
                        <Tabs.List size="sm" type="button-border" className="mb-6 overflow-x-auto" items={[
                            { id: "use-cases", label: "Use Cases" },
                            { id: "certifications", label: "Certifications" },
                            { id: "tracker", label: "RFP Tracker" },
                            { id: "answer-bank", label: "Answer Bank" },
                            { id: "downloads", label: "Quick Downloads" },
                        ]}>
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        {/* ═══ USE CASES TAB ═══ */}
                        <Tabs.Panel id="use-cases">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-secondary bg-primary p-3 sm:flex-row sm:items-center">
                                        <div className="min-w-0 flex-1">
                                            <InputBase type="text" size="sm" placeholder="Search use cases..." icon={SearchLg} value={useCaseSearch} onChange={(v: string) => setUseCaseSearch(v)} />
                                        </div>
                                        <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
                                        <div className="flex items-center gap-2">
                                            <FilterDropdown
                                                aria-label="Industry"
                                                value={industryFilter}
                                                onChange={setIndustryFilter}
                                                options={[
                                                    { label: "Industry: All", value: "all" },
                                                    ...industries.map((ind) => ({ label: ind, value: ind })),
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
                                                ]}
                                            />
                                        </div>
                                    </div>
                                    <SlideoutMenu.Trigger>
                                        <Button size="md" color="primary" iconLeading={Plus}>New Use Case</Button>
                                        <SlideoutMenu className="max-w-[600px]">
                                            {({ close }) => (
                                                <>
                                                    <SlideoutMenu.Header onClose={close}>
                                                        <h2 className="text-lg font-semibold text-primary">New Use Case</h2>
                                                        <p className="text-sm text-tertiary mt-1">Create a structured use case for sales reference</p>
                                                    </SlideoutMenu.Header>
                                                    <SlideoutMenu.Content>
                                                        <div className="flex flex-col gap-5">
                                                            {formInput("Title", ucTitle, setUcTitle, "e.g. Healthcare Provider – Ransomware Recovery")}
                                                            {formInput("Industry", ucIndustry, setUcIndustry, "e.g. Healthcare")}
                                                            {formTextarea("Problem Statement", ucProblem, setUcProblem, "What problem was solved?")}
                                                            {formTextarea("Scope of Work", ucScope, setUcScope, "What was delivered?")}
                                                            {formTextarea("How We Help", ucHelp, setUcHelp, "How the MSP helped")}
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={ucApproved} onChange={(e) => setUcApproved(e.target.checked)} className="size-4 accent-brand-600" />
                                                                <span className="text-sm text-secondary">Approved Reference</span>
                                                            </label>
                                                        </div>
                                                    </SlideoutMenu.Content>
                                                    <SlideoutMenu.Footer>
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Button color="secondary" onClick={close}>Cancel</Button>
                                                            <Button color="primary" onClick={() => handleCreateUseCase(close)} isDisabled={!ucTitle.trim() || isUcSubmitting}>
                                                                {isUcSubmitting ? "Creating..." : "Create Use Case"}
                                                            </Button>
                                                        </div>
                                                    </SlideoutMenu.Footer>
                                                </>
                                            )}
                                        </SlideoutMenu>
                                    </SlideoutMenu.Trigger>
                                </div>

                                {useCases === undefined ? (
                                    <div className="flex items-center justify-center py-20"><Loading02 className="h-8 w-8 animate-spin text-brand-600" /></div>
                                ) : filteredUseCases.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                        <div className="flex flex-col items-center text-center max-w-sm gap-3">
                                            <Folder className="w-8 h-8 text-tertiary" />
                                            <h3 className="text-lg font-semibold text-primary">No use cases yet</h3>
                                            <p className="text-sm text-tertiary">Create your first use case to start building your reference library.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <TableCard.Root>
                                        <TableCard.Header title="Use Case Library" badge={`${filteredUseCases.length} Total`} />
                                        <div className="overflow-x-auto">
                                        <Table aria-label="Use Cases" sortDescriptor={useCaseSort} onSortChange={setUseCaseSort}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.Head id="title" isRowHeader allowsSorting>Title</Table.Head>
                                                    <Table.Head id="industry" allowsSorting>Industry</Table.Head>
                                                    <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                    <Table.Head id="actions" className="w-12"></Table.Head>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body items={filteredUseCases.map((item) => ({ ...item, id: item._id }))}>
                                                {(item) => (
                                                    <Table.Row id={item.id}>
                                                        <Table.Cell>
                                                            <div className="flex items-center gap-3">
                                                                <Folder className="w-5 h-5 text-tertiary" />
                                                                <span className="font-medium text-primary">{item.title}</span>
                                                            </div>
                                                        </Table.Cell>
                                                        <Table.Cell><Badge size="sm" color="gray">{item.industry || "—"}</Badge></Table.Cell>
                                                        <Table.Cell>
                                                            {item.isApprovedReference
                                                                ? <Badge color="success" size="sm">Approved Reference</Badge>
                                                                : <Badge color="warning" size="sm">Pending Approval</Badge>
                                                            }
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDeleteUseCase(item._id)} />
                                                        </Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                        </div>
                                    </TableCard.Root>
                                )}
                            </div>
                        </Tabs.Panel>

                        {/* ═══ CERTIFICATIONS TAB ═══ */}
                        <Tabs.Panel id="certifications">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search certifications..." className="w-full shadow-sm" icon={SearchLg} value={certSearch} onChange={(v: string) => setCertSearch(v)} />
                                    </div>
                                    <SlideoutMenu.Trigger>
                                        <Button size="md" color="primary" iconLeading={Plus}>Add Certification</Button>
                                        <SlideoutMenu className="max-w-[600px]">
                                            {({ close }) => (
                                                <>
                                                    <SlideoutMenu.Header onClose={close}>
                                                        <h2 className="text-lg font-semibold text-primary">Add Certification</h2>
                                                    </SlideoutMenu.Header>
                                                    <SlideoutMenu.Content>
                                                        <div className="flex flex-col gap-5">
                                                            {formInput("Name", certName, setCertName, "e.g. SOC 2 Type II")}
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Category</label>
                                                                <NativeSelect aria-label="Category" value={certCategory} onChange={(e) => setCertCategory(e.target.value as any)}
                                                                    options={certCategories.map((c) => ({ label: certCategoryLabels[c], value: c }))}
                                                                    className="w-full" selectClassName="text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Status</label>
                                                                <NativeSelect aria-label="Status" value={certStatus} onChange={(e) => setCertStatus(e.target.value as any)}
                                                                    options={certStatuses.map((s) => ({ label: certStatusLabels[s], value: s }))}
                                                                    className="w-full" selectClassName="text-sm"
                                                                />
                                                            </div>
                                                            {formInput("Issuing Authority", certAuthority, setCertAuthority, "e.g. AICPA")}
                                                            {formTextarea("Description", certDesc, setCertDesc, "Details about the certification")}
                                                        </div>
                                                    </SlideoutMenu.Content>
                                                    <SlideoutMenu.Footer>
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Button color="secondary" onClick={close}>Cancel</Button>
                                                            <Button color="primary" onClick={() => handleCreateCert(close)} isDisabled={!certName.trim() || isCertSubmitting}>
                                                                {isCertSubmitting ? "Adding..." : "Add Certification"}
                                                            </Button>
                                                        </div>
                                                    </SlideoutMenu.Footer>
                                                </>
                                            )}
                                        </SlideoutMenu>
                                    </SlideoutMenu.Trigger>
                                </div>

                                {certifications === undefined ? (
                                    <div className="flex items-center justify-center py-20"><Loading02 className="h-8 w-8 animate-spin text-brand-600" /></div>
                                ) : filteredCerts.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                        <div className="flex flex-col items-center text-center max-w-sm gap-3">
                                            <Award01 className="w-8 h-8 text-tertiary" />
                                            <h3 className="text-lg font-semibold text-primary">No certifications yet</h3>
                                            <p className="text-sm text-tertiary">Add your first certification, insurance, or compliance record.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <TableCard.Root>
                                        <TableCard.Header title="Certifications & Compliance" badge={`${filteredCerts.length} Total`} />
                                        <div className="overflow-x-auto">
                                        <Table aria-label="Certifications" sortDescriptor={certSort} onSortChange={setCertSort}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.Head id="name" isRowHeader allowsSorting>Name</Table.Head>
                                                    <Table.Head id="category" allowsSorting>Category</Table.Head>
                                                    <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                    <Table.Head id="expiry" allowsSorting>Expiry</Table.Head>
                                                    <Table.Head id="actions" className="w-12"></Table.Head>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body items={filteredCerts.map((item) => ({ ...item, id: item._id }))}>
                                                {(item) => (
                                                    <Table.Row id={item.id}>
                                                        <Table.Cell>
                                                            <div className="flex items-center gap-3">
                                                                <Award01 className="w-5 h-5 text-tertiary" />
                                                                <span className="font-medium text-primary">{item.name}</span>
                                                            </div>
                                                        </Table.Cell>
                                                        <Table.Cell><Badge size="sm" color="brand">{certCategoryLabels[item.category]}</Badge></Table.Cell>
                                                        <Table.Cell>
                                                            <Badge color={item.status === "active" ? "success" : item.status === "pending" ? "warning" : "error"} size="sm">
                                                                {certStatusLabels[item.status]}
                                                            </Badge>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <span className="text-secondary">
                                                                {item.expiryDate ? formatDate(item.expiryDate) : "No Expiry"}
                                                            </span>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDeleteCert(item._id)} />
                                                        </Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                        </div>
                                    </TableCard.Root>
                                )}
                            </div>
                        </Tabs.Panel>

                        {/* ═══ RFP TRACKER TAB ═══ */}
                        <Tabs.Panel id="tracker">
                            <div className="flex flex-col gap-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricsChart04 title={rfpStats.active.toString()} subtitle="Active RFPs" change={rfpStats.active.toString()} changeTrend="positive" changeDescription="in pipeline" />
                                    <MetricsChart04 title={rfpStats.won.toString()} subtitle="Won" change={rfpStats.won.toString()} changeTrend="positive" changeDescription="total" />
                                    <MetricsChart04 title={rfpStats.lost.toString()} subtitle="Lost" change={rfpStats.lost.toString()} changeTrend="negative" changeDescription="total" chartColor="text-fg-error-secondary" />
                                    <MetricsChart04 title={rfpStats.winRate} subtitle="Win Rate" change="" changeTrend="positive" changeDescription="" />
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search proposals..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <SlideoutMenu.Trigger>
                                        <Button size="md" color="primary" iconLeading={Plus}>New Proposal</Button>
                                        <SlideoutMenu className="max-w-[600px]">
                                            {({ close }) => (
                                                <>
                                                    <SlideoutMenu.Header onClose={close}>
                                                        <h2 className="text-lg font-semibold text-primary">New RFP Entry</h2>
                                                    </SlideoutMenu.Header>
                                                    <SlideoutMenu.Content>
                                                        <div className="flex flex-col gap-5">
                                                            {formInput("RFP Title", rfpTitle, setRfpTitle, "e.g. City of Houston IT Infrastructure")}
                                                            {formInput("Client / Prospect", rfpClient, setRfpClient, "Who issued the RFP?")}
                                                            {formInput("Submission Deadline", rfpDeadline, setRfpDeadline, "", "date")}
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Status</label>
                                                                <NativeSelect aria-label="Status" value={rfpStatus} onChange={(e) => setRfpStatus(e.target.value as any)}
                                                                    options={rfpStatuses.map((s) => ({ label: rfpStatusLabels[s], value: s }))}
                                                                    className="w-full" selectClassName="text-sm"
                                                                />
                                                            </div>
                                                            {formInput("Estimated Value ($)", rfpValue, setRfpValue, "e.g. 125000", "number")}
                                                        </div>
                                                    </SlideoutMenu.Content>
                                                    <SlideoutMenu.Footer>
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Button color="secondary" onClick={close}>Cancel</Button>
                                                            <Button color="primary" onClick={() => handleCreateRfpEntry(close)} isDisabled={!rfpTitle.trim() || !rfpClient.trim() || !rfpDeadline || isRfpSubmitting}>
                                                                {isRfpSubmitting ? "Creating..." : "Create Entry"}
                                                            </Button>
                                                        </div>
                                                    </SlideoutMenu.Footer>
                                                </>
                                            )}
                                        </SlideoutMenu>
                                    </SlideoutMenu.Trigger>
                                </div>

                                {rfpEntries === undefined ? (
                                    <div className="flex items-center justify-center py-20"><Loading02 className="h-8 w-8 animate-spin text-brand-600" /></div>
                                ) : rfpEntries.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                        <div className="flex flex-col items-center text-center max-w-sm gap-3">
                                            <File05 className="w-8 h-8 text-tertiary" />
                                            <h3 className="text-lg font-semibold text-primary">No RFP entries yet</h3>
                                            <p className="text-sm text-tertiary">Create your first RFP entry to start tracking proposals.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <TableCard.Root>
                                        <TableCard.Header title="Active Proposals" badge={`${rfpEntries.length} Total`} />
                                        <div className="overflow-x-auto">
                                        <Table aria-label="RFP Tracker" sortDescriptor={rfpSort} onSortChange={setRfpSort}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.Head id="client" isRowHeader allowsSorting>Client / Opportunity</Table.Head>
                                                    <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                    <Table.Head id="value" allowsSorting>Est. Value</Table.Head>
                                                    <Table.Head id="deadline" allowsSorting>Due Date</Table.Head>
                                                    <Table.Head id="actions" className="w-12"></Table.Head>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body items={rfpEntries.map((item) => ({ ...item, id: item._id }))}>
                                                {(item) => (
                                                    <Table.Row id={item.id}>
                                                        <Table.Cell>
                                                            <div className="flex items-center gap-3">
                                                                <File05 className="w-5 h-5 text-tertiary" />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-primary">{item.title}</span>
                                                                    <span className="text-sm text-tertiary">{item.clientProspect}</span>
                                                                </div>
                                                            </div>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Badge
                                                                color={item.status === "won" ? "success" : item.status === "lost" ? "error" : item.status === "submitted" ? "brand" : item.status === "in_progress" ? "warning" : "gray"}
                                                                size="sm"
                                                            >
                                                                {rfpStatusLabels[item.status]}
                                                            </Badge>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <span className="text-secondary font-medium">
                                                                {item.estimatedValue ? formatCurrency(item.estimatedValue) : "—"}
                                                            </span>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <div className="flex items-center gap-2">
                                                                {getDeadlineIndicator(item.submissionDeadline)}
                                                                <span className="text-secondary">{formatDate(item.submissionDeadline)}</span>
                                                            </div>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDeleteRfp(item._id)} />
                                                        </Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                        </div>
                                    </TableCard.Root>
                                )}
                            </div>
                        </Tabs.Panel>

                        {/* ═══ ANSWER BANK TAB ═══ */}
                        <Tabs.Panel id="answer-bank">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search questions or answers..." className="w-full shadow-sm" icon={SearchLg} value={answerSearch} onChange={(v: string) => setAnswerSearch(v)} />
                                    </div>
                                    <SlideoutMenu.Trigger>
                                        <Button size="md" color="primary" iconLeading={Plus}>Add Answer</Button>
                                        <SlideoutMenu className="max-w-[600px]">
                                            {({ close }) => (
                                                <>
                                                    <SlideoutMenu.Header onClose={close}>
                                                        <h2 className="text-lg font-semibold text-primary">Add RFP Answer</h2>
                                                    </SlideoutMenu.Header>
                                                    <SlideoutMenu.Content>
                                                        <div className="flex flex-col gap-5">
                                                            {formInput("Question / Category", ansCategory, setAnsCategory, "e.g. Describe your incident response procedures")}
                                                            {formTextarea("Answer", ansAnswer, setAnsAnswer, "Your pre-written response...")}
                                                        </div>
                                                    </SlideoutMenu.Content>
                                                    <SlideoutMenu.Footer>
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Button color="secondary" onClick={close}>Cancel</Button>
                                                            <Button color="primary" onClick={() => handleCreateAnswer(close)} isDisabled={!ansCategory.trim() || !ansAnswer.trim() || isAnsSubmitting}>
                                                                {isAnsSubmitting ? "Adding..." : "Add Answer"}
                                                            </Button>
                                                        </div>
                                                    </SlideoutMenu.Footer>
                                                </>
                                            )}
                                        </SlideoutMenu>
                                    </SlideoutMenu.Trigger>
                                </div>

                                {rfpAnswers === undefined ? (
                                    <div className="flex items-center justify-center py-20"><Loading02 className="h-8 w-8 animate-spin text-brand-600" /></div>
                                ) : filteredAnswers.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                        <div className="flex flex-col items-center text-center max-w-sm gap-3">
                                            <Copy01 className="w-8 h-8 text-tertiary" />
                                            <h3 className="text-lg font-semibold text-primary">No answers yet</h3>
                                            <p className="text-sm text-tertiary">Build your answer bank for fast RFP responses.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {filteredAnswers.map((item) => (
                                            <div key={item._id} className="flex flex-col gap-3 p-4 sm:p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                                        <Badge size="sm" color="brand">{item.questionCategory}</Badge>
                                                        <p className="text-sm text-secondary leading-relaxed">{item.answer}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            iconLeading={Copy01}
                                                            onClick={() => handleCopyAnswer(item._id, item.answer)}
                                                        >
                                                            {copiedId === item._id ? "Copied!" : "Copy"}
                                                        </Button>
                                                        <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDeleteAnswer(item._id)} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Tabs.Panel>

                        {/* ═══ QUICK DOWNLOADS TAB ═══ */}
                        <Tabs.Panel id="downloads">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Quick Downloads</h2>
                                        <p className="text-sm text-tertiary">Downloadable documents and assets for sales and compliance.</p>
                                    </div>
                                    <Button size="md" color="primary" iconLeading={UploadCloud02}>Upload File</Button>
                                </div>

                                {rfpDownloads === undefined ? (
                                    <div className="flex items-center justify-center py-20"><Loading02 className="h-8 w-8 animate-spin text-brand-600" /></div>
                                ) : rfpDownloads.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                        <div className="flex flex-col items-center text-center max-w-sm gap-3">
                                            <DownloadCloud01 className="w-8 h-8 text-tertiary" />
                                            <h3 className="text-lg font-semibold text-primary">No downloads yet</h3>
                                            <p className="text-sm text-tertiary">Upload capabilities decks, whitepapers, and compliance documents.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {rfpDownloads.map((item) => (
                                            <div key={item._id} className="flex flex-col gap-4 p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle shrink-0">
                                                        <File04 className="w-5 h-5 text-tertiary" />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 flex-1">
                                                        <span className="font-semibold text-primary">{item.name}</span>
                                                        <span className="text-sm text-tertiary">
                                                            {downloadCatLabels[item.category] || item.category}
                                                            {item.fileSize ? ` · ${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
                                                        </span>
                                                    </div>
                                                    <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDeleteDownload(item._id)} />
                                                </div>
                                                <Button size="sm" color="secondary" iconLeading={DownloadCloud01} className="w-full" onClick={() => window.open(item.fileUrl, "_blank")}>
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
