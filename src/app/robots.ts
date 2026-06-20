import type { MetadataRoute } from "next";
import { DISALLOW_ROBOTS_PREFIXES, getPublicSiteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW_ROBOTS_PREFIXES,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
