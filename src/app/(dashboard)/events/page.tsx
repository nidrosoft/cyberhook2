"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import {
    Plus,
    SearchLg,
    Calendar,
    MarkerPin01,
    Clock,
    ChevronLeft,
    ChevronRight,
    VideoRecorder,
    User01,
    Ticket01,
    Bell01,
    Trash01,
    Edit05,
} from "@untitledui/icons";

import { Table, TableCard } from "@/components/application/table/table";
import { MetricsChart04 } from "@/components/application/metrics/metrics";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { Tabs } from "@/components/application/tabs/tabs";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { NativeSelect } from "@/components/base/select/select-native";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Toggle } from "@/components/base/toggle/toggle";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { parseDate } from "@internationalized/date";

const TYPE_LABELS: Record<string, string> = {
    meeting: "Meeting",
    appointment: "Appointment",
    conference: "Conference",
    webinar: "Webinar",
    call: "Call",
    trade_show: "Trade Show",
    networking: "Networking",
    workshop: "Workshop",
    lunch_and_learn: "Lunch & Learn",
    other: "Other",
};

const CALENDAR_COLORS = [
    "bg-brand-500",
    "bg-purple-500",
    "bg-success-500",
    "bg-warning-500",
    "bg-error-500",
    "bg-blue-500",
];

const typeFilterOptions = [
    { label: "All Types", value: "all" },
    { label: "Conference", value: "conference" },
    { label: "Trade Show", value: "trade_show" },
    { label: "Webinar", value: "webinar" },
    { label: "Workshop", value: "workshop" },
    { label: "Networking", value: "networking" },
    { label: "Lunch & Learn", value: "lunch_and_learn" },
    { label: "Meeting", value: "meeting" },
    { label: "Appointment", value: "appointment" },
    { label: "Call", value: "call" },
    { label: "Other", value: "other" },
];

const dateRangeOptions = [
    { label: "All", value: "all" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Next 30 Days", value: "30" },
    { label: "Next 90 Days", value: "90" },
];

const locationFilterOptions = [
    { label: "All Locations", value: "all" },
    { label: "In Person", value: "in-person" },
    { label: "Virtual", value: "virtual" },
];

const eventTypeOptions = [
    { label: "Conference", value: "conference" },
    { label: "Trade Show", value: "trade_show" },
    { label: "Webinar", value: "webinar" },
    { label: "Workshop", value: "workshop" },
    { label: "Networking", value: "networking" },
    { label: "Lunch & Learn", value: "lunch_and_learn" },
    { label: "Meeting", value: "meeting" },
    { label: "Appointment", value: "appointment" },
    { label: "Call", value: "call" },
    { label: "Other", value: "other" },
];

function getFormatColor(isVirtual: boolean | undefined): "brand" | "success" {
    return isVirtual ? "success" : "brand";
}

function buildGoogleCalendarUrl(event: { title: string; startDate: number; endDate?: number; location?: string; description?: string; isVirtual?: boolean }) {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const start = fmt(new Date(event.startDate));
    const end = fmt(new Date(event.endDate || event.startDate + 60 * 60 * 1000));
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${start}/${end}`,
        ...(event.location && !event.isVirtual ? { location: event.location } : {}),
        ...(event.description ? { details: event.description } : {}),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarUrl(event: { title: string; startDate: number; endDate?: number; location?: string; description?: string; isVirtual?: boolean }) {
    const iso = (d: Date) => d.toISOString();
    const params = new URLSearchParams({
        path: "/calendar/action/compose",
        rru: "addevent",
        subject: event.title,
        startdt: iso(new Date(event.startDate)),
        enddt: iso(new Date(event.endDate || event.startDate + 60 * 60 * 1000)),
        ...(event.location && !event.isVirtual ? { location: event.location } : {}),
        ...(event.description ? { body: event.description } : {}),
    });
    return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function getTypeColor(type: string): "brand" | "success" | "warning" | "gray" | "error" {
    if (type === "conference" || type === "trade_show") return "brand";
    if (type === "webinar" || type === "workshop") return "success";
    if (type === "call" || type === "lunch_and_learn") return "warning";
    if (type === "meeting" || type === "networking") return "gray";
    if (type === "appointment") return "gray";
    return "error";
}

function formatEventDate(startDate: number, endDate?: number): string {
    const start = new Date(startDate);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const startStr = start.toLocaleDateString("en-US", opts);
    if (!endDate || endDate === startDate) return startStr;
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startStr} - ${end.toLocaleDateString("en-US", opts)}`;
}

function formatAppointmentDateTime(startDate: number): string {
    const d = new Date(startDate);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function EventCalendar({ events }: { events: Array<{ title: string; startDate: number; endDate?: number }> }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const now = new Date();
    const currentMonth = now.getMonth() + monthOffset;
    const date = new Date(now.getFullYear(), currentMonth, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleString("default", { month: "long" });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const todayDate = new Date();
    const isCurrentMonth = todayDate.getMonth() === month && todayDate.getFullYear() === year;
    const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

    const calendarEvents = useMemo(() => {
        return events
            .filter((ev) => {
                const evDate = new Date(ev.startDate);
                const evEndDate = ev.endDate ? new Date(ev.endDate) : evDate;
                const monthStart = new Date(year, month, 1).getTime();
                const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).getTime();
                return evDate.getTime() <= monthEnd && evEndDate.getTime() >= monthStart;
            })
            .map((ev, i) => {
                const evStart = new Date(ev.startDate);
                const evEnd = ev.endDate ? new Date(ev.endDate) : evStart;
                return {
                    day: evStart.getMonth() === month ? evStart.getDate() : 1,
                    endDay: evEnd.getMonth() === month ? evEnd.getDate() : daysInMonth,
                    label: ev.title,
                    color: CALENDAR_COLORS[i % CALENDAR_COLORS.length],
                };
            });
    }, [events, year, month, daysInMonth]);

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return (
        <div className="rounded-xl border border-secondary bg-primary p-3 sm:p-6 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
                <Button color="secondary" size="sm" iconLeading={ChevronLeft} onClick={() => setMonthOffset((p) => p - 1)}>
                    Prev
                </Button>
                <h3 className="text-lg font-semibold text-primary">{monthName} {year}</h3>
                <Button color="secondary" size="sm" iconTrailing={ChevronRight} onClick={() => setMonthOffset((p) => p + 1)}>
                    Next
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-px min-w-[500px]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-tertiary py-2">{d}</div>
                ))}
                {days.map((day, i) => {
                    const eventsForDay = calendarEvents.filter((e) => {
                        if (e.endDay) return day !== null && day >= e.day && day <= e.endDay;
                        return day === e.day;
                    });
                    const isToday = day === todayDay;
                    return (
                        <div
                            key={i}
                            className={`min-h-[60px] sm:min-h-[80px] border border-secondary/50 p-1 sm:p-1.5 text-sm ${
                                day === null ? "bg-secondary_subtle/50" : "bg-primary"
                            } ${isToday ? "ring-2 ring-brand-500 ring-inset rounded-md" : ""}`}
                        >
                            {day !== null && (
                                <>
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                        isToday ? "bg-brand-500 text-white font-semibold" : "text-secondary"
                                    }`}>
                                        {day}
                                    </span>
                                    {eventsForDay.length > 0 && (
                                        <div className="mt-1 flex flex-col gap-0.5">
                                            {eventsForDay.map((ev, j) => (
                                                <div key={j} className="flex items-center gap-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.color}`} />
                                                    <span className="text-[10px] text-secondary truncate leading-tight">{ev.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function EventsPage() {
    const userData = useQuery(api.users.getCurrentUserWithCompany);
    const companyId = userData?.company?._id;
    const userId = userData?.user?._id;

    const allEvents = useQuery(
        api.events.list,
        companyId ? { companyId } : "skip"
    );

    const stats = useQuery(
        api.events.getStats,
        companyId ? { companyId } : "skip"
    );

    const createEvent = useMutation(api.events.create);
    const updateEvent = useMutation(api.events.update);
    const removeEvent = useMutation(api.events.remove);

    const [evtSearch, setEvtSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [locFilter, setLocFilter] = useState("all");

    const [evtTitle, setEvtTitle] = useState("");
    const [evtType, setEvtType] = useState("conference");
    const [evtStartDate, setEvtStartDate] = useState("");
    const [evtStartTime, setEvtStartTime] = useState("");
    const [evtEndDate, setEvtEndDate] = useState("");
    const [evtLocation, setEvtLocation] = useState("");
    const [evtIsVirtual, setEvtIsVirtual] = useState(false);
    const [evtDescription, setEvtDescription] = useState("");
    const [evtOrganizer, setEvtOrganizer] = useState("");
    const [evtTicketUrl, setEvtTicketUrl] = useState("");
    const [evtTicketCost, setEvtTicketCost] = useState("");
    const [evtReminderDays, setEvtReminderDays] = useState("");

    const [aptTitle, setAptTitle] = useState("");
    const [aptDate, setAptDate] = useState("");
    const [aptTime, setAptTime] = useState("");
    const [aptDuration, setAptDuration] = useState("30");
    const [aptNotes, setAptNotes] = useState("");

    const [viewingEvent, setViewingEvent] = useState<typeof events[0] | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [showEditSlideout, setShowEditSlideout] = useState(false);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [showArchived, setShowArchived] = useState(false);

    if (!userData) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-primary">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <p className="text-sm text-tertiary">Loading...</p>
                </div>
            </div>
        );
    }

    const events = allEvents ?? [];

    const suggestedEvents = events.filter((e) => e.isSuggested && !e.isArchived);

    const filteredEvents = events
        .filter((e) => {
            if (e.isSuggested) return false;
            if (!showArchived && e.isArchived) return false;
            if (showArchived && !e.isArchived) return false;
            if (evtSearch && !e.title.toLowerCase().includes(evtSearch.toLowerCase())) return false;
            if (typeFilter !== "all" && e.type !== typeFilter) return false;
            if (locFilter === "virtual" && !e.isVirtual) return false;
            if (locFilter === "in-person" && e.isVirtual) return false;
            if (dateRange !== "all") {
                const now = Date.now();
                if (dateRange === "week" && e.startDate > now + 7 * 24 * 60 * 60 * 1000) return false;
                if (dateRange === "month" && e.startDate > now + 30 * 24 * 60 * 60 * 1000) return false;
                if (dateRange === "30" && e.startDate > now + 30 * 24 * 60 * 60 * 1000) return false;
                if (dateRange === "90" && e.startDate > now + 90 * 24 * 60 * 60 * 1000) return false;
            }
            return true;
        })
        .sort((a, b) => sortOrder === "asc" ? a.startDate - b.startDate : b.startDate - a.startDate);

    const appointmentEvents = events.filter(
        (e) => !e.isArchived && (e.type === "meeting" || e.type === "appointment")
    );

    type EventType = "meeting" | "appointment" | "conference" | "webinar" | "call" | "trade_show" | "networking" | "workshop" | "lunch_and_learn" | "other";

    function resetEvtForm() {
        setEvtTitle(""); setEvtType("conference"); setEvtStartDate(""); setEvtStartTime("");
        setEvtEndDate(""); setEvtLocation(""); setEvtIsVirtual(false); setEvtDescription("");
        setEvtOrganizer(""); setEvtTicketUrl(""); setEvtTicketCost(""); setEvtReminderDays("");
        setEditingEventId(null);
    }

    function populateEvtForm(ev: typeof events[0]) {
        setEditingEventId(ev._id);
        setEvtTitle(ev.title);
        setEvtType(ev.type);
        const sd = new Date(ev.startDate);
        setEvtStartDate(`${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`);
        setEvtStartTime(`${String(sd.getHours()).padStart(2, "0")}:${String(sd.getMinutes()).padStart(2, "0")}`);
        if (ev.endDate) {
            const ed = new Date(ev.endDate);
            setEvtEndDate(`${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`);
        } else { setEvtEndDate(""); }
        setEvtLocation(ev.location || "");
        setEvtIsVirtual(ev.isVirtual ?? false);
        setEvtDescription(ev.description || "");
        setEvtOrganizer(ev.organizer || "");
        setEvtTicketUrl(ev.ticketUrl || "");
        setEvtTicketCost(ev.ticketCost != null ? String(ev.ticketCost) : "");
        if (ev.reminderDate && ev.startDate) {
            const daysBefore = Math.round((ev.startDate - ev.reminderDate) / (24 * 60 * 60 * 1000));
            setEvtReminderDays(daysBefore > 0 ? String(daysBefore) : "");
        } else { setEvtReminderDays(""); }
    }

    const handleCreateEvent = async (close: () => void) => {
        if (!evtTitle.trim() || !evtType || !evtStartDate || !companyId || !userId) return;

        const [y, m, d] = evtStartDate.split("-").map(Number);
        const [hours, minutes] = evtStartTime ? evtStartTime.split(":").map(Number) : [0, 0];
        const startMs = new Date(y, m - 1, d, hours, minutes).getTime();

        let endMs: number | undefined;
        if (evtEndDate) {
            const [ey, em, ed] = evtEndDate.split("-").map(Number);
            endMs = new Date(ey, em - 1, ed, 23, 59).getTime();
        }

        let reminderMs: number | undefined;
        if (evtReminderDays && parseInt(evtReminderDays) > 0) {
            reminderMs = startMs - parseInt(evtReminderDays) * 24 * 60 * 60 * 1000;
        }

        if (editingEventId) {
            await updateEvent({
                id: editingEventId as any,
                title: evtTitle,
                type: evtType as EventType,
                startDate: startMs,
                endDate: endMs,
                location: evtLocation || undefined,
                isVirtual: evtIsVirtual,
                description: evtDescription || undefined,
                organizer: evtOrganizer.trim() || undefined,
                ticketUrl: evtTicketUrl.trim() || undefined,
                ticketCost: evtTicketCost ? parseFloat(evtTicketCost) : undefined,
                reminderDate: reminderMs,
            });
            toast.success("Event updated");
        } else {
            await createEvent({
                companyId,
                createdByUserId: userId,
                title: evtTitle,
                type: evtType as EventType,
                startDate: startMs,
                endDate: endMs,
                location: evtLocation || undefined,
                isVirtual: evtIsVirtual,
                description: evtDescription || undefined,
                organizer: evtOrganizer.trim() || undefined,
                ticketUrl: evtTicketUrl.trim() || undefined,
                ticketCost: evtTicketCost ? parseFloat(evtTicketCost) : undefined,
                reminderDate: reminderMs,
            });
            toast.success("Event created");
        }

        resetEvtForm();
        close();
    };

    const handleArchiveEvent = async (id: string, archive: boolean) => {
        try {
            await updateEvent({ id: id as any, isArchived: archive });
            toast.success(archive ? "Event archived" : "Event restored");
            if (viewingEvent?._id === id) setViewingEvent(null);
        } catch { toast.error("Failed to update event"); }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Delete this event?")) return;
        try {
            await removeEvent({ id: id as any });
            toast.success("Event deleted");
            if (viewingEvent?._id === id) setViewingEvent(null);
        } catch { toast.error("Failed to delete event"); }
    };

    const handleSchedule = async (close: () => void) => {
        if (!aptTitle.trim() || !companyId || !userId) return;

        let startMs = Date.now();
        if (aptDate) {
            const [y, m, d] = aptDate.split("-").map(Number);
            const [hours, minutes] = aptTime ? aptTime.split(":").map(Number) : [0, 0];
            startMs = new Date(y, m - 1, d, hours, minutes).getTime();
        }

        const durationMs = parseInt(aptDuration) * 60 * 1000;

        await createEvent({
            companyId,
            createdByUserId: userId,
            title: aptTitle,
            type: "appointment",
            startDate: startMs,
            endDate: startMs + durationMs,
            description: aptNotes || undefined,
            isVirtual: true,
        });

        toast.success("Appointment scheduled");
        setAptTitle("");
        setAptDate("");
        setAptTime("");
        setAptDuration("30");
        setAptNotes("");
        close();
    };

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-display-sm font-semibold text-primary">Events</h1>
                            <p className="text-md text-tertiary">
                                Industry conferences, appointments, and calendar
                            </p>
                        </div>
                        <SlideoutMenu.Trigger>
                            <Button color="primary" size="sm" iconLeading={Plus} onClick={() => resetEvtForm()}>
                                New Event
                            </Button>
                            <SlideoutMenu>
                                {({ close }) => (
                                    <>
                                        <SlideoutMenu.Header onClose={close}>
                                            <h2 className="text-lg font-semibold text-primary">{editingEventId ? "Edit Event" : "New Event"}</h2>
                                        </SlideoutMenu.Header>
                                        <SlideoutMenu.Content>
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Title *</label>
                                                    <input
                                                        type="text"
                                                        value={evtTitle}
                                                        onChange={(e) => setEvtTitle(e.target.value)}
                                                        placeholder="Event title..."
                                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Type *</label>
                                                    <NativeSelect
                                                        options={eventTypeOptions}
                                                        value={evtType}
                                                        onChange={(e) => setEvtType(e.target.value)}
                                                        className="w-full"
                                                        selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Start Date *</label>
                                                    <DatePicker
                                                        aria-label="Start Date"
                                                        value={evtStartDate ? parseDate(evtStartDate) : undefined}
                                                        onChange={(val) => setEvtStartDate(val ? val.toString() : "")}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Start Time</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <NativeSelect
                                                            aria-label="Hour"
                                                            value={evtStartTime ? evtStartTime.split(":")[0] : ""}
                                                            onChange={(e) => {
                                                                const min = evtStartTime ? evtStartTime.split(":")[1] || "00" : "00";
                                                                setEvtStartTime(`${e.target.value}:${min}`);
                                                            }}
                                                            options={[
                                                                { label: "Hour", value: "" },
                                                                ...Array.from({ length: 24 }, (_, i) => ({
                                                                    label: String(i === 0 ? 12 : i > 12 ? i - 12 : i).padStart(2, "0"),
                                                                    value: String(i).padStart(2, "0"),
                                                                })),
                                                            ]}
                                                            className="w-full"
                                                            selectClassName="text-sm"
                                                        />
                                                        <NativeSelect
                                                            aria-label="Minute"
                                                            value={evtStartTime ? evtStartTime.split(":")[1] || "00" : ""}
                                                            onChange={(e) => {
                                                                const hr = evtStartTime ? evtStartTime.split(":")[0] || "09" : "09";
                                                                setEvtStartTime(`${hr}:${e.target.value}`);
                                                            }}
                                                            options={[
                                                                { label: "Min", value: "" },
                                                                ...Array.from({ length: 12 }, (_, i) => ({
                                                                    label: String(i * 5).padStart(2, "0"),
                                                                    value: String(i * 5).padStart(2, "0"),
                                                                })),
                                                            ]}
                                                            className="w-full"
                                                            selectClassName="text-sm"
                                                        />
                                                        <NativeSelect
                                                            aria-label="AM/PM"
                                                            value={evtStartTime && parseInt(evtStartTime.split(":")[0]) >= 12 ? "PM" : "AM"}
                                                            onChange={(e) => {
                                                                if (!evtStartTime) return;
                                                                let hr = parseInt(evtStartTime.split(":")[0]);
                                                                const min = evtStartTime.split(":")[1] || "00";
                                                                if (e.target.value === "PM" && hr < 12) hr += 12;
                                                                if (e.target.value === "AM" && hr >= 12) hr -= 12;
                                                                setEvtStartTime(`${String(hr).padStart(2, "0")}:${min}`);
                                                            }}
                                                            options={[
                                                                { label: "AM", value: "AM" },
                                                                { label: "PM", value: "PM" },
                                                            ]}
                                                            className="w-full"
                                                            selectClassName="text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">End Date</label>
                                                    <DatePicker
                                                        aria-label="End Date"
                                                        value={evtEndDate ? parseDate(evtEndDate) : undefined}
                                                        onChange={(val) => setEvtEndDate(val ? val.toString() : "")}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Location</label>
                                                    <input
                                                        type="text"
                                                        value={evtLocation}
                                                        onChange={(e) => setEvtLocation(e.target.value)}
                                                        placeholder="Location..."
                                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                    />
                                                </div>
                                                <div>
                                                    <Toggle
                                                        label="Is Virtual"
                                                        isSelected={evtIsVirtual}
                                                        onChange={setEvtIsVirtual}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Description</label>
                                                    <textarea
                                                        value={evtDescription}
                                                        onChange={(e) => setEvtDescription(e.target.value)}
                                                        placeholder="Event description..."
                                                        rows={3}
                                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary resize-none"
                                                    />
                                                </div>

                                                {/* Organizer, Tickets & Reminder */}
                                                <div className="border-t border-secondary pt-4 mt-1">
                                                    <h3 className="text-sm font-semibold text-primary mb-3">Additional Details</h3>
                                                    <div className="flex flex-col gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-secondary mb-1.5">Organizer</label>
                                                            <input type="text" value={evtOrganizer} onChange={(e) => setEvtOrganizer(e.target.value)}
                                                                placeholder="e.g. CompTIA, ConnectWise"
                                                                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Ticket URL</label>
                                                                <input type="url" value={evtTicketUrl} onChange={(e) => setEvtTicketUrl(e.target.value)}
                                                                    placeholder="https://..."
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Ticket Cost ($)</label>
                                                                <input type="number" value={evtTicketCost} onChange={(e) => setEvtTicketCost(e.target.value)}
                                                                    placeholder="0"
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-secondary mb-1.5">Reminder (days before)</label>
                                                            <NativeSelect
                                                                aria-label="Reminder"
                                                                value={evtReminderDays}
                                                                onChange={(e) => setEvtReminderDays(e.target.value)}
                                                                options={[
                                                                    { label: "No reminder", value: "" },
                                                                    { label: "1 day before", value: "1" },
                                                                    { label: "3 days before", value: "3" },
                                                                    { label: "7 days before", value: "7" },
                                                                    { label: "14 days before", value: "14" },
                                                                    { label: "30 days before", value: "30" },
                                                                ]}
                                                                className="w-full"
                                                                selectClassName="text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <div className="flex items-center justify-end gap-3">
                                                <Button color="secondary" onClick={() => { resetEvtForm(); close(); }}>Cancel</Button>
                                                <Button color="primary" onClick={() => handleCreateEvent(close)}>{editingEventId ? "Save Changes" : "Create"}</Button>
                                            </div>
                                        </SlideoutMenu.Footer>
                                    </>
                                )}
                            </SlideoutMenu>
                        </SlideoutMenu.Trigger>
                    </div>

                    {/* Tabs */}
                    <Tabs className="w-full">
                        <Tabs.List
                            size="sm"
                            type="underline"
                            className="mb-6"
                            items={[
                                { id: "upcoming", label: "Upcoming Events" },
                                { id: "suggested", label: `Suggested (${suggestedEvents.length})` },
                                { id: "calendar", label: "Calendar" },
                                { id: "appointments", label: "Appointments" },
                            ]}
                        >
                            {(item) => <Tabs.Item id={item.id}>{item.label}</Tabs.Item>}
                        </Tabs.List>

                        {/* =================== UPCOMING EVENTS TAB =================== */}
                        <Tabs.Panel id="upcoming">
                            <div className="flex flex-col gap-6">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                                    <MetricsChart04
                                        title={String(stats?.total ?? 0)}
                                        subtitle="Total Events"
                                        change={String(stats?.upcoming ?? 0)}
                                        changeTrend="positive"
                                        changeDescription="upcoming"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(stats?.thisWeek ?? 0)}
                                        subtitle="This Week"
                                        change={String(stats?.upcoming ?? 0)}
                                        changeTrend="positive"
                                        changeDescription="upcoming total"
                                        actions={false}
                                    />
                                    <MetricsChart04
                                        title={String(stats?.upcoming ?? 0)}
                                        subtitle="Upcoming"
                                        change={String(Object.keys(stats?.byType ?? {}).length)}
                                        changeTrend="positive"
                                        changeDescription="event types"
                                        actions={false}
                                    />
                                </div>

                                {/* Filter Row */}
                                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                                    <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                                        <InputBase
                                            type="text"
                                            size="sm"
                                            placeholder="Search events..."
                                            icon={SearchLg}
                                            value={evtSearch}
                                            onChange={(value: string) => setEvtSearch(value)}
                                        />
                                    </div>
                                    <div className="hidden sm:block h-8 w-px shrink-0 bg-secondary" />
                                    <div className="flex flex-wrap items-center gap-3">
                                        <FilterDropdown
                                            aria-label="Type"
                                            value={typeFilter}
                                            onChange={(v) => setTypeFilter(v)}
                                            options={typeFilterOptions}
                                        />
                                        <FilterDropdown
                                            aria-label="Date range"
                                            value={dateRange}
                                            onChange={(v) => setDateRange(v)}
                                            options={dateRangeOptions}
                                        />
                                        <FilterDropdown
                                            aria-label="Location"
                                            value={locFilter}
                                            onChange={(v) => setLocFilter(v)}
                                            options={locationFilterOptions}
                                        />
                                        <button
                                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary bg-primary text-sm text-secondary hover:bg-secondary_subtle transition-colors"
                                        >
                                            Date {sortOrder === "asc" ? "↑" : "↓"}
                                        </button>
                                        <button
                                            onClick={() => setShowArchived(!showArchived)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${showArchived ? "border-brand-500 bg-brand-50 text-brand-700" : "border-primary bg-primary text-secondary hover:bg-secondary_subtle"}`}
                                        >
                                            {showArchived ? "Showing Archived" : "Show Archived"}
                                        </button>
                                    </div>
                                </div>

                                {/* Events Table */}
                                <TableCard.Root>
                                    <TableCard.Header title={showArchived ? "Archived Events" : "Upcoming Events"} badge={`${filteredEvents.length} events`} />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Events Schedule">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader>Event Name</Table.Head>
                                                <Table.Head id="type">Type</Table.Head>
                                                <Table.Head id="location">Location</Table.Head>
                                                <Table.Head id="date">Date</Table.Head>
                                                <Table.Head id="format">Format</Table.Head>
                                                <Table.Head id="actions" className="w-[180px]">Actions</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={filteredEvents.map((e) => ({ ...e, id: e._id }))}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                                                <Calendar className="w-5 h-5 text-tertiary" />
                                                            </div>
                                                            <span className="font-medium text-primary">{item.title}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getTypeColor(item.type)} size="sm">
                                                            {TYPE_LABELS[item.type] ?? item.type}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <MarkerPin01 className="w-4 h-4 text-tertiary" />
                                                            <span className="text-secondary text-sm">
                                                                {item.isVirtual ? "Virtual" : (item.location || "TBD")}
                                                            </span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary text-sm">
                                                            {formatEventDate(item.startDate, item.endDate)}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getFormatColor(item.isVirtual)} size="sm">
                                                            {item.isVirtual ? "Virtual" : "In Person"}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1">
                                                            <Button size="sm" color="secondary" onClick={() => setViewingEvent(item)}>
                                                                View
                                                            </Button>
                                                            <button onClick={() => { populateEvtForm(item); setShowEditSlideout(true); }} className="p-1.5 rounded-md text-tertiary hover:text-brand-secondary hover:bg-brand-secondary_alt transition-colors" aria-label="Edit">
                                                                <Edit05 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleArchiveEvent(item._id, !item.isArchived)} className="p-1.5 rounded-md text-tertiary hover:text-warning-primary hover:bg-warning-secondary transition-colors" aria-label={item.isArchived ? "Restore" : "Archive"} title={item.isArchived ? "Restore" : "Archive"}>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-2-3H6L4 7m16 0v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7m16 0H4m8 4v6m-3-3l3 3 3-3" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteEvent(item._id)} className="p-1.5 rounded-md text-tertiary hover:text-error-primary hover:bg-error-secondary transition-colors" aria-label="Delete">
                                                                <Trash01 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* =================== SUGGESTED EVENTS TAB =================== */}
                        <Tabs.Panel id="suggested">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-semibold text-primary">Suggested Industry Events</h3>
                                    <p className="text-sm text-tertiary">Curated events recommended for your team. Add them to your calendar to stay up to date.</p>
                                </div>

                                {suggestedEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <Calendar className="w-10 h-10 text-quaternary" />
                                        <p className="text-sm text-tertiary">No suggested events available right now.</p>
                                        <p className="text-xs text-quaternary">Check back later for recommended industry events.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {suggestedEvents
                                            .sort((a, b) => a.startDate - b.startDate)
                                            .map((ev) => (
                                                <div key={ev._id} className="flex flex-col gap-3 p-5 border border-secondary rounded-xl bg-primary hover:border-brand-secondary transition-colors">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <span className="text-sm font-semibold text-primary truncate">{ev.title}</span>
                                                            <Badge color={getTypeColor(ev.type)} size="sm">{TYPE_LABELS[ev.type] || ev.type}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 text-xs text-secondary">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-tertiary shrink-0" />
                                                            <span>{formatEventDate(ev.startDate, ev.endDate)}</span>
                                                        </div>
                                                        {(ev.location || ev.isVirtual) && (
                                                            <div className="flex items-center gap-1.5">
                                                                <MarkerPin01 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                                                                <span>{ev.isVirtual ? "Virtual" : ev.location}</span>
                                                            </div>
                                                        )}
                                                        {ev.organizer && (
                                                            <div className="flex items-center gap-1.5">
                                                                <User01 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                                                                <span>{ev.organizer}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {ev.description && (
                                                        <p className="text-xs text-tertiary line-clamp-2">{ev.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-secondary">
                                                        <a
                                                            href={buildGoogleCalendarUrl(ev)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-secondary bg-primary text-xs font-medium text-secondary hover:bg-secondary_hover transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            Google
                                                        </a>
                                                        <a
                                                            href={buildOutlookCalendarUrl(ev)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-secondary bg-primary text-xs font-medium text-secondary hover:bg-secondary_hover transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            Outlook
                                                        </a>
                                                        <button
                                                            onClick={() => setViewingEvent(ev)}
                                                            className="ml-auto text-xs font-medium text-brand-secondary hover:underline"
                                                        >
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </Tabs.Panel>

                        {/* =================== CALENDAR TAB =================== */}
                        <Tabs.Panel id="calendar">
                            <EventCalendar events={events.filter(e => !e.isArchived && !e.isSuggested)} />
                        </Tabs.Panel>

                        {/* =================== APPOINTMENTS TAB =================== */}
                        <Tabs.Panel id="appointments">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-primary">Appointments</h2>
                                        <p className="text-sm text-tertiary">Upcoming meetings and calls</p>
                                    </div>
                                    <SlideoutMenu.Trigger>
                                        <Button color="primary" size="sm" iconLeading={Plus}>
                                            Schedule Appointment
                                        </Button>
                                        <SlideoutMenu>
                                            {({ close }) => (
                                                <>
                                                    <SlideoutMenu.Header onClose={close}>
                                                        <h2 className="text-lg font-semibold text-primary">Schedule Appointment</h2>
                                                    </SlideoutMenu.Header>
                                                    <SlideoutMenu.Content>
                                                        <div className="flex flex-col gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Title *</label>
                                                                <input
                                                                    type="text"
                                                                    value={aptTitle}
                                                                    onChange={(e) => setAptTitle(e.target.value)}
                                                                    placeholder="Meeting title..."
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Date</label>
                                                                <DatePicker
                                                                    aria-label="Appointment Date"
                                                                    value={aptDate ? parseDate(aptDate) : undefined}
                                                                    onChange={(val) => setAptDate(val ? val.toString() : "")}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Time</label>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    <NativeSelect
                                                                        aria-label="Hour"
                                                                        value={aptTime ? aptTime.split(":")[0] : ""}
                                                                        onChange={(e) => {
                                                                            const min = aptTime ? aptTime.split(":")[1] || "00" : "00";
                                                                            setAptTime(`${e.target.value}:${min}`);
                                                                        }}
                                                                        options={[
                                                                            { label: "Hour", value: "" },
                                                                            ...Array.from({ length: 24 }, (_, i) => ({
                                                                                label: String(i === 0 ? 12 : i > 12 ? i - 12 : i).padStart(2, "0"),
                                                                                value: String(i).padStart(2, "0"),
                                                                            })),
                                                                        ]}
                                                                        className="w-full"
                                                                        selectClassName="text-sm"
                                                                    />
                                                                    <NativeSelect
                                                                        aria-label="Minute"
                                                                        value={aptTime ? aptTime.split(":")[1] || "00" : ""}
                                                                        onChange={(e) => {
                                                                            const hr = aptTime ? aptTime.split(":")[0] || "09" : "09";
                                                                            setAptTime(`${hr}:${e.target.value}`);
                                                                        }}
                                                                        options={[
                                                                            { label: "Min", value: "" },
                                                                            ...Array.from({ length: 12 }, (_, i) => ({
                                                                                label: String(i * 5).padStart(2, "0"),
                                                                                value: String(i * 5).padStart(2, "0"),
                                                                            })),
                                                                        ]}
                                                                        className="w-full"
                                                                        selectClassName="text-sm"
                                                                    />
                                                                    <NativeSelect
                                                                        aria-label="AM/PM"
                                                                        value={aptTime && parseInt(aptTime.split(":")[0]) >= 12 ? "PM" : "AM"}
                                                                        onChange={(e) => {
                                                                            if (!aptTime) return;
                                                                            let hr = parseInt(aptTime.split(":")[0]);
                                                                            const min = aptTime.split(":")[1] || "00";
                                                                            if (e.target.value === "PM" && hr < 12) hr += 12;
                                                                            if (e.target.value === "AM" && hr >= 12) hr -= 12;
                                                                            setAptTime(`${String(hr).padStart(2, "0")}:${min}`);
                                                                        }}
                                                                        options={[
                                                                            { label: "AM", value: "AM" },
                                                                            { label: "PM", value: "PM" },
                                                                        ]}
                                                                        className="w-full"
                                                                        selectClassName="text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Duration</label>
                                                                <NativeSelect
                                                                    options={[
                                                                        { label: "15 min", value: "15" },
                                                                        { label: "30 min", value: "30" },
                                                                        { label: "45 min", value: "45" },
                                                                        { label: "60 min", value: "60" },
                                                                    ]}
                                                                    value={aptDuration}
                                                                    onChange={(e) => setAptDuration(e.target.value)}
                                                                    className="w-full"
                                                                    selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Notes</label>
                                                                <textarea
                                                                    value={aptNotes}
                                                                    onChange={(e) => setAptNotes(e.target.value)}
                                                                    placeholder="Meeting notes..."
                                                                    rows={2}
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </SlideoutMenu.Content>
                                                    <SlideoutMenu.Footer>
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Button color="secondary" onClick={close}>Cancel</Button>
                                                            <Button color="primary" onClick={() => handleSchedule(close)}>Schedule</Button>
                                                        </div>
                                                    </SlideoutMenu.Footer>
                                                </>
                                            )}
                                        </SlideoutMenu>
                                    </SlideoutMenu.Trigger>
                                </div>

                                {/* Appointments Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Scheduled Appointments" badge={`${appointmentEvents.length} total`} />
                                    <div className="overflow-x-auto">
                                    <Table aria-label="Appointments">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="meeting" isRowHeader>Meeting</Table.Head>
                                                <Table.Head id="datetime">Date/Time</Table.Head>
                                                <Table.Head id="type">Type</Table.Head>
                                                <Table.Head id="location">Location</Table.Head>
                                                <Table.Head id="actions" className="w-[200px]">Actions</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={appointmentEvents.map((e) => ({ ...e, id: e._id }))}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                                                <VideoRecorder className="w-4 h-4 text-tertiary" />
                                                            </div>
                                                            <span className="font-medium text-primary text-sm">{item.title}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4 text-tertiary" />
                                                            <span className="text-sm text-secondary">
                                                                {formatAppointmentDateTime(item.startDate)}
                                                            </span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getTypeColor(item.type)} size="sm">
                                                            {TYPE_LABELS[item.type] ?? item.type}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-secondary">
                                                            {item.isVirtual ? "Virtual" : (item.location || "TBD")}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            {item.meetingUrl && (
                                                                <Button size="sm" color="primary">Join</Button>
                                                            )}
                                                            <Button size="sm" color="secondary" onClick={() => setViewingEvent(item)}>View Details</Button>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                    </div>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>

            {/* Event Detail Slideout */}
            {viewingEvent && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setViewingEvent(null)} />
                    <div className="relative w-full max-w-[480px] bg-primary border-l border-secondary shadow-xl flex flex-col h-full animate-in slide-in-from-right">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
                            <h2 className="text-lg font-semibold text-primary">Event Details</h2>
                            <button onClick={() => setViewingEvent(null)} className="text-tertiary hover:text-secondary transition-colors text-xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-secondary bg-secondary_subtle">
                                        <Calendar className="w-6 h-6 text-brand-secondary" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className="text-md font-semibold text-primary">{viewingEvent.title}</h3>
                                        <Badge color={getTypeColor(viewingEvent.type)} size="sm">
                                            {TYPE_LABELS[viewingEvent.type] ?? viewingEvent.type}
                                        </Badge>
                                    </div>
                                </div>

                                <hr className="border-secondary" />

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-medium text-tertiary uppercase">Date</span>
                                            <span className="text-sm text-primary">{formatEventDate(viewingEvent.startDate, viewingEvent.endDate)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-medium text-tertiary uppercase">Time</span>
                                            <span className="text-sm text-primary">
                                                {new Date(viewingEvent.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                                {viewingEvent.endDate && ` – ${new Date(viewingEvent.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <MarkerPin01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-medium text-tertiary uppercase">Location</span>
                                            <span className="text-sm text-primary">
                                                {viewingEvent.isVirtual ? "Virtual" : (viewingEvent.location || "Not specified")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                                            <Badge color={getFormatColor(viewingEvent.isVirtual)} size="sm">
                                                {viewingEvent.isVirtual ? "Virtual" : "In Person"}
                                            </Badge>
                                        </div>
                                    </div>

                                    {viewingEvent.organizer && (
                                        <div className="flex items-start gap-3">
                                            <User01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-tertiary uppercase">Organizer</span>
                                                <span className="text-sm text-primary">{viewingEvent.organizer}</span>
                                            </div>
                                        </div>
                                    )}

                                    {(viewingEvent.ticketUrl || viewingEvent.ticketCost) && (
                                        <div className="flex items-start gap-3">
                                            <Ticket01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-tertiary uppercase">Tickets</span>
                                                {viewingEvent.ticketCost != null && (
                                                    <span className="text-sm text-primary">${viewingEvent.ticketCost.toLocaleString()}</span>
                                                )}
                                                {viewingEvent.ticketUrl && (
                                                    <a href={viewingEvent.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-secondary hover:underline truncate max-w-[280px]">
                                                        {viewingEvent.ticketUrl}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {viewingEvent.reminderDate && (
                                        <div className="flex items-start gap-3">
                                            <Bell01 className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-tertiary uppercase">Reminder</span>
                                                <span className="text-sm text-primary">
                                                    {new Date(viewingEvent.reminderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {viewingEvent.description && (
                                    <>
                                        <hr className="border-secondary" />
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-xs font-medium text-tertiary uppercase">Description</span>
                                            <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{viewingEvent.description}</p>
                                        </div>
                                    </>
                                )}

                                <hr className="border-secondary" />
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-tertiary uppercase">Add to Calendar</span>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={buildGoogleCalendarUrl(viewingEvent)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary bg-primary text-sm font-medium text-secondary hover:bg-secondary_hover transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            Google Calendar
                                        </a>
                                        <a
                                            href={buildOutlookCalendarUrl(viewingEvent)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary bg-primary text-sm font-medium text-secondary hover:bg-secondary_hover transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            Outlook
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-secondary flex items-center gap-3">
                            <Button size="md" color="secondary" className="flex-1" onClick={() => setViewingEvent(null)}>Close</Button>
                            <button onClick={() => { populateEvtForm(viewingEvent); setViewingEvent(null); setShowEditSlideout(true); }} className="px-4 py-2.5 rounded-lg border border-primary text-secondary hover:bg-secondary_subtle text-sm font-medium transition-colors">
                                Edit
                            </button>
                            <button onClick={() => { handleArchiveEvent(viewingEvent._id, !viewingEvent.isArchived); }} className="px-4 py-2.5 rounded-lg border border-warning-secondary text-warning-primary hover:bg-warning-secondary text-sm font-medium transition-colors">
                                {viewingEvent.isArchived ? "Restore" : "Archive"}
                            </button>
                            <button onClick={() => handleDeleteEvent(viewingEvent._id)} className="px-4 py-2.5 rounded-lg border border-error-secondary text-error-primary hover:bg-error-secondary text-sm font-medium transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Event Slideout */}
            {showEditSlideout && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setShowEditSlideout(false); resetEvtForm(); }} />
                    <div className="relative w-full max-w-[480px] bg-primary border-l border-secondary shadow-xl flex flex-col h-full animate-in slide-in-from-right">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
                            <h2 className="text-lg font-semibold text-primary">Edit Event</h2>
                            <button onClick={() => { setShowEditSlideout(false); resetEvtForm(); }} className="text-tertiary hover:text-secondary transition-colors text-xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Title *</label>
                                    <input type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="Event title..." className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Type *</label>
                                    <NativeSelect options={eventTypeOptions} value={evtType} onChange={(e) => setEvtType(e.target.value)} className="w-full" selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Start Date *</label>
                                    <DatePicker aria-label="Start Date" value={evtStartDate ? parseDate(evtStartDate) : undefined} onChange={(val) => setEvtStartDate(val ? val.toString() : "")} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Start Time</label>
                                    <input type="time" value={evtStartTime} onChange={(e) => setEvtStartTime(e.target.value)} className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">End Date</label>
                                    <DatePicker aria-label="End Date" value={evtEndDate ? parseDate(evtEndDate) : undefined} onChange={(val) => setEvtEndDate(val ? val.toString() : "")} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Location</label>
                                    <input type="text" value={evtLocation} onChange={(e) => setEvtLocation(e.target.value)} placeholder="Location..." className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Toggle isSelected={evtIsVirtual} onChange={setEvtIsVirtual} aria-label="Virtual" />
                                    <span className="text-sm text-secondary">Virtual Event</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Description</label>
                                    <textarea value={evtDescription} onChange={(e) => setEvtDescription(e.target.value)} placeholder="Description..." rows={3} className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary resize-none" />
                                </div>
                                <hr className="border-secondary" />
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Organizer</label>
                                    <input type="text" value={evtOrganizer} onChange={(e) => setEvtOrganizer(e.target.value)} placeholder="Organizer name..." className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Ticket URL</label>
                                    <input type="url" value={evtTicketUrl} onChange={(e) => setEvtTicketUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Ticket Cost ($)</label>
                                    <input type="number" value={evtTicketCost} onChange={(e) => setEvtTicketCost(e.target.value)} placeholder="0.00" min="0" step="0.01" className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-quaternary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1.5">Reminder</label>
                                    <NativeSelect options={[{ label: "No reminder", value: "" }, { label: "1 day before", value: "1" }, { label: "3 days before", value: "3" }, { label: "7 days before", value: "7" }, { label: "14 days before", value: "14" }, { label: "30 days before", value: "30" }]} value={evtReminderDays} onChange={(e) => setEvtReminderDays(e.target.value)} className="w-full" selectClassName="text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-secondary flex items-center justify-end gap-3">
                            <Button size="md" color="secondary" onClick={() => { setShowEditSlideout(false); resetEvtForm(); }}>Cancel</Button>
                            <Button size="md" color="primary" onClick={() => { handleCreateEvent(() => setShowEditSlideout(false)); }}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
