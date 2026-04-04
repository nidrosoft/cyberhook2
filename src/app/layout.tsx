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
    title: "CyberHook — Sales Enablement Platform",
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
                        <Toaster position="bottom-center" richColors closeButton duration={4000} />
                    </body>
                </html>
            </ConvexClientProvider>
        </ClerkProvider>
    );
}
