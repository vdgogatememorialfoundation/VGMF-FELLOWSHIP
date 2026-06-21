import type { Metadata } from "next";
import { getSiteSettings } from "./cms";
import {
  normalizeAppUrl,
  isBlockedIntegrationHost,
  FELLOWSHIP_APP_URL as FELLOWSHIP_PUBLIC_SITE_URL,
} from "./integrations";
import { ORGANIZATION_NAME } from "./constants";
import type { SiteContent } from "./cms";
import type { FaqItem } from "./site-content";
import { resolveSeoConfig } from "./seo-config";

export { FELLOWSHIP_APP_URL as FELLOWSHIP_PUBLIC_SITE_URL } from "./integrations";

export const PUBLIC_CMS_SLUGS = [
  "about",
  "terms",
  "undertaking",
  "rulebook",
  "privacy",
  "refund-policy",
] as const;

/** Paths Google should crawl (listed explicitly before portal disallows). */
export const PUBLIC_ROBOTS_ALLOW_PATHS = [
  "/",
  "/register",
  ...PUBLIC_CMS_SLUGS.map((slug) => `/${slug}`),
];

export const DISALLOW_ROBOTS_PREFIXES = [
  "/admin",
  "/applicant",
  "/staff",
  "/reviewer",
  "/trustee",
  "/committee",
  "/api",
  "/login",
  "/verification",
];

function isBlockedPublicHost(url: string): boolean {
  return isBlockedIntegrationHost(url);
}

export function resolvePublicSiteUrl(input?: {
  publicSiteUrl?: string | null;
  integrationAppUrl?: string | null;
  envAppUrl?: string | null;
}): string {
  const candidates = [
    input?.publicSiteUrl,
    input?.envAppUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    input?.integrationAppUrl,
    FELLOWSHIP_PUBLIC_SITE_URL,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeAppUrl(raw.trim()).replace(/\/$/, "");
    if (isBlockedPublicHost(normalized)) continue;
    return normalized;
  }

  return FELLOWSHIP_PUBLIC_SITE_URL;
}

export async function getPublicSiteUrl(): Promise<string> {
  const { getIntegrationConfig } = await import("./integrations");
  const [settings, config] = await Promise.all([getSiteSettings(), getIntegrationConfig()]);

  return resolvePublicSiteUrl({
    publicSiteUrl: settings.publicSiteUrl,
    integrationAppUrl: config.appUrl,
    envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}

/** Fallback when CMS/DB is unavailable (robots.txt, sitemap.xml). */
export function getPublicSiteUrlFallback(): string {
  return resolvePublicSiteUrl({
    envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}

export async function getPublicSiteUrlSafe(): Promise<string> {
  try {
    return await getPublicSiteUrl();
  } catch (error) {
    console.error("getPublicSiteUrlSafe fallback:", error);
    return getPublicSiteUrlFallback();
  }
}

export async function buildRootMetadata(settings: SiteContent): Promise<Metadata> {
  const siteUrl = await getPublicSiteUrl();
  const seo = resolveSeoConfig(settings);
  const ogImage = settings.logoUrl
    ? new URL(settings.logoUrl, siteUrl).toString()
    : `${siteUrl}/api/site/logo`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.metaTitle,
      template: `%s | ${ORGANIZATION_NAME}`,
    },
    description: seo.metaDescription,
    keywords: seo.keywords,
    authors: [{ name: ORGANIZATION_NAME }],
    creator: ORGANIZATION_NAME,
    publisher: ORGANIZATION_NAME,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: siteUrl,
      siteName: ORGANIZATION_NAME,
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: `${ORGANIZATION_NAME} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: [ogImage],
    },
    robots: seo.indexingEnabled
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        },
    ...(seo.googleSiteVerification
      ? { verification: { google: seo.googleSiteVerification } }
      : {}),
  };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  siteUrl: string;
  indexingEnabled?: boolean;
}): Metadata {
  const canonical = `${input.siteUrl}${input.path}`;
  const indexingEnabled = input.indexingEnabled !== false;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
    },
    robots: indexingEnabled
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function buildOrganizationJsonLd(settings: SiteContent, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORGANIZATION_NAME,
    url: siteUrl,
    logo: settings.logoUrl ? new URL(settings.logoUrl, siteUrl).toString() : undefined,
    email: settings.contactEmail || undefined,
    telephone: settings.contactPhone || undefined,
    address: settings.contactAddress
      ? { "@type": "PostalAddress", addressCountry: "IN", streetAddress: settings.contactAddress }
      : undefined,
    sameAs: [] as string[],
  };
}

export function buildWebsiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORGANIZATION_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/about?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
