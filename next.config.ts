import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/image",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/reference/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://static.cloudflareinsights.com; connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://*.r2.cloudflarestorage.com https://cloudflareinsights.com; frame-src https://www.google.com https://maps.google.com;" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  tunnelRoute: "/monitoring",
});
