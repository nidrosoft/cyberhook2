"use client";

/**
 * Contacts repository (orange item 4.1).
 *
 * A standalone, company-scoped contacts directory used as the audience pool
 * for AI-Agents campaigns. Supports CSV upload, manual single-contact add,
 * inline edit/delete, search + filter, and dedupe by email on import.
 */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
    Plus,
    SearchLg,
    Trash01,
    Edit05,
    UploadCloud02,
    UserPlus01,
    XClose,
    Mail01,
    Phone,
    Building02,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Table, TableCard } from "@/components/application/table/table";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";

type ContactRow = {
    _id: Id<"contacts">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    companyName?: string;
    linkedinUrl?: string;
    notes?: string;
    source?: string;
    createdAt: number;
    lastContactedAt?: number;
};

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContactsPage() {
    const { companyId } = useCurrentUser();
    const contacts = useQuery(api.contacts.getByCompanyId, companyId ? { companyId } : "skip");

    const createContact = useMutation(api.contacts.create);
    const updateContact = useMutation(api.contacts.update);
    const removeContact = useMutation(api.contacts.remove);
    const bulkImport = useMutation(api.contacts.bulkImport);

    // ── Filter state ──────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");

    // ── Add / edit slideout state ────────────────────────────────────────
    const [editingId, setEditingId] = useState<Id<"contacts"> | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [title, setTitle] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── CSV import state ─────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showImport, setShowImport] = useState(false);
    const [importParsed, setImportParsed] = useState<Array<Record<string, string>>>([]);
    const [importHeaders, setImportHeaders] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    function resetForm() {
        setEditingId(null);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setTitle("");
        setCompanyName("");
        setLinkedinUrl("");
        setNotes("");
    }

    function populateForm(c: ContactRow) {
        setEditingId(c._id);
        setFirstName(c.firstName);
        setLastName(c.lastName);
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setTitle(c.title || "");
        setCompanyName(c.companyName || "");
        setLinkedinUrl(c.linkedinUrl || "");
        setNotes(c.notes || "");
    }

    async function handleSave(close: () => void) {
        if (!companyId) return;
        if (!firstName.trim() && !lastName.trim() && !email.trim()) {
            toast.error("Provide at least a name or email");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateContact({
                    id: editingId,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                    title: title.trim() || undefined,
                    companyName: companyName.trim() || undefined,
                    linkedinUrl: linkedinUrl.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                toast.success("Contact updated");
            } else {
                await createContact({
                    companyId,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                    title: title.trim() || undefined,
                    companyName: companyName.trim() || undefined,
                    linkedinUrl: linkedinUrl.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                toast.success("Contact added");
            }
            resetForm();
            close();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save contact");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(id: Id<"contacts">) {
        if (!confirm("Remove this contact? This cannot be undone.")) return;
        try {
            await removeContact({ id });
            toast.success("Contact removed");
        } catch {
            toast.error("Failed to remove contact");
        }
    }

    function handleFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = String(e.target?.result || "");
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length === 0) return;
            const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            setImportHeaders(headers);
            const rows: Array<Record<string, string>> = [];
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                const row: Record<string, string> = {};
                headers.forEach((h, idx) => { row[h] = cells[idx] || ""; });
                rows.push(row);
            }
            setImportParsed(rows);
        };
        reader.readAsText(file);
    }

    async function handleConfirmImport() {
        if (!companyId || importParsed.length === 0) return;
        setIsImporting(true);
        try {
            // Best-effort header detection.
            const find = (re: RegExp) => importHeaders.find((h) => re.test(h)) || "";
            const fnCol = find(/^first.?name|^fname$/i);
            const lnCol = find(/^last.?name|^lname$/i);
            const fullCol = !fnCol && !lnCol ? find(/^name$/i) : "";
            const emailCol = find(/email/i);
            const phoneCol = find(/phone|mobile|cell/i);
            const titleCol = find(/title|role|position/i);
            const companyCol = find(/company|organization/i);
            const linkedinCol = find(/linkedin/i);
            const notesCol = find(/notes?|comment/i);

            const rows = importParsed.map((r) => {
                let firstName = fnCol ? r[fnCol] : "";
                let lastName = lnCol ? r[lnCol] : "";
                if (fullCol && !firstName && !lastName) {
                    const parts = (r[fullCol] || "").split(" ");
                    firstName = parts[0] || "";
                    lastName = parts.slice(1).join(" ");
                }
                return {
                    firstName: (firstName || "").trim(),
                    lastName: (lastName || "").trim(),
                    email: emailCol ? r[emailCol]?.trim() : undefined,
                    phone: phoneCol ? r[phoneCol]?.trim() : undefined,
                    title: titleCol ? r[titleCol]?.trim() : undefined,
                    companyName: companyCol ? r[companyCol]?.trim() : undefined,
                    linkedinUrl: linkedinCol ? r[linkedinCol]?.trim() : undefined,
                    notes: notesCol ? r[notesCol]?.trim() : undefined,
                };
            });

            const result = await bulkImport({ companyId, rows });
            toast.success(`Imported ${result.created} contacts (${result.skipped} skipped / duplicates)`);
            setImportParsed([]);
            setImportHeaders([]);
            setShowImport(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
            setIsImporting(false);
        }
    }

    const filtered = useMemo(() => {
        const list = (contacts ?? []) as ContactRow[];
        return list.filter((c) => {
            if (search) {
                const q = search.toLowerCase();
                const hay = [c.firstName, c.lastName, c.email, c.title, c.companyName].filter(Boolean).join(" ").toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (companyFilter && (c.companyName || "").toLowerCase() !== companyFilter.toLowerCase()) return false;
            return true;
        });
    }, [contacts, search, companyFilter]);

    const companyOptions = useMemo(() => {
        const set = new Set<string>();
        for (const c of (contacts ?? []) as ContactRow[]) {
            if (c.companyName) set.add(c.companyName);
        }
        return Array.from(set).sort();
    }, [contacts]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold text-primary">Contacts</h1>
                <p className="text-sm text-tertiary">
                    Your team's contact repository. Use these contacts as the audience for AI Agents campaigns.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <InputBase
                    size="sm"
                    type="search"
                    icon={SearchLg}
                    placeholder="Search by name, email, title, company..."
                    value={search}
                    onChange={(v: string) => setSearch(v)}
                    className="w-full sm:max-w-[360px]"
                />
                <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                    <option value="">All companies</option>
                    {companyOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" color="secondary" iconLeading={UploadCloud02} onClick={() => setShowImport(true)}>
                        Import CSV
                    </Button>
                    <SlideoutMenu.Trigger>
                        <Button size="sm" color="primary" iconLeading={UserPlus01} onClick={resetForm}>Add Contact</Button>
                        <SlideoutMenu className="max-w-[520px]">
                            {({ close }) => (
                                <>
                                    <SlideoutMenu.Header onClose={() => { resetForm(); close(); }}>
                                        <h2 className="text-lg font-semibold text-primary">{editingId ? "Edit Contact" : "Add Contact"}</h2>
                                        <p className="text-sm text-tertiary mt-1">Manually add a single contact to the repository.</p>
                                    </SlideoutMenu.Header>
                                    <SlideoutMenu.Content>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <Field label="First Name *">
                                                <InputBase size="md" value={firstName} onChange={(v: string) => setFirstName(v)} />
                                            </Field>
                                            <Field label="Last Name *">
                                                <InputBase size="md" value={lastName} onChange={(v: string) => setLastName(v)} />
                                            </Field>
                                            <Field label="Email">
                                                <InputBase size="md" type="email" value={email} onChange={(v: string) => setEmail(v)} />
                                            </Field>
                                            <Field label="Phone">
                                                <InputBase size="md" value={phone} onChange={(v: string) => setPhone(v)} />
                                            </Field>
                                            <Field label="Title">
                                                <InputBase size="md" value={title} onChange={(v: string) => setTitle(v)} />
                                            </Field>
                                            <Field label="Company">
                                                <InputBase size="md" value={companyName} onChange={(v: string) => setCompanyName(v)} />
                                            </Field>
                                            <div className="sm:col-span-2">
                                                <Field label="LinkedIn URL">
                                                    <InputBase size="md" value={linkedinUrl} onChange={(v: string) => setLinkedinUrl(v)} />
                                                </Field>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Field label="Notes">
                                                    <textarea
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        rows={3}
                                                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary"
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    </SlideoutMenu.Content>
                                    <SlideoutMenu.Footer>
                                        <div className="flex items-center justify-end gap-3">
                                            <Button color="secondary" onClick={() => { resetForm(); close(); }}>Cancel</Button>
                                            <Button color="primary" onClick={() => handleSave(close)} isDisabled={isSubmitting}>
                                                {isSubmitting ? "Saving..." : editingId ? "Update Contact" : "Add Contact"}
                                            </Button>
                                        </div>
                                    </SlideoutMenu.Footer>
                                </>
                            )}
                        </SlideoutMenu>
                    </SlideoutMenu.Trigger>
                </div>
            </div>

            {/* Table */}
            <TableCard.Root>
                <TableCard.Header
                    title="All Contacts"
                    badge={`${filtered.length} ${filtered.length === 1 ? "contact" : "contacts"}`}
                />
                <div className="overflow-x-auto">
                    <Table aria-label="Contacts">
                        <Table.Header>
                            <Table.Row>
                                <Table.Head id="name" isRowHeader>Name</Table.Head>
                                <Table.Head id="email">Email</Table.Head>
                                <Table.Head id="phone">Phone</Table.Head>
                                <Table.Head id="title">Title</Table.Head>
                                <Table.Head id="company">Company</Table.Head>
                                <Table.Head id="source">Source</Table.Head>
                                <Table.Head id="created">Added</Table.Head>
                                <Table.Head id="actions" className="w-20"></Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body items={filtered.map((c) => ({ ...c, id: c._id }))}>
                            {(item) => (
                                <Table.Row id={item.id}>
                                    <Table.Cell>
                                        <span className="font-medium text-primary">{item.firstName} {item.lastName}</span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {item.email ? (
                                            <a href={`mailto:${item.email}`} className="text-sm text-secondary hover:text-brand-secondary inline-flex items-center gap-1.5">
                                                <Mail01 className="w-3.5 h-3.5" />
                                                {item.email}
                                            </a>
                                        ) : <span className="text-tertiary">—</span>}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {item.phone ? (
                                            <span className="text-sm text-secondary inline-flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5" /> {item.phone}
                                            </span>
                                        ) : <span className="text-tertiary">—</span>}
                                    </Table.Cell>
                                    <Table.Cell><span className="text-sm text-secondary">{item.title || "—"}</span></Table.Cell>
                                    <Table.Cell>
                                        {item.companyName ? (
                                            <span className="text-sm text-secondary inline-flex items-center gap-1.5">
                                                <Building02 className="w-3.5 h-3.5" /> {item.companyName}
                                            </span>
                                        ) : <span className="text-tertiary">—</span>}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge size="sm" color={item.source === "csv_import" ? "blue" : "gray"}>
                                            {item.source === "csv_import" ? "CSV" : "Manual"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell><span className="text-sm text-tertiary">{formatDate(item.createdAt)}</span></Table.Cell>
                                    <Table.Cell>
                                        <div className="flex items-center gap-1">
                                            <SlideoutMenu.Trigger>
                                                <ButtonUtility size="sm" color="tertiary" icon={Edit05} aria-label="Edit" onClick={() => populateForm(item)} />
                                                <SlideoutMenu className="max-w-[520px]">
                                                    {({ close }) => (
                                                        <>
                                                            <SlideoutMenu.Header onClose={() => { resetForm(); close(); }}>
                                                                <h2 className="text-lg font-semibold text-primary">Edit Contact</h2>
                                                            </SlideoutMenu.Header>
                                                            <SlideoutMenu.Content>
                                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                                    <Field label="First Name *"><InputBase size="md" value={firstName} onChange={(v: string) => setFirstName(v)} /></Field>
                                                                    <Field label="Last Name *"><InputBase size="md" value={lastName} onChange={(v: string) => setLastName(v)} /></Field>
                                                                    <Field label="Email"><InputBase size="md" type="email" value={email} onChange={(v: string) => setEmail(v)} /></Field>
                                                                    <Field label="Phone"><InputBase size="md" value={phone} onChange={(v: string) => setPhone(v)} /></Field>
                                                                    <Field label="Title"><InputBase size="md" value={title} onChange={(v: string) => setTitle(v)} /></Field>
                                                                    <Field label="Company"><InputBase size="md" value={companyName} onChange={(v: string) => setCompanyName(v)} /></Field>
                                                                    <div className="sm:col-span-2">
                                                                        <Field label="LinkedIn URL"><InputBase size="md" value={linkedinUrl} onChange={(v: string) => setLinkedinUrl(v)} /></Field>
                                                                    </div>
                                                                    <div className="sm:col-span-2">
                                                                        <Field label="Notes">
                                                                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                                                                                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand-secondary" />
                                                                        </Field>
                                                                    </div>
                                                                </div>
                                                            </SlideoutMenu.Content>
                                                            <SlideoutMenu.Footer>
                                                                <div className="flex items-center justify-end gap-3">
                                                                    <Button color="secondary" onClick={() => { resetForm(); close(); }}>Cancel</Button>
                                                                    <Button color="primary" onClick={() => handleSave(close)} isDisabled={isSubmitting}>
                                                                        {isSubmitting ? "Saving..." : "Update Contact"}
                                                                    </Button>
                                                                </div>
                                                            </SlideoutMenu.Footer>
                                                        </>
                                                    )}
                                                </SlideoutMenu>
                                            </SlideoutMenu.Trigger>
                                            <ButtonUtility size="sm" color="tertiary" icon={Trash01} aria-label="Delete" onClick={() => handleDelete(item.id)} />
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                    {filtered.length === 0 && (
                        <div className="px-5 py-12 text-center text-sm text-tertiary">
                            {contacts === undefined
                                ? "Loading contacts..."
                                : (contacts ?? []).length === 0
                                    ? "No contacts yet. Click Add Contact or Import CSV to get started."
                                    : "No contacts match your filters."}
                        </div>
                    )}
                </div>
            </TableCard.Root>

            {/* CSV import modal */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-primary border border-secondary shadow-xl">
                        <div className="flex items-center justify-between border-b border-secondary p-4">
                            <h3 className="text-lg font-semibold text-primary">Import Contacts</h3>
                            <button
                                onClick={() => { setShowImport(false); setImportParsed([]); setImportHeaders([]); }}
                                className="text-tertiary hover:text-primary transition-colors"
                            >
                                <XClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <p className="text-sm text-tertiary">
                                Upload a CSV file. Recommended columns: <code className="text-xs">First Name, Last Name, Email, Phone, Title, Company, LinkedIn URL, Notes</code>.
                                Duplicates by email will be skipped.
                            </p>
                            {importParsed.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 border-2 border-dashed border-secondary rounded-lg p-8">
                                    <UploadCloud02 className="w-8 h-8 text-tertiary" />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFile(file);
                                        }}
                                    />
                                    <Button size="sm" color="secondary" onClick={() => fileInputRef.current?.click()}>
                                        Choose CSV File
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm text-secondary">
                                        Preview: <span className="font-semibold">{importParsed.length}</span> rows detected with columns: <span className="font-mono text-xs">{importHeaders.join(", ")}</span>
                                    </p>
                                    <div className="max-h-60 overflow-auto rounded-lg border border-secondary">
                                        <table className="w-full text-xs">
                                            <thead className="bg-secondary_subtle">
                                                <tr>{importHeaders.slice(0, 6).map((h) => <th key={h} className="px-2 py-1 text-left font-medium text-secondary">{h}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {importParsed.slice(0, 5).map((row, i) => (
                                                    <tr key={i} className="border-t border-secondary">
                                                        {importHeaders.slice(0, 6).map((h) => (
                                                            <td key={h} className="px-2 py-1 text-tertiary truncate max-w-[140px]">{row[h]}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" color="secondary" onClick={() => { setImportParsed([]); setImportHeaders([]); }}>
                                            Choose different file
                                        </Button>
                                        <Button size="sm" color="primary" onClick={handleConfirmImport} isDisabled={isImporting}>
                                            {isImporting ? "Importing..." : `Import ${importParsed.length} contacts`}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">{label}</label>
            {children}
        </div>
    );
}
