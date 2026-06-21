import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/cms";
import { DISALLOW_ROBOTS_PREFIXES, getPublicSiteUrlSafe } from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

function isProductionIndexingForced(): boolean {
  return process.env.SEO_INDEXING_ENABLED?.trim().toLowerCase() === "true";
}

function buildRobotsBody(indexingEnabled: boolean, base: string): string {
  if (!indexingEnabled) {
    return ["User-agent: *", "Disallow: /", "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
  }

  return [
    "User-agent: *",
    ...DISALLOW_ROBOTS_PREFIXES.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function GET() {
  const [base, settings] = await Promise.all([getPublicSiteUrlSafe(), getSiteSettings()]);
  const seo = resolveSeoConfig(settings);
  const indexingEnabled = seo.indexingEnabled || isProductionIndexingForced();
  const body = buildRobotsBody(indexingEnabled, base);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
