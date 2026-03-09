"use client";

import { useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Building07,
    CreditCard02,
    Flag05,
    Globe01,
    Phone,
    Shield01,
    Stars02,
    UploadCloud02,
    Users01,
    UsersPlus,
    Zap,
} from "@untitledui/icons";

import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressFeaturedIconType } from "@/components/application/progress-steps/progress-types";
import { PricingTierCardCallout } from "@/components/marketing/pricing-sections/base-components/pricing-tier-card";
import { Button } from "@/components/base/buttons/button";
import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";

const businessModels = [
    { id: "msp", label: "MSP/MSSP" },
    { id: "var", label: "VAR/Reseller" },
    { id: "si", label: "Systems Integrator" },
    { id: "vad", label: "VAD" },
    { id: "tap", label: "TAP" },
    { id: "consultant", label: "Consultant/Referral Partner" },
    { id: "not-set", label: "Not set" },
];

const revenueRanges = [
    { id: "0-4", label: "$0–4M" },
    { id: "5-9", label: "$5–9M" },
    { id: "10-24", label: "$10–24M" },
    { id: "25-49", label: "$25–49M" },
    { id: "50-99", label: "$50–99M" },
    { id: "100-249", label: "$100–249M" },
    { id: "250-1b", label: "$250M–1B" },
    { id: "1b+", label: "$1B+" },
];

const geoOptions = ["North America", "EMEA", "APAC", "ANZ", "LATAM"];
const customerOptions = ["SMB", "Mid Market", "Enterprise", "Fortune 500"];

const employeeRanges = [
    { id: "1-10", label: "1–10" },
    { id: "11-50", label: "11–50" },
    { id: "51-100", label: "51–100" },
    { id: "101-150", label: "101–150" },
    { id: "151-250", label: "151–250" },
    { id: "251-500", label: "251–500" },
    { id: "501+", label: "501+" },
];

const salesRanges = [
    { id: "just-me", label: "Just me" },
    { id: "2-3", label: "2–3" },
    { id: "3-5", label: "3–5" },
    { id: "5-10", label: "5–10" },
    { id: "10-25", label: "10–25" },
    { id: "25-50", label: "25–50" },
    { id: "50+", label: "50+" },
];

const pricingPlans = [
    {
        title: "Starter",
        subtitle: "$299/mo",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        features: [
            "Up to 100 Live Search queries/mo",
            "AI Email Campaigns (500/mo)",
            "Basic Threat Intelligence Feed",
            "1 User Seat",
            "Email Support",
        ],
    },
    {
        title: "Growth",
        subtitle: "$599/mo",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        callOut: "Most popular",
        hasCallout: true,
        features: [
            "Up to 500 Live Search queries/mo",
            "AI Email Campaigns (5,000/mo)",
            "Advanced Threat Intelligence + Ransomware Hub",
            "5 User Seats",
            "Priority Support + Onboarding",
            "CRM Integrations (HubSpot, GHL)",
            "Custom Report Templates",
        ],
    },
    {
        title: "Enterprise",
        subtitle: "$1,250/mo",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        features: [
            "1,000 Live Search queries/mo",
            "Unlimited AI Email Campaigns",
            "Full Threat Intel Suite + Custom Alerts",
            "Unlimited User Seats",
            "Dedicated Success Manager",
            "All Integrations + API Access",
            "Advanced Analytics & Reporting",
            "SSO Authentication",
            "Custom Onboarding & Training",
        ],
    },
];

function getSteps(currentStep: number): ProgressFeaturedIconType[] {
    const status = (i: number): "complete" | "current" | "incomplete" => {
        if (i + 1 < currentStep) return "complete";
        if (i + 1 === currentStep) return "current";
        return "incomplete";
    };
    return [
        { title: "Company Info", description: "Name, phone & website", status: status(0), icon: Building07 },
        { title: "Business Details", description: "Revenue & customers", status: status(1), icon: Flag05 },
        { title: "Team & Branding", description: "Invite your team", status: status(2), icon: UsersPlus },
        { title: "Select Plan", description: "Choose your pricing", status: status(3), icon: Stars02 },
    ];
}

interface FormData {
    companyName: string;
    phone: string;
    website: string;
    businessModel: string;
    annualRevenue: string;
    geoCoverage: string[];
    targetCustomers: string[];
    totalEmployees: string;
    totalSales: string;
    teamEmails: string;
    selectedPlan: string;
}

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        companyName: "",
        phone: "",
        website: "",
        businessModel: "",
        annualRevenue: "",
        geoCoverage: [],
        targetCustomers: [],
        totalEmployees: "",
        totalSales: "",
        teamEmails: "",
        selectedPlan: "",
    });

    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleArrayField = (key: "geoCoverage" | "targetCustomers", value: string) => {
        setFormData((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((v) => v !== value)
                : [...prev[key], value],
        }));
    };

    const steps = getSteps(step);

    return (
        <div className="flex min-h-screen w-full flex-col items-center bg-primary px-4 py-8 lg:py-12">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
                <Shield01 className="h-6 w-6 text-brand-primary" />
                <span>CyberHook</span>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8 w-full max-w-6xl">
                <Progress.IconsWithText
                    type="number"
                    items={steps}
                    size="sm"
                    orientation="horizontal"
                    className="max-md:hidden"
                />
                <Progress.IconsWithText
                    type="number"
                    items={steps}
                    size="sm"
                    orientation="vertical"
                    className="md:hidden"
                />
            </div>

            {/* Step Content Card */}
            <div className={`w-full rounded-2xl border border-secondary bg-secondary_subtle p-6 shadow-lg lg:p-10 ${step === 4 ? "max-w-6xl" : "max-w-6xl"}`}>
                {/* Step 1 */}
                {step === 1 && (
                    <div className="mx-auto flex max-w-xl flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-semibold text-primary lg:text-2xl">Company Basic Info</h2>
                            <p className="text-sm text-tertiary">Tell us about your company so we can set up your workspace.</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            <TextField name="companyName" isRequired value={formData.companyName} onChange={(v) => updateField("companyName", v)}>
                                <Label>Company Name</Label>
                                <InputBase size="md" placeholder="Acme Security LLC" icon={Building07} />
                            </TextField>
                            <TextField name="phone" isRequired type="tel" value={formData.phone} onChange={(v) => updateField("phone", v)}>
                                <Label>Phone</Label>
                                <InputBase size="md" placeholder="+1 (555) 000-0000" icon={Phone} />
                            </TextField>
                            <TextField name="website" isRequired type="url" value={formData.website} onChange={(v) => updateField("website", v)}>
                                <Label>Website</Label>
                                <InputBase size="md" placeholder="https://yourcompany.com" icon={Globe01} />
                            </TextField>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => setStep(2)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div className="mx-auto flex max-w-xl flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-semibold text-primary lg:text-2xl">Business Details</h2>
                            <p className="text-sm text-tertiary">Help us understand your business so we can tailor the experience.</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            <Select
                                name="businessModel"
                                label="Primary Business Model"
                                placeholder="Select model..."
                                selectedKey={formData.businessModel || undefined}
                                onSelectionChange={(key) => updateField("businessModel", String(key))}
                            >
                                {businessModels.map((m) => (
                                    <Select.Item key={m.id} id={m.id}>{m.label}</Select.Item>
                                ))}
                            </Select>

                            <Select
                                name="annualRevenue"
                                label="Annual Revenue"
                                placeholder="Select range..."
                                selectedKey={formData.annualRevenue || undefined}
                                onSelectionChange={(key) => updateField("annualRevenue", String(key))}
                            >
                                {revenueRanges.map((r) => (
                                    <Select.Item key={r.id} id={r.id}>{r.label}</Select.Item>
                                ))}
                            </Select>

                            <div className="flex flex-col gap-2">
                                <Label>Geographic Coverage</Label>
                                <div className="flex flex-wrap gap-2">
                                    {geoOptions.map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => toggleArrayField("geoCoverage", g)}
                                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                                formData.geoCoverage.includes(g)
                                                    ? "border-brand-solid bg-brand-solid/10 text-brand-primary"
                                                    : "border-secondary bg-primary text-secondary hover:border-tertiary"
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Target Customer Base</Label>
                                <div className="flex flex-wrap gap-2">
                                    {customerOptions.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => toggleArrayField("targetCustomers", c)}
                                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                                formData.targetCustomers.includes(c)
                                                    ? "border-brand-solid bg-brand-solid/10 text-brand-primary"
                                                    : "border-secondary bg-primary text-secondary hover:border-tertiary"
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <Select
                                    name="totalEmployees"
                                    label="Total Employees"
                                    placeholder="Select..."
                                    selectedKey={formData.totalEmployees || undefined}
                                    onSelectionChange={(key) => updateField("totalEmployees", String(key))}
                                >
                                    {employeeRanges.map((e) => (
                                        <Select.Item key={e.id} id={e.id}>{e.label}</Select.Item>
                                    ))}
                                </Select>

                                <Select
                                    name="totalSales"
                                    label="Total Sales People"
                                    placeholder="Select..."
                                    selectedKey={formData.totalSales || undefined}
                                    onSelectionChange={(key) => updateField("totalSales", String(key))}
                                >
                                    {salesRanges.map((s) => (
                                        <Select.Item key={s.id} id={s.id}>{s.label}</Select.Item>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => setStep(3)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <div className="mx-auto flex max-w-xl flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-semibold text-primary lg:text-2xl">Team & Branding</h2>
                            <p className="text-sm text-tertiary">Invite your team and upload your company logo.</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <Label>Team Member Emails</Label>
                                <textarea
                                    value={formData.teamEmails}
                                    onChange={(e) => updateField("teamEmails", e.target.value)}
                                    placeholder="john@company.com, jane@company.com"
                                    rows={3}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3.5 py-2.5 text-sm text-primary placeholder:text-placeholder shadow-xs focus:border-brand-solid focus:outline-none focus:ring-4 focus:ring-brand-solid/10"
                                />
                                <p className="text-xs text-tertiary">Comma-separated list of email addresses (optional)</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Company Logo</Label>
                                <FileUpload.DropZone
                                    accept="image/*"
                                    hint="SVG, PNG, or JPG (max. 2MB)"
                                    className="w-full"
                                />
                                <p className="text-xs text-tertiary">Optional — you can add this later in Settings</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => setStep(4)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4 — Pricing */}
                {step === 4 && (
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-brand-secondary md:text-md">Pricing</p>
                            <h2 className="text-display-md font-semibold text-primary lg:text-display-lg">Simple, transparent pricing</h2>
                            <p className="mt-2 text-lg text-tertiary">
                                All plans include a 5-day free trial. Cancel anytime.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                            {pricingPlans.map((plan) => (
                                <PricingTierCardCallout key={plan.title} {...plan} checkItemTextColor="success" />
                            ))}
                        </div>

                        {/* Payment Form */}
                        <div className="mx-auto w-full max-w-xl">
                            <div className="flex flex-col gap-5 rounded-xl border border-secondary bg-primary p-6">
                                <div className="flex items-center gap-2">
                                    <CreditCard02 className="h-5 w-5 text-tertiary" />
                                    <h3 className="text-md font-semibold text-primary">Payment Details</h3>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <TextField name="cardNumber">
                                        <Label>Card Number</Label>
                                        <InputBase size="md" placeholder="4242 4242 4242 4242" icon={CreditCard02} />
                                    </TextField>
                                    <div className="grid grid-cols-2 gap-4">
                                        <TextField name="expiry">
                                            <Label>Expiry Date</Label>
                                            <InputBase size="md" placeholder="MM / YY" />
                                        </TextField>
                                        <TextField name="cvc">
                                            <Label>CVC</Label>
                                            <InputBase size="md" placeholder="123" />
                                        </TextField>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(3)}>
                                Back
                            </Button>
                            <Button color="primary" size="lg" iconLeading={Zap}>
                                Start 5-day Free Trial
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-6 text-xs text-tertiary">
                By continuing, you agree to CyberHook&apos;s{" "}
                <a href="#" className="underline hover:text-primary">Terms of Service</a> and{" "}
                <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
            </p>
        </div>
    );
}
