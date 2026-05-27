"use client";

import { Compass03 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { useWalkthrough } from "./walkthrough-context";

/**
 * Phase 10 — "Restart tour" entry inside the avatar dropdown. Styled to
 * match the surrounding `NavAccountCardMenuItem` rows so it doesn't stand
 * out visually from the rest of the menu.
 */
export function TourMenuItem() {
    const { restart, status } = useWalkthrough();
    const label = status === "completed" ? "Restart product tour" : status === "in_progress" ? "Restart product tour" : "Start product tour";

    return (
        <button
            type="button"
            onClick={() => restart()}
            className={cx("group/item w-full cursor-pointer px-1.5 focus:outline-hidden")}
        >
            <div
                className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover",
                    "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
                )}
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                    <Compass03 className="size-5 text-fg-quaternary" />
                    {label}
                </div>
            </div>
        </button>
    );
}
