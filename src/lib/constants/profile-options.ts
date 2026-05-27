/**
 * Canonical dropdown options for the Company Profile.
 *
 * SINGLE SOURCE OF TRUTH — both the onboarding wizard and the Settings →
 * Company Profile form import from this file. Do not hard-code these lists
 * anywhere else.
 *
 * Each option is `{ value, label }` where `value` is the canonical string
 * persisted to Convex and `label` is the human-friendly text shown in the UI.
 *
 * If you add/rename a value here, update `normalizeLegacy<Field>` below so
 * existing rows in the database still resolve correctly.
 */

export interface ProfileOption {
    /** Canonical value persisted to the database. */
    value: string;
    /** Human-readable label shown in the UI. */
    label: string;
}

/* -------------------------------------------------------------------------- */
/*  Canonical option lists                                                    */
/* -------------------------------------------------------------------------- */

export const PRIMARY_BUSINESS_MODEL_OPTIONS: readonly ProfileOption[] = [
    { value: "msp", label: "MSP / MSSP" },
    { value: "var", label: "VAR / Reseller" },
    { value: "si", label: "Systems Integrator" },
    { value: "vad", label: "Value Added Distributor (VAD)" },
    { value: "tap", label: "Technology Alliances Partner (TAP)" },
    { value: "consultant", label: "Consultant / Referral Partner" },
] as const;

export const ANNUAL_REVENUE_OPTIONS: readonly ProfileOption[] = [
    { value: "0-4M", label: "$0–4M" },
    { value: "5-9M", label: "$5–9M" },
    { value: "10-24M", label: "$10–24M" },
    { value: "25-49M", label: "$25–49M" },
    { value: "50-99M", label: "$50–99M" },
    { value: "100-249M", label: "$100–249M" },
    { value: "250M-1B", label: "$250M–1B" },
    { value: "1B+", label: "$1B+" },
] as const;

export const GEOGRAPHIC_COVERAGE_OPTIONS: readonly string[] = [
    "North America",
    "EMEA",
    "APAC",
    "ANZ",
    "LATAM",
] as const;

export const TARGET_CUSTOMER_BASE_OPTIONS: readonly string[] = [
    "SMB",
    "Mid Market",
    "Enterprise",
    "Fortune 500",
] as const;

export const TOTAL_EMPLOYEES_OPTIONS: readonly ProfileOption[] = [
    { value: "1-10", label: "1–10" },
    { value: "11-50", label: "11–50" },
    { value: "51-100", label: "51–100" },
    { value: "101-150", label: "101–150" },
    { value: "151-250", label: "151–250" },
    { value: "251-500", label: "251–500" },
    { value: "501+", label: "501+" },
] as const;

export const SALES_TEAM_SIZE_OPTIONS: readonly ProfileOption[] = [
    { value: "just-me", label: "Just me (solo)" },
    { value: "2-3", label: "2–3" },
    { value: "3-5", label: "3–5" },
    { value: "5-10", label: "5–10" },
    { value: "10-25", label: "10–25" },
    { value: "25-50", label: "25–50" },
    { value: "50+", label: "50+" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Legacy normalizers                                                        */
/*                                                                            */
/*  These map historical/Settings-only values onto the canonical list so that */
/*  existing DB rows still surface correctly in the redesigned dropdowns.     */
/*  Whenever we add a new value above, add a mapping here (or in the           */
/*  migration script) to keep dropdowns stable.                                */
/* -------------------------------------------------------------------------- */

const PRIMARY_BUSINESS_MODEL_LEGACY: Record<string, string> = {
    "MSP/MSSP": "msp",
    "VAR/Reseller": "var",
    vendor: "var",
    vad: "vad",
    tap: "tap",
};

const ANNUAL_REVENUE_LEGACY: Record<string, string> = {
    // Onboarding legacy (no $/M suffix)
    "0-4": "0-4M",
    "5-9": "5-9M",
    "10-24": "10-24M",
    "25-49": "25-49M",
    "50-99": "50-99M",
    "100-249": "100-249M",
    "250-1b": "250M-1B",
    "1b+": "1B+",
    // Old Settings buckets (coarser) — best-effort mapping
    "0-1": "0-4M",
    "1-10": "5-9M",
    "25+": "25-49M",
};

const SALES_TEAM_SIZE_LEGACY: Record<string, string> = {
    "Just me": "just-me",
    solo: "just-me",
    // Old Settings buckets
    "1": "just-me",
    "2-5": "2-3",
    "6-10": "5-10",
    "11+": "10-25",
};

const TOTAL_EMPLOYEES_LEGACY: Record<string, string> = {
    "101+": "101-150",
};

function normalizeWithMap(
    value: string | undefined | null,
    map: Record<string, string>,
    canonicalValues: readonly string[],
): string {
    if (!value) return "";
    if (canonicalValues.includes(value)) return value;
    return map[value] ?? value;
}

export function normalizeLegacyPrimaryBusinessModel(value: string | undefined | null): string {
    return normalizeWithMap(
        value,
        PRIMARY_BUSINESS_MODEL_LEGACY,
        PRIMARY_BUSINESS_MODEL_OPTIONS.map((o) => o.value),
    );
}

export function normalizeLegacyAnnualRevenue(value: string | undefined | null): string {
    return normalizeWithMap(
        value,
        ANNUAL_REVENUE_LEGACY,
        ANNUAL_REVENUE_OPTIONS.map((o) => o.value),
    );
}

export function normalizeLegacyTotalEmployees(value: string | undefined | null): string {
    return normalizeWithMap(
        value,
        TOTAL_EMPLOYEES_LEGACY,
        TOTAL_EMPLOYEES_OPTIONS.map((o) => o.value),
    );
}

export function normalizeLegacySalesTeamSize(value: string | undefined | null): string {
    return normalizeWithMap(
        value,
        SALES_TEAM_SIZE_LEGACY,
        SALES_TEAM_SIZE_OPTIONS.map((o) => o.value),
    );
}

/* -------------------------------------------------------------------------- */
/*  Helper getters                                                            */
/* -------------------------------------------------------------------------- */

/** Returns the display label for a canonical value, or the raw value if unknown. */
export function getProfileLabel(options: readonly ProfileOption[], value: string | undefined | null): string {
    if (!value) return "";
    return options.find((o) => o.value === value)?.label ?? value;
}
