import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/cms";
import {
  DISALLOW_ROBOTS_PREFIXES,
  getPublicSiteUrlSafe,
  PUBLIC_ROBOTS_ALLOW_PATHS,
} from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [base, settings] = await Promise.all([getPublicSiteUrlSafe(), getSiteSettings()]);
  const seo = resolveSeoConfig(settings);

  if (!seo.indexingEnabled) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${base}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: PUBLIC_ROBOTS_ALLOW_PATHS,
      disallow: DISALLOW_ROBOTS_PREFIXES,
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
