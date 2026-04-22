"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
import {
    Plus,
    SearchLg,
    Globe01,
    HelpCircle,
    File04,
    Database01,
    DotsVertical,
    Settings01,
    UploadCloud02,
    Edit01,
    Trash01,
    Loading02,
    Eye,
    Copy01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Tabs } from "@/components/application/tabs/tabs";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type KbType = "web_crawler" | "faq" | "rich_text" | "file_upload";
type KbScope = "global" | "personal";

const typeLabels: Record<KbType, string> = {
    web_crawler: "Web Crawler",
    faq: "FAQ",
    rich_text: "Rich Text",
    file_upload: "File Upload",
};

function formatRelativeDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getTypeIcon(type: string) {
    switch (type) {
        case "web_crawler": return <Globe01 className="w-5 h-5 text-tertiary" />;
        case "faq": return <HelpCircle className="w-5 h-5 text-tertiary" />;
        case "file_upload": return <File04 className="w-5 h-5 text-tertiary" />;
        case "rich_text": return <Edit01 className="w-5 h-5 text-tertiary" />;
        default: return <Database01 className="w-5 h-5 text-tertiary" />;
    }
}

export default function KnowledgeBasePage() {
    const router = useRouter();
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // ─── Queries ─────────────────────────────────────────────────────
    const allEntries = useQuery(
        api.knowledgeBase.list,
        companyId ? { companyId } : "skip"
    );
    const stats = useQuery(
        api.knowledgeBase.getStats,
        companyId ? { companyId } : "skip"
    );

    // ─── Mutations & Actions ─────────────────────────────────────────
    const createEntry = useMutation(api.knowledgeBase.create);
    const removeEntry = useMutation(api.knowledgeBase.remove);
    const extractFromUrl = useAction(api.knowledgeBase.extractFromUrl);
    // Seeds the canonical cadence templates (orange item 4.2). Idempotent.
    const seedTemplates = useMutation(api.knowledgeBase.seedStarterTemplates);

    // ─── Local state ─────────────────────────────────────────────────
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "createdAt",
        direction: "descending",
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("all");

    // Add Source slideout state
    const [kbSourceType, setKbSourceType] = useState<KbType>("web_crawler");
    const [kbSourceName, setKbSourceName] = useState("");
    const [kbScope, setKbScope] = useState<KbScope>("global");
    const [kbUrl, setKbUrl] = useState("");
    const [kbQuestion, setKbQuestion] = useState("");
    const [kbAnswer, setKbAnswer] = useState("");
    const [kbRichContent, setKbRichContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [kbFileName, setKbFileName] = useState("");
    const [kbFileContent, setKbFileContent] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // ─── Derived data ────────────────────────────────────────────────
    const filteredEntries = useMemo(() => {
        if (!allEntries) return [];
        let items = [...allEntries];

        // Tab type filter
        if (activeTab !== "all") {
            const typeMap: Record<string, KbType> = {
                web: "web_crawler",
                faq: "faq",
                richtext: "rich_text",
                files: "file_upload",
            };
            const filterType = typeMap[activeTab];
            if (filterType) {
                items = items.filter((e) => e.type === filterType);
            }
        }

        // Scope filter
        if (scopeFilter !== "all") {
            items = items.filter((e) => e.scope === scopeFilter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(
                (e) =>
                    e.name.toLowerCase().includes(q) ||
                    (e.url && e.url.toLowerCase().includes(q)) ||
                    (e.question && e.question.toLowerCase().includes(q))
            );
        }

        return items;
    }, [allEntries, activeTab, scopeFilter, searchQuery]);

    // ─── Handlers ────────────────────────────────────────────────────
    function resetForm() {
        setKbSourceType("web_crawler");
        setKbSourceName("");
        setKbScope("global");
        setKbUrl("");
        setKbQuestion("");
        setKbAnswer("");
        setKbRichContent("");
        setKbFileName("");
        setKbFileContent("");
        setIsExtracting(false);
    }

    async function handleExtractData() {
        const trimmedUrl = kbUrl.trim();
        if (!trimmedUrl) { toast.error("Enter a URL first"); return; }

        if (!trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("http://")) {
            toast.error("URL must start with https:// or http://");
            return;
        }

        try {
            new URL(trimmedUrl);
        } catch {
            toast.error("Invalid URL format — please check and try again");
            return;
        }

        setIsExtracting(true);
        try {
            const result = await extractFromUrl({ url: trimmedUrl });
            if (result.success) {
                setKbRichContent(result.content);
                toast.success(`Content extracted — ${result.content.length.toLocaleString()} characters`);
            } else {
                toast.error(result.error || "Failed to extract content from URL", {
                    duration: 6000,
                    description: "Check the URL and try again, or use Rich Text to paste content manually.",
                });
            }
        } catch (error) {
            toast.error("Extraction failed — an unexpected error occurred", {
                duration: 6000,
                description: error instanceof Error ? error.message : "Please try again or use a different URL.",
            });
        } finally {
            setIsExtracting(false);
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) { toast.error("File too large. Maximum 5 MB."); return; }

        setKbFileName(file.name);

        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setKbFileContent(text.slice(0, 15000));
                toast.success(`"${file.name}" loaded`);
            };
            reader.readAsText(file);
        } else {
            setKbFileContent(`[File: ${file.name}]\nType: ${file.type || "unknown"}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nBinary file content stored. For full text extraction, use a text-based format (.txt, .md, .csv).`);
            toast.success(`"${file.name}" attached`);
        }
    }

    async function handleAddSource(close: () => void) {
        if (!companyId || !user || !kbSourceName.trim()) return;

        if (kbSourceType === "faq" && (!kbQuestion.trim() || !kbAnswer.trim())) {
            toast.error("Please fill in both the question and answer"); return;
        }
        if (kbSourceType === "rich_text" && !kbRichContent.trim()) {
            toast.error("Please enter some content"); return;
        }
        if (kbSourceType === "web_crawler" && !kbUrl.trim()) {
            toast.error("Please enter a URL"); return;
        }
        if (kbSourceType === "web_crawler" && !kbRichContent.trim()) {
            toast.error("Please extract content from the URL first"); return;
        }
        if (kbSourceType === "file_upload" && !kbFileContent) {
            toast.error("Please select a file to upload"); return;
        }

        setIsSubmitting(true);
        try {
            await createEntry({
                companyId,
                createdByUserId: user._id,
                name: kbSourceName.trim(),
                type: kbSourceType,
                scope: kbScope,
                ...(kbSourceType === "web_crawler" && {
                    url: kbUrl.trim(),
                    crawledContent: kbRichContent || undefined,
                }),
                ...(kbSourceType === "faq" && {
                    question: kbQuestion.trim(),
                    answer: kbAnswer.trim(),
                }),
                ...(kbSourceType === "rich_text" && {
                    richTextContent: kbRichContent,
                }),
                ...(kbSourceType === "file_upload" && {
                    fileName: kbFileName,
                    richTextContent: kbFileContent,
                }),
            });
            toast.success(`"${kbSourceName.trim()}" added to Knowledge Base`);
            resetForm();
            close();
        } catch (error) {
            devError("Failed to add source:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add source");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(id: Id<"knowledgeBaseEntries">) {
        try {
            await removeEntry({ id });
            toast.success("Entry deleted");
        } catch (error) {
            devError("Failed to delete:", error);
            toast.error("Failed to delete entry");
        }
    }

    // ─── Loading state ───────────────────────────────────────────────
    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    const kbSourceTypes: KbType[] = ["web_crawler", "faq", "rich_text", "file_upload"];

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-md font-semibold text-primary mb-2">Delete Entry</h3>
                        <p className="text-sm text-secondary mb-6">Are you sure you want to delete this knowledge base entry?</p>
                        <div className="flex items-center justify-end gap-3">
                            <Button color="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button color="primary-destructive" size="sm" onClick={() => { handleDelete(confirmDeleteId as Id<"knowledgeBaseEntries">); setConfirmDeleteId(null); }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl font-semibold text-primary lg:text-display-sm">Knowledge Base</h1>
                                <BadgeWithIcon color="brand" size="sm" iconLeading={Database01}>
                                    {stats?.total ?? 0} Sources
                                </BadgeWithIcon>
                            </div>
                            <p className="text-md text-tertiary">
                                Train your AI Agents by adding data sources, FAQs, and files.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                size="md"
                                color="secondary"
                                onClick={async () => {
                                    if (!companyId) return;
                                    try {
                                        const r = await seedTemplates({ companyId });
                                        toast.success(`Seeded ${r.created} cadence templates (${r.skipped} already existed)`);
                                    } catch (err) {
                                        toast.error(err instanceof Error ? err.message : "Failed to seed templates");
                                    }
                                }}
                            >
                                Seed Cadence Templates
                            </Button>
                            <SlideoutMenu.Trigger>
                                <Button size="md" color="primary" iconLeading={Plus}>Add Source</Button>
                                <SlideoutMenu className="max-w-[600px]">
                                    {({ close }) => (
                                        <>
                                            <SlideoutMenu.Header onClose={close}>
                                                <h2 className="text-lg font-semibold text-primary">Add Knowledge Source</h2>
                                                <p className="text-sm text-tertiary mt-1">Add a new source to train your AI agents</p>
                                            </SlideoutMenu.Header>
                                            <SlideoutMenu.Content>
                                                <div className="flex flex-col gap-6">
                                                    {/* Source Type Selector */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1.5">Source Type</label>
                                                        <div className="grid grid-cols-2 gap-px rounded-lg border border-secondary overflow-hidden sm:flex">
                                                            {kbSourceTypes.map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => setKbSourceType(type)}
                                                                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${kbSourceType === type ? "bg-brand-solid text-white" : "bg-primary text-secondary hover:bg-secondary_subtle"}`}
                                                                >
                                                                    {typeLabels[type]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Source Name */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1.5">Source Name</label>
                                                        <input
                                                            type="text"
                                                            value={kbSourceName}
                                                            onChange={(e) => setKbSourceName(e.target.value)}
                                                            placeholder="e.g. Company Pricing Page"
                                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                        />
                                                    </div>

                                                    {/* Type-specific fields */}
                                                    {kbSourceType === "web_crawler" && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">URL</label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="url"
                                                                        value={kbUrl}
                                                                        onChange={(e) => setKbUrl(e.target.value)}
                                                                        placeholder="https://example.com"
                                                                        className="flex-1 rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                                    />
                                                                    <Button color="primary" size="md" onClick={handleExtractData} isDisabled={isExtracting || !kbUrl.trim()}>
                                                                        {isExtracting ? "Extracting..." : "Extract Data"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            {kbRichContent && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Extracted Content</label>
                                                                    <textarea
                                                                        value={kbRichContent}
                                                                        onChange={(e) => setKbRichContent(e.target.value)}
                                                                        rows={10}
                                                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary font-mono text-xs"
                                                                    />
                                                                    <span className="text-xs text-tertiary mt-1">{kbRichContent.length.toLocaleString()} characters extracted</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {kbSourceType === "faq" && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Question</label>
                                                                <textarea
                                                                    value={kbQuestion}
                                                                    onChange={(e) => setKbQuestion(e.target.value)}
                                                                    placeholder="Enter the question..."
                                                                    maxLength={1000}
                                                                    rows={4}
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                                />
                                                                <span className="text-xs text-tertiary mt-1">{kbQuestion.length}/1000</span>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Answer</label>
                                                                <textarea
                                                                    value={kbAnswer}
                                                                    onChange={(e) => setKbAnswer(e.target.value)}
                                                                    placeholder="Enter the answer..."
                                                                    maxLength={1000}
                                                                    rows={4}
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                                />
                                                                <span className="text-xs text-tertiary mt-1">{kbAnswer.length}/1000</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {kbSourceType === "rich_text" && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-secondary mb-1.5">Content</label>
                                                            <textarea
                                                                value={kbRichContent}
                                                                onChange={(e) => setKbRichContent(e.target.value)}
                                                                placeholder="Enter your content..."
                                                                rows={8}
                                                                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                            />
                                                        </div>
                                                    )}

                                                    {kbSourceType === "file_upload" && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-secondary mb-1.5">Upload File</label>
                                                            <div
                                                                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-secondary bg-secondary_subtle px-6 py-6 cursor-pointer hover:border-brand-400 transition-colors"
                                                                onClick={() => fileInputRef.current?.click()}
                                                            >
                                                                <UploadCloud02 className="w-8 h-8 text-tertiary" />
                                                                {kbFileName ? (
                                                                    <>
                                                                        <span className="text-sm font-medium text-primary">{kbFileName}</span>
                                                                        <span className="text-xs text-success-600">File loaded — click to change</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-sm font-medium text-secondary">Click to select a file</span>
                                                                        <span className="text-xs text-tertiary">TXT, MD, CSV, PDF, DOC, DOCX (max 5 MB)</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                accept=".txt,.md,.csv,.pdf,.doc,.docx"
                                                                className="hidden"
                                                                onChange={handleFileSelect}
                                                            />
                                                            {kbFileContent && (
                                                                <div className="mt-3">
                                                                    <label className="block text-xs font-medium text-tertiary mb-1">File Preview</label>
                                                                    <pre className="w-full max-h-[200px] overflow-y-auto rounded-lg border border-secondary bg-secondary_subtle p-3 text-xs text-secondary whitespace-pre-wrap">
                                                                        {kbFileContent.slice(0, 2000)}{kbFileContent.length > 2000 ? "\n\n... (truncated)" : ""}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Scope */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="block text-sm font-medium text-secondary">Scope</label>
                                                        <NativeSelect
                                                            aria-label="Scope"
                                                            value={kbScope}
                                                            onChange={(e) => setKbScope(e.target.value as KbScope)}
                                                            options={[
                                                                { label: "Global (all team members)", value: "global" },
                                                                { label: "Personal (only me)", value: "personal" },
                                                            ]}
                                                            className="w-full"
                                                            selectClassName="text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </SlideoutMenu.Content>
                                            <SlideoutMenu.Footer>
                                                <div className="flex items-center justify-end gap-3">
                                                    <Button color="secondary" onClick={() => { resetForm(); close(); }}>Cancel</Button>
                                                    <Button
                                                        color="primary"
                                                        onClick={() => handleAddSource(close)}
                                                        isDisabled={!kbSourceName.trim() || isSubmitting}
                                                    >
                                                        {isSubmitting ? "Adding..." : "Add Source"}
                                                    </Button>
                                                </div>
                                            </SlideoutMenu.Footer>
                                        </>
                                    )}
                                </SlideoutMenu>
                            </SlideoutMenu.Trigger>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricsChart04
                            title={(stats?.total ?? 0).toString()}
                            subtitle="Total Sources"
                            change={(stats?.byScope?.global ?? 0).toString()}
                            changeTrend="positive"
                            changeDescription="global"
                            actions={false}
                        />
                        <MetricsChart04
                            title={(stats?.byType?.web_crawler ?? 0).toString()}
                            subtitle="Web Crawlers"
                            change={(stats?.byType?.web_crawler ?? 0).toString()}
                            changeTrend="positive"
                            changeDescription="active"
                            actions={false}
                        />
                        <MetricsChart04
                            title={(stats?.byType?.faq ?? 0).toString()}
                            subtitle="FAQ Entries"
                            change={(stats?.byType?.faq ?? 0).toString()}
                            changeTrend="positive"
                            changeDescription="pairs"
                            actions={false}
                        />
                        <MetricsChart04
                            title={((stats?.byType?.rich_text ?? 0) + (stats?.byType?.file_upload ?? 0)).toString()}
                            subtitle="Documents & Files"
                            change={(stats?.byType?.file_upload ?? 0).toString()}
                            changeTrend="positive"
                            changeDescription="files uploaded"
                            actions={false}
                        />
                    </div>

                    {/* Main Content Area */}
                    <Tabs className="w-full" onSelectionChange={(key) => setActiveTab(key as string)}>
                        <Tabs.List size="sm" type="button-border" className="mb-6 overflow-x-auto" items={[
                            { id: "all", label: "All Sources" },
                            { id: "web", label: "Web Crawler" },
                            { id: "faq", label: "FAQs" },
                            { id: "files", label: "Files" },
                            { id: "richtext", label: "Rich Text" },
                        ]}>
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        {/* All tabs share the same content — just filtered differently */}
                        {["all", "web", "faq", "files", "richtext"].map((tabId) => (
                            <Tabs.Panel key={tabId} id={tabId}>
                                <div className="flex flex-col gap-6">
                                    {/* Search & Filters */}
                                    <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-3 sm:flex-row sm:items-center">
                                        <div className="min-w-0 flex-1">
                                            <InputBase
                                                type="text"
                                                size="sm"
                                                placeholder="Search knowledge sources..."
                                                icon={SearchLg}
                                                value={searchQuery}
                                                onChange={(v: string) => setSearchQuery(v)}
                                            />
                                        </div>
                                        <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
                                        <FilterDropdown
                                            aria-label="Scope"
                                            value={scopeFilter}
                                            onChange={setScopeFilter}
                                            options={[
                                                { label: "Scope: All", value: "all" },
                                                { label: "Global", value: "global" },
                                                { label: "Personal", value: "personal" },
                                            ]}
                                        />
                                    </div>

                                    {/* Loading state */}
                                    {allEntries === undefined ? (
                                        <div className="flex items-center justify-center py-24">
                                            <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
                                        </div>
                                    ) : filteredEntries.length === 0 ? (
                                        /* Empty state */
                                        <div className="flex items-center justify-center py-24 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                            <div className="flex flex-col items-center text-center max-w-sm gap-4">
                                                <div className="p-3 bg-primary border border-secondary rounded-lg shadow-sm">
                                                    {tabId === "web" ? <Globe01 className="w-6 h-6 text-brand-secondary" /> :
                                                     tabId === "faq" ? <HelpCircle className="w-6 h-6 text-brand-secondary" /> :
                                                     tabId === "files" ? <UploadCloud02 className="w-6 h-6 text-brand-secondary" /> :
                                                     tabId === "richtext" ? <Edit01 className="w-6 h-6 text-brand-secondary" /> :
                                                     <Database01 className="w-6 h-6 text-brand-secondary" />}
                                                </div>
                                                <h3 className="text-lg font-semibold text-primary">
                                                    {searchQuery || scopeFilter !== "all" ? "No matching sources" : "No sources yet"}
                                                </h3>
                                                <p className="text-sm text-tertiary">
                                                    {searchQuery || scopeFilter !== "all"
                                                        ? "Try adjusting your search or filters."
                                                        : "Add your first knowledge source to start training your AI agents."
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Data table */
                                        <TableCard.Root>
                                            <TableCard.Header title="Knowledge Sources" badge={`${filteredEntries.length} Total`} />
                                            <div className="overflow-x-auto">
                                            <Table aria-label="Knowledge Sources" sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}>
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.Head id="name" isRowHeader allowsSorting>Source Name</Table.Head>
                                                        <Table.Head id="type" allowsSorting>Type</Table.Head>
                                                        <Table.Head id="scope" allowsSorting>Scope</Table.Head>
                                                        <Table.Head id="createdAt" allowsSorting>Date Added</Table.Head>
                                                        <Table.Head id="actions" className="w-20">Actions</Table.Head>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body items={filteredEntries.map((item) => ({ ...item, id: item._id }))}>
                                                    {(item) => (
                                                        <Table.Row id={item.id} className="cursor-pointer" onAction={() => router.push(`/knowledge-base/${item._id}`)}>
                                                            <Table.Cell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                                                        {getTypeIcon(item.type)}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-primary">{item.name}</span>
                                                                        {item.type === "web_crawler" && item.url && (
                                                                            <span className="text-sm text-tertiary truncate max-w-[200px]">{item.url}</span>
                                                                        )}
                                                                        {item.type === "faq" && item.question && (
                                                                            <span className="text-sm text-tertiary truncate max-w-[200px]">{item.question}</span>
                                                                        )}
                                                                        {item.type === "file_upload" && item.fileName && (
                                                                            <span className="text-sm text-tertiary truncate max-w-[200px]">{item.fileName}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <Badge color="gray" size="sm">{typeLabels[item.type as KbType] || item.type}</Badge>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <Badge color={item.scope === "global" ? "brand" : "gray"} size="sm">
                                                                    {item.scope === "global" ? "Global" : "Personal"}
                                                                </Badge>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <span className="text-secondary">{formatRelativeDate(item.createdAt)}</span>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                                    <ButtonUtility
                                                                        size="sm"
                                                                        color="tertiary"
                                                                        icon={Eye}
                                                                        aria-label="View"
                                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/knowledge-base/${item._id}`); }}
                                                                    />
                                                                    <ButtonUtility
                                                                        size="sm"
                                                                        color="tertiary"
                                                                        icon={Trash01}
                                                                        aria-label="Delete"
                                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setConfirmDeleteId(item._id); }}
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
                                </div>
                            </Tabs.Panel>
                        ))}
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
