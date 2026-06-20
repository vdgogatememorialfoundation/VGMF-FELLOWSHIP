import type { Metadata } from "next";
import { getIntegrationConfig } from "./integrations";
import { ORGANIZATION_NAME } from "./constants";
import type { SiteContent } from "./cms";
import type { FaqItem } from "./site-content";

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

export function getGoogleSiteVerification(): string | undefined {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}

export function getGoogleAnalyticsId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;
}

export async function buildRootMetadata(settings: SiteContent): Promise<Metadata> {
  const siteUrl = await getPublicSiteUrl();
  const title = settings.siteName;
  const description =
    settings.siteTagline ||
    `${ORGANIZATION_NAME} Research Fellowship Portal — apply for Ayurvedic research grants up to ₹75,000.`;
  const ogImage = settings.logoUrl
    ? new URL(settings.logoUrl, siteUrl).toString()
    : `${siteUrl}/api/site/logo`;

  const verification = getGoogleSiteVerification();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${ORGANIZATION_NAME}`,
    },
    description,
    keywords: [
      "Vaidya Gogate Memorial Foundation",
      "VGMF Fellowship",
      "Ayurvedic research fellowship",
      "Viddhakarma research",
      "BAMS fellowship India",
      "Ayurveda grant",
    ],
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
      title,
      description,
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
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(verification
      ? { verification: { google: verification } }
      : {}),
  };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  siteUrl: string;
}): Metadata {
  const canonical = `${input.siteUrl}${input.path}`;

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
