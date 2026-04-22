"use client";

import type { FC, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell01, CheckCircle, AlertTriangle, InfoCircle, LifeBuoy01, SearchLg, Settings01 } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger, Popover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { CyberHookLogo } from "@/components/foundations/logo/cyberhook-logo";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/hooks/use-company";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "./base-components/mobile-header";
import { NavAccountCard, NavAccountMenu } from "./base-components/nav-account-card";
import { NavItemBase } from "./base-components/nav-item";
import { NavItemButton } from "./base-components/nav-item-button";
import { NavList } from "./base-components/nav-list";

function getNotificationIcon(type: string) {
    if (type.startsWith("watchlist.") || type.startsWith("billing.")) return AlertTriangle;
    if (type.startsWith("lead.") || type.startsWith("task.")) return SearchLg;
    if (type.startsWith("campaign.") || type.startsWith("team.")) return CheckCircle;
    return InfoCircle;
}

function getNotificationColors(type: string) {
    if (type.startsWith("watchlist.") || type.startsWith("billing.")) return "text-warning-secondary bg-warning-secondary";
    if (type.startsWith("lead.") || type.startsWith("task.")) return "text-brand-secondary bg-brand-secondary";
    if (type.startsWith("campaign.") || type.startsWith("team.")) return "text-success-secondary bg-success-secondary";
    return "text-fg-quaternary bg-secondary";
}

function getNotificationRoute(notification: { type: string; relatedEntityType?: string; relatedEntityId?: string; actionUrl?: string }): string | null {
    if (notification.actionUrl) return notification.actionUrl;
    const type = notification.type;
    if (type.startsWith("watchlist.")) return "/watchlist";
    if (type.startsWith("lead.")) return "/live-leads";
    if (type.startsWith("campaign.")) return "/ai-agents";
    if (type.startsWith("task.")) return "/todos";
    // Team notifications deep-link directly to the related team member row
    // (orange item 2.5). When the notification carries a user entity id we
    // append it as `?user=<id>` so the settings page can scroll to and
    // highlight the affected row.
    if (type.startsWith("team.")) {
        const userParam = notification.relatedEntityType === "user" && notification.relatedEntityId
            ? `&user=${encodeURIComponent(notification.relatedEntityId)}`
            : "";
        return `/settings?tab=team${userParam}`;
    }
    if (type.startsWith("billing.")) return "/billing";
    if (type.startsWith("system.")) return "/dashboard";
    return null;
}

function formatTimeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
    const router = useRouter();
    const { user, clerkUser } = useCurrentUser();
    const { tokensRemaining, tokenAllocation } = useCompany();
    const avatarSrc = user?.imageUrl ?? clerkUser?.imageUrl ?? "";
    const avatarAlt = user ? `${user.firstName} ${user.lastName}` : clerkUser?.fullName ?? "User";
    const tokensLeft = tokensRemaining ?? 0;
    const tokensTotal = tokenAllocation ?? 0;
    const tokenPercent = tokensTotal > 0 ? Math.round((tokensLeft / tokensTotal) * 100) : 0;
    const activeSubNavItems = subItems || items.find((item) => item.current && item.items && item.items.length > 0)?.items;

    // Real notifications from Convex
    const notifications = useQuery(
        api.notifications.getRecent,
        user?._id ? { userId: user._id, limit: 15 } : "skip"
    );
    const unreadCount = useQuery(
        api.notifications.getUnreadCount,
        user?._id ? { userId: user._id } : "skip"
    );
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    const showSecondaryNav = activeSubNavItems && activeSubNavItems.length > 0;

    return (
        <>
            <MobileNavigationHeader>
                <aside className="flex h-full max-w-full flex-col justify-between overflow-auto border-r border-secondary bg-primary pt-4 lg:pt-6">
                    <div className="flex flex-col gap-5 px-4 lg:px-5">
                        <CyberHookLogo className="h-8" />
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
                                <span className="text-sm font-medium text-fg-secondary whitespace-nowrap">{tokensLeft.toLocaleString()} / {tokensTotal.toLocaleString()}</span>
                                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${tokenPercent}%` }} />
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
                                    {(unreadCount ?? 0) > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                            {unreadCount! > 9 ? "9+" : unreadCount}
                                        </span>
                                    )}
                                </AriaButton>
                                <SlideoutMenu>
                                    {({ close }) => (
                                        <>
                                            <SlideoutMenu.Header onClose={close}>
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-lg font-semibold text-primary">Notifications</h2>
                                                    {(unreadCount ?? 0) > 0 && (
                                                        <Badge color="brand" size="sm">{unreadCount} new</Badge>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-tertiary">Stay updated on breaches, leads, and campaigns.</p>
                                            </SlideoutMenu.Header>

                                            <SlideoutMenu.Content>
                                                <div className="flex flex-col">
                                                    {(!notifications || notifications.length === 0) && (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                                            <Bell01 className="size-8 text-quaternary mb-3" />
                                                            <p className="text-sm font-medium text-secondary">No notifications yet</p>
                                                            <p className="text-xs text-tertiary mt-1">You&apos;ll be notified about breaches, leads, and campaigns.</p>
                                                        </div>
                                                    )}
                                                    {notifications?.map((notification) => {
                                                        const Icon = getNotificationIcon(notification.type);
                                                        const colors = getNotificationColors(notification.type);
                                                        const route = getNotificationRoute(notification);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={notification._id}
                                                                className={cx(
                                                                    "flex gap-3 border-b border-secondary px-1 py-4 transition-colors hover:bg-primary_hover text-left w-full",
                                                                    !notification.isRead && "bg-brand-primary_alt",
                                                                    route && "cursor-pointer",
                                                                )}
                                                                onClick={async () => {
                                                                    if (!notification.isRead) {
                                                                        await markAsRead({ id: notification._id });
                                                                    }
                                                                    if (route) {
                                                                        close();
                                                                        router.push(route);
                                                                    }
                                                                }}
                                                            >
                                                                <div className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", colors)}>
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div className="flex flex-1 flex-col gap-0.5">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className={cx("text-sm font-medium", !notification.isRead ? "text-primary" : "text-secondary")}>
                                                                            {notification.title}
                                                                        </span>
                                                                        {!notification.isRead && <span className="size-2 shrink-0 rounded-full bg-brand-solid" />}
                                                                    </div>
                                                                    <p className="text-sm text-tertiary">{notification.message}</p>
                                                                    <span className="mt-1 text-xs text-quaternary">{formatTimeAgo(notification.createdAt)}</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </SlideoutMenu.Content>

                                            <SlideoutMenu.Footer>
                                                <div className="flex items-center justify-between">
                                                    <Button
                                                        size="sm"
                                                        color="link-gray"
                                                        onClick={() => {
                                                            if (user?._id) markAllAsRead({ userId: user._id });
                                                        }}
                                                    >
                                                        Mark all as read
                                                    </Button>
                                                    <Button size="sm" color="link-color" onClick={() => { close(); router.push("/dashboard"); }}>
                                                        View all notifications
                                                    </Button>
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

                        </div>
                    </section>
                )}
            </header>
        </>
    );
};
