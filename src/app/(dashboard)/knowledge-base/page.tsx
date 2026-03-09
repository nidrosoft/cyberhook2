"use client";

import React, { useState } from "react";
import {
    Plus,
    SearchLg,
    Globe01,
    HelpCircle,
    File04,
    Database01,
    DotsVertical,
    File05,
    Settings01,
    UploadCloud02,
    Edit01,
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

const mockSources = [
    { id: "1", name: "Company Pricing Page", type: "Web Crawler", added: "Jan 12, 2026", status: "Active", scope: "Global", url: "https://acme-corp.com/pricing", documents: 12 },
    { id: "2", name: "Q4 Objection Handling", type: "FAQ", added: "Feb 05, 2026", status: "Active", scope: "Global", url: "45 entries", documents: 45 },
    { id: "3", name: "SOC2 Compliance Report", type: "File Upload", added: "Mar 01, 2026", status: "Active", scope: "Global", url: "SOC2_2024.pdf", documents: 1 },
    { id: "4", name: "Competitor Battlecards", type: "Rich Text", added: "Dec 18, 2025", status: "Active", scope: "Global", url: "", documents: 8 },
    { id: "5", name: "CEO Cold Email Template", type: "Rich Text", added: "Jan 25, 2026", status: "Active", scope: "Personal", url: "", documents: 1 },
    { id: "6", name: "Product Demo Script", type: "Rich Text", added: "Feb 14, 2026", status: "Active", scope: "Personal", url: "", documents: 1 },
    { id: "7", name: "HIPAA FAQ Sheet", type: "FAQ", added: "Feb 28, 2026", status: "Active", scope: "Global", url: "12 entries", documents: 12 },
    { id: "8", name: "Security Architecture Diagram", type: "File Upload", added: "Mar 05, 2026", status: "Processing", scope: "Personal", url: "security_arch.pdf", documents: 1 },
];

const kbSourceTypes = ["Web Crawler", "FAQ", "Rich Text", "File Upload"] as const;
type KbSourceType = (typeof kbSourceTypes)[number];

export default function KnowledgeBasePage() {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "added",
        direction: "descending",
    });

    // Add Source slideout state
    const [kbSourceType, setKbSourceType] = useState<KbSourceType>("Web Crawler");
    const [kbSourceName, setKbSourceName] = useState("");
    const [kbScope, setKbScope] = useState<"Global" | "Personal">("Global");
    const [kbUrl, setKbUrl] = useState("");
    const [kbQuestion, setKbQuestion] = useState("");
    const [kbAnswer, setKbAnswer] = useState("");
    const [kbRichContent, setKbRichContent] = useState("");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Active": return <Badge color="success" size="sm">Active</Badge>;
            case "Processing": return <Badge color="warning" size="sm">Processing</Badge>;
            default: return <Badge color="gray" size="sm">{status}</Badge>;
        }
    };

    const getScopeBadge = (scope: string) => {
        switch (scope) {
            case "Global": return <Badge color="brand" size="sm">Global</Badge>;
            case "Personal": return <Badge color="gray" size="sm">Personal</Badge>;
            default: return <Badge color="gray" size="sm">{scope}</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "Web Crawler": return <Globe01 className="w-5 h-5 text-tertiary" />;
            case "FAQ": return <HelpCircle className="w-5 h-5 text-tertiary" />;
            case "File Upload": return <File04 className="w-5 h-5 text-tertiary" />;
            case "Rich Text": return <Edit01 className="w-5 h-5 text-tertiary" />;
            default: return <Database01 className="w-5 h-5 text-tertiary" />;
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-display-sm font-semibold text-primary">Knowledge Base</h1>
                                <BadgeWithIcon color="brand" size="sm" iconLeading={Database01}>{mockSources.length} Sources</BadgeWithIcon>
                            </div>
                            <p className="text-md text-tertiary">
                                Train your AI Agents by adding data sources, FAQs, and files.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button size="md" color="secondary" iconLeading={Settings01}>Settings</Button>
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
                                                        <div className="flex rounded-lg border border-secondary overflow-hidden">
                                                            {kbSourceTypes.map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => setKbSourceType(type)}
                                                                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${kbSourceType === type ? "bg-brand-solid text-white" : "bg-primary text-secondary hover:bg-secondary_subtle"}`}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Source Name - always shown */}
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

                                                    {/* Scope - always shown */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="block text-sm font-medium text-secondary">Scope</label>
                                                        <NativeSelect
                                                            aria-label="Scope"
                                                            value={kbScope}
                                                            onChange={(e) => setKbScope(e.target.value as "Global" | "Personal")}
                                                            options={[
                                                                { label: "Global", value: "Global" },
                                                                { label: "Personal", value: "Personal" },
                                                            ]}
                                                            className="w-full"
                                                            selectClassName="text-sm"
                                                        />
                                                    </div>

                                                    {/* Type-specific fields */}
                                                    {kbSourceType === "Web Crawler" && (
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
                                                                <Button color="primary" size="md">Extract Data</Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {kbSourceType === "FAQ" && (
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
                                                                <span className="text-xs text-tertiary mt-1">{(kbQuestion.length)}/1000</span>
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
                                                                <span className="text-xs text-tertiary mt-1">{(kbAnswer.length)}/1000</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {kbSourceType === "Rich Text" && (
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

                                                    {kbSourceType === "File Upload" && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-secondary mb-1.5">Upload Files</label>
                                                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-secondary bg-secondary_subtle px-6 py-6">
                                                                <span className="text-sm font-medium text-secondary">Drop files here or browse</span>
                                                                <span className="text-xs text-tertiary">Supports PDF, DOC, DOCX</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </SlideoutMenu.Content>
                                            <SlideoutMenu.Footer>
                                                <div className="flex items-center justify-end gap-3">
                                                    <Button color="secondary" onClick={close}>Cancel</Button>
                                                    <Button color="primary" onClick={close}>Add Source</Button>
                                                </div>
                                            </SlideoutMenu.Footer>
                                        </>
                                    )}
                                </SlideoutMenu>
                            </SlideoutMenu.Trigger>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <Tabs className="w-full">
                        <Tabs.List size="sm" type="button-border" className="mb-6" items={[
                            { id: "all", label: "All Sources" },
                            { id: "web", label: "Web Crawler" },
                            { id: "faq", label: "FAQs" },
                            { id: "files", label: "Files" },
                            { id: "richtext", label: "Rich Text" },
                        ]}>
                            {(item) => <Tabs.Item key={item.id} id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        <Tabs.Panel id="all">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full sm:max-w-md">
                                        <InputBase type="text" size="md" placeholder="Search knowledge sources..." className="w-full shadow-sm" icon={SearchLg} />
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Button size="md" color="secondary">Filters</Button>
                                    </div>
                                </div>

                                <TableCard.Root>
                                    <TableCard.Header title="Knowledge Sources" badge={`${mockSources.length} Total`} />
                                    <Table aria-label="Knowledge Sources" sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader allowsSorting>Source Name</Table.Head>
                                                <Table.Head id="type" allowsSorting>Type</Table.Head>
                                                <Table.Head id="status" allowsSorting>Status</Table.Head>
                                                <Table.Head id="scope" allowsSorting>Scope</Table.Head>
                                                <Table.Head id="documents" allowsSorting>Docs Learned</Table.Head>
                                                <Table.Head id="added" allowsSorting>Date Added</Table.Head>
                                                <Table.Head id="actions" className="w-12"></Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={mockSources}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                                                {getTypeIcon(item.type)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-primary">{item.name}</span>
                                                                {item.url && <span className="text-sm text-tertiary truncate max-w-[200px]">{item.url}</span>}
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.type}</span></Table.Cell>
                                                    <Table.Cell>{getStatusBadge(item.status)}</Table.Cell>
                                                    <Table.Cell>{getScopeBadge(item.scope)}</Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.documents} files</span></Table.Cell>
                                                    <Table.Cell><span className="text-secondary">{item.added}</span></Table.Cell>
                                                    <Table.Cell><ButtonUtility size="sm" icon={DotsVertical} aria-label="Row actions" /></Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        <Tabs.Panel id="web">
                            <div className="flex items-center justify-center py-24 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                <div className="flex flex-col items-center text-center max-w-sm gap-4">
                                    <div className="p-3 bg-primary border border-secondary rounded-lg shadow-sm">
                                        <Globe01 className="w-6 h-6 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">Web Crawler</h3>
                                    <p className="text-sm text-tertiary">Add your company's website or specific pages. The crawler will read all links automatically and update periodically.</p>
                                    <Button color="primary" iconLeading={Plus} className="mt-2">Start Crawler</Button>
                                </div>
                            </div>
                        </Tabs.Panel>

                        <Tabs.Panel id="faq">
                            <div className="flex items-center justify-center py-24 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                <div className="flex flex-col items-center text-center max-w-sm gap-4">
                                    <div className="p-3 bg-primary border border-secondary rounded-lg shadow-sm">
                                        <HelpCircle className="w-6 h-6 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">Q&A Knowledge</h3>
                                    <p className="text-sm text-tertiary">Directly teach the AI how to answer specific questions, objections, or competitor challenges.</p>
                                    <Button color="primary" iconLeading={Plus} className="mt-2">Add Q&A Pair</Button>
                                </div>
                            </div>
                        </Tabs.Panel>

                        <Tabs.Panel id="files">
                            <div className="flex items-center justify-center py-24 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                <div className="flex flex-col items-center text-center max-w-sm gap-4">
                                    <div className="p-3 bg-primary border border-secondary rounded-lg shadow-sm">
                                        <UploadCloud02 className="w-6 h-6 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">Upload Files</h3>
                                    <p className="text-sm text-tertiary">Drag and drop PDFs, docs, spreadsheets, or sales literature to power AI intelligence.</p>
                                    <Button color="primary" iconLeading={Plus} className="mt-2">Upload Files</Button>
                                </div>
                            </div>
                        </Tabs.Panel>

                        <Tabs.Panel id="richtext">
                            <div className="flex items-center justify-center py-24 border border-dashed border-secondary rounded-xl bg-secondary_subtle">
                                <div className="flex flex-col items-center text-center max-w-sm gap-4">
                                    <div className="p-3 bg-primary border border-secondary rounded-lg shadow-sm">
                                        <Edit01 className="w-6 h-6 text-brand-secondary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">Rich Text Templates</h3>
                                    <p className="text-sm text-tertiary">Create named rich text entries with formatting for email templates, scripts, and reusable content.</p>
                                    <Button color="primary" iconLeading={Plus} className="mt-2">Create Template</Button>
                                </div>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
