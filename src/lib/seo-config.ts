import type { SiteContent } from "./cms";
import { ORGANIZATION_NAME } from "./constants";

export type SeoSettingsInput = Pick<
  SiteContent,
  | "siteName"
  | "siteTagline"
  | "seoMetaTitle"
  | "seoMetaDescription"
  | "seoKeywords"
  | "googleSiteVerification"
  | "googleAnalyticsId"
  | "seoIndexingEnabled"
  | "seoStructuredDataEnabled"
>;

export type SeoConfig = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  googleSiteVerification?: string;
  googleAnalyticsId?: string;
  indexingEnabled: boolean;
  structuredDataEnabled: boolean;
};

const DEFAULT_KEYWORDS = [
  "Vaidya Gogate Memorial Foundation",
  "VGMF Fellowship",
  "Ayurvedic research fellowship",
  "Viddhakarma research",
  "BAMS fellowship India",
  "Ayurveda grant",
];

export function parseSeoKeywords(raw?: string | null): string[] {
  if (!raw?.trim()) return DEFAULT_KEYWORDS;
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_KEYWORDS;
}

export function resolveSeoConfig(settings: SeoSettingsInput): SeoConfig {
  const envVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const envAnalytics = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return {
    metaTitle: settings.seoMetaTitle?.trim() || settings.siteName,
    metaDescription:
      settings.seoMetaDescription?.trim() ||
      settings.siteTagline ||
      `${ORGANIZATION_NAME} Research Fellowship Portal — apply for Ayurvedic research grants up to ₹75,000.`,
    keywords: parseSeoKeywords(settings.seoKeywords),
    googleSiteVerification:
      settings.googleSiteVerification?.trim() || envVerification || undefined,
    googleAnalyticsId: settings.googleAnalyticsId?.trim() || envAnalytics || undefined,
    indexingEnabled: settings.seoIndexingEnabled !== false,
    structuredDataEnabled: settings.seoStructuredDataEnabled !== false,
  };
}

export type SeoAdminStatus = {
  appUrl: string;
  sitemapUrl: string;
  robotsUrl: string;
  searchConsoleUrl: string;
  googleConfigured: boolean;
  analyticsConfigured: boolean;
  indexingEnabled: boolean;
  structuredDataEnabled: boolean;
  checklist: Array<{ label: string; ok: boolean; hint?: string }>;
};

export function buildSeoAdminStatus(
  settings: SeoSettingsInput,
  appUrl: string
): SeoAdminStatus {
  const base = appUrl.replace(/\/$/, "");
  const seo = resolveSeoConfig(settings);

  const checklist = [
    {
      label: "Fellowship public site URL configured",
      ok: Boolean(base && !base.includes("localhost") && !base.includes("0.0.0.0") && !base.includes("seminar.")),
      hint: "Set below — use https://fellowship.vaidyagogate.org (not the seminar site)",
    },
    {
      label: "Google Search Console verification",
      ok: Boolean(seo.googleSiteVerification),
      hint: "Paste verification code from Search Console",
    },
    {
      label: "Google Analytics tracking ID",
      ok: Boolean(seo.googleAnalyticsId),
      hint: "Use GA4 measurement ID (G-XXXXXXXX)",
    },
    {
      label: "Search engine indexing enabled",
      ok: seo.indexingEnabled,
      hint: "Turn off only for staging or pre-launch",
    },
    {
      label: "Structured data (JSON-LD) enabled",
      ok: seo.structuredDataEnabled,
      hint: "Helps Google show rich results for FAQ and organisation",
    },
    {
      label: "Meta description set",
      ok: Boolean(seo.metaDescription?.trim()),
    },
  ];

  return {
    appUrl: base,
    sitemapUrl: `${base}/sitemap.xml`,
    robotsUrl: `${base}/robots.txt`,
    searchConsoleUrl: "https://search.google.com/search-console",
    googleConfigured: Boolean(seo.googleSiteVerification),
    analyticsConfigured: Boolean(seo.googleAnalyticsId),
    indexingEnabled: seo.indexingEnabled,
    structuredDataEnabled: seo.structuredDataEnabled,
    checklist,
  };
}
