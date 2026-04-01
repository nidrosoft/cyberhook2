"use client";

import { useState } from "react";
import { CyberHookLogo, CyberHookLogoMinimal } from "@/components/foundations/logo/cyberhook-logo";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard, NavAccountMenu } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavItemButton } from "../base-components/nav-item-button";
import type { NavItemType } from "../config";

interface SidebarNavigationSectionsSubheadingsProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: Array<{ label: string; items: NavItemType[] }>;
}

export const SidebarNavigationSectionsSubheadings = ({ activeUrl = "/", items }: SidebarNavigationSectionsSubheadingsProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const { user, clerkUser } = useCurrentUser();
    const avatarSrc = user?.imageUrl ?? clerkUser?.imageUrl ?? "";
    const avatarAlt = user ? `${user.firstName} ${user.lastName}` : clerkUser?.fullName ?? "User";
    const MAIN_SIDEBAR_WIDTH = isExpanded ? 292 : 80;

    const content = (
        <aside
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                } as React.CSSProperties
            }
            className="flex h-full w-full max-w-full flex-col justify-between overflow-x-hidden overflow-y-auto border-secondary bg-primary pt-4 shadow-xs md:border-r lg:w-(--width) transition-all duration-300 ease-in-out lg:rounded-xl lg:border lg:pt-5"
        >
            <div className={cx("flex flex-col gap-5 lg:px-5", isExpanded ? "px-4" : "items-center px-0")}>
                {isExpanded ? <CyberHookLogo className="h-8" /> : <CyberHookLogoMinimal className="h-8" />}
            </div>

            <ul className="mt-8 flex flex-col gap-2">
                {items.map((group, index) => (
                    <li key={group.label} className="w-full">
                        {isExpanded && (
                            <div className="px-5 pb-1 mt-2">
                                <p className="text-xs font-bold text-quaternary uppercase">{group.label}</p>
                            </div>
                        )}
                        <ul className={cx("pb-1", isExpanded ? "px-4" : "px-3 flex flex-col gap-1 items-center")}>
                            {group.items.map((item) => (
                                <li key={item.label} className="py-0.5 w-full">
                                    {isExpanded ? (
                                        <NavItemBase icon={item.icon} href={item.href} badge={item.badge} type="link" current={item.href === activeUrl}>
                                            {item.label}
                                        </NavItemBase>
                                    ) : (
                                        <NavItemButton
                                            size="md"
                                            current={item.href === activeUrl}
                                            href={item.href}
                                            label={item.label || ""}
                                            icon={item.icon as any}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {!isExpanded && index < items.length - 1 && <div className="mx-4 mt-2 border-t border-secondary" />}
                    </li>
                ))}
            </ul>

            <div className={cx("mt-auto flex flex-col gap-3 py-4", isExpanded ? "px-2 lg:px-4 lg:py-4" : "items-center")}>
                {isExpanded ? (
                    <NavAccountCard />
                ) : (
                    <AriaDialogTrigger>
                        <AriaButton
                            className={({ isPressed, isFocused }) =>
                                cx("group relative inline-flex rounded-full", (isPressed || isFocused) && "outline-2 outline-offset-2 outline-focus-ring")
                            }
                        >
                            <Avatar status="online" src={avatarSrc} size="md" alt={avatarAlt} />
                        </AriaButton>
                        <AriaPopover
                            placement="right bottom"
                            offset={8}
                            crossOffset={6}
                        >
                            <NavAccountMenu />
                        </AriaPopover>
                    </AriaDialogTrigger>
                )}

                <div className={cx("flex w-full", isExpanded ? "px-1" : "justify-center px-0")}>
                    {isExpanded ? (
                        <NavItemBase icon={ChevronLeft} type="link" href="#" onClick={(e: any) => { e.preventDefault(); setIsExpanded(false); }}>
                            Collapse
                        </NavItemBase>
                    ) : (
                        <NavItemButton
                            size="md"
                            current={false}
                            label="Expand"
                            icon={ChevronRight}
                            onClick={() => setIsExpanded(true)}
                        />
                    )}
                </div>
            </div>
        </aside>
    );

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:py-1 lg:pl-1">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH + 4,
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block transition-all duration-300 ease-in-out"
            />
        </>
    );
};
