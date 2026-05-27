import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: { default: "CyberHook AI", template: "%s | CyberHook AI" },
    description: "Turn cyber threat intelligence into qualified sales leads",
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <ConvexClientProvider>
                <html lang="en" suppressHydrationWarning>
                    <body className={cx(inter.variable, "bg-primary antialiased")} suppressHydrationWarning>
                        <RouteProvider>
                            <Theme>{children}</Theme>
                        </RouteProvider>
                        {/*
                          Toast notifications: bottom-right, no colored backgrounds.
                          We deliberately omit `richColors` so the toast surface
                          stays neutral (white in light mode, dark in dark mode)
                          and only the type icon carries the success/error/info
                          color. Per-type icon colors are set via toastOptions
                          classNames so they don't depend on background tinting.
                        */}
                        <Toaster
                            position="bottom-right"
                            closeButton
                            duration={4000}
                            toastOptions={{
                                classNames: {
                                    toast: "group !bg-primary !border-secondary !text-primary !shadow-lg",
                                    title: "!text-primary !text-sm !font-semibold",
                                    description: "!text-tertiary !text-sm",
                                    actionButton: "!bg-brand-solid !text-white",
                                    cancelButton: "!bg-secondary !text-secondary",
                                    closeButton: "!bg-primary !border-secondary !text-tertiary hover:!text-primary",
                                    success: "[&_[data-icon]]:!text-success-primary",
                                    error: "[&_[data-icon]]:!text-error-primary",
                                    warning: "[&_[data-icon]]:!text-warning-primary",
                                    info: "[&_[data-icon]]:!text-brand-secondary",
                                },
                            }}
                        />
                    </body>
                </html>
            </ConvexClientProvider>
        </ClerkProvider>
    );
}
