import type { Metadata } from "next";
import { getIntegrationConfig } from "./integrations";
import { ORGANIZATION_NAME } from "./constants";
import type { SiteContent } from "./cms";
import type { FaqItem } from "./site-content";
import { resolveSeoConfig } from "./seo-config";

export const PUBLIC_CMS_SLUGS = [
  "about",
  "terms",
  "undertaking",
  "rulebook",
  "privacy",
  "refund-policy",
] as const;

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

export async function getPublicSiteUrl(): Promise<string> {
  const config = await getIntegrationConfig();
  return config.appUrl.replace(/\/$/, "");
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
