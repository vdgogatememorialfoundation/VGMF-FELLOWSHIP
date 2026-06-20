import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/cms";
import { DISALLOW_ROBOTS_PREFIXES, getPublicSiteUrl } from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [base, settings] = await Promise.all([getPublicSiteUrl(), getSiteSettings()]);
  const seo = resolveSeoConfig(settings);

  if (!seo.indexingEnabled) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  }

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
