import type { MetadataRoute } from "next";
import { getPublicSiteUrl, PUBLIC_CMS_SLUGS } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getPublicSiteUrl();
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...PUBLIC_CMS_SLUGS.map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
