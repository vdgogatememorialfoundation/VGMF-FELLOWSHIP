import type { MetadataRoute } from "next";
import { getPublicSiteUrlFallback } from "@/lib/seo";
import { isSeoIndexingEnabled } from "@/lib/seo-indexing";

/** Runtime robots.txt — overrides public/robots.txt so Google always gets current rules. */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrlFallback().replace(/\/$/, "");
  const sitemap = `${base}/sitemap.xml`;

  if (!isSeoIndexingEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Google-InspectionTool", allow: "/" },
    ],
    sitemap,
  };
}
