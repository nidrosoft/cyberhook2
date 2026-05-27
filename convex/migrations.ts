/**
 * One-off data migrations.
 *
 * All migrations here are idempotent: running them multiple times has the
 * same effect as running them once. Each migration logs the rewrites it
 * applied so we can include them in the Phase 2 status report.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Keep these aligned with src/lib/constants/profile-options.ts. Duplicated
// here because Convex functions can't import from src/.
const BUSINESS_MODEL_CANONICAL = new Set([
    "msp",
    "var",
    "si",
    "vad",
    "tap",
    "consultant",
]);
const BUSINESS_MODEL_LEGACY: Record<string, string> = {
    "MSP/MSSP": "msp",
    "VAR/Reseller": "var",
    vendor: "var",
};

const ANNUAL_REVENUE_CANONICAL = new Set([
    "0-4M",
    "5-9M",
    "10-24M",
    "25-49M",
    "50-99M",
    "100-249M",
    "250M-1B",
    "1B+",
]);
const ANNUAL_REVENUE_LEGACY: Record<string, string> = {
    "0-4": "0-4M",
    "5-9": "5-9M",
    "10-24": "10-24M",
    "25-49": "25-49M",
    "50-99": "50-99M",
    "100-249": "100-249M",
    "250-1b": "250M-1B",
    "1b+": "1B+",
    "0-1": "0-4M",
    "1-10": "5-9M",
    "25+": "25-49M",
};

const SALES_TEAM_SIZE_CANONICAL = new Set([
    "just-me",
    "2-3",
    "3-5",
    "5-10",
    "10-25",
    "25-50",
    "50+",
]);
const SALES_TEAM_SIZE_LEGACY: Record<string, string> = {
    "Just me": "just-me",
    "1": "just-me",
    "2-5": "2-3",
    "6-10": "5-10",
    "11+": "10-25",
};

const TOTAL_EMPLOYEES_CANONICAL = new Set([
    "1-10",
    "11-50",
    "51-100",
    "101-150",
    "151-250",
    "251-500",
    "501+",
]);
const TOTAL_EMPLOYEES_LEGACY: Record<string, string> = {
    "101+": "101-150",
};

function normalize(
    value: string | undefined,
    canonical: Set<string>,
    legacy: Record<string, string>,
): string | undefined {
    if (value === undefined || value === null || value === "") return value;
    if (canonical.has(value)) return value;
    return legacy[value] ?? value;
}

/**
 * Normalize all profile-option fields in the `companies` table.
 *
 * Idempotent. Run with:
 *   npx convex run migrations:normalizeCompanyProfileOptions '{}'
 */
export const normalizeCompanyProfileOptions = internalMutation({
    args: {},
    handler: async (ctx) => {
        const companies = await ctx.db.query("companies").collect();
        const rewrites: Array<{ id: string; name: string; changes: Record<string, { from: unknown; to: unknown }> }> = [];

        for (const c of companies) {
            const changes: Record<string, { from: unknown; to: unknown }> = {};

            const nextBusinessModel = normalize(
                c.primaryBusinessModel,
                BUSINESS_MODEL_CANONICAL,
                BUSINESS_MODEL_LEGACY,
            );
            if (nextBusinessModel && nextBusinessModel !== c.primaryBusinessModel) {
                changes.primaryBusinessModel = { from: c.primaryBusinessModel, to: nextBusinessModel };
            }

            const nextRevenue = normalize(c.annualRevenue, ANNUAL_REVENUE_CANONICAL, ANNUAL_REVENUE_LEGACY);
            if (nextRevenue && nextRevenue !== c.annualRevenue) {
                changes.annualRevenue = { from: c.annualRevenue, to: nextRevenue };
            }

            const nextEmployees = normalize(c.totalEmployees, TOTAL_EMPLOYEES_CANONICAL, TOTAL_EMPLOYEES_LEGACY);
            if (nextEmployees && nextEmployees !== c.totalEmployees) {
                changes.totalEmployees = { from: c.totalEmployees, to: nextEmployees };
            }

            const nextTotalSalesPeople = normalize(
                c.totalSalesPeople,
                SALES_TEAM_SIZE_CANONICAL,
                SALES_TEAM_SIZE_LEGACY,
            );
            if (nextTotalSalesPeople && nextTotalSalesPeople !== c.totalSalesPeople) {
                changes.totalSalesPeople = { from: c.totalSalesPeople, to: nextTotalSalesPeople };
            }

            const nextSalesTeamSize = normalize(
                c.salesTeamSize ?? nextTotalSalesPeople ?? c.totalSalesPeople,
                SALES_TEAM_SIZE_CANONICAL,
                SALES_TEAM_SIZE_LEGACY,
            );
            if (nextSalesTeamSize && nextSalesTeamSize !== c.salesTeamSize) {
                changes.salesTeamSize = { from: c.salesTeamSize, to: nextSalesTeamSize };
            }

            // Settings used to store `companyType` separately from `primaryBusinessModel`.
            // Normalize both consistently so future reads from either field render correctly.
            const nextCompanyType = normalize(
                c.companyType ?? nextBusinessModel ?? c.primaryBusinessModel,
                BUSINESS_MODEL_CANONICAL,
                BUSINESS_MODEL_LEGACY,
            );
            if (nextCompanyType && nextCompanyType !== c.companyType) {
                changes.companyType = { from: c.companyType, to: nextCompanyType };
            }

            if (Object.keys(changes).length > 0) {
                const patch: Record<string, string> = {};
                for (const [k, v] of Object.entries(changes)) {
                    patch[k] = v.to as string;
                }
                await ctx.db.patch(c._id, patch);
                rewrites.push({ id: c._id, name: c.name ?? "(unnamed)", changes });
            }
        }

        return {
            scanned: companies.length,
            rewritten: rewrites.length,
            rewrites,
        };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — backfill `inviteToken` for legacy pending invitations so the
// tokenized accept-invite flow works for invites created before Phase 3.
// Idempotent: skips rows that already have a token.
// ─────────────────────────────────────────────────────────────────────────────

function generateInviteToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export const backfillInviteTokens = internalMutation({
    args: {},
    handler: async (ctx) => {
        const invitations = await ctx.db.query("invitations").collect();
        const rewrites: Array<{ id: string; email: string }> = [];
        for (const inv of invitations) {
            if (inv.inviteToken) continue;
            if (inv.status !== "pending") continue;
            const inviteToken = generateInviteToken();
            await ctx.db.patch(inv._id, { inviteToken });
            rewrites.push({ id: inv._id, email: inv.email });
        }
        return {
            scanned: invitations.length,
            rewritten: rewrites.length,
            rewrites,
        };
    },
});
