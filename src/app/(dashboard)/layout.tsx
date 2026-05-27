"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SidebarNavigationSectionsSubheadings } from "@/components/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings";
import { HeaderNavigationBase } from "@/components/application/app-navigation/header-navigation";
import { RouteGuard } from "@/components/auth/route-guard";
import { UpgradeModalProvider } from "@/components/application/upgrade-modal/upgrade-modal";
import { WalkthroughProvider } from "@/components/walkthrough/walkthrough-context";
import { WalkthroughOverlay } from "@/components/walkthrough/walkthrough-overlay";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    BarChartSquare02,
    Calendar,
    CheckDone01,
    Database01,
    File04,
    Mail01,
    PieChart03,
    SearchLg,
    Shield01,
    Star01,
    Target05,
    Users01,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

const headerItems: any[] = [];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { companyId } = useCurrentUser();

    const taskStats = useQuery(
        api.tasks.getStats,
        companyId ? { companyId } : "skip"
    );

    const pendingTasks = taskStats?.pending ?? 0;

    const navItemsWithSectionsSubheadings = useMemo<Array<{ label: string; items: NavItemType[] }>>(() => [
        {
            label: "Growth",
            items: [
                { label: "Dashboard", href: "/dashboard", icon: BarChartSquare02, dataWalkthrough: "nav-dashboard" },
                { label: "To-Do List", href: "/todos", icon: CheckDone01, dataWalkthrough: "nav-todos", ...(pendingTasks > 0 ? { badge: pendingTasks } : {}) },
                { label: "Ransom Hub", href: "/ransom-hub", icon: Shield01, badge: "New", dataWalkthrough: "nav-ransom-hub" },
                { label: "Live Search", href: "/live-search", icon: SearchLg, dataWalkthrough: "nav-live-search" },
                { label: "Live-Leads", href: "/live-leads", icon: Target05, dataWalkthrough: "nav-live-leads" },
                { label: "Watchlist", href: "/watchlist", icon: Star01, dataWalkthrough: "nav-watchlist" },
                { label: "AI Agents", href: "/ai-agents", icon: Mail01, dataWalkthrough: "nav-ai-agents" },
                { label: "Contacts", href: "/contacts", icon: Users01, dataWalkthrough: "nav-contacts" },
                { label: "Knowledge Base", href: "/knowledge-base", icon: Database01, dataWalkthrough: "nav-knowledge-base" },
                { label: "RFP Hub", href: "/rfp-hub", icon: File04, dataWalkthrough: "nav-rfp-hub" },
                { label: "Events", href: "/events", icon: Calendar, dataWalkthrough: "nav-events" },
                { label: "Reporting", href: "/reporting", icon: PieChart03, dataWalkthrough: "nav-reporting" },
            ],
        },
    ], [pendingTasks]);
    return (
        <RouteGuard>
            <WalkthroughProvider>
                <div className="flex bg-secondary text-primary min-h-screen">
                    <SidebarNavigationSectionsSubheadings
                        items={navItemsWithSectionsSubheadings}
                        activeUrl={pathname}
                    />
                    {/* Main content with Header above it */}
                    <main className="flex flex-1 flex-col min-w-0 bg-primary h-screen overflow-hidden">
                        <HeaderNavigationBase
                            items={headerItems}
                            showAvatarDropdown={true}
                            hideBorder={false}
                        />
                        <div className="flex-1 overflow-y-auto">
                            <UpgradeModalProvider>
                                {children}
                            </UpgradeModalProvider>
                        </div>
                    </main>
                </div>
                {/* Phase 10 — guided walkthrough overlay (welcome, spotlight,
                    tooltip, completion). Mounted last so it sits above all
                    page content. */}
                <WalkthroughOverlay />
            </WalkthroughProvider>
        </RouteGuard>
    );
}
