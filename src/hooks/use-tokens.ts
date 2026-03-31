"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCompany } from "./use-company";

export function useTokens() {
    const { 
        company,
        tokensRemaining, 
        tokenAllocation, 
        tokensUsed,
        tokenPercentage, 
        tokenStatus,
        daysUntilReset,
        isLoading 
    } = useCompany();

    const consumeTokensMutation = useMutation(api.companies.consumeToken);

    const consumeTokens = async (amount: number = 1): Promise<{ success: boolean; error?: string }> => {
        if (!company) {
            return { success: false, error: "Company not found" };
        }

        if (tokensRemaining < amount) {
            return { success: false, error: "Insufficient tokens" };
        }

        try {
            await consumeTokensMutation({ 
                id: company._id
            });
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : "Failed to consume tokens" 
            };
        }
    };

    const canConsumeTokens = (amount: number = 1): boolean => {
        return tokensRemaining >= amount;
    };

    return {
        // Token data
        tokensRemaining,
        tokenAllocation,
        tokensUsed,
        tokenPercentage,
        tokenStatus,
        daysUntilReset,
        isLoading,
        // Actions
        consumeTokens,
        canConsumeTokens,
        // Display helpers
        tokenDisplayText: `${tokensRemaining} / ${tokenAllocation}`,
        resetDisplayText: daysUntilReset > 0 
            ? `Resets in ${daysUntilReset} day${daysUntilReset === 1 ? "" : "s"}`
            : "Resets today",
    };
}
