/** @type {import('next').NextConfig} */

const securityHeaders = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-XSS-Protection", value: "1; mode=block" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https:",
            "connect-src 'self' https://*.clerk.accounts.dev https://*.convex.cloud https://*.convex.site https://api.stripe.com wss://*.convex.cloud",
            "frame-src https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
        ].join("; "),
    },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

const nextConfig = {
    poweredByHeader: false,
    reactStrictMode: true,
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "img.clerk.com" },
            { protocol: "https", hostname: "images.clerk.dev" },
            { protocol: "https", hostname: "**.convex.cloud" },
        ],
    },
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    async headers() {
        return [{ source: "/(.*)", headers: securityHeaders }];
    },
};

export default nextConfig;
