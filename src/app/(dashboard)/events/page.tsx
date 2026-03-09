"use client";

import { useState } from "react";
import {
    Plus,
    SearchLg,
    Calendar,
    MarkerPin01,
    Clock,
    ChevronLeft,
    ChevronRight,
    VideoRecorder,
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

type EventItem = {
    id: string;
    name: string;
    type: "Conference" | "Webinar" | "Meeting" | "Trade Show" | "Appointment" | "Custom";
    location: string;
    date: string;
    dateRange?: [number, number];
    format: "In Person" | "Virtual" | "Hybrid";
    registered: boolean;
    actionLabel: string;
};

const mockEvents: EventItem[] = [
    {
        id: "evt-1",
        name: "Channel Partners Conference",
        type: "Conference",
        location: "Las Vegas, NV",
        date: "Mar 15-17, 2026",
        dateRange: [15, 17],
        format: "In Person",
        registered: true,
        actionLabel: "View Details",
    },
    {
        id: "evt-2",
        name: "RSAC 2026",
        type: "Conference",
        location: "San Francisco, CA",
        date: "Apr 28 - May 1, 2026",
        format: "In Person",
        registered: true,
        actionLabel: "View Details",
    },
    {
        id: "evt-3",
        name: "MSP Summit East",
        type: "Trade Show",
        location: "Orlando, FL",
        date: "May 12-14, 2026",
        format: "In Person",
        registered: true,
        actionLabel: "View Details",
    },
    {
        id: "evt-4",
        name: "CyberTech Webinar: AI in SecOps",
        type: "Webinar",
        location: "Virtual",
        date: "Mar 20, 2026",
        dateRange: [20, 20],
        format: "Virtual",
        registered: true,
        actionLabel: "Join Link",
    },
    {
        id: "evt-5",
        name: "Dark Reading Summit",
        type: "Conference",
        location: "Washington, DC",
        date: "Jun 10-12, 2026",
        format: "Hybrid",
        registered: false,
        actionLabel: "Register",
    },
    {
        id: "evt-6",
        name: "Gartner IT Symposium",
        type: "Conference",
        location: "Barcelona, Spain",
        date: "Nov 3-5, 2026",
        format: "In Person",
        registered: false,
        actionLabel: "Register",
    },
    {
        id: "evt-7",
        name: "CompTIA ChannelCon",
        type: "Trade Show",
        location: "Chicago, IL",
        date: "Aug 4-6, 2026",
        format: "In Person",
        registered: false,
        actionLabel: "Register",
    },
    {
        id: "evt-8",
        name: "Cybersecurity Roundtable",
        type: "Meeting",
        location: "Virtual",
        date: "Mar 22, 2026",
        dateRange: [22, 22],
        format: "Virtual",
        registered: true,
        actionLabel: "Join Link",
    },
];

type Appointment = {
    id: string;
    title: string;
    contact: string;
    contactRole: string;
    dateTime: string;
    duration: string;
    status: "Confirmed" | "Pending";
};

const mockAppointments: Appointment[] = [
    {
        id: "apt-1",
        title: "Discovery Call - Acme Corp",
        contact: "John Smith",
        contactRole: "CEO",
        dateTime: "Mar 10, 2026 2:00 PM",
        duration: "30 min",
        status: "Confirmed",
    },
    {
        id: "apt-2",
        title: "Demo - TechNexus",
        contact: "Sarah Johnson",
        contactRole: "CTO",
        dateTime: "Mar 11, 2026 10:00 AM",
        duration: "60 min",
        status: "Confirmed",
    },
    {
        id: "apt-3",
        title: "Follow-up - GlobalLogistics",
        contact: "Mike Chen",
        contactRole: "IT Dir",
        dateTime: "Mar 12, 2026 3:30 PM",
        duration: "30 min",
        status: "Pending",
    },
    {
        id: "apt-4",
        title: "Security Assessment Review - FinServe",
        contact: "Emily Davis",
        contactRole: "CISO",
        dateTime: "Mar 14, 2026 11:00 AM",
        duration: "45 min",
        status: "Confirmed",
    },
    {
        id: "apt-5",
        title: "Proposal Review - CityGov",
        contact: "Robert Wilson",
        contactRole: "CIO",
        dateTime: "Mar 18, 2026 1:00 PM",
        duration: "60 min",
        status: "Pending",
    },
];

const calendarEvents: { day: number; endDay?: number; label: string; color: string }[] = [
    { day: 15, endDay: 17, label: "Channel Partners", color: "bg-brand-500" },
    { day: 20, label: "CyberTech Webinar", color: "bg-purple-500" },
    { day: 22, label: "Cybersecurity Roundtable", color: "bg-success-500" },
];

const typeFilterOptions = [
    { label: "All Types", value: "all" },
    { label: "Conference", value: "Conference" },
    { label: "Webinar", value: "Webinar" },
    { label: "Meeting", value: "Meeting" },
    { label: "Trade Show", value: "Trade Show" },
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
    { label: "In Person", value: "In Person" },
    { label: "Virtual", value: "Virtual" },
    { label: "Hybrid", value: "Hybrid" },
];

function getFormatColor(format: string): "brand" | "success" | "warning" | "gray" {
    if (format === "Virtual") return "success";
    if (format === "Hybrid") return "warning";
    return "brand";
}

function getTypeColor(type: string): "brand" | "success" | "warning" | "gray" | "error" {
    if (type === "Conference") return "brand";
    if (type === "Webinar") return "success";
    if (type === "Trade Show") return "warning";
    if (type === "Meeting") return "gray";
    return "gray";
}

function MarchCalendar() {
    const [monthOffset, setMonthOffset] = useState(0);
    const baseYear = 2026;
    const baseMonth = 2; // March = index 2
    const currentMonth = baseMonth + monthOffset;
    const date = new Date(baseYear, currentMonth, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleString("default", { month: "long" });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const today = month === 2 && year === 2026 ? 8 : -1;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    const showEvents = month === 2 && year === 2026;

    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <Button color="secondary" size="sm" iconLeading={ChevronLeft} onClick={() => setMonthOffset((p) => p - 1)}>
                    Prev
                </Button>
                <h3 className="text-lg font-semibold text-primary">{monthName} {year}</h3>
                <Button color="secondary" size="sm" iconTrailing={ChevronRight} onClick={() => setMonthOffset((p) => p + 1)}>
                    Next
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-px">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-tertiary py-2">{d}</div>
                ))}
                {days.map((day, i) => {
                    const eventsForDay = showEvents ? calendarEvents.filter((e) => {
                        if (e.endDay) return day !== null && day >= e.day && day <= e.endDay;
                        return day === e.day;
                    }) : [];
                    const isToday = day === today;
                    return (
                        <div
                            key={i}
                            className={`min-h-[80px] border border-secondary/50 p-1.5 text-sm ${
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

const eventTypeOptions = [
    { label: "Conference", value: "Conference" },
    { label: "Webinar", value: "Webinar" },
    { label: "Meeting", value: "Meeting" },
    { label: "Appointment", value: "Appointment" },
    { label: "Custom", value: "Custom" },
];

const linkedLeadOptions = [
    { label: "None", value: "none" },
    { label: "Acme Corp", value: "Acme Corp" },
    { label: "TechNexus", value: "TechNexus" },
    { label: "GlobalLogistics", value: "GlobalLogistics" },
    { label: "FinServe", value: "FinServe" },
    { label: "Pacific Insurance", value: "Pacific Insurance" },
    { label: "CityGov", value: "CityGov" },
];

export default function EventsPage() {
    const [evtSearch, setEvtSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [locFilter, setLocFilter] = useState("all");

    const [events, setEvents] = useState<EventItem[]>(mockEvents);
    const [evtTitle, setEvtTitle] = useState("");
    const [evtType, setEvtType] = useState("Conference");
    const [evtStartDate, setEvtStartDate] = useState("");
    const [evtStartTime, setEvtStartTime] = useState("");
    const [evtEndDate, setEvtEndDate] = useState("");
    const [evtLocation, setEvtLocation] = useState("");
    const [evtIsVirtual, setEvtIsVirtual] = useState(false);
    const [evtDescription, setEvtDescription] = useState("");
    const [evtLinkedLead, setEvtLinkedLead] = useState("none");

    const [aptTitle, setAptTitle] = useState("");
    const [aptContact, setAptContact] = useState("");
    const [aptDate, setAptDate] = useState("");
    const [aptTime, setAptTime] = useState("");
    const [aptDuration, setAptDuration] = useState("30");
    const [aptNotes, setAptNotes] = useState("");
    const [appointments, setAppointments] = useState(mockAppointments);

    const handleCreateEvent = (close: () => void) => {
        if (!evtTitle.trim() || !evtType || !evtStartDate) return;
        const newEvt: EventItem = {
            id: `evt-${Date.now()}`,
            name: evtTitle,
            type: evtType as EventItem["type"],
            location: evtLocation || "TBD",
            date: evtStartDate + (evtEndDate ? ` - ${evtEndDate}` : ""),
            format: evtIsVirtual ? "Virtual" : "In Person",
            registered: false,
            actionLabel: "Register",
        };
        setEvents((prev) => [...prev, newEvt]);
        setEvtTitle("");
        setEvtType("Conference");
        setEvtStartDate("");
        setEvtStartTime("");
        setEvtEndDate("");
        setEvtLocation("");
        setEvtIsVirtual(false);
        setEvtDescription("");
        setEvtLinkedLead("none");
        close();
    };

    const handleSchedule = (close: () => void) => {
        if (!aptTitle.trim() || !aptContact.trim()) return;
        const newApt: Appointment = {
            id: `apt-${Date.now()}`,
            title: aptTitle,
            contact: aptContact,
            contactRole: "",
            dateTime: `${aptDate} ${aptTime}`,
            duration: `${aptDuration} min`,
            status: "Pending",
        };
        setAppointments((prev) => [...prev, newApt]);
        setAptTitle("");
        setAptContact("");
        setAptDate("");
        setAptTime("");
        setAptDuration("30");
        setAptNotes("");
        close();
    };

    const filteredEvents = events.filter((e) => {
        if (evtSearch && !e.name.toLowerCase().includes(evtSearch.toLowerCase())) return false;
        if (typeFilter !== "all" && e.type !== typeFilter) return false;
        if (locFilter !== "all" && e.format !== locFilter) return false;
        return true;
    });

    return (
        <div className="flex h-full w-full flex-col bg-primary relative">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 py-8 flex flex-col gap-8">

                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-secondary pb-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-display-sm font-semibold text-primary">Events</h1>
                            <p className="text-md text-tertiary">
                                Industry conferences, appointments, and calendar
                            </p>
                        </div>
                        <SlideoutMenu.Trigger>
                            <Button size="md" color="primary" iconLeading={Plus}>
                                New Event
                            </Button>
                            <SlideoutMenu>
                                {({ close }) => (
                                    <>
                                        <SlideoutMenu.Header onClose={close}>
                                            <h2 className="text-lg font-semibold text-primary">New Event</h2>
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
                                                    <input
                                                        type="time"
                                                        value={evtStartTime}
                                                        onChange={(e) => setEvtStartTime(e.target.value)}
                                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
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
                                                <div>
                                                    <label className="block text-sm font-medium text-secondary mb-1.5">Linked Lead</label>
                                                    <NativeSelect
                                                        options={linkedLeadOptions}
                                                        value={evtLinkedLead}
                                                        onChange={(e) => setEvtLinkedLead(e.target.value)}
                                                        className="w-full"
                                                        selectClassName="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <div className="flex items-center justify-end gap-3">
                                                <Button color="secondary" onClick={close}>Cancel</Button>
                                                <Button color="primary" onClick={() => handleCreateEvent(close)}>Create</Button>
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
                            type="button-border"
                            className="mb-6"
                            items={[
                                { id: "upcoming", label: "Upcoming Events" },
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
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <MetricsChart04 title="8" subtitle="Upcoming Events" change="3" changeTrend="positive" changeDescription="new this month" />
                                    <MetricsChart04 title="3" subtitle="Events This Month" change="1" changeTrend="positive" changeDescription="more than last month" />
                                    <MetricsChart04 title="5" subtitle="Registered" change="62%" changeTrend="positive" changeDescription="registration rate" />
                                </div>

                                {/* Filter Row */}
                                <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-3">
                                    <div className="min-w-0 flex-1">
                                        <InputBase
                                            type="text"
                                            size="sm"
                                            placeholder="Search events..."
                                            icon={SearchLg}
                                            value={evtSearch}
                                            onChange={(value: string) => setEvtSearch(value)}
                                        />
                                    </div>
                                    <div className="h-8 w-px shrink-0 bg-secondary" />
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
                                </div>

                                {/* Events Table */}
                                <TableCard.Root>
                                    <TableCard.Header title="Upcoming Events" badge={`${filteredEvents.length} events`} />

                                    <Table aria-label="Events Schedule">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="name" isRowHeader>Event Name</Table.Head>
                                                <Table.Head id="type">Type</Table.Head>
                                                <Table.Head id="location">Location</Table.Head>
                                                <Table.Head id="date">Date</Table.Head>
                                                <Table.Head id="format">Format</Table.Head>
                                                <Table.Head id="status">Status</Table.Head>
                                                <Table.Head id="actions" className="w-[140px]">Actions</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={filteredEvents}>
                                            {(item) => (
                                                <Table.Row id={item.id}>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary bg-secondary_subtle">
                                                                <Calendar className="w-5 h-5 text-tertiary" />
                                                            </div>
                                                            <span className="font-medium text-primary">{item.name}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getTypeColor(item.type)} size="sm">{item.type}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <MarkerPin01 className="w-4 h-4 text-tertiary" />
                                                            <span className="text-secondary text-sm">{item.location}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-secondary text-sm">{item.date}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getFormatColor(item.format)} size="sm">{item.format}</Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {item.registered ? (
                                                            <Badge color="success" size="sm">Registered ✅</Badge>
                                                        ) : (
                                                            <Badge color="gray" size="sm">Not Registered</Badge>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Button size="sm" color={item.registered ? "secondary" : "primary"}>
                                                            {item.actionLabel}
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>

                        {/* =================== CALENDAR TAB =================== */}
                        <Tabs.Panel id="calendar">
                            <MarchCalendar />
                        </Tabs.Panel>

                        {/* =================== APPOINTMENTS TAB =================== */}
                        <Tabs.Panel id="appointments">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between">
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
                                                                <label className="block text-sm font-medium text-secondary mb-1.5">Contact Name *</label>
                                                                <input
                                                                    type="text"
                                                                    value={aptContact}
                                                                    onChange={(e) => setAptContact(e.target.value)}
                                                                    placeholder="Contact name..."
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
                                                                <input
                                                                    type="time"
                                                                    value={aptTime}
                                                                    onChange={(e) => setAptTime(e.target.value)}
                                                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs outline-none focus:ring-2 focus:ring-brand-500"
                                                                />
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
                                    <TableCard.Header title="Scheduled Appointments" badge={`${appointments.length} total`} />

                                    <Table aria-label="Appointments">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head id="meeting" isRowHeader>Meeting</Table.Head>
                                                <Table.Head id="contact">Contact</Table.Head>
                                                <Table.Head id="datetime">Date/Time</Table.Head>
                                                <Table.Head id="duration">Duration</Table.Head>
                                                <Table.Head id="status">Status</Table.Head>
                                                <Table.Head id="actions" className="w-[200px]">Actions</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body items={appointments}>
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
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-primary">{item.contact}</span>
                                                            {item.contactRole && (
                                                                <span className="text-xs text-tertiary">{item.contactRole}</span>
                                                            )}
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4 text-tertiary" />
                                                            <span className="text-sm text-secondary">{item.dateTime}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span className="text-sm text-secondary">{item.duration}</span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge
                                                            color={item.status === "Confirmed" ? "success" : "warning"}
                                                            size="sm"
                                                        >
                                                            {item.status === "Confirmed" ? "Confirmed ✅" : "Pending ⏳"}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex items-center gap-2">
                                                            <Button size="sm" color="primary">Join</Button>
                                                            <Button size="sm" color="secondary">Reschedule</Button>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table>
                                </TableCard.Root>
                            </div>
                        </Tabs.Panel>
                    </Tabs>

                </div>
            </div>
        </div>
    );
}
