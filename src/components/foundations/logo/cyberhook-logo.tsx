"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";

export const CyberHookLogo = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("flex h-8 items-center gap-2", props.className)}>
            <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8 shrink-0">
                <rect width="32" height="32" rx="8" fill="var(--color-bg-brand-solid, #7F56D9)" />
                <path
                    d="M16 6C16 6 8 9.5 8 16C8 19.5 9.5 22 12 24L13.5 22C11.5 20.5 10.5 18.5 10.5 16C10.5 11.5 16 8.5 16 8.5C16 8.5 21.5 11.5 21.5 16C21.5 18.5 20.5 20.5 18.5 22L20 24C22.5 22 24 19.5 24 16C24 9.5 16 6 16 6Z"
                    fill="white"
                    fillOpacity="0.9"
                />
                <circle cx="16" cy="16" r="3" fill="white" />
                <path
                    d="M16 13.5C14.619 13.5 13.5 14.619 13.5 16C13.5 17.381 14.619 18.5 16 18.5C17.381 18.5 18.5 17.381 18.5 16C18.5 14.619 17.381 13.5 16 13.5Z"
                    fill="white"
                    fillOpacity="0.3"
                />
            </svg>
            <span className="text-lg font-bold tracking-tight text-primary whitespace-nowrap">CyberHook</span>
        </div>
    );
};

export const CyberHookLogoMinimal = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("flex h-8 w-8 items-center justify-center", props.className)}>
            <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8 shrink-0">
                <rect width="32" height="32" rx="8" fill="var(--color-bg-brand-solid, #7F56D9)" />
                <path
                    d="M16 6C16 6 8 9.5 8 16C8 19.5 9.5 22 12 24L13.5 22C11.5 20.5 10.5 18.5 10.5 16C10.5 11.5 16 8.5 16 8.5C16 8.5 21.5 11.5 21.5 16C21.5 18.5 20.5 20.5 18.5 22L20 24C22.5 22 24 19.5 24 16C24 9.5 16 6 16 6Z"
                    fill="white"
                    fillOpacity="0.9"
                />
                <circle cx="16" cy="16" r="3" fill="white" />
                <path
                    d="M16 13.5C14.619 13.5 13.5 14.619 13.5 16C13.5 17.381 14.619 18.5 16 18.5C17.381 18.5 18.5 17.381 18.5 16C18.5 14.619 17.381 13.5 16 13.5Z"
                    fill="white"
                    fillOpacity="0.3"
                />
            </svg>
        </div>
    );
};
