import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Hardcoded — no env/DB reads so cold starts cannot serve Disallow: / by mistake. */
const PRODUCTION_ROBOTS = `User-agent: Googlebot
Allow: /

User-agent: Google-InspectionTool
Allow: /

User-agent: *
Allow: /

Sitemap: https://fellowship.vaidyagogate.org/sitemap.xml
`;

export function GET() {
  return new NextResponse(PRODUCTION_ROBOTS, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cache at Cloudflare edge so Google gets Allow even when Render is cold.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
