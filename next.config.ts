import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const siteIsHttps = (process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.instagram.com https://www.tiktok.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: https: http:",
  "frame-src https://www.instagram.com https://www.tiktok.com",
  "connect-src 'self' https://*.supabase.co https://www.instagram.com https://www.tiktok.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(siteIsHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
  ...(isProd && siteIsHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]
    : []),
];

const noStore = [{ key: "Cache-Control", value: "private, no-store" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
