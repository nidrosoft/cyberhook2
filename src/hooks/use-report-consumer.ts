"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUpgradeModal } from "@/components/application/upgrade-modal/upgrade-modal";
import { useCompany } from "./use-company";
import type { PlanTier } from "@/lib/plans";

/**
 * Wraps the `companies.consumeReport` mutation so callers don't have to
 * re-implement the limit-reached UX every time they generate a report
 * (PDF export, exposure report, etc.).
 *
 * Returns an async function that returns `true` if consumption succeeded
 * and the caller can proceed with the actual report generation. If the
 * company has hit its monthly quota, the upgrade modal is shown and the
 * function returns `false`. Network/auth errors surface a toast and
 * also return `false`.
 */
export function useReportConsumer() {
    const consumeReport = useMutation(api.companies.consumeReport);
    const { showUpgradeModal } = useUpgradeModal();
    const { company } = useCompany();

    return useCallback(
        async (companyId: Id<"companies"> | null | undefined): Promise<boolean> => {
            if (!companyId) {
                toast.error("We couldn't identify your account. Please refresh and try again.");
                return false;
            }
            try {
                await consumeReport({ id: companyId });
                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes("REPORT_LIMIT_REACHED")) {
                    const currentPlan = (company?.planId ?? "solo") as PlanTier;
                    showUpgradeModal(currentPlan, {
                        type: "usage",
                        resource: "reports",
                        message: "You've used all your reports for this billing cycle. Upgrade to generate more exposure reports.",
                    });
                    return false;
                }
                if (process.env.NODE_ENV === "development") console.error("consumeReport failed:", err);
                toast.error("We couldn't record this report. Please try again.");
                return false;
            }
        },
        [consumeReport, showUpgradeModal, company?.planId],
    );
}
