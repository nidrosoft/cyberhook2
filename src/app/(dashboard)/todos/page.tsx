"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
    CheckCircle,
    Circle,
    Plus,
    SearchLg,
    DotsVertical,
    Calendar,
    LayoutGrid01,
    List,
    Loading02,
    Trash01,
} from "@untitledui/icons";

import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Table, TableCard } from "@/components/application/table/table";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(timestamp: number, status: string): boolean {
    if (status === "completed") return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return timestamp < today.getTime();
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

const assigneeOptions = [
    { label: "All Assignees", value: "all" },
    { label: "Sarah Jenkins", value: "Sarah Jenkins" },
    { label: "Mike Ross", value: "Mike Ross" },
    { label: "Jessica Pearson", value: "Jessica Pearson" },
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

    // Mutations
    const createTask = useMutation(api.tasks.create);
    const completeTask = useMutation(api.tasks.complete);
    const reopenTask = useMutation(api.tasks.reopen);
    const deleteTask = useMutation(api.tasks.remove);

    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("dueDate");
    const [viewMode, setViewMode] = useState<"list" | "board">("list");

    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newPriority, setNewPriority] = useState("medium");
    const [newDueDate, setNewDueDate] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    async function toggleDone(id: Id<"tasks">, currentStatus: string) {
        try {
            if (currentStatus === "completed") {
                await reopenTask({ id });
            } else {
                await completeTask({ id });
            }
        } catch (error) {
            console.error("Failed to toggle task:", error);
        }
    }

    async function handleCreateTask(close: () => void) {
        if (!newTitle.trim() || !companyId || !user) return;
        setIsCreating(true);
        try {
            await createTask({
                companyId,
                createdByUserId: user._id,
                assignedToUserId: user._id,
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                priority: newPriority as "high" | "medium" | "low",
                dueDate: newDueDate ? new Date(newDueDate).getTime() : undefined,
            });
            setNewTitle("");
            setNewDescription("");
            setNewPriority("medium");
            setNewDueDate("");
            close();
        } catch (error) {
            console.error("Failed to create task:", error);
            alert(error instanceof Error ? error.message : "Failed to create task");
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(id: Id<"tasks">) {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteTask({ id });
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
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

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-display-sm font-semibold text-primary">To-Do List</h1>
                        <p className="text-md text-tertiary">
                            Stay on top of follow-ups and sales actions
                        </p>
                    </div>
                    <SlideoutMenu.Trigger>
                        <Button color="primary" iconLeading={Plus}>
                            New Task
                        </Button>
                        <SlideoutMenu>
                            {({ close }) => (
                                <>
                                    <SlideoutMenu.Header onClose={close}>
                                        <h2 className="text-lg font-semibold text-primary">Create New Task</h2>
                                        <p className="text-sm text-tertiary mt-1">Add a task and assign it to your team</p>
                                    </SlideoutMenu.Header>
                                    <SlideoutMenu.Content>
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Task Title *</label>
                                                <input
                                                    type="text"
                                                    value={newTitle}
                                                    onChange={(e) => setNewTitle(e.target.value)}
                                                    placeholder="Enter task title..."
                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Description</label>
                                                <textarea
                                                    value={newDescription}
                                                    onChange={(e) => setNewDescription(e.target.value)}
                                                    placeholder="Add a description..."
                                                    rows={3}
                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Priority</label>
                                                <NativeSelect
                                                    options={[
                                                        { label: "High", value: "high" },
                                                        { label: "Medium", value: "medium" },
                                                        { label: "Low", value: "low" },
                                                    ]}
                                                    value={newPriority}
                                                    onChange={(e) => setNewPriority(e.target.value)}
                                                    className="w-full"
                                                    selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Due Date</label>
                                                <DatePicker
                                                    aria-label="Due Date"
                                                    value={newDueDate ? parseDate(newDueDate) : undefined}
                                                    onChange={(val) => setNewDueDate(val ? val.toString() : "")}
                                                />
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
                                                onClick={() => handleCreateTask(close)}
                                                isDisabled={!newTitle.trim() || isCreating}
                                            >
                                                {isCreating ? "Creating..." : "Create Task"}
                                            </Button>
                                        </div>
                                    </SlideoutMenu.Footer>
                                </>
                            )}
                        </SlideoutMenu>
                    </SlideoutMenu.Trigger>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricsChart04 
                        title={(taskStats?.total ?? 0).toString()} 
                        subtitle="Total Tasks" 
                        change={(taskStats?.pending ?? 0).toString()} 
                        changeTrend="positive" 
                        changeDescription="pending" 
                    />
                    <MetricsChart04 
                        title={(taskStats?.overdue ?? 0).toString()} 
                        subtitle="Overdue" 
                        change={(taskStats?.overdue ?? 0).toString()} 
                        changeTrend={(taskStats?.overdue ?? 0) > 0 ? "negative" : "positive"} 
                        changeDescription="need attention" 
                        chartColor="text-fg-error-secondary" 
                    />
                    <MetricsChart04 
                        title={(taskStats?.dueToday ?? 0).toString()} 
                        subtitle="Due Today" 
                        change={(taskStats?.dueToday ?? 0).toString()} 
                        changeTrend={(taskStats?.dueToday ?? 0) > 0 ? "negative" : "positive"} 
                        changeDescription="remaining" 
                        chartColor="text-fg-warning-secondary" 
                    />
                    <MetricsChart04 
                        title={(taskStats?.completed ?? 0).toString()} 
                        subtitle="Completed" 
                        change={taskStats?.total ? Math.round((taskStats.completed / taskStats.total) * 100).toString() + "%" : "0%"} 
                        changeTrend="positive" 
                        changeDescription="completion rate" 
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
                                <Table.Head id="actions" className="w-[80px]" />
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
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${item.done ? "text-tertiary line-through" : "text-primary"}`}>
                                                    {item.title}
                                                </span>
                                                {item.description && (
                                                    <span className="text-xs text-tertiary truncate max-w-[300px]">{item.description}</span>
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
                                                <ButtonUtility 
                                                    size="sm" 
                                                    color="tertiary" 
                                                    icon={Trash01} 
                                                    aria-label="Delete task"
                                                    onClick={() => handleDelete(item._id)}
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
                                                <Badge color={getPriorityColor(t.priority.charAt(0).toUpperCase() + t.priority.slice(1))} size="sm">
                                                    {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-tertiary">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className={t.overdue && !t.done ? "text-error-600 font-medium" : ""}>{t.dueDate}</span>
                                                    {t.overdue && !t.done && <span className="text-error-600 font-semibold">⚠️</span>}
                                                </div>
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
