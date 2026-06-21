import { NextResponse } from "next/server";
import {
  FELLOWSHIP_PUBLIC_SITE_URL,
  PUBLIC_CMS_SLUGS,
  getPublicSiteUrlSafe,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type SitemapEntry = {
  loc: string;
  priority: string;
  changefreq: "weekly" | "monthly";
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemapXml(base: string): string {
  const lastmod = new Date().toISOString();
  const entries: SitemapEntry[] = [
    { loc: base, priority: "1.0", changefreq: "weekly" },
    { loc: `${base}/register`, priority: "0.9", changefreq: "weekly" },
    ...PUBLIC_CMS_SLUGS.map((slug) => ({
      loc: `${base}/${slug}`,
      priority: "0.7",
      changefreq: "monthly" as const,
    })),
  ];

  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function resolveSitemapBaseUrl(): Promise<string> {
  try {
    const base = (await getPublicSiteUrlSafe()).replace(/\/$/, "");
    if (base && !base.includes("localhost") && !base.includes("127.0.0.1")) {
      return base;
    }
  } catch (error) {
    console.error("sitemap base url fallback:", error);
  }

  return FELLOWSHIP_PUBLIC_SITE_URL.replace(/\/$/, "");
}

export async function GET() {
  const base = await resolveSitemapBaseUrl();
  const xml = buildSitemapXml(base);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
