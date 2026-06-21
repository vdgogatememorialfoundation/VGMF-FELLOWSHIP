import type { NextConfig } from "next";
import { PORTAL_NOINDEX_PATH_PREFIXES } from "./src/lib/seo";

const portalNoindexHeader = {
  key: "X-Robots-Tag",
  value: "noindex, nofollow",
};

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@aws-sdk/client-s3"],
  async headers() {
    const portalHeaders = PORTAL_NOINDEX_PATH_PREFIXES.flatMap((prefix) => [
      {
        source: prefix,
        headers: [portalNoindexHeader],
      },
      {
        source: `${prefix}/:path*`,
        headers: [portalNoindexHeader],
      },
    ]);

    return [
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400, immutable" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      ...portalHeaders,
    ];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
