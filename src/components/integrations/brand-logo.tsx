/**
 * BrandLogo — renders a brand SVG icon at the requested size.
 *
 * The icon data comes from the `simple-icons` package, which ships the
 * SVG path for ~3,300 brands as plain data (no React deps, fully tree-
 * shakeable). We render inline SVG so the icon inherits the surrounding
 * font color via `fill="currentColor"` OR uses the official brand color
 * when `useBrandColor` is true.
 *
 * For brands that aren't in Simple Icons (ConnectWise, GoHighLevel),
 * `slug` may be undefined; in that case the parent renders the monogram
 * fallback instead.
 *
 * Phase 7D: previously the integrations grid pointed at
 * `https://cdn.simpleicons.org/{slug}/FFFFFF` which renders white-on-
 * white on the new light tile background. Self-hosting via the
 * `simple-icons` package fixes the legibility problem and removes the
 * CDN dependency entirely.
 */
"use client";

import type { SimpleIcon } from "simple-icons";

type BrandLogoProps = {
    /** Simple Icons brand record. */
    icon: SimpleIcon;
    /** Pixel size of the rendered SVG. Defaults to 24. */
    size?: number;
    /**
     * When true (the default), uses the official brand hex color from
     * Simple Icons. Set to false to inherit `currentColor` instead.
     */
    useBrandColor?: boolean;
    /**
     * Explicit color override (e.g. "#0078D4"). Wins over `useBrandColor`.
     * Useful when Simple Icons stores a generic mark (e.g. the Microsoft
     * four-square in gray) that should be tinted to the product color.
     */
    color?: string;
    className?: string;
};

export function BrandLogo({ icon, size = 24, useBrandColor = true, color, className }: BrandLogoProps) {
    const fill = color ?? (useBrandColor ? `#${icon.hex}` : "currentColor");
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            role="img"
            aria-label={`${icon.title} logo`}
            className={className}
        >
            <title>{icon.title}</title>
            <path d={icon.path} fill={fill} />
        </svg>
    );
}
