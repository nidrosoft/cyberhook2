"use client";

import { usePathname } from "next/navigation";
import { SidebarNavigationSectionsSubheadings } from "@/components/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings";
import { HeaderNavigationBase } from "@/components/application/app-navigation/header-navigation";
import { RouteGuard } from "@/components/auth/route-guard";
import {
    Calendar,
    CheckDone01,
    CreditCard02,
    Database01,
    File04,
    Grid03,
    Mail01,
    PieChart03,
    SearchLg,
    Settings01,
    Shield01,
    Star01,
    Target05,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

const navItemsWithSectionsSubheadings: Array<{ label: string; items: NavItemType[] }> = [
    {
        label: "Growth",
        items: [
            { label: "News", href: "/dashboard", icon: Grid03 },
            { label: "To-Do List", href: "/todos", icon: CheckDone01, badge: 10 },
            { label: "Ransom Hub", href: "/ransom-hub", icon: Shield01, badge: "New" },
            { label: "Live Search", href: "/live-search", icon: SearchLg },
            { label: "Live-Leads", href: "/live-leads", icon: Target05 },
            { label: "Watchlist", href: "/watchlist", icon: Star01 },
            { label: "AI Agents", href: "/ai-agents", icon: Mail01 },
            { label: "Knowledge Base", href: "/knowledge-base", icon: Database01 },
            { label: "RFP Hub", href: "/rfp-hub", icon: File04 },
            { label: "Events", href: "/events", icon: Calendar },
            { label: "Reporting", href: "/reporting", icon: PieChart03 },
        ],
    },
    {
        label: "Admin",
        items: [
            { label: "Settings", href: "/settings", icon: Settings01 },
            { label: "Billing & Usage", href: "/billing", icon: CreditCard02 },
        ],
    },
];

// Provide empty items since we use the sidebar for primary navigation
const headerItems: any[] = [];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
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
                        {children}
                    </div>
                </main>
            </div>
        </RouteGuard>
    );
}
