"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle,
    Copy01,
    Edit01,
    Play,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";

const steps = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Select Audience" },
    { num: 3, label: "Configure Cadence" },
    { num: 4, label: "Review & Launch" },
];

const mockContacts = [
    { id: "mc1", name: "John Smith", title: "CEO", company: "Acme Corp", exposures: 7, selected: true },
    { id: "mc2", name: "Sarah Johnson", title: "CFO", company: "TechNexus", exposures: 3, selected: true },
    { id: "mc3", name: "Mike Chen", title: "IT Manager", company: "GlobalLogistics", exposures: 12, selected: false },
    { id: "mc4", name: "Emily Davis", title: "CISO", company: "FinServe", exposures: 5, selected: true },
    { id: "mc5", name: "Robert Wilson", title: "CIO", company: "Cyberdyne", exposures: 2, selected: false },
];

const cadencePresets = [
    {
        id: "quick",
        name: "Quick Touch",
        steps: ["Day 1: Email", "Day 3: Follow-up"],
        stepCount: 2,
    },
    {
        id: "standard",
        name: "Standard Outreach",
        steps: ["Day 1: Email", "Day 3: Follow-up", "Day 5: Email", "Day 7: Final"],
        stepCount: 4,
    },
    {
        id: "deep",
        name: "Deep Engagement",
        steps: ["Day 1: Email", "Day 2: LinkedIn", "Day 4: Email", "Day 7: Call", "Day 10: Final"],
        stepCount: 5,
    },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const timezones = [
    { id: "est", label: "Eastern (EST)" },
    { id: "cst", label: "Central (CST)" },
    { id: "mst", label: "Mountain (MST)" },
    { id: "pst", label: "Pacific (PST)" },
    { id: "utc", label: "UTC" },
];

function ProgressIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center gap-2 w-full">
            {steps.map((step, i) => (
                <div key={step.num} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2 min-w-max">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                                step.num < currentStep
                                    ? "bg-fg-success-primary text-white"
                                    : step.num === currentStep
                                      ? "bg-brand-solid text-white"
                                      : "bg-secondary_subtle text-tertiary border border-secondary"
                            }`}
                        >
                            {step.num < currentStep ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                step.num
                            )}
                        </div>
                        <span
                            className={`text-sm font-medium hidden sm:block ${
                                step.num === currentStep ? "text-primary" : "text-tertiary"
                            }`}
                        >
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div
                            className={`h-px flex-1 ${
                                step.num < currentStep ? "bg-fg-success-primary" : "bg-border-secondary"
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function Step1({
    campaignName,
    setCampaignName,
    description,
    setDescription,
}: {
    campaignName: string;
    setCampaignName: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
}) {
    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6 max-w-2xl">
            <div>
                <h2 className="text-lg font-semibold text-primary">Basic Information</h2>
                <p className="text-sm text-tertiary mt-1">Give your campaign a name and optional description.</p>
            </div>

            <Input
                label="Campaign Name"
                placeholder="e.g. Q1 High-Risk Outreach"
                isRequired
                value={campaignName}
                onChange={setCampaignName}
            />

            <div className="flex flex-col gap-1.5">
                <Label>Description (optional)</Label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the goal of this campaign..."
                    rows={4}
                    className="w-full rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset px-3 py-2 text-md text-primary placeholder:text-placeholder outline-hidden focus:ring-2 focus:ring-brand transition-shadow duration-100 resize-none"
                />
            </div>
        </div>
    );
}

function Step2({
    contactSelections,
    setContactSelections,
    audienceRegion,
    setAudienceRegion,
    audienceSize,
    setAudienceSize,
    audienceExposure,
    setAudienceExposure,
}: {
    contactSelections: Record<string, boolean>;
    setContactSelections: (v: Record<string, boolean>) => void;
    audienceRegion: string;
    setAudienceRegion: (v: string) => void;
    audienceSize: string;
    setAudienceSize: (v: string) => void;
    audienceExposure: string;
    setAudienceExposure: (v: string) => void;
}) {
    const selectedCount = Object.values(contactSelections).filter(Boolean).length;

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Select Audience</h2>
                    <p className="text-sm text-tertiary mt-1">Choose the leads to include in this campaign.</p>
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <Label className="mb-1.5">Source</Label>
                        <ButtonGroup defaultSelectedKeys={["live-leads"]} className="mt-1">
                            <ButtonGroupItem id="live-leads">Live-Leads</ButtonGroupItem>
                            <ButtonGroupItem id="watchlist">Watchlist</ButtonGroupItem>
                        </ButtonGroup>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <FilterDropdown
                            aria-label="Region"
                            value={audienceRegion}
                            onChange={setAudienceRegion}
                            options={[
                                { label: "All Regions", value: "all" },
                                { label: "North America", value: "na" },
                                { label: "Europe", value: "eu" },
                                { label: "Asia-Pacific", value: "apac" },
                            ]}
                        />
                        <FilterDropdown
                            aria-label="Employee Size"
                            value={audienceSize}
                            onChange={setAudienceSize}
                            options={[
                                { label: "All Sizes", value: "all" },
                                { label: "1–50", value: "1-50" },
                                { label: "51–200", value: "51-200" },
                                { label: "201–1,000", value: "201-1000" },
                                { label: "1,000+", value: "1000+" },
                            ]}
                        />
                        <FilterDropdown
                            aria-label="Exposure Status"
                            value={audienceExposure}
                            onChange={setAudienceExposure}
                            options={[
                                { label: "All Statuses", value: "all" },
                                { label: "Critical", value: "critical" },
                                { label: "High", value: "high" },
                                { label: "Medium", value: "medium" },
                                { label: "Low", value: "low" },
                            ]}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {mockContacts.map((contact) => (
                        <label
                            key={contact.id}
                            className="flex items-center gap-3 rounded-lg border border-secondary px-4 py-3 hover:bg-secondary_subtle cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={contactSelections[contact.id] ?? contact.selected}
                                onChange={(e) =>
                                    setContactSelections({
                                        ...contactSelections,
                                        [contact.id]: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 rounded border-secondary accent-brand-600"
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-primary">{contact.name}</span>
                                <span className="text-sm text-tertiary">-</span>
                                <span className="text-sm text-tertiary">{contact.title} at {contact.company}</span>
                            </div>
                            <Badge color="error" size="sm">{contact.exposures} exposures</Badge>
                        </label>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <Badge color="brand" size="sm">{selectedCount} contacts selected</Badge>
                </div>
            </div>
        </div>
    );
}

function Step3({
    selectedCadence,
    setSelectedCadence,
    activeDays,
    setActiveDays,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    timezone,
    setTimezone,
    maxEmails,
    setMaxEmails,
    minDelay,
    setMinDelay,
    aiPersonalization,
    setAiPersonalization,
    requireApproval,
    setRequireApproval,
}: {
    selectedCadence: string;
    setSelectedCadence: (v: string) => void;
    activeDays: string[];
    setActiveDays: (v: string[]) => void;
    startTime: string;
    setStartTime: (v: string) => void;
    endTime: string;
    setEndTime: (v: string) => void;
    timezone: string;
    setTimezone: (v: string) => void;
    maxEmails: number;
    setMaxEmails: (v: number) => void;
    minDelay: number;
    setMinDelay: (v: number) => void;
    aiPersonalization: boolean;
    setAiPersonalization: (v: boolean) => void;
    requireApproval: boolean;
    setRequireApproval: (v: boolean) => void;
}) {
    return (
        <div className="flex flex-col gap-6">
            {/* Cadence Presets */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Cadence Pattern</h2>
                    <p className="text-sm text-tertiary mt-1">Select a preset outreach cadence.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {cadencePresets.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedCadence(preset.id)}
                            className={`rounded-xl border-2 p-5 text-left transition-colors ${
                                selectedCadence === preset.id
                                    ? "border-brand-solid bg-brand-primary_alt"
                                    : "border-secondary bg-primary hover:border-brand-300"
                            }`}
                        >
                            <h3 className="text-sm font-semibold text-primary">{preset.name}</h3>
                            <ul className="mt-3 flex flex-col gap-1">
                                {preset.steps.map((step, i) => (
                                    <li key={i} className="text-xs text-tertiary flex items-center gap-1.5">
                                        <CheckCircle className="w-3 h-3 text-fg-success-primary shrink-0" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sending Window */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Sending Window</h2>
                    <p className="text-sm text-tertiary mt-1">Define when emails can be sent.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Start Time</Label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset px-3 py-2 text-sm text-primary outline-hidden focus:ring-2 focus:ring-brand"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>End Time</Label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset px-3 py-2 text-sm text-primary outline-hidden focus:ring-2 focus:ring-brand"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Timezone</Label>
                        <NativeSelect
                            aria-label="Timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            options={timezones.map((tz) => ({ label: tz.label, value: tz.id }))}
                            className="w-full"
                            selectClassName="text-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label>Active Days</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                        {weekdays.map((day) => (
                            <button
                                key={day}
                                type="button"
                                onClick={() =>
                                    setActiveDays(
                                        activeDays.includes(day)
                                            ? activeDays.filter((d) => d !== day)
                                            : [...activeDays, day]
                                    )
                                }
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                    activeDays.includes(day)
                                        ? "bg-brand-solid text-white border-transparent"
                                        : "bg-primary text-secondary border-secondary hover:bg-secondary_subtle"
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Throttling */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Throttling</h2>
                    <p className="text-sm text-tertiary mt-1">Control the send rate to protect deliverability.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    <div className="flex flex-col gap-1.5">
                        <Label>Max emails per day</Label>
                        <input
                            type="number"
                            value={maxEmails}
                            onChange={(e) => setMaxEmails(Number(e.target.value))}
                            className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset px-3 py-2 text-sm text-primary outline-hidden focus:ring-2 focus:ring-brand"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Min delay between sends (min)</Label>
                        <input
                            type="number"
                            value={minDelay}
                            onChange={(e) => setMinDelay(Number(e.target.value))}
                            className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset px-3 py-2 text-sm text-primary outline-hidden focus:ring-2 focus:ring-brand"
                        />
                    </div>
                </div>
            </div>

            {/* Toggles */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-5">
                <Toggle
                    size="md"
                    isSelected={aiPersonalization}
                    onChange={setAiPersonalization}
                    label="AI Personalization"
                    hint="Let AI tailor each email based on the recipient's exposure data and role."
                />
                <Toggle
                    size="md"
                    isSelected={requireApproval}
                    onChange={setRequireApproval}
                    label="Require Approval"
                    hint="Emails will be queued for manual review before sending."
                />
            </div>
        </div>
    );
}

function Step4({
    campaignName,
    selectedCadence,
    contactSelections,
    activeDays,
    startTime,
    endTime,
    timezone,
    aiPersonalization,
    requireApproval,
}: {
    campaignName: string;
    selectedCadence: string;
    contactSelections: Record<string, boolean>;
    activeDays: string[];
    startTime: string;
    endTime: string;
    timezone: string;
    aiPersonalization: boolean;
    requireApproval: boolean;
}) {
    const selectedCount = Object.values(contactSelections).filter(Boolean).length;
    const cadence = cadencePresets.find((c) => c.id === selectedCadence);
    const tz = timezones.find((t) => t.id === timezone);
    const dayRange = activeDays.join(", ");

    const emailSubject = "Urgent: Compromised Credentials Detected at Acme Corp";
    const emailBody = `Hi John,

Our threat intelligence team has identified 7 compromised credentials associated with acmecorp.com in the last 5 days. This includes active employee sessions with passwords that were found on dark web forums.

As a cybersecurity-focused MSP, we help companies like yours secure their infrastructure and prevent unauthorized access.

Would you have 15 minutes this week to discuss how we can help protect Acme Corp?

Best regards,
Liron
TechCo MSP`;

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Campaign Summary */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-5">
                <h2 className="text-lg font-semibold text-primary">Campaign Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SummaryRow label="Campaign Name" value={campaignName || "Untitled Campaign"} />
                    <SummaryRow label="Audience" value={`${selectedCount} contacts from Live-Leads`} />
                    <SummaryRow label="Cadence" value={`${cadence?.name || "—"} (${cadence?.stepCount || 0} steps)`} />
                    <SummaryRow label="Window" value={`${dayRange}, ${startTime}–${endTime} ${tz?.label || ""}`} />
                    <SummaryRow label="AI Personalization" value={aiPersonalization ? "Enabled" : "Disabled"} />
                    <SummaryRow label="Approval Required" value={requireApproval ? "Yes" : "No"} />
                </div>
            </div>

            {/* Email Preview */}
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-primary">Email Preview</h2>
                    <Badge color="brand" size="sm">AI Generated</Badge>
                </div>
                <div className="rounded-lg border border-secondary bg-secondary_subtle p-5 flex flex-col gap-3">
                    <div>
                        <span className="text-xs text-tertiary uppercase tracking-wide">Subject</span>
                        <p className="text-sm font-semibold text-primary mt-0.5">{emailSubject}</p>
                    </div>
                    <div className="h-px bg-border-secondary" />
                    <div>
                        <span className="text-xs text-tertiary uppercase tracking-wide">Body</span>
                        <p className="text-sm text-secondary mt-1 whitespace-pre-line leading-relaxed">{emailBody}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button color="secondary" size="sm" iconLeading={Copy01} onClick={handleCopy}>
                        {copied ? "Copied!" : "Copy to Clipboard"}
                    </Button>
                    <Button color="secondary" size="sm" iconLeading={Edit01}>
                        Edit Email
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-tertiary">{label}</span>
            <span className="text-sm font-medium text-primary">{value}</span>
        </div>
    );
}

export default function NewCampaignPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [campaignName, setCampaignName] = useState("");
    const [description, setDescription] = useState("");
    const [audienceRegion, setAudienceRegion] = useState("all");
    const [audienceSize, setAudienceSize] = useState("all");
    const [audienceExposure, setAudienceExposure] = useState("all");
    const [contactSelections, setContactSelections] = useState<Record<string, boolean>>({
        mc1: true,
        mc2: true,
        mc3: false,
        mc4: true,
        mc5: false,
    });
    const [selectedCadence, setSelectedCadence] = useState("standard");
    const [activeDays, setActiveDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [timezone, setTimezone] = useState("est");
    const [maxEmails, setMaxEmails] = useState(50);
    const [minDelay, setMinDelay] = useState(5);
    const [aiPersonalization, setAiPersonalization] = useState(true);
    const [requireApproval, setRequireApproval] = useState(true);

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-secondary pb-6">
                    <Link
                        href="/ai-agents"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-secondary transition-colors w-max"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to AI Agents
                    </Link>
                    <h1 className="text-display-sm font-semibold text-primary">New Campaign</h1>
                </div>

                {/* Progress */}
                <ProgressIndicator currentStep={currentStep} />

                {/* Step Content */}
                {currentStep === 1 && (
                    <Step1
                        campaignName={campaignName}
                        setCampaignName={setCampaignName}
                        description={description}
                        setDescription={setDescription}
                    />
                )}
                {currentStep === 2 && (
                    <Step2
                        contactSelections={contactSelections}
                        setContactSelections={setContactSelections}
                        audienceRegion={audienceRegion}
                        setAudienceRegion={setAudienceRegion}
                        audienceSize={audienceSize}
                        setAudienceSize={setAudienceSize}
                        audienceExposure={audienceExposure}
                        setAudienceExposure={setAudienceExposure}
                    />
                )}
                {currentStep === 3 && (
                    <Step3
                        selectedCadence={selectedCadence}
                        setSelectedCadence={setSelectedCadence}
                        activeDays={activeDays}
                        setActiveDays={setActiveDays}
                        startTime={startTime}
                        setStartTime={setStartTime}
                        endTime={endTime}
                        setEndTime={setEndTime}
                        timezone={timezone}
                        setTimezone={setTimezone}
                        maxEmails={maxEmails}
                        setMaxEmails={setMaxEmails}
                        minDelay={minDelay}
                        setMinDelay={setMinDelay}
                        aiPersonalization={aiPersonalization}
                        setAiPersonalization={setAiPersonalization}
                        requireApproval={requireApproval}
                        setRequireApproval={setRequireApproval}
                    />
                )}
                {currentStep === 4 && (
                    <Step4
                        campaignName={campaignName}
                        selectedCadence={selectedCadence}
                        contactSelections={contactSelections}
                        activeDays={activeDays}
                        startTime={startTime}
                        endTime={endTime}
                        timezone={timezone}
                        aiPersonalization={aiPersonalization}
                        requireApproval={requireApproval}
                    />
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between border-t border-secondary pt-6">
                    <Button
                        color="secondary"
                        size="md"
                        iconLeading={ArrowLeft}
                        onClick={() => {
                            if (currentStep === 1) {
                                window.location.href = "/ai-agents";
                            } else {
                                setCurrentStep(currentStep - 1);
                            }
                        }}
                    >
                        Back
                    </Button>
                    {currentStep < 4 ? (
                        <Button
                            color="primary"
                            size="md"
                            onClick={() => setCurrentStep(currentStep + 1)}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            color="primary"
                            size="lg"
                            iconLeading={Play}
                        >
                            Launch Campaign
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
