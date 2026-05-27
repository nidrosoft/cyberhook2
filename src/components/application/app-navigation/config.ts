import type { FC, ReactNode } from "react";

export type NavItemType = {
    /** Label text for the nav item. */
    label: string;
    /** URL to navigate to when the nav item is clicked. */
    href?: string;
    /** Icon component to display. */
    icon?: FC<{ className?: string }>;
    /** Badge to display. */
    badge?: ReactNode;
    /** List of sub-items to display. */
    items?: { label: string; href: string; icon?: FC<{ className?: string }>; badge?: ReactNode; dataWalkthrough?: string }[];
    /** Whether this nav item is a divider. */
    divider?: boolean;
    /**
     * Phase 10 — selector hook for the guided walkthrough overlay so the
     * tour can highlight this specific sidebar item. Renders as
     * `data-walkthrough="..."` on the underlying anchor.
     */
    dataWalkthrough?: string;
};

export type NavItemDividerType = Omit<NavItemType, "icon" | "label" | "divider"> & {
    /** Label text for the divider. */
    label?: string;
    /** Whether this nav item is a divider. */
    divider: true;
};
