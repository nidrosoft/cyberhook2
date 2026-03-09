"use client";

import { ChevronDown } from "@untitledui/icons";
import type { Key } from "react-aria-components";
import { Button as AriaButton } from "react-aria-components";
import { Dropdown } from "./dropdown";
import { cx } from "@/utils/cx";

interface FilterDropdownProps {
    /** Currently selected value */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Options to display */
    options: { label: string; value: string }[];
    /** Accessible label */
    "aria-label"?: string;
    /** Additional class for the trigger button */
    className?: string;
}

export const FilterDropdown = ({ value, onChange, options, "aria-label": ariaLabel, className }: FilterDropdownProps) => {
    const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

    return (
        <Dropdown.Root>
            <AriaButton
                aria-label={ariaLabel}
                className={({ isPressed, isHovered, isFocusVisible }) =>
                    cx(
                        "flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-secondary shadow-xs ring-1 ring-primary ring-inset outline-hidden transition duration-100 ease-linear",
                        (isHovered || isPressed) && "bg-primary_hover text-secondary_hover",
                        isFocusVisible && "ring-2 ring-brand",
                        className,
                    )
                }
            >
                {selectedLabel}
                <ChevronDown className="size-4 shrink-0 text-fg-quaternary" />
            </AriaButton>
            <Dropdown.Popover placement="bottom start" className="w-auto min-w-[160px]">
                <Dropdown.Menu
                    selectedKeys={new Set([value])}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys as Set<Key>)[0];
                        if (selected != null) onChange(String(selected));
                    }}
                >
                    {options.map((opt) => (
                        <Dropdown.Item key={opt.value} id={opt.value} label={opt.label} />
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};
