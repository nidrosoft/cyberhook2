"use client";

import type { FC, ReactNode } from "react";
import { Bell01, CheckCircle, AlertTriangle, InfoCircle, LifeBuoy01, SearchLg, Settings01 } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger, Popover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { CyberHookLogo } from "@/components/foundations/logo/cyberhook-logo";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "./base-components/mobile-header";
import { NavAccountCard, NavAccountMenu } from "./base-components/nav-account-card";
import { NavItemBase } from "./base-components/nav-item";
import { NavItemButton } from "./base-components/nav-item-button";
import { NavList } from "./base-components/nav-list";

const mockNotifications = [
    { id: "1", type: "alert" as const, title: "New breach detected", description: "A new ransomware incident involving HealthNet Corp has been detected.", time: "2 min ago", read: false },
    { id: "2", type: "lead" as const, title: "Lead added to watchlist", description: "acmecorp.com was automatically added from a Live Search match.", time: "15 min ago", read: false },
    { id: "3", type: "success" as const, title: "Campaign delivered", description: "Q1 Healthcare Outreach campaign sent 145 emails successfully.", time: "1 hour ago", read: false },
    { id: "4", type: "info" as const, title: "Weekly report ready", description: "Your weekly performance report for Feb 24 – Mar 2 is available.", time: "3 hours ago", read: true },
    { id: "5", type: "alert" as const, title: "Domain exposure change", description: "globallogistics.com exposure level changed from Medium to High.", time: "5 hours ago", read: true },
    { id: "6", type: "success" as const, title: "New meeting booked", description: "Meeting with TechForward Inc scheduled for Mar 10 at 2:00 PM.", time: "Yesterday", read: true },
    { id: "7", type: "info" as const, title: "Token usage reminder", description: "You've used 85% of your monthly search tokens.", time: "Yesterday", read: true },
];

const notificationIconMap = {
    alert: AlertTriangle,
    lead: SearchLg,
    success: CheckCircle,
    info: InfoCircle,
};

const notificationColorMap = {
    alert: "text-warning-secondary bg-warning-secondary",
    lead: "text-brand-secondary bg-brand-secondary",
    success: "text-success-secondary bg-success-secondary",
    info: "text-fg-quaternary bg-secondary",
};

type NavItem = {
    /** Label text for the nav item. */
    label: string;
    /** URL to navigate to when the nav item is clicked. */
    href: string;
    /** Whether the nav item is currently active. */
    current?: boolean;
    /** Icon component to display. */
    icon?: FC<{ className?: string }>;
    /** Badge to display. */
    badge?: ReactNode;
    /** List of sub-items to display. */
    items?: NavItem[];
};

interface HeaderNavigationBaseProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItem[];
    /** List of sub-items to display. */
    subItems?: NavItem[];
    /** Content to display in the trailing position. */
    trailingContent?: ReactNode;
    /** Whether to show the avatar dropdown. */
    showAvatarDropdown?: boolean;
    /** Whether to hide the bottom border. */
    hideBorder?: boolean;
}

export const HeaderNavigationBase = ({
    activeUrl,
    items,
    subItems,
    trailingContent,
    showAvatarDropdown = true,
    hideBorder = false,
}: HeaderNavigationBaseProps) => {
    const { user, clerkUser } = useCurrentUser();
    const avatarSrc = user?.imageUrl ?? clerkUser?.imageUrl ?? "";
    const avatarAlt = user ? `${user.firstName} ${user.lastName}` : clerkUser?.fullName ?? "User";
    const activeSubNavItems = subItems || items.find((item) => item.current && item.items && item.items.length > 0)?.items;

    const showSecondaryNav = activeSubNavItems && activeSubNavItems.length > 0;

    return (
        <>
            <MobileNavigationHeader>
                <aside className="flex h-full max-w-full flex-col justify-between overflow-auto border-r border-secondary bg-primary pt-4 lg:pt-6">
                    <div className="flex flex-col gap-5 px-4 lg:px-5">
                        <CyberHookLogo className="h-8" />
                        <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} />
                    </div>

                    <NavList items={items} />

                    <div className="mt-auto flex flex-col gap-4 px-2 py-4 lg:px-4 lg:py-6">
                        <div className="flex flex-col gap-1">
                            <NavItemBase type="link" href="#" icon={LifeBuoy01}>
                                Support
                            </NavItemBase>
                            <NavItemBase
                                type="link"
                                href="/settings"
                                icon={Settings01}
                                badge={
                                    <BadgeWithDot color="success" type="modern" size="sm">
                                        Online
                                    </BadgeWithDot>
                                }
                            >
                                Settings
                            </NavItemBase>
                        </div>

                        <NavAccountCard />
                    </div>
                </aside>
            </MobileNavigationHeader>

            <header className="max-lg:hidden">
                <section
                    className={cx(
                        "flex h-16 w-full items-center justify-center bg-primary md:h-18",
                        (!hideBorder || showSecondaryNav) && "border-b border-secondary",
                    )}
                >
                    <div className="flex w-full justify-between pr-3 pl-4 md:px-8">
                        <div className="flex flex-1 items-center gap-3">
                            <Input
                                shortcut
                                size="sm"
                                aria-label="Search CyberHook"
                                placeholder="Search leads, domains, reports..."
                                icon={SearchLg}
                                className="max-w-sm"
                            />

                            {items.length > 0 && (
                                <nav>
                                    <ul className="flex items-center gap-0.5">
                                        {items.map((item) => (
                                            <li key={item.label} className="py-0.5">
                                                <NavItemBase icon={item.icon} href={item.href} current={item.current} badge={item.badge} type="link">
                                                    {item.label}
                                                </NavItemBase>
                                            </li>
                                        ))}
                                    </ul>
                                </nav>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {trailingContent}

                            <div className="flex items-center gap-2 rounded-md border border-secondary px-3 py-1.5">
                                <SearchLg aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
                                <span className="text-sm font-medium text-fg-secondary whitespace-nowrap">941 / 1,000</span>
                                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: "94%" }} />
                                </div>
                            </div>

                            <NavItemButton
                                current={activeUrl === "/settings"}
                                size="md"
                                icon={Settings01}
                                label="Settings"
                                href="/settings"
                                tooltipPlacement="bottom"
                            />

                            <SlideoutMenu.Trigger>
                                <AriaButton className="relative flex cursor-pointer items-center justify-center rounded-lg p-2 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2">
                                    <Bell01 className="size-5" />
                                    <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        3
                                    </span>
                                </AriaButton>
                                <SlideoutMenu>
                                    {({ close }) => (
                                        <>
                                            <SlideoutMenu.Header onClose={close}>
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-lg font-semibold text-primary">Notifications</h2>
                                                    <Badge color="brand" size="sm">{mockNotifications.filter((n) => !n.read).length} new</Badge>
                                                </div>
                                                <p className="mt-1 text-sm text-tertiary">Stay updated on breaches, leads, and campaigns.</p>
                                            </SlideoutMenu.Header>

                                            <SlideoutMenu.Content>
                                                <div className="flex flex-col">
                                                    {mockNotifications.map((notification) => {
                                                        const Icon = notificationIconMap[notification.type];
                                                        const colors = notificationColorMap[notification.type];
                                                        return (
                                                            <div
                                                                key={notification.id}
                                                                className={cx(
                                                                    "flex gap-3 border-b border-secondary px-1 py-4 transition-colors hover:bg-primary_hover",
                                                                    !notification.read && "bg-brand-primary_alt",
                                                                )}
                                                            >
                                                                <div className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", colors)}>
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div className="flex flex-1 flex-col gap-0.5">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className={cx("text-sm font-medium", !notification.read ? "text-primary" : "text-secondary")}>
                                                                            {notification.title}
                                                                        </span>
                                                                        {!notification.read && <span className="size-2 shrink-0 rounded-full bg-brand-solid" />}
                                                                    </div>
                                                                    <p className="text-sm text-tertiary">{notification.description}</p>
                                                                    <span className="mt-1 text-xs text-quaternary">{notification.time}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </SlideoutMenu.Content>

                                            <SlideoutMenu.Footer>
                                                <div className="flex items-center justify-between">
                                                    <Button size="sm" color="link-gray">Mark all as read</Button>
                                                    <Button size="sm" color="link-color">View all notifications</Button>
                                                </div>
                                            </SlideoutMenu.Footer>
                                        </>
                                    )}
                                </SlideoutMenu>
                            </SlideoutMenu.Trigger>

                            {showAvatarDropdown && (
                                <DialogTrigger>
                                    <AriaButton
                                        className={({ isPressed, isFocused }) =>
                                            cx(
                                                "group relative inline-flex cursor-pointer",
                                                (isPressed || isFocused) && "rounded-full outline-2 outline-offset-2 outline-focus-ring",
                                            )
                                        }
                                    >
                                        <Avatar alt={avatarAlt} src={avatarSrc} size="md" />
                                    </AriaButton>
                                    <Popover
                                        placement="bottom right"
                                        offset={8}
                                        className={({ isEntering, isExiting }) =>
                                            cx(
                                                "will-change-transform",
                                                isEntering &&
                                                "duration-300 ease-out animate-in fade-in placement-right:slide-in-from-left-2 placement-top:slide-in-from-bottom-2 placement-bottom:slide-in-from-top-2",
                                                isExiting &&
                                                "duration-150 ease-in animate-out fade-out placement-right:slide-out-to-left-2 placement-top:slide-out-to-bottom-2 placement-bottom:slide-out-to-top-2",
                                            )
                                        }
                                    >
                                        <NavAccountMenu />
                                    </Popover>
                                </DialogTrigger>
                            )}
                        </div>
                    </div>
                </section>

                {showSecondaryNav && (
                    <section className={cx("flex h-16 w-full items-center justify-center bg-primary", !hideBorder && "border-b border-secondary")}>
                        <div className="flex w-full max-w-container items-center justify-between gap-8 px-8">
                            <nav>
                                <ul className="flex items-center gap-0.5">
                                    {activeSubNavItems.map((item) => (
                                        <li key={item.label} className="py-0.5">
                                            <NavItemBase icon={item.icon} href={item.href} current={item.current} badge={item.badge} type="link">
                                                {item.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            <Input shortcut aria-label="Search" placeholder="Search" icon={SearchLg} size="sm" className="max-w-xs" />
                        </div>
                    </section>
                )}
            </header>
        </>
    );
};
