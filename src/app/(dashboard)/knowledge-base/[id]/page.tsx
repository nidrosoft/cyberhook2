"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import {
    ArrowLeft,
    Globe01,
    HelpCircle,
    File04,
    Edit01,
    Trash01,
    Loading02,
    Save01,
    Copy01,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type KbType = "web_crawler" | "faq" | "rich_text" | "file_upload";

const typeLabels: Record<KbType, string> = {
    web_crawler: "Web Crawler",
    faq: "FAQ",
    rich_text: "Rich Text",
    file_upload: "File Upload",
};

function getTypeIcon(type: string) {
    switch (type) {
        case "web_crawler": return <Globe01 className="w-6 h-6 text-brand-secondary" />;
        case "faq": return <HelpCircle className="w-6 h-6 text-brand-secondary" />;
        case "file_upload": return <File04 className="w-6 h-6 text-brand-secondary" />;
        case "rich_text": return <Edit01 className="w-6 h-6 text-brand-secondary" />;
        default: return null;
    }
}

export default function KnowledgeBaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isLoading: isUserLoading } = useCurrentUser();

    const entryId = params.id as Id<"knowledgeBaseEntries">;
    const entry = useQuery(api.knowledgeBase.getById, entryId ? { id: entryId } : "skip");
    const updateEntry = useMutation(api.knowledgeBase.update);
    const removeEntry = useMutation(api.knowledgeBase.remove);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editScope, setEditScope] = useState<"global" | "personal">("global");
    const [editUrl, setEditUrl] = useState("");
    const [editQuestion, setEditQuestion] = useState("");
    const [editAnswer, setEditAnswer] = useState("");
    const [editRichContent, setEditRichContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    function startEditing() {
        if (!entry) return;
        setEditName(entry.name);
        setEditScope(entry.scope);
        setEditUrl(entry.url || "");
        setEditQuestion(entry.question || "");
        setEditAnswer(entry.answer || "");
        setEditRichContent(entry.richTextContent || "");
        setIsEditing(true);
    }

    async function handleSave() {
        if (!entry) return;
        setIsSaving(true);
        try {
            await updateEntry({
                id: entry._id,
                name: editName.trim(),
                scope: editScope,
                ...(entry.type === "web_crawler" && { url: editUrl.trim() }),
                ...(entry.type === "faq" && {
                    question: editQuestion.trim(),
                    answer: editAnswer.trim(),
                }),
                ...(entry.type === "rich_text" && {
                    richTextContent: editRichContent,
                }),
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save:", error);
            alert(error instanceof Error ? error.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!entry || !confirm("Are you sure you want to delete this entry?")) return;
        try {
            await removeEntry({ id: entry._id });
            router.push("/knowledge-base");
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    }

    if (isUserLoading || entry === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (entry === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <h2 className="text-lg font-semibold text-primary">Entry not found</h2>
                <Button color="secondary" onClick={() => router.push("/knowledge-base")}>
                    Back to Knowledge Base
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-primary">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[900px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => router.push("/knowledge-base")}
                            className="flex items-center gap-2 text-sm text-tertiary hover:text-secondary transition-colors w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Knowledge Base
                        </button>

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-secondary bg-secondary_subtle">
                                    {getTypeIcon(entry.type)}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="text-display-xs font-semibold text-primary bg-transparent border-b-2 border-brand-500 outline-none pb-0.5"
                                        />
                                    ) : (
                                        <h1 className="text-display-xs font-semibold text-primary">{entry.name}</h1>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Badge color="gray" size="sm">{typeLabels[entry.type as KbType]}</Badge>
                                        <Badge color={entry.scope === "global" ? "brand" : "gray"} size="sm">
                                            {entry.scope === "global" ? "Global" : "Personal"}
                                        </Badge>
                                        <span className="text-sm text-tertiary">
                                            Added {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <Button color="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button color="primary" size="sm" iconLeading={Save01} onClick={handleSave} isDisabled={isSaving}>
                                            {isSaving ? "Saving..." : "Save"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button color="secondary" size="sm" iconLeading={Edit01} onClick={startEditing}>Edit</Button>
                                        <Button color="secondary" size="sm" iconLeading={Trash01} onClick={handleDelete}>Delete</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scope Editor (when editing) */}
                    {isEditing && (
                        <div className="rounded-xl border border-secondary bg-primary p-6">
                            <label className="block text-sm font-medium text-secondary mb-1.5">Scope</label>
                            <NativeSelect
                                aria-label="Scope"
                                value={editScope}
                                onChange={(e) => setEditScope(e.target.value as "global" | "personal")}
                                options={[
                                    { label: "Global (all team members)", value: "global" },
                                    { label: "Personal (only me)", value: "personal" },
                                ]}
                                className="max-w-xs"
                                selectClassName="text-sm"
                            />
                        </div>
                    )}

                    {/* Type-specific content */}
                    <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                        {entry.type === "web_crawler" && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-secondary mb-2">URL</h3>
                                    {isEditing ? (
                                        <input
                                            type="url"
                                            value={editUrl}
                                            onChange={(e) => setEditUrl(e.target.value)}
                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    ) : (
                                        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600 text-sm underline">
                                            {entry.url}
                                        </a>
                                    )}
                                </div>
                                {entry.crawledContent && (
                                    <div>
                                        <h3 className="text-sm font-medium text-secondary mb-2">Crawled Content</h3>
                                        <div className="rounded-lg border border-secondary bg-secondary_subtle p-4 text-sm text-secondary whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                                            {entry.crawledContent}
                                        </div>
                                        {entry.crawledAt && (
                                            <span className="text-xs text-tertiary mt-2 block">
                                                Last crawled: {new Date(entry.crawledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {entry.type === "faq" && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-secondary mb-2">Question</h3>
                                    {isEditing ? (
                                        <textarea
                                            value={editQuestion}
                                            onChange={(e) => setEditQuestion(e.target.value)}
                                            maxLength={1000}
                                            rows={4}
                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    ) : (
                                        <p className="text-primary text-md font-medium">{entry.question || "—"}</p>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-secondary mb-2">Answer</h3>
                                    {isEditing ? (
                                        <textarea
                                            value={editAnswer}
                                            onChange={(e) => setEditAnswer(e.target.value)}
                                            maxLength={1000}
                                            rows={4}
                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    ) : (
                                        <p className="text-secondary text-sm leading-relaxed">{entry.answer || "—"}</p>
                                    )}
                                </div>
                            </>
                        )}

                        {entry.type === "rich_text" && (
                            <div>
                                <h3 className="text-sm font-medium text-secondary mb-2">Content</h3>
                                {isEditing ? (
                                    <textarea
                                        value={editRichContent}
                                        onChange={(e) => setEditRichContent(e.target.value)}
                                        rows={12}
                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                ) : (
                                    <div className="rounded-lg border border-secondary bg-secondary_subtle p-4 text-sm text-secondary whitespace-pre-wrap min-h-[200px]">
                                        {entry.richTextContent || "No content yet."}
                                    </div>
                                )}
                            </div>
                        )}

                        {entry.type === "file_upload" && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 p-4 rounded-lg border border-secondary bg-secondary_subtle">
                                    <File04 className="w-10 h-10 text-tertiary shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-primary">{entry.fileName || "Unknown file"}</span>
                                        <span className="text-sm text-tertiary">
                                            {entry.fileMimeType || "Unknown type"}
                                            {entry.fileSize ? ` · ${(entry.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
                                        </span>
                                    </div>
                                    {entry.fileUrl && (
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            className="ml-auto"
                                            onClick={() => window.open(entry.fileUrl!, "_blank")}
                                        >
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
