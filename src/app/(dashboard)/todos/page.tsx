"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
import {
    CheckCircle,
    Circle,
    Plus,
    SearchLg,
    Calendar,
    LayoutGrid01,
    List,
    Loading02,
    Trash01,
    Edit05,
    Building07,
} from "@untitledui/icons";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { NativeSelect } from "@/components/base/select/select-native";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { parseDate } from "@internationalized/date";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function formatDueDate(timestamp: number): string {
    const now = new Date();
    const due = new Date(timestamp);
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.floor((dueDay.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(timestamp: number, status: string): boolean {
    if (status === "completed") return false;
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return timestamp < todayDate.getTime();
}

function toISODateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

const priorityOptions = [
    { label: "All Priorities", value: "all" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
];

const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Done", value: "Done" },
];

const sortOptions = [
    { label: "Due Date", value: "dueDate" },
    { label: "Priority", value: "priority" },
    { label: "Created", value: "created" },
];


export default function TodosPage() {
    const { user, companyId, isLoading: isUserLoading } = useCurrentUser();

    // Fetch tasks from Convex
    const tasks = useQuery(
        api.tasks.list,
        companyId ? { companyId } : "skip"
    );
    const taskStats = useQuery(
        api.tasks.getStats,
        companyId ? { companyId } : "skip"
    );

    // Fetch team members for assignee dropdown
    const teamMembers = useQuery(
        api.users.getByCompanyId,
        companyId ? { companyId } : "skip"
    );

    // Fetch leads for related company dropdown
    const leads = useQuery(
        api.leads.list,
        companyId ? { companyId } : "skip"
    );

    // Fetch contacts for related contact dropdown
    const contacts = useQuery(
        api.contacts.getByCompanyId,
        companyId ? { companyId } : "skip"
    );

    // Mutations
    const createTask = useMutation(api.tasks.create);
    const updateTask = useMutation(api.tasks.update);
    const completeTask = useMutation(api.tasks.complete);
    const reopenTask = useMutation(api.tasks.reopen);
    const deleteTask = useMutation(api.tasks.remove);

    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("dueDate");
    const [viewMode, setViewMode] = useState<"list" | "board">("list");

    // Form state
    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formPriority, setFormPriority] = useState("medium");
    const [formDueDate, setFormDueDate] = useState("");
    const [formAssignee, setFormAssignee] = useState<string>("");
    const [formLinkedLead, setFormLinkedLead] = useState<string>("");
    const [formLinkedContact, setFormLinkedContact] = useState<string>("");
    const [leadSearchQuery, setLeadSearchQuery] = useState("");
    const [contactSearchQuery, setContactSearchQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Edit state
    const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | null>(null);
    const [isSlideoutOpen, setIsSlideoutOpen] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"tasks"> | null>(null);

    function resetForm() {
        setFormTitle("");
        setFormDescription("");
        setFormPriority("medium");
        setFormDueDate("");
        setFormAssignee(user?._id ?? "");
        setFormLinkedLead("");
        setFormLinkedContact("");
        setLeadSearchQuery("");
        setContactSearchQuery("");
        setEditingTaskId(null);
    }

    function openCreateForm() {
        resetForm();
        setFormAssignee(user?._id ?? "");
        setIsSlideoutOpen(true);
    }

    function openEditForm(taskId: Id<"tasks">) {
        const task = tasks?.find((t) => t._id === taskId);
        if (!task) return;
        setFormTitle(task.title);
        setFormDescription(task.description ?? "");
        setFormPriority(task.priority);
        setFormDueDate(task.dueDate ? toISODateString(new Date(task.dueDate)) : "");
        setFormAssignee(task.assignedToUserId);
        setFormLinkedLead(task.linkedLeadId ?? "");
        setFormLinkedContact(task.linkedContactId ?? "");
        setLeadSearchQuery("");
        setContactSearchQuery("");
        setEditingTaskId(taskId);
        setIsSlideoutOpen(true);
    }

    async function toggleDone(id: Id<"tasks">, currentStatus: string) {
        try {
            if (currentStatus === "completed") {
                await reopenTask({ id });
            } else {
                await completeTask({ id });
            }
        } catch (error) {
            devError("Failed to toggle task:", error);
        }
    }

    async function handleSaveTask(close: () => void) {
        if (!formTitle.trim() || !companyId || !user) return;
        setIsSaving(true);
        try {
            if (editingTaskId) {
                await updateTask({
                    id: editingTaskId,
                    title: formTitle.trim(),
                    description: formDescription.trim() || undefined,
                    priority: formPriority as "high" | "medium" | "low",
                    dueDate: formDueDate ? new Date(formDueDate).getTime() : undefined,
                    assignedToUserId: (formAssignee || user._id) as Id<"users">,
                    linkedLeadId: formLinkedLead ? (formLinkedLead as Id<"leads">) : undefined,
                    linkedContactId: formLinkedContact ? (formLinkedContact as Id<"contacts">) : undefined,
                });
            } else {
                await createTask({
                    companyId,
                    createdByUserId: user._id,
                    assignedToUserId: (formAssignee || user._id) as Id<"users">,
                    title: formTitle.trim(),
                    description: formDescription.trim() || undefined,
                    priority: formPriority as "high" | "medium" | "low",
                    dueDate: formDueDate ? new Date(formDueDate).getTime() : undefined,
                    linkedLeadId: formLinkedLead ? (formLinkedLead as Id<"leads">) : undefined,
                    linkedContactId: formLinkedContact ? (formLinkedContact as Id<"contacts">) : undefined,
                });
            }
            resetForm();
            close();
        } catch (error) {
            devError("Failed to save task:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save task");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: Id<"tasks">) {
        try {
            await deleteTask({ id });
            toast.success("Task deleted");
        } catch (error) {
            devError("Failed to delete task:", error);
            toast.error("Failed to delete task");
        }
    }

    // Quick date helpers
    function setQuickDate(offset: "today" | "tomorrow" | "nextWeek") {
        const d = new Date();
        if (offset === "tomorrow") d.setDate(d.getDate() + 1);
        if (offset === "nextWeek") d.setDate(d.getDate() + (7 - d.getDay()) + 1);
        setFormDueDate(toISODateString(d));
    }

    // Filtered leads for dropdown search
    const filteredLeads = useMemo(() => {
        if (!leads) return [];
        if (!leadSearchQuery) return leads.slice(0, 50);
        return leads
            .filter((l) => l.name.toLowerCase().includes(leadSearchQuery.toLowerCase()))
            .slice(0, 50);
    }, [leads, leadSearchQuery]);

    // Helper: get lead name by ID
    function getLeadName(leadId: string): string | undefined {
        return leads?.find((l) => l._id === leadId)?.name;
    }

    // Filtered contacts for dropdown search
    const filteredContacts = useMemo(() => {
        if (!contacts) return [];
        const list = formLinkedLead
            ? contacts.filter((c) => c.leadId === formLinkedLead)
            : contacts;
        if (!contactSearchQuery) return list.slice(0, 50);
        const q = contactSearchQuery.toLowerCase();
        return list
            .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
            .slice(0, 50);
    }, [contacts, contactSearchQuery, formLinkedLead]);

    // Helper: get contact name by ID
    function getContactName(contactId: string): string | undefined {
        const c = contacts?.find((ct) => ct._id === contactId);
        return c ? `${c.firstName} ${c.lastName}`.trim() : undefined;
    }

    // Filter and transform tasks
    const filtered = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((t) => {
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (priorityFilter !== "all" && t.priority !== priorityFilter.toLowerCase()) return false;
            if (statusFilter !== "all") {
                const statusMap: Record<string, string> = {
                    "To Do": "pending",
                    "In Progress": "pending",
                    "Done": "completed",
                };
                if (t.status !== statusMap[statusFilter]) return false;
            }
            return true;
        }).map((t) => ({
            ...t,
            id: t._id,
            dueDate: t.dueDate ? formatDueDate(t.dueDate) : "No date",
            overdue: t.dueDate ? isOverdue(t.dueDate, t.status) : false,
            done: t.status === "completed",
            displayStatus: t.status === "completed" ? "Done" : "To Do",
        }));
    }, [tasks, search, priorityFilter, statusFilter]);

    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading02 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    const getPriorityColor = (p: string) => {
        if (p === "High") return "error";
        if (p === "Medium") return "warning";
        return "success";
    };

    const getStatusColor = (s: string) => {
        if (s === "Done") return "success";
        if (s === "In Progress") return "brand";
        return "gray";
    };

    const formContent = (close: () => void) => (
        <>
            <SlideoutMenu.Header onClose={close}>
                <h2 className="text-lg font-semibold text-primary">
                    {editingTaskId ? "Edit Task" : "Create New Task"}
                </h2>
                <p className="text-sm text-tertiary mt-1">
                    {editingTaskId ? "Update the task details" : "Add a task and assign it to your team"}
                </p>
            </SlideoutMenu.Header>
            <SlideoutMenu.Content>
                <div className="flex flex-col gap-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Task Title *</label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="Enter task title..."
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                        />
                    </div>
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Description</label>
                        <textarea
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Add a description..."
                            rows={3}
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary resize-none"
                        />
                    </div>
                    {/* Assignee (Issue 3.1) */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Assignee</label>
                        <select
                            value={formAssignee}
                            onChange={(e) => setFormAssignee(e.target.value)}
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            {teamMembers?.map((member) => (
                                <option key={member._id} value={member._id}>
                                    {member.firstName} {member.lastName}
                                    {member._id === user?._id ? " (Me)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Priority</label>
                        <NativeSelect
                            options={[
                                { label: "High", value: "high" },
                                { label: "Medium", value: "medium" },
                                { label: "Low", value: "low" },
                            ]}
                            value={formPriority}
                            onChange={(e) => setFormPriority(e.target.value)}
                            className="w-full"
                            selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    {/* Due Date + Quick Date Buttons (Issue 3.2) */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Due Date</label>
                        <DatePicker
                            aria-label="Due Date"
                            value={formDueDate ? parseDate(formDueDate) : undefined}
                            onChange={(val) => setFormDueDate(val ? val.toString() : "")}
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setQuickDate("today")}
                                className="rounded-md border border-secondary bg-primary px-2.5 py-1 text-xs font-medium text-secondary hover:bg-secondary_hover transition duration-100 ease-linear"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate("tomorrow")}
                                className="rounded-md border border-secondary bg-primary px-2.5 py-1 text-xs font-medium text-secondary hover:bg-secondary_hover transition duration-100 ease-linear"
                            >
                                Tomorrow
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate("nextWeek")}
                                className="rounded-md border border-secondary bg-primary px-2.5 py-1 text-xs font-medium text-secondary hover:bg-secondary_hover transition duration-100 ease-linear"
                            >
                                Next Week
                            </button>
                        </div>
                    </div>
                    {/* Related Company / Lead (Issue 3.3) */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Related Company</label>
                        <input
                            type="text"
                            value={leadSearchQuery}
                            onChange={(e) => setLeadSearchQuery(e.target.value)}
                            placeholder="Search companies..."
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary mb-1.5"
                        />
                        <select
                            value={formLinkedLead}
                            onChange={(e) => setFormLinkedLead(e.target.value)}
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">None</option>
                            {filteredLeads.map((lead) => (
                                <option key={lead._id} value={lead._id}>
                                    {lead.name}{lead.domain ? ` (${lead.domain})` : ""}
                                </option>
                            ))}
                        </select>
                        {formLinkedLead && (
                            <button
                                type="button"
                                onClick={() => setFormLinkedLead("")}
                                className="mt-1 text-xs text-brand-secondary hover:text-brand-primary transition duration-100 ease-linear"
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                    {/* Related Contact (Issue 3.3) */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Related Contact</label>
                        <input
                            type="text"
                            value={contactSearchQuery}
                            onChange={(e) => setContactSearchQuery(e.target.value)}
                            placeholder="Search contacts..."
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary mb-1.5"
                        />
                        <select
                            value={formLinkedContact}
                            onChange={(e) => setFormLinkedContact(e.target.value)}
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">None</option>
                            {filteredContacts.map((contact) => (
                                <option key={contact._id} value={contact._id}>
                                    {contact.firstName} {contact.lastName}{contact.email ? ` (${contact.email})` : ""}
                                </option>
                            ))}
                        </select>
                        {formLinkedContact && (
                            <button
                                type="button"
                                onClick={() => setFormLinkedContact("")}
                                className="mt-1 text-xs text-brand-secondary hover:text-brand-primary transition duration-100 ease-linear"
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                </div>
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer>
                <div className="flex items-center justify-end gap-3">
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onClick={() => handleSaveTask(close)}
                        isDisabled={!formTitle.trim() || isSaving}
                    >
                        {isSaving
                            ? (editingTaskId ? "Saving..." : "Creating...")
                            : (editingTaskId ? "Save Changes" : "Create Task")
                        }
                    </Button>
                </div>
            </SlideoutMenu.Footer>
        </>
    );

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto relative">
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary border border-secondary rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-md font-semibold text-primary mb-2">Delete Task</h3>
                        <p className="text-sm text-secondary mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-3">
                            <Button color="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button color="primary-destructive" size="sm" onClick={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">To-Do List</h1>
                        <p className="text-md text-tertiary">
                            Stay on top of follow-ups and sales actions
                        </p>
                    </div>
                    <SlideoutMenu.Trigger isOpen={isSlideoutOpen && !editingTaskId} onOpenChange={(open) => {
                        if (open) openCreateForm();
                        else { setIsSlideoutOpen(false); resetForm(); }
                    }}>
                        <Button color="primary" iconLeading={Plus}>
                            New Task
                        </Button>
                        <SlideoutMenu>
                            {({ close }) => formContent(() => { close(); setIsSlideoutOpen(false); resetForm(); })}
                        </SlideoutMenu>
                    </SlideoutMenu.Trigger>
                </div>

                {/* Edit Slideout (Issue 3.4) */}
                <SlideoutMenu.Trigger isOpen={isSlideoutOpen && !!editingTaskId} onOpenChange={(open) => {
                    if (!open) { setIsSlideoutOpen(false); resetForm(); }
                }}>
                    <span className="hidden" />
                    <SlideoutMenu>
                        {({ close }) => formContent(() => { close(); setIsSlideoutOpen(false); resetForm(); })}
                    </SlideoutMenu>
                </SlideoutMenu.Trigger>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
                    <MetricsChart04 
                        title={(taskStats?.total ?? 0).toString()} 
                        subtitle="Total Tasks" 
                        change={(taskStats?.pending ?? 0).toString()} 
                        changeTrend="positive" 
                        changeDescription="pending" 
                        actions={false}
                    />
                    <MetricsChart04 
                        title={(taskStats?.overdue ?? 0).toString()} 
                        subtitle="Overdue" 
                        change={(taskStats?.overdue ?? 0).toString()} 
                        changeTrend={(taskStats?.overdue ?? 0) > 0 ? "negative" : "positive"} 
                        changeDescription="need attention" 
                        chartColor="text-fg-error-secondary" 
                        actions={false}
                    />
                    <MetricsChart04 
                        title={(taskStats?.dueToday ?? 0).toString()} 
                        subtitle="Due Today" 
                        change={(taskStats?.dueToday ?? 0).toString()} 
                        changeTrend={(taskStats?.dueToday ?? 0) > 0 ? "negative" : "positive"} 
                        changeDescription="remaining" 
                        chartColor="text-fg-warning-secondary" 
                        actions={false}
                    />
                    <MetricsChart04 
                        title={(taskStats?.completed ?? 0).toString()} 
                        subtitle="Completed" 
                        change={taskStats?.total ? Math.round((taskStats.completed / taskStats.total) * 100).toString() + "%" : "0%"} 
                        changeTrend="positive" 
                        changeDescription="completion rate" 
                        actions={false}
                    />
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                        <InputBase
                            size="sm"
                            type="search"
                            aria-label="Search tasks"
                            placeholder="Search tasks..."
                            icon={SearchLg}
                            value={search}
                            onChange={(value: string) => setSearch(value)}
                        />
                    </div>
                    <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
                    <div className="flex flex-wrap items-center gap-3">
                        <FilterDropdown
                            aria-label="Priority"
                            value={priorityFilter}
                            onChange={(v) => setPriorityFilter(v)}
                            options={priorityOptions}
                        />
                        <FilterDropdown
                            aria-label="Status"
                            value={statusFilter}
                            onChange={(v) => setStatusFilter(v)}
                            options={statusOptions}
                        />
                        <FilterDropdown
                            aria-label="Sort by"
                            value={sortBy}
                            onChange={(v) => setSortBy(v)}
                            options={sortOptions}
                        />
                        <ButtonGroup
                            selectedKeys={new Set([viewMode])}
                            onSelectionChange={(keys) => {
                                const arr = Array.from(keys as Set<string>);
                                if (arr.length > 0) setViewMode(arr[0] as "list" | "board");
                            }}
                        >
                            <ButtonGroupItem id="list" aria-label="List view"><List className="w-4 h-4" /></ButtonGroupItem>
                            <ButtonGroupItem id="board" aria-label="Board view"><LayoutGrid01 className="w-4 h-4" /></ButtonGroupItem>
                        </ButtonGroup>
                    </div>
                </div>

                {/* Task Table */}
                {viewMode === "list" ? (
                    <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                        <TableCard.Header title="Tasks" badge={`${filtered.length} tasks`} />
                        <div className="overflow-x-auto">
                        <Table
                            aria-label="Tasks List"
                            className="bg-primary w-full"
                        >
                            <Table.Header className="bg-secondary_subtle">
                                <Table.Head id="check" className="w-[50px]" />
                                <Table.Head id="title" label="Task" isRowHeader className="w-full min-w-[250px]" />
                                <Table.Head id="priority" label="Priority" className="min-w-[100px]" />
                                <Table.Head id="dueDate" label="Due Date" className="min-w-[160px]" />
                                <Table.Head id="status" label="Status" className="min-w-[110px]" />
                                <Table.Head id="actions" className="w-[100px]" />
                            </Table.Header>

                            <Table.Body items={filtered}>
                                {(item) => (
                                    <Table.Row
                                        id={item.id}
                                        className={item.overdue && !item.done ? "bg-error-50 dark:bg-error-950/20" : ""}
                                    >
                                        <Table.Cell>
                                            <button
                                                onClick={() => toggleDone(item._id, item.status)}
                                                className="text-tertiary hover:text-brand-primary transition-colors focus:outline-none"
                                            >
                                                {item.done ? (
                                                    <CheckCircle className="w-5 h-5 text-success-500" />
                                                ) : (
                                                    <Circle className="w-5 h-5" />
                                                )}
                                            </button>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`font-medium ${item.done ? "text-tertiary line-through" : "text-primary"}`}>
                                                    {item.title}
                                                </span>
                                                {item.description && (
                                                    <span className="text-xs text-tertiary truncate max-w-[300px]">{item.description}</span>
                                                )}
                                                {/* Related Company / Contact badges (Issue 3.3) */}
                                                {(item.linkedLeadId || item.linkedContactId) && (
                                                    <div className="inline-flex items-center gap-1 mt-0.5 flex-wrap">
                                                        {item.linkedLeadId && (
                                                            <Badge color="blue" size="sm">
                                                                <Building07 className="w-3 h-3 mr-0.5" />
                                                                {getLeadName(item.linkedLeadId) ?? "Company"}
                                                            </Badge>
                                                        )}
                                                        {item.linkedContactId && (
                                                            <Badge color="purple" size="sm">
                                                                {getContactName(item.linkedContactId) ?? "Contact"}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color={getPriorityColor(item.priority.charAt(0).toUpperCase() + item.priority.slice(1))} size="sm">
                                                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-tertiary" />
                                                <span className={`text-sm ${item.overdue && !item.done ? "text-error-600 font-medium" : "text-secondary"}`}>
                                                    {item.dueDate}
                                                </span>
                                                {item.overdue && !item.done && (
                                                    <Badge color="error" size="sm">OVERDUE</Badge>
                                                )}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color={getStatusColor(item.displayStatus)} size="sm">
                                                {item.displayStatus}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <div className="flex justify-end gap-1">
                                                {/* Edit button (Issue 3.4) */}
                                                <ButtonUtility 
                                                    size="sm" 
                                                    color="tertiary" 
                                                    icon={Edit05} 
                                                    aria-label="Edit task"
                                                    onClick={() => openEditForm(item._id)}
                                                />
                                                <ButtonUtility 
                                                    size="sm" 
                                                    color="tertiary" 
                                                    icon={Trash01} 
                                                    aria-label="Delete task"
                                                    onClick={() => setConfirmDeleteId(item._id)}
                                                />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                        </div>
                        {filtered.length === 0 && (
                            <div className="px-5 py-8 text-center text-sm text-tertiary">
                                {tasks?.length === 0 
                                    ? "No tasks yet. Create a task to get started."
                                    : "No tasks match your filters."
                                }
                            </div>
                        )}
                    </TableCard.Root>
                ) : (
                    /* Board / Kanban View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(["To Do", "Done"] as const).map((col) => {
                            const colTasks = filtered.filter((t) => t.displayStatus === col);
                            const colColor = col === "To Do" ? "bg-gray-50 dark:bg-gray-900" : "bg-success-50 dark:bg-success-950";
                            return (
                                <div key={col} className={`rounded-xl border border-secondary ${colColor} p-4 flex flex-col gap-3`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-primary">{col}</h3>
                                        <Badge size="sm" color={getStatusColor(col)}>{colTasks.length}</Badge>
                                    </div>
                                    {colTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className={`rounded-lg border bg-primary p-4 shadow-xs flex flex-col gap-2 ${t.overdue && !t.done ? "border-error-300 dark:border-error-700" : "border-secondary"}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <button onClick={() => toggleDone(t._id, t.status)} className="mt-0.5 shrink-0">
                                                    {t.done ? <CheckCircle className="w-4 h-4 text-success-500" /> : <Circle className="w-4 h-4 text-tertiary" />}
                                                </button>
                                                <span className={`flex-1 text-sm font-medium ${t.done ? "line-through text-tertiary" : "text-primary"}`}>{t.title}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Badge color={getPriorityColor(t.priority.charAt(0).toUpperCase() + t.priority.slice(1))} size="sm">
                                                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                                    </Badge>
                                                    <button
                                                        onClick={() => openEditForm(t._id)}
                                                        className="text-tertiary hover:text-secondary transition-colors p-0.5"
                                                        aria-label="Edit task"
                                                    >
                                                        <Edit05 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-tertiary">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className={t.overdue && !t.done ? "text-error-600 font-medium" : ""}>{t.dueDate}</span>
                                                    {t.overdue && !t.done && <span className="text-error-600 font-semibold">&#9888;&#65039;</span>}
                                                </div>
                                                {t.linkedLeadId && (
                                                    <Badge color="blue" size="sm">
                                                        <Building07 className="w-3 h-3 mr-0.5" />
                                                        {getLeadName(t.linkedLeadId) ?? "Company"}
                                                    </Badge>
                                                )}
                                                {t.linkedContactId && (
                                                    <Badge color="purple" size="sm">
                                                        {getContactName(t.linkedContactId) ?? "Contact"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <p className="text-sm text-quaternary text-center py-6">No tasks</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
