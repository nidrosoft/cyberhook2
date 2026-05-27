"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { setOnboardingComplete } from "@/app/actions/clerk";
import { useFileUpload } from "@/hooks/use-file-upload";
import { validateCompanyLogo } from "@/lib/logo-validation";
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
    XClose,
    Zap,
} from "@untitledui/icons";

import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressFeaturedIconType } from "@/components/application/progress-steps/progress-types";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { friendlyError } from "@/lib/friendly-errors";
import { PLANS, PLAN_ORDER, type PlanTier } from "@/lib/plans";
import { CheckCircle } from "@untitledui/icons";

import {
    PRIMARY_BUSINESS_MODEL_OPTIONS as businessModels,
    ANNUAL_REVENUE_OPTIONS as revenueRanges,
    GEOGRAPHIC_COVERAGE_OPTIONS as geoOptions,
    TARGET_CUSTOMER_BASE_OPTIONS as customerOptions,
    TOTAL_EMPLOYEES_OPTIONS as employeeRanges,
    SALES_TEAM_SIZE_OPTIONS as salesRanges,
} from "@/lib/constants/profile-options";


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
    selectedPlan: PlanTier;
    planSelectedManually: boolean;
    logoUrl: string;
    logoStorageId: Id<"_storage"> | "";
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

const STORAGE_KEY_STEP = "cyberhook_onboarding_step";
const STORAGE_KEY_FORM = "cyberhook_onboarding_form";

const defaultFormData: FormData = {
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
    selectedPlan: "growth",
    planSelectedManually: false,
    logoUrl: "",
    logoStorageId: "",
};

function loadSavedStep(): number {
    if (typeof window === "undefined") return 1;
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY_STEP);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (parsed >= 1 && parsed <= 4) return parsed;
        }
    } catch {}
    return 1;
}

function loadSavedForm(): FormData {
    if (typeof window === "undefined") return defaultFormData;
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY_FORM);
        if (saved) return { ...defaultFormData, ...JSON.parse(saved) };
    } catch {}
    return defaultFormData;
}

export default function OnboardingPage() {
    const { user } = useUser();
    const { session } = useSession();
    const router = useRouter();
    const [step, setStepRaw] = useState(loadSavedStep);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
    // Phase 4B: signup creates a Stripe Checkout Session with a 7-day trial
    // before the user lands on the pending-approval page.
    const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
    const [formData, setFormData] = useState<FormData>(loadSavedForm);
    const { uploadWithMetadata: uploadLogo, isUploading: isLogoUploading } = useFileUpload();
    const [logoError, setLogoError] = useState<string | null>(null);

    const setStep = useCallback((s: number) => {
        setStepRaw(s);
        try { sessionStorage.setItem(STORAGE_KEY_STEP, String(s)); } catch {}
    }, []);

    useEffect(() => {
        try { sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData)); } catch {}
    }, [formData]);

    const clearSavedProgress = useCallback(() => {
        try {
            sessionStorage.removeItem(STORAGE_KEY_STEP);
            sessionStorage.removeItem(STORAGE_KEY_FORM);
        } catch {}
    }, []);

    // Phase 4B: card collection moved to Stripe Checkout. The only step-4
    // requirement now is an explicit plan pick — Stripe handles everything
    // else over its own hosted form.
    const step4Validation = useMemo(() => ({
        planSelected: formData.planSelectedManually,
        allValid: formData.planSelectedManually,
    }), [formData.planSelectedManually]);

    const setErrorsForFields = useCallback((keys: Array<keyof FormData>, errors: FieldErrors) => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            keys.forEach((key) => delete next[key]);
            return { ...next, ...errors };
        });
    }, []);

    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const toggleArrayField = (key: "geoCoverage" | "targetCustomers", value: string) => {
        setFormData((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((v) => v !== value)
                : [...prev[key], value],
        }));
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const validateStep1 = useCallback(() => {
        const errors: FieldErrors = {};
        if (!formData.companyName.trim()) errors.companyName = "Company name is required.";
        if (!formData.phone.trim()) errors.phone = "Phone number is required.";
        if (!formData.website.trim()) errors.website = "Website is required.";
        setErrorsForFields(["companyName", "phone", "website"], errors);
        return Object.keys(errors).length === 0;
    }, [formData.companyName, formData.phone, formData.website, setErrorsForFields]);

    const validateStep2 = useCallback(() => {
        const errors: FieldErrors = {};
        if (!formData.businessModel) errors.businessModel = "Primary business model is required.";
        if (!formData.annualRevenue) errors.annualRevenue = "Annual revenue is required.";
        if (formData.geoCoverage.length === 0) errors.geoCoverage = "Select at least one geographic coverage area.";
        if (formData.targetCustomers.length === 0) errors.targetCustomers = "Select at least one target customer segment.";
        if (!formData.totalEmployees) errors.totalEmployees = "Total employees is required.";
        if (!formData.totalSales) errors.totalSales = "Total sales people is required.";
        setErrorsForFields(["businessModel", "annualRevenue", "geoCoverage", "targetCustomers", "totalEmployees", "totalSales"], errors);
        return Object.keys(errors).length === 0;
    }, [formData.businessModel, formData.annualRevenue, formData.geoCoverage, formData.targetCustomers, formData.totalEmployees, formData.totalSales, setErrorsForFields]);

    const goToStep = useCallback((nextStep: number) => {
        setError(null);
        if (nextStep > 1 && !validateStep1()) {
            setError("Please complete the required company fields before continuing.");
            setStep(1);
            return;
        }
        if (nextStep > 2 && !validateStep2()) {
            setError("Please complete the required business details before continuing.");
            setStep(2);
            return;
        }
        setStep(nextStep);
    }, [setStep, validateStep1, validateStep2]);

    const steps = getSteps(step);

    return (
        <div className="flex min-h-screen w-full flex-col items-center bg-primary px-4 py-8 lg:py-12">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
                <Shield01 className="h-6 w-6 text-brand-primary" />
                <span>CyberHook AI</span>
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
            <div className={`w-full max-w-6xl rounded-2xl border border-secondary bg-secondary_subtle p-4 shadow-lg sm:p-6 lg:p-10`}>
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
                            {fieldErrors.companyName && <p className="text-xs text-error-primary">{fieldErrors.companyName}</p>}
                            <TextField name="phone" isRequired type="tel" value={formData.phone} onChange={(v) => updateField("phone", v)}>
                                <Label>Phone</Label>
                                <InputBase size="md" placeholder="+1 (555) 000-0000" icon={Phone} />
                            </TextField>
                            {fieldErrors.phone && <p className="text-xs text-error-primary">{fieldErrors.phone}</p>}
                            <TextField name="website" isRequired type="url" value={formData.website} onChange={(v) => updateField("website", v)}>
                                <Label>Website</Label>
                                <InputBase size="md" placeholder="https://yourcompany.com" icon={Globe01} />
                            </TextField>
                            {fieldErrors.website && <p className="text-xs text-error-primary">{fieldErrors.website}</p>}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => goToStep(2)}>
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
                                    <Select.Item key={m.value} id={m.value}>{m.label}</Select.Item>
                                ))}
                            </Select>
                            {fieldErrors.businessModel && <p className="text-xs text-error-primary">{fieldErrors.businessModel}</p>}

                            <Select
                                name="annualRevenue"
                                label="Annual Revenue"
                                placeholder="Select range..."
                                selectedKey={formData.annualRevenue || undefined}
                                onSelectionChange={(key) => updateField("annualRevenue", String(key))}
                            >
                                {revenueRanges.map((r) => (
                                    <Select.Item key={r.value} id={r.value}>{r.label}</Select.Item>
                                ))}
                            </Select>
                            {fieldErrors.annualRevenue && <p className="text-xs text-error-primary">{fieldErrors.annualRevenue}</p>}

                            <div className="flex flex-col gap-2">
                                <Label>Geographic Coverage *</Label>
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
                                {fieldErrors.geoCoverage && <p className="text-xs text-error-primary">{fieldErrors.geoCoverage}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Target Customer Base *</Label>
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
                                {fieldErrors.targetCustomers && <p className="text-xs text-error-primary">{fieldErrors.targetCustomers}</p>}
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
                                        <Select.Item key={e.value} id={e.value}>{e.label}</Select.Item>
                                    ))}
                                </Select>
                                {fieldErrors.totalEmployees && <p className="text-xs text-error-primary">{fieldErrors.totalEmployees}</p>}

                                <Select
                                    name="totalSales"
                                    label="Total Sales People"
                                    placeholder="Select..."
                                    selectedKey={formData.totalSales || undefined}
                                    onSelectionChange={(key) => updateField("totalSales", String(key))}
                                >
                                    {salesRanges.map((s) => (
                                        <Select.Item key={s.value} id={s.value}>{s.label}</Select.Item>
                                    ))}
                                </Select>
                                {fieldErrors.totalSales && <p className="text-xs text-error-primary">{fieldErrors.totalSales}</p>}
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => goToStep(3)}>
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
                                {formData.logoUrl ? (
                                    <div className="flex items-center gap-4">
                                        <div className="relative group shrink-0">
                                            <img
                                                src={formData.logoUrl}
                                                alt="Company logo"
                                                className="h-16 w-16 rounded-lg border border-secondary object-contain bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, logoUrl: "" }))}
                                                className="absolute -top-2 -right-2 flex items-center justify-center size-5 rounded-full bg-error-primary text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                                title="Remove logo"
                                            >
                                                <XClose className="size-3" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-tertiary">Logo uploaded. Hover to remove.</p>
                                    </div>
                                ) : (
                                    <FileUpload.DropZone
                                        accept="image/gif,image/png,image/jpeg,image/jpg,image/jfif,.jfif"
                                        hint="GIF, PNG, JPG, JPEG, or JFIF (min 256×256, max 2MB)"
                                        className="w-full"
                                        allowsMultiple={false}
                                        maxSize={2 * 1024 * 1024}
                                        isDisabled={isLogoUploading}
                                        onDropFiles={async (files) => {
                                            const file = files?.[0];
                                            if (!file) return;
                                            setLogoError(null);
                                            try {
                                                const validationError = await validateCompanyLogo(file);
                                                if (validationError) {
                                                    setLogoError(validationError);
                                                    return;
                                                }
                                                const uploadResult = await uploadLogo(file);
                                                if (uploadResult) {
                                                    setFormData((prev) => ({ ...prev, logoUrl: uploadResult.url, logoStorageId: uploadResult.storageId as Id<"_storage"> }));
                                                } else {
                                                    setLogoError("Failed to upload logo. Please try again.");
                                                }
                                            } catch {
                                                setLogoError("Failed to upload logo. Please try again.");
                                            }
                                        }}
                                        onSizeLimitExceed={() => setLogoError("Logo must be smaller than 2MB.")}
                                    />
                                )}
                                {isLogoUploading && (
                                    <p className="text-xs text-tertiary">Uploading…</p>
                                )}
                                {logoError && (
                                    <p className="text-xs text-error-primary">{logoError}</p>
                                )}
                                <p className="text-xs text-tertiary">Optional — you can add this later in Settings</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button color="primary" size="lg" iconTrailing={ArrowRight} onClick={() => goToStep(4)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4 — Select Plan */}
                {step === 4 && (
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-brand-secondary md:text-md">Select Plan</p>
                            <h2 className="text-display-xs font-semibold text-primary sm:text-display-md lg:text-display-lg">Simple, transparent pricing</h2>
                            <p className="mt-2 text-md text-tertiary sm:text-lg">
                                All plans include a 7-day free trial. No onboarding fees. Cancel anytime.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:gap-6">
                            {PLAN_ORDER.map((tier) => {
                                const plan = PLANS[tier];
                                const isSelected = formData.selectedPlan === tier;
                                return (
                                    <button
                                        key={tier}
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, selectedPlan: tier, planSelectedManually: true }))}
                                        className={`relative flex flex-col rounded-2xl bg-primary shadow-lg text-left transition-all ${
                                            isSelected
                                                ? "ring-2 ring-brand-secondary border-brand-secondary"
                                                : "ring-1 ring-secondary hover:ring-brand-secondary/50"
                                        }`}
                                    >
                                        {plan.badge && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                <Badge color="brand" size="sm">{plan.badge}</Badge>
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center px-6 pt-10 text-center md:px-8">
                                            <h2 className="text-display-md font-semibold text-primary md:text-display-lg">
                                                {plan.priceLabel}<span className="text-lg font-normal text-tertiary">/mo</span>
                                            </h2>
                                            <p className="mt-3 text-xl font-semibold text-primary">{plan.name}</p>
                                            <p className="mt-1 text-sm text-tertiary">{plan.tagline}</p>
                                        </div>

                                        <div className="px-6 pt-4 pb-1 md:px-8">
                                            <p className="text-xs font-medium text-secondary">{plan.marketingDescription}</p>
                                        </div>

                                        <ul className="flex flex-col gap-3 px-6 pt-3 pb-6 md:px-8">
                                            {plan.features.map((feat) => (
                                                <li key={feat} className="flex items-start gap-2 text-sm text-secondary">
                                                    <CheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-auto px-6 pb-6 md:px-8">
                                            <div className={`w-full rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                                                isSelected
                                                    ? "bg-brand-solid text-white"
                                                    : "bg-secondary_subtle text-secondary"
                                            }`}>
                                                {isSelected ? "Selected" : "Select Plan"}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Phase 4B: card details are collected on Stripe's
                            hosted Checkout page, not in our form. We just
                            confirm the chosen plan + trial summary here. */}
                        <div className="mx-auto w-full max-w-xl">
                            <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-6">
                                <div className="flex items-center gap-2">
                                    <CreditCard02 className="h-5 w-5 text-tertiary" />
                                    <h3 className="text-md font-semibold text-primary">Secure Checkout</h3>
                                </div>
                                <p className="text-sm text-secondary">
                                    Start your 7-day free trial — you won&apos;t be charged until day 8. We&apos;ll hand you off to Stripe&apos;s secure checkout to enter your card details. You can cancel any time from your Settings.
                                </p>
                                <ul className="mt-1 flex flex-col gap-1.5 text-sm text-tertiary">
                                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" /> No charge during the 7-day trial.</li>
                                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" /> Cancel anytime from your billing settings.</li>
                                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-success-500 mt-0.5 shrink-0" /> Payment is handled by Stripe, PCI-DSS Level 1 certified.</li>
                                </ul>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-error-primary">{error}</p>
                        )}
                        {!step4Validation.allValid && (
                            <p className="text-xs text-tertiary text-center">
                                {!step4Validation.planSelected ? "Select a plan to continue." : ""}
                            </p>
                        )}
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                            <Button color="secondary" size="lg" iconLeading={ArrowLeft} onClick={() => setStep(3)}>
                                Back
                            </Button>
                            <Button 
                                color="primary" 
                                size="lg" 
                                iconLeading={Zap}
                                disabled={isSubmitting || !step4Validation.allValid}
                                onClick={async () => {
                                    if (!user) return;
                                    if (!validateStep1()) {
                                        setError("Please complete the required company fields before continuing.");
                                        setStep(1);
                                        return;
                                    }
                                    if (!validateStep2()) {
                                        setError("Please complete the required business details before continuing.");
                                        setStep(2);
                                        return;
                                    }
                                    if (!step4Validation.allValid) {
                                        setError("Please select a plan to continue.");
                                        return;
                                    }
                                    setIsSubmitting(true);
                                    setError(null);
                                    try {
                                        const teamEmailsArray = formData.teamEmails
                                            .split(",")
                                            .map((e) => e.trim())
                                            .filter((e) => e.length > 0);

                                        const result = await completeOnboarding({
                                            clerkId: user.id,
                                            email: user.primaryEmailAddress?.emailAddress || "",
                                            firstName: user.firstName || "",
                                            lastName: user.lastName || "",
                                            imageUrl: user.imageUrl,
                                            companyName: formData.companyName,
                                            phone: formData.phone,
                                            website: formData.website,
                                            primaryBusinessModel: formData.businessModel,
                                            annualRevenue: formData.annualRevenue,
                                            geographicCoverage: formData.geoCoverage,
                                            targetCustomerBase: formData.targetCustomers,
                                            totalEmployees: formData.totalEmployees,
                                            totalSalesPeople: formData.totalSales,
                                            teamEmails: teamEmailsArray,
                                            logoUrl: formData.logoUrl || undefined,
                                            logoStorageId: formData.logoStorageId || undefined,
                                            selectedPlanId: formData.selectedPlan,
                                            planSelectedManually: formData.planSelectedManually,
                                            // Stripe Checkout is now the payment gate; this flag stays
                                            // true here so the existing onboarding state machine accepts
                                            // the submission. Approval still waits for the
                                            // checkout.session.completed webhook.
                                            paymentMethodProvided: true,
                                        });

                                        if (!result.success) {
                                            setError("Failed to complete onboarding. Please try again.");
                                            setIsSubmitting(false);
                                            return;
                                        }

                                        await setOnboardingComplete(
                                            user.id,
                                            result.userId,
                                            result.companyId,
                                        );

                                        clearSavedProgress();
                                        if (session) {
                                            await session.reload();
                                        }

                                        // Phase 4B: hand off to Stripe Checkout for the selected
                                        // plan. The 7-day free trial defers the actual charge.
                                        const selectedTier = formData.selectedPlan as PlanTier;
                                        const planConfig = PLANS[selectedTier] ?? PLANS.growth;
                                        const checkout = await createCheckoutSession({
                                            priceId: planConfig.stripePriceId,
                                            planId: planConfig.id,
                                            successUrl: `${window.location.origin}/pending-approval?checkout=success`,
                                            cancelUrl: `${window.location.origin}/onboarding?step=4&checkout=cancelled`,
                                            trialPeriodDays: 7,
                                        });

                                        if (checkout?.url && checkout.url.startsWith("https://checkout.stripe.com")) {
                                            window.location.href = checkout.url;
                                        } else {
                                            // Stripe didn't return a URL — degrade gracefully: take the
                                            // user to the pending-approval page so onboarding isn't
                                            // wedged, and surface a toast so support can investigate.
                                            window.location.href = "/pending-approval";
                                        }
                                    } catch (err) {
                                        if (process.env.NODE_ENV === "development") console.error("Error completing onboarding:", err);
                                        setError(friendlyError(err, "We couldn't complete onboarding. Please try again."));
                                        setIsSubmitting(false);
                                    }
                                }}
                            >
                                {isSubmitting ? "Setting up..." : "Start 7-day Free Trial"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-6 text-xs text-tertiary">
                By continuing, you agree to CyberHook AI&apos;s{" "}
                <a
                    href="https://cyberhook.ai/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                >
                    Terms &amp; Conditions
                </a>{" "}
                and{" "}
                <a
                    href="https://cyberhook.ai/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                >
                    Privacy Policy
                </a>.
            </p>
        </div>
    );
}
