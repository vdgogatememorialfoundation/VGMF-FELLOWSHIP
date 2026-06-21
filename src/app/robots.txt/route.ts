import { NextResponse } from "next/server";
import { DISALLOW_ROBOTS_PREFIXES, resolvePublicSiteUrl } from "@/lib/seo";

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
  const base = resolvePublicSiteUrl({
    envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  }).replace(/\/$/, "");
  const indexingEnabled = isProductionIndexingForced();
  const body = buildRobotsBody(indexingEnabled, base);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
