"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SidebarNavigationSectionsSubheadings } from "@/components/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings";
import { HeaderNavigationBase } from "@/components/application/app-navigation/header-navigation";
import { RouteGuard } from "@/components/auth/route-guard";
import { UpgradeModalProvider } from "@/components/application/upgrade-modal/upgrade-modal";
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
                { label: "Dashboard", href: "/dashboard", icon: BarChartSquare02 },
                { label: "To-Do List", href: "/todos", icon: CheckDone01, ...(pendingTasks > 0 ? { badge: pendingTasks } : {}) },
                { label: "Ransom Hub", href: "/ransom-hub", icon: Shield01, badge: "New" },
                { label: "Live Search", href: "/live-search", icon: SearchLg },
                { label: "Live-Leads", href: "/live-leads", icon: Target05 },
                { label: "Watchlist", href: "/watchlist", icon: Star01 },
                { label: "AI Agents", href: "/ai-agents", icon: Mail01 },
                { label: "Contacts", href: "/contacts", icon: Users01 },
                { label: "Knowledge Base", href: "/knowledge-base", icon: Database01 },
                { label: "RFP Hub", href: "/rfp-hub", icon: File04 },
                { label: "Events", href: "/events", icon: Calendar },
                { label: "Reporting", href: "/reporting", icon: PieChart03 },
            ],
        },
    ], [pendingTasks]);
    return (
        <RouteGuard>
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
        </RouteGuard>
    );
}
