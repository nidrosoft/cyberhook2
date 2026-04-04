"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/hooks/use-company";
import { toast } from "sonner";
import { devError } from "@/utils/dev-error";
import {
    ArrowLeft,
    CheckCircle,
    Copy01,
    Edit01,
    Loading02,
    Play,
    RefreshCw01,
    Stars01,
} from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FilterDropdown } from "@/components/base/dropdown/filter-dropdown";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { Id } from "../../../../../convex/_generated/dataModel";

const steps = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Select Audience" },
    { num: 3, label: "Configure Cadence" },
    { num: 4, label: "Review & Launch" },
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
        <div className="flex items-center gap-2 w-[60%] mx-auto">
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
        <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6 w-[80%] mx-auto">
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

interface LeadItem {
    _id: Id<"leads">;
    name: string;
    domain: string;
    industry?: string;
    country?: string;
    region?: string;
    employeeCount?: string;
    exposureCount?: number;
    exposureSeverity?: string;
}

function Step2({
    leads,
    selectedLeadIds,
    setSelectedLeadIds,
    audienceRegion,
    setAudienceRegion,
    audienceSize,
    setAudienceSize,
    audienceExposure,
    setAudienceExposure,
    isLoading,
}: {
    leads: LeadItem[];
    selectedLeadIds: Set<string>;
    setSelectedLeadIds: (v: Set<string>) => void;
    audienceRegion: string;
    setAudienceRegion: (v: string) => void;
    audienceSize: string;
    setAudienceSize: (v: string) => void;
    audienceExposure: string;
    setAudienceExposure: (v: string) => void;
    isLoading: boolean;
}) {
    const filteredLeads = useMemo(() => {
        let result = leads;
        if (audienceRegion !== "all") {
            result = result.filter((l) => l.region?.toLowerCase().includes(audienceRegion));
        }
        if (audienceSize !== "all") {
            result = result.filter((l) => {
                const count = parseInt(l.employeeCount || "0");
                if (audienceSize === "1-50") return count <= 50;
                if (audienceSize === "51-200") return count > 50 && count <= 200;
                if (audienceSize === "201-1000") return count > 200 && count <= 1000;
                if (audienceSize === "1000+") return count > 1000;
                return true;
            });
        }
        if (audienceExposure !== "all") {
            result = result.filter((l) => l.exposureSeverity?.toLowerCase() === audienceExposure);
        }
        return result;
    }, [leads, audienceRegion, audienceSize, audienceExposure]);

    const toggleLead = (id: string) => {
        const next = new Set(selectedLeadIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedLeadIds(next);
    };

    const toggleAll = () => {
        if (selectedLeadIds.size === filteredLeads.length) {
            setSelectedLeadIds(new Set());
        } else {
            setSelectedLeadIds(new Set(filteredLeads.map((l) => l._id)));
        }
    };

    return (
        <div className="flex flex-col gap-6 w-[80%] mx-auto">
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Select Audience</h2>
                    <p className="text-sm text-tertiary mt-1">Choose leads from your database to include in this campaign.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <FilterDropdown
                        aria-label="Region"
                        value={audienceRegion}
                        onChange={setAudienceRegion}
                        options={[
                            { label: "All Regions", value: "all" },
                            { label: "North America", value: "north america" },
                            { label: "Europe", value: "europe" },
                            { label: "Asia-Pacific", value: "asia" },
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

                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-tertiary gap-2">
                        <Loading02 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading leads...</span>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-tertiary">No leads found matching your filters.</p>
                        <p className="text-xs text-quaternary mt-1">Try adjusting your filters or add leads via Live Search first.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 pb-2 border-b border-secondary">
                            <input
                                type="checkbox"
                                checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded border-secondary accent-brand-600"
                            />
                            <span className="text-xs text-tertiary">Select all ({filteredLeads.length})</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                            {filteredLeads.map((lead) => (
                                <label
                                    key={lead._id}
                                    className="flex items-center gap-3 rounded-lg border border-secondary px-4 py-3 hover:bg-secondary_subtle cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedLeadIds.has(lead._id)}
                                        onChange={() => toggleLead(lead._id)}
                                        className="w-4 h-4 rounded border-secondary accent-brand-600"
                                    />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-sm font-medium text-primary truncate">{lead.name}</span>
                                        <span className="text-sm text-tertiary">·</span>
                                        <span className="text-sm text-tertiary truncate">{lead.domain}</span>
                                        {lead.industry && (
                                            <>
                                                <span className="text-sm text-tertiary">·</span>
                                                <span className="text-xs text-quaternary truncate">{lead.industry}</span>
                                            </>
                                        )}
                                    </div>
                                    {(lead.exposureCount ?? 0) > 0 && (
                                        <Badge color="error" size="sm">{lead.exposureCount} exposures</Badge>
                                    )}
                                </label>
                            ))}
                        </div>
                    </>
                )}

                <div className="flex items-center gap-2 text-sm">
                    <Badge color="brand" size="sm">{selectedLeadIds.size} leads selected</Badge>
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
        <div className="flex flex-col gap-6 w-[80%] mx-auto">
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

            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Sending Window</h2>
                    <p className="text-sm text-tertiary mt-1">Define when emails can be sent.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1.5">
                        <Label>Start Time</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <NativeSelect
                                aria-label="Start Hour"
                                value={startTime.split(":")[0]}
                                onChange={(e) => {
                                    const min = startTime.split(":")[1] || "00";
                                    setStartTime(`${e.target.value}:${min}`);
                                }}
                                options={Array.from({ length: 24 }, (_, i) => ({
                                    label: String(i === 0 ? 12 : i > 12 ? i - 12 : i).padStart(2, "0"),
                                    value: String(i).padStart(2, "0"),
                                }))}
                                className="w-full"
                                selectClassName="text-sm"
                            />
                            <NativeSelect
                                aria-label="Start Minute"
                                value={startTime.split(":")[1] || "00"}
                                onChange={(e) => {
                                    const hr = startTime.split(":")[0] || "09";
                                    setStartTime(`${hr}:${e.target.value}`);
                                }}
                                options={Array.from({ length: 12 }, (_, i) => ({
                                    label: String(i * 5).padStart(2, "0"),
                                    value: String(i * 5).padStart(2, "0"),
                                }))}
                                className="w-full"
                                selectClassName="text-sm"
                            />
                            <NativeSelect
                                aria-label="Start AM/PM"
                                value={parseInt(startTime.split(":")[0]) >= 12 ? "PM" : "AM"}
                                onChange={(e) => {
                                    let hr = parseInt(startTime.split(":")[0]);
                                    const min = startTime.split(":")[1] || "00";
                                    if (e.target.value === "PM" && hr < 12) hr += 12;
                                    if (e.target.value === "AM" && hr >= 12) hr -= 12;
                                    setStartTime(`${String(hr).padStart(2, "0")}:${min}`);
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
                    <div className="flex flex-col gap-1.5">
                        <Label>End Time</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <NativeSelect
                                aria-label="End Hour"
                                value={endTime.split(":")[0]}
                                onChange={(e) => {
                                    const min = endTime.split(":")[1] || "00";
                                    setEndTime(`${e.target.value}:${min}`);
                                }}
                                options={Array.from({ length: 24 }, (_, i) => ({
                                    label: String(i === 0 ? 12 : i > 12 ? i - 12 : i).padStart(2, "0"),
                                    value: String(i).padStart(2, "0"),
                                }))}
                                className="w-full"
                                selectClassName="text-sm"
                            />
                            <NativeSelect
                                aria-label="End Minute"
                                value={endTime.split(":")[1] || "00"}
                                onChange={(e) => {
                                    const hr = endTime.split(":")[0] || "17";
                                    setEndTime(`${hr}:${e.target.value}`);
                                }}
                                options={Array.from({ length: 12 }, (_, i) => ({
                                    label: String(i * 5).padStart(2, "0"),
                                    value: String(i * 5).padStart(2, "0"),
                                }))}
                                className="w-full"
                                selectClassName="text-sm"
                            />
                            <NativeSelect
                                aria-label="End AM/PM"
                                value={parseInt(endTime.split(":")[0]) >= 12 ? "PM" : "AM"}
                                onChange={(e) => {
                                    let hr = parseInt(endTime.split(":")[0]);
                                    const min = endTime.split(":")[1] || "00";
                                    if (e.target.value === "PM" && hr < 12) hr += 12;
                                    if (e.target.value === "AM" && hr >= 12) hr -= 12;
                                    setEndTime(`${String(hr).padStart(2, "0")}:${min}`);
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
    selectedLeadCount,
    activeDays,
    startTime,
    endTime,
    timezone,
    aiPersonalization,
    requireApproval,
    emailPreview,
    isGenerating,
    onRegenerate,
}: {
    campaignName: string;
    selectedCadence: string;
    selectedLeadCount: number;
    activeDays: string[];
    startTime: string;
    endTime: string;
    timezone: string;
    aiPersonalization: boolean;
    requireApproval: boolean;
    emailPreview: { subject: string; body: string } | null;
    isGenerating: boolean;
    onRegenerate: () => void;
}) {
    const cadence = cadencePresets.find((c) => c.id === selectedCadence);
    const tz = timezones.find((t) => t.id === timezone);
    const dayRange = activeDays.join(", ");

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!emailPreview) return;
        navigator.clipboard.writeText(`Subject: ${emailPreview.subject}\n\n${emailPreview.body}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col gap-6 w-[80%] mx-auto">
            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-5">
                <h2 className="text-lg font-semibold text-primary">Campaign Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SummaryRow label="Campaign Name" value={campaignName || "Untitled Campaign"} />
                    <SummaryRow label="Audience" value={`${selectedLeadCount} leads from your database`} />
                    <SummaryRow label="Cadence" value={`${cadence?.name || "—"} (${cadence?.stepCount || 0} steps)`} />
                    <SummaryRow label="Window" value={`${dayRange}, ${startTime}–${endTime} ${tz?.label || ""}`} />
                    <SummaryRow label="AI Personalization" value={aiPersonalization ? "Enabled" : "Disabled"} />
                    <SummaryRow label="Approval Required" value={requireApproval ? "Yes" : "No"} />
                </div>
            </div>

            <div className="rounded-xl border border-secondary bg-primary p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-primary">Email Preview</h2>
                    <div className="flex items-center gap-2">
                        <Badge color="brand" size="sm">
                            <Stars01 className="w-3 h-3 mr-1" />
                            AI Generated
                        </Badge>
                    </div>
                </div>

                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                            <Loading02 className="w-5 h-5 animate-spin text-brand-600" />
                        </div>
                        <p className="text-sm font-medium text-primary">Generating personalized email with AI...</p>
                        <p className="text-xs text-tertiary">Claude is crafting a tailored outreach email for your first lead</p>
                    </div>
                ) : emailPreview ? (
                    <>
                        <div className="rounded-lg border border-secondary bg-secondary_subtle p-5 flex flex-col gap-3">
                            <div>
                                <span className="text-xs text-tertiary uppercase tracking-wide">Subject</span>
                                <p className="text-sm font-semibold text-primary mt-0.5">{emailPreview.subject}</p>
                            </div>
                            <div className="h-px bg-border-secondary" />
                            <div>
                                <span className="text-xs text-tertiary uppercase tracking-wide">Body</span>
                                <p className="text-sm text-secondary mt-1 whitespace-pre-line leading-relaxed">{emailPreview.body}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button color="secondary" size="sm" iconLeading={Copy01} onClick={handleCopy}>
                                {copied ? "Copied!" : "Copy to Clipboard"}
                            </Button>
                            <Button color="secondary" size="sm" iconLeading={RefreshCw01} onClick={onRegenerate}>
                                Regenerate
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <p className="text-sm text-tertiary">No preview generated yet.</p>
                        <Button color="secondary" size="sm" onClick={onRegenerate}>
                            Generate Preview
                        </Button>
                    </div>
                )}
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
    const { user, companyId, fullName } = useCurrentUser();
    const { company } = useCompany();
    const createCampaign = useMutation(api.campaigns.create);
    const generatePreview = useAction(api.aiEmail.generatePreviewEmail);
    const generateEmails = useAction(api.aiEmail.generateCampaignEmails);
    const router = useRouter();

    const leads = useQuery(
        api.leads.list,
        companyId ? { companyId } : "skip"
    );

    const [isLaunching, setIsLaunching] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [campaignName, setCampaignName] = useState("");
    const [description, setDescription] = useState("");
    const [audienceRegion, setAudienceRegion] = useState("all");
    const [audienceSize, setAudienceSize] = useState("all");
    const [audienceExposure, setAudienceExposure] = useState("all");
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [selectedCadence, setSelectedCadence] = useState("standard");
    const [activeDays, setActiveDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [timezone, setTimezone] = useState("est");
    const [maxEmails, setMaxEmails] = useState(50);
    const [minDelay, setMinDelay] = useState(5);
    const [aiPersonalization, setAiPersonalization] = useState(true);
    const [requireApproval, setRequireApproval] = useState(true);
    const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string } | null>(null);

    const selectedLeads = useMemo(() => {
        if (!leads) return [];
        return leads.filter((l) => selectedLeadIds.has(l._id));
    }, [leads, selectedLeadIds]);

    const handleGeneratePreview = async () => {
        if (selectedLeads.length === 0 || !company) return;
        setIsGeneratingPreview(true);
        try {
            const firstLead = selectedLeads[0];
            const result = await generatePreview({
                recipientName: firstLead.name,
                recipientDomain: firstLead.domain,
                recipientIndustry: firstLead.industry,
                exposureCount: firstLead.exposureCount ?? 0,
                campaignName: campaignName || "Untitled Campaign",
                campaignDescription: description || undefined,
                senderName: fullName || "Sales Team",
                senderCompany: company.name,
                companyId: companyId || undefined,
            });
            setEmailPreview(result);
        } catch (error) {
            devError("Failed to generate preview:", error);
            toast.error("Failed to generate email preview. Please try again.");
        } finally {
            setIsGeneratingPreview(false);
        }
    };

    const handleStepChange = async (nextStep: number) => {
        if (nextStep === 4 && aiPersonalization && selectedLeads.length > 0 && !emailPreview) {
            setCurrentStep(nextStep);
            handleGeneratePreview();
        } else {
            setCurrentStep(nextStep);
        }
    };

    const handleLaunch = async () => {
        if (!companyId || !user || !company) return;
        if (selectedLeadIds.size === 0) {
            toast.error("Please select at least one lead for your campaign.");
            return;
        }
        setIsLaunching(true);
        try {
            const cadence = cadencePresets.find((c) => c.id === selectedCadence);

            const campaignId = await createCampaign({
                companyId,
                createdByUserId: user._id,
                name: campaignName || "Untitled Campaign",
                description: description || undefined,
                status: requireApproval ? "draft" : "active",
                cadencePattern: cadence?.name || selectedCadence,
                sendingWindowStart: startTime,
                sendingWindowEnd: endTime,
                sendingDays: activeDays,
                timezone,
                maxEmailsPerDay: maxEmails,
                minDelayBetweenSends: minDelay,
            });

            if (aiPersonalization && selectedLeads.length > 0) {
                toast.info(`Generating personalized emails for ${selectedLeads.length} leads...`);
                await generateEmails({
                    campaignId,
                    companyId,
                    recipients: selectedLeads.map((l) => ({
                        leadId: l._id,
                        name: l.name,
                        domain: l.domain,
                        industry: l.industry,
                        exposureCount: l.exposureCount ?? 0,
                    })),
                    campaignName: campaignName || "Untitled Campaign",
                    campaignDescription: description || undefined,
                    senderName: fullName || "Sales Team",
                    senderCompany: company.name,
                });
                toast.success("Campaign created with AI-generated emails!");
            } else {
                toast.success("Campaign created successfully!");
            }

            router.push("/ai-agents");
        } catch (error) {
            devError("Failed to create campaign:", error);
            toast.error("Failed to create campaign. Please try again.");
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <div className="pt-8 pb-12 w-full px-4 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
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

                <ProgressIndicator currentStep={currentStep} />

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
                        leads={(leads || []) as LeadItem[]}
                        selectedLeadIds={selectedLeadIds}
                        setSelectedLeadIds={setSelectedLeadIds}
                        audienceRegion={audienceRegion}
                        setAudienceRegion={setAudienceRegion}
                        audienceSize={audienceSize}
                        setAudienceSize={setAudienceSize}
                        audienceExposure={audienceExposure}
                        setAudienceExposure={setAudienceExposure}
                        isLoading={leads === undefined}
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
                        selectedLeadCount={selectedLeadIds.size}
                        activeDays={activeDays}
                        startTime={startTime}
                        endTime={endTime}
                        timezone={timezone}
                        aiPersonalization={aiPersonalization}
                        requireApproval={requireApproval}
                        emailPreview={emailPreview}
                        isGenerating={isGeneratingPreview}
                        onRegenerate={handleGeneratePreview}
                    />
                )}

                <div className="flex items-center justify-between border-t border-secondary pt-6 w-[80%] mx-auto">
                    <Button
                        color="secondary"
                        size="md"
                        iconLeading={ArrowLeft}
                        onClick={() => {
                            if (currentStep === 1) {
                                router.push("/ai-agents");
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
                            onClick={() => handleStepChange(currentStep + 1)}
                            isDisabled={currentStep === 1 && !campaignName.trim()}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            color="primary"
                            size="lg"
                            iconLeading={Play}
                            onClick={handleLaunch}
                            isLoading={isLaunching}
                            isDisabled={selectedLeadIds.size === 0}
                        >
                            {requireApproval ? "Save as Draft" : "Launch Campaign"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
