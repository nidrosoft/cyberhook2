"use client";

import { useState } from "react";
import {
    CheckCircle,
    Circle,
    Plus,
    SearchLg,
    DotsVertical,
    Calendar,
    LayoutGrid01,
    List,
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

type Task = {
    id: string;
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
    dueDate: string;
    dueDateRaw: string;
    assignee: { name: string; avatar: string };
    relatedLead: string;
    status: "To Do" | "In Progress" | "Done";
    overdue: boolean;
    done: boolean;
};

const initialTasks: Task[] = [
    {
        id: "tsk-1",
        title: "Follow up with Acme Corp CEO",
        description: "",
        priority: "High",
        dueDate: "Today",
        dueDateRaw: "2026-03-08",
        assignee: { name: "Sarah Jenkins", avatar: "https://i.pravatar.cc/150?img=47" },
        relatedLead: "Acme Corp",
        status: "To Do",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-2",
        title: "Send proposal to TechNexus",
        description: "",
        priority: "Medium",
        dueDate: "Today",
        dueDateRaw: "2026-03-08",
        assignee: { name: "Mike Ross", avatar: "https://i.pravatar.cc/150?img=11" },
        relatedLead: "TechNexus",
        status: "To Do",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-3",
        title: "Schedule demo with GlobalLogistics",
        description: "",
        priority: "Low",
        dueDate: "Tomorrow",
        dueDateRaw: "2026-03-09",
        assignee: { name: "Sarah Jenkins", avatar: "https://i.pravatar.cc/150?img=47" },
        relatedLead: "GlobalLogistics",
        status: "To Do",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-4",
        title: "Review exposure report for FinServe",
        description: "",
        priority: "High",
        dueDate: "Today",
        dueDateRaw: "2026-03-08",
        assignee: { name: "Jessica Pearson", avatar: "https://i.pravatar.cc/150?img=32" },
        relatedLead: "FinServe",
        status: "In Progress",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-5",
        title: "Update battlecard for CrowdStrike",
        description: "",
        priority: "Medium",
        dueDate: "Mar 10",
        dueDateRaw: "2026-03-10",
        assignee: { name: "Mike Ross", avatar: "https://i.pravatar.cc/150?img=11" },
        relatedLead: "",
        status: "To Do",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-6",
        title: "Prep slides for Channel Partners",
        description: "",
        priority: "High",
        dueDate: "Mar 12",
        dueDateRaw: "2026-03-12",
        assignee: { name: "Sarah Jenkins", avatar: "https://i.pravatar.cc/150?img=47" },
        relatedLead: "",
        status: "In Progress",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-7",
        title: "Submit SOC2 renewal paperwork",
        description: "",
        priority: "Medium",
        dueDate: "Mar 15",
        dueDateRaw: "2026-03-15",
        assignee: { name: "Jessica Pearson", avatar: "https://i.pravatar.cc/150?img=32" },
        relatedLead: "",
        status: "To Do",
        overdue: false,
        done: false,
    },
    {
        id: "tsk-8",
        title: "Send campaign report to management",
        description: "",
        priority: "Low",
        dueDate: "Mar 7",
        dueDateRaw: "2026-03-07",
        assignee: { name: "Sarah Jenkins", avatar: "https://i.pravatar.cc/150?img=47" },
        relatedLead: "",
        status: "Done",
        overdue: false,
        done: true,
    },
    {
        id: "tsk-9",
        title: "Complete RSAC registration",
        description: "",
        priority: "Low",
        dueDate: "Mar 6",
        dueDateRaw: "2026-03-06",
        assignee: { name: "Mike Ross", avatar: "https://i.pravatar.cc/150?img=11" },
        relatedLead: "",
        status: "Done",
        overdue: false,
        done: true,
    },
    {
        id: "tsk-10",
        title: "Call back John Smith at Acme",
        description: "",
        priority: "High",
        dueDate: "Yesterday",
        dueDateRaw: "2026-03-07",
        assignee: { name: "Sarah Jenkins", avatar: "https://i.pravatar.cc/150?img=47" },
        relatedLead: "Acme Corp",
        status: "To Do",
        overdue: true,
        done: false,
    },
    {
        id: "tsk-11",
        title: "Follow up on insurance renewal",
        description: "",
        priority: "Medium",
        dueDate: "Yesterday",
        dueDateRaw: "2026-03-07",
        assignee: { name: "Jessica Pearson", avatar: "https://i.pravatar.cc/150?img=32" },
        relatedLead: "Pacific Insurance",
        status: "To Do",
        overdue: true,
        done: false,
    },
    {
        id: "tsk-12",
        title: "Research CityGov RFP requirements",
        description: "",
        priority: "High",
        dueDate: "2 days ago",
        dueDateRaw: "2026-03-06",
        assignee: { name: "Mike Ross", avatar: "https://i.pravatar.cc/150?img=11" },
        relatedLead: "CityGov",
        status: "To Do",
        overdue: true,
        done: false,
    },
];

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

const leadOptions = [
    { label: "None", value: "" },
    { label: "Acme Corp", value: "Acme Corp" },
    { label: "TechNexus", value: "TechNexus" },
    { label: "GlobalLogistics", value: "GlobalLogistics" },
    { label: "FinServe", value: "FinServe" },
    { label: "Pacific Insurance", value: "Pacific Insurance" },
    { label: "CityGov", value: "CityGov" },
];

export default function TodosPage() {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("dueDate");
    const [viewMode, setViewMode] = useState<"list" | "board">("list");

    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newPriority, setNewPriority] = useState("Medium");
    const [newDueDate, setNewDueDate] = useState("");
    const [newAssignee, setNewAssignee] = useState("Sarah Jenkins");
    const [newLead, setNewLead] = useState("");

    const toggleDone = (id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, done: !t.done, status: !t.done ? "Done" : "To Do" }
                    : t,
            ),
        );
    };

    const handleCreateTask = (): boolean => {
        if (!newTitle.trim()) return false;
        const avatarMap: Record<string, string> = {
            "Sarah Jenkins": "https://i.pravatar.cc/150?img=47",
            "Mike Ross": "https://i.pravatar.cc/150?img=11",
            "Jessica Pearson": "https://i.pravatar.cc/150?img=32",
        };
        const task: Task = {
            id: `tsk-${Date.now()}`,
            title: newTitle,
            description: newDescription,
            priority: newPriority as Task["priority"],
            dueDate: newDueDate || "No date",
            dueDateRaw: newDueDate || "",
            assignee: { name: newAssignee, avatar: avatarMap[newAssignee] || "https://i.pravatar.cc/150?img=47" },
            relatedLead: newLead,
            status: "To Do",
            overdue: false,
            done: false,
        };
        setTasks((prev) => [task, ...prev]);
        setNewTitle("");
        setNewDescription("");
        setNewPriority("Medium");
        setNewDueDate("");
        setNewAssignee("Sarah Jenkins");
        setNewLead("");
        return true;
    };

    const filtered = tasks.filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (assigneeFilter !== "all" && t.assignee.name !== assigneeFilter) return false;
        return true;
    });

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
                                                        { label: "High", value: "High" },
                                                        { label: "Medium", value: "Medium" },
                                                        { label: "Low", value: "Low" },
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
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Assignee</label>
                                                <NativeSelect
                                                    options={[
                                                        { label: "Sarah Jenkins", value: "Sarah Jenkins" },
                                                        { label: "Mike Ross", value: "Mike Ross" },
                                                        { label: "Jessica Pearson", value: "Jessica Pearson" },
                                                    ]}
                                                    value={newAssignee}
                                                    onChange={(e) => setNewAssignee(e.target.value)}
                                                    className="w-full"
                                                    selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1.5">Related Lead</label>
                                                <NativeSelect
                                                    options={leadOptions}
                                                    value={newLead}
                                                    onChange={(e) => setNewLead(e.target.value)}
                                                    className="w-full"
                                                    selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
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
                                                onClick={() => {
                                                    if (handleCreateTask()) close();
                                                }}
                                            >
                                                Create Task
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
                    <MetricsChart04 title="12" subtitle="Total Tasks" change="5" changeTrend="positive" changeDescription="new this week" />
                    <MetricsChart04 title="3" subtitle="Overdue" change="3" changeTrend="negative" changeDescription="need attention" chartColor="text-fg-error-secondary" />
                    <MetricsChart04 title="4" subtitle="Due Today" change="4" changeTrend="negative" changeDescription="remaining" chartColor="text-fg-warning-secondary" />
                    <MetricsChart04 title="22" subtitle="Completed This Week" change="38%" changeTrend="positive" changeDescription="completion rate" />
                </div>

                {/* Filter Bar */}
                <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                    <div className="min-w-0 flex-1">
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
                    <div className="h-8 w-px shrink-0 bg-secondary" />
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
                        aria-label="Assignee"
                        value={assigneeFilter}
                        onChange={(v) => setAssigneeFilter(v)}
                        options={assigneeOptions}
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

                {/* Task Table */}
                {viewMode === "list" ? (
                    <TableCard.Root className="rounded-xl border border-secondary shadow-sm bg-primary">
                        <TableCard.Header title="Tasks" badge={`${filtered.length} tasks`} />

                        <Table
                            aria-label="Tasks List"
                            className="bg-primary w-full"
                        >
                            <Table.Header className="bg-secondary_subtle">
                                <Table.Head id="check" className="w-[50px]" />
                                <Table.Head id="title" label="Task" isRowHeader className="w-full min-w-[250px]" />
                                <Table.Head id="priority" label="Priority" className="min-w-[100px]" />
                                <Table.Head id="dueDate" label="Due Date" className="min-w-[140px]" />
                                <Table.Head id="assignee" label="Assignee" className="min-w-[160px]" />
                                <Table.Head id="lead" label="Related Lead" className="min-w-[130px]" />
                                <Table.Head id="status" label="Status" className="min-w-[110px]" />
                                <Table.Head id="actions" className="w-[60px]" />
                            </Table.Header>

                            <Table.Body items={filtered}>
                                {(item) => (
                                    <Table.Row
                                        id={item.id}
                                        className={item.overdue && !item.done ? "bg-error-50 dark:bg-error-950/20" : ""}
                                    >
                                        <Table.Cell>
                                            <button
                                                onClick={() => toggleDone(item.id)}
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
                                            <span className={`font-medium ${item.done ? "text-tertiary line-through" : "text-primary"}`}>
                                                {item.title}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color={getPriorityColor(item.priority)} size="sm">
                                                {item.priority}
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
                                            <div className="flex items-center gap-2">
                                                <Avatar size="xs" src={item.assignee.avatar} alt={item.assignee.name} />
                                                <span className="text-sm text-secondary">{item.assignee.name}</span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-secondary text-sm">{item.relatedLead || "—"}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color={getStatusColor(item.status)} size="sm">
                                                {item.status}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell className="px-4">
                                            <div className="flex justify-end">
                                                <ButtonUtility size="sm" color="tertiary" icon={DotsVertical} aria-label="More options" />
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </TableCard.Root>
                ) : (
                    /* Board / Kanban View */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(["To Do", "In Progress", "Done"] as const).map((col) => {
                            const colTasks = filtered.filter((t) => t.status === col);
                            const colColor = col === "To Do" ? "bg-gray-50 dark:bg-gray-900" : col === "In Progress" ? "bg-brand-50 dark:bg-brand-950" : "bg-success-50 dark:bg-success-950";
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
                                                <button onClick={() => toggleDone(t.id)} className="mt-0.5 shrink-0">
                                                    {t.done ? <CheckCircle className="w-4 h-4 text-success-500" /> : <Circle className="w-4 h-4 text-tertiary" />}
                                                </button>
                                                <span className={`flex-1 text-sm font-medium ${t.done ? "line-through text-tertiary" : "text-primary"}`}>{t.title}</span>
                                                <Badge color={getPriorityColor(t.priority)} size="sm">{t.priority}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-tertiary">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className={t.overdue && !t.done ? "text-error-600 font-medium" : ""}>{t.dueDate}</span>
                                                    {t.overdue && !t.done && <span className="text-error-600 font-semibold">⚠️</span>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Avatar size="xxs" src={t.assignee.avatar} alt={t.assignee.name} />
                                                    <span>{t.assignee.name}</span>
                                                </div>
                                            </div>
                                            {t.relatedLead && (
                                                <span className="text-xs text-quaternary">{t.relatedLead}</span>
                                            )}
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
