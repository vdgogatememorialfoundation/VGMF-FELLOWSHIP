import prisma from "./db";
import type { CmsPageSlug } from "@prisma/client";
import {
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_QUICK_LINKS,
  DEFAULT_FOOTER_LEGAL_LINKS,
  DEFAULT_HERO_STATS,
  DEFAULT_HERO_SNAPSHOT,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_JOURNEY_STEPS,
  DEFAULT_FAQ_ITEMS,
  parseJsonArray,
  type NavLink,
  type HeroStat,
  type SnapshotItem,
  type HighlightTile,
  type JourneyStep,
  type FaqItem,
} from "./site-content";

const DEFAULT_SITE_SETTINGS = {
  id: "default",
  siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
  siteTagline: "Advancing Ayurvedic Research & Viddhakarma Studies",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  headerOrgName: "Vaidya Gogate Memorial Foundation",
  utilityBarText: "Fellowship 2026",
  tickerText:
    "Applications open for VGMF Fellowship 2026 | Visit Notices for important updates",
  tickerEnabled: true,
  heroTitle: "Vaidya Gogate Memorial Foundation Research Fellowship 2026",
  heroSubtitle:
    "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000.",
  heroBadge: "Fellowship 2026 · Applications Open",
  heroStats: DEFAULT_HERO_STATS,
  heroSnapshot: DEFAULT_HERO_SNAPSHOT,
  highlightsTitle: "Programme highlights",
  highlightsSubtitle:
    "Clinical research, mentorship, and structured funding — designed like our national seminar experience.",
  highlights: DEFAULT_HIGHLIGHTS,
  journeyTitle: "Your application journey",
  journeySubtitle: "3 simple steps",
  journeySteps: DEFAULT_JOURNEY_STEPS,
  aboutBadge: "Since 1972",
  aboutTitle: "About the foundation",
  aboutContent:
    "The Vaidya Gogate Memorial Foundation advances Ayurvedic education and research. The 2026 Fellowship empowers practitioners to contribute meaningful work in Viddhakarma and allied sciences.",
  aboutCtaLabel: "Learn more",
  aboutCtaHref: "/about",
  faqTitle: "Frequently asked questions",
  faqSubtitle: "Registration, applications, grants, and tracking — answered.",
  faqItems: DEFAULT_FAQ_ITEMS,
  navLinks: DEFAULT_NAV_LINKS,
  footerQuickLinks: DEFAULT_FOOTER_QUICK_LINKS,
  footerLegalLinks: DEFAULT_FOOTER_LEGAL_LINKS,
  footerAboutText: "Advancing Ayurveda since 1972",
  footerDeveloperCredit:
    "Developed by Capture Visual Studios · Vaidya Gogate Memorial Foundation Copyrights",
  footerText: "© 2026 Vaidya Gogate Memorial Foundation. All rights reserved.",
  contactEmail: "info@vaidyagogate.org",
  contactPhone: "+91-9876543210",
  contactAddress: "Vaidya Gogate Memorial Foundation, India",
  updatedAt: new Date(),
};

export type SiteContent = {
  id?: string;
  siteName: string;
  siteTagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  headerOrgName: string;
  utilityBarText: string;
  tickerText: string;
  tickerEnabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  heroStats: HeroStat[];
  heroSnapshot: SnapshotItem[];
  highlightsTitle: string;
  highlightsSubtitle: string;
  highlights: HighlightTile[];
  journeyTitle: string;
  journeySubtitle: string;
  journeySteps: JourneyStep[];
  aboutBadge: string;
  aboutTitle: string;
  aboutContent: string;
  aboutCtaLabel: string;
  aboutCtaHref: string;
  faqTitle: string;
  faqSubtitle: string;
  faqItems: FaqItem[];
  navLinks: NavLink[];
  footerQuickLinks: NavLink[];
  footerLegalLinks: NavLink[];
  footerAboutText: string;
  footerDeveloperCredit: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  updatedAt?: Date;
};

function enrichSettings(settings: Awaited<ReturnType<typeof prisma.siteSettings.findUnique>>): SiteContent {
  if (!settings) return DEFAULT_SITE_SETTINGS;

  return {
    ...settings,
    siteTagline: settings.siteTagline || DEFAULT_SITE_SETTINGS.siteTagline,
    headerOrgName: settings.headerOrgName || DEFAULT_SITE_SETTINGS.headerOrgName,
    utilityBarText: settings.utilityBarText || DEFAULT_SITE_SETTINGS.utilityBarText,
    heroBadge: settings.heroBadge || DEFAULT_SITE_SETTINGS.heroBadge,
    heroStats: parseJsonArray<HeroStat>(settings.heroStats, DEFAULT_HERO_STATS),
    heroSnapshot: parseJsonArray<SnapshotItem>(settings.heroSnapshot, DEFAULT_HERO_SNAPSHOT),
    highlightsTitle: settings.highlightsTitle || DEFAULT_SITE_SETTINGS.highlightsTitle,
    highlightsSubtitle: settings.highlightsSubtitle || DEFAULT_SITE_SETTINGS.highlightsSubtitle,
    highlights: parseJsonArray<HighlightTile>(settings.highlights, DEFAULT_HIGHLIGHTS),
    journeyTitle: settings.journeyTitle || DEFAULT_SITE_SETTINGS.journeyTitle,
    journeySubtitle: settings.journeySubtitle || DEFAULT_SITE_SETTINGS.journeySubtitle,
    journeySteps: parseJsonArray<JourneyStep>(settings.journeySteps, DEFAULT_JOURNEY_STEPS),
    aboutBadge: settings.aboutBadge || DEFAULT_SITE_SETTINGS.aboutBadge,
    aboutTitle: settings.aboutTitle || DEFAULT_SITE_SETTINGS.aboutTitle,
    aboutContent: settings.aboutContent || DEFAULT_SITE_SETTINGS.aboutContent,
    aboutCtaLabel: settings.aboutCtaLabel || DEFAULT_SITE_SETTINGS.aboutCtaLabel,
    aboutCtaHref: settings.aboutCtaHref || DEFAULT_SITE_SETTINGS.aboutCtaHref,
    faqTitle: settings.faqTitle || DEFAULT_SITE_SETTINGS.faqTitle,
    faqSubtitle: settings.faqSubtitle || DEFAULT_SITE_SETTINGS.faqSubtitle,
    faqItems: parseJsonArray<FaqItem>(settings.faqItems, DEFAULT_FAQ_ITEMS),
    navLinks: parseJsonArray<NavLink>(settings.navLinks, DEFAULT_NAV_LINKS),
    footerQuickLinks: parseJsonArray<NavLink>(
      settings.footerQuickLinks,
      DEFAULT_FOOTER_QUICK_LINKS
    ),
    footerLegalLinks: parseJsonArray<NavLink>(
      settings.footerLegalLinks,
      DEFAULT_FOOTER_LEGAL_LINKS
    ),
    heroTitle: settings.heroTitle || DEFAULT_SITE_SETTINGS.heroTitle,
    heroSubtitle: settings.heroSubtitle || DEFAULT_SITE_SETTINGS.heroSubtitle,
    tickerText: settings.tickerText || DEFAULT_SITE_SETTINGS.tickerText,
    tickerEnabled: settings.tickerEnabled ?? DEFAULT_SITE_SETTINGS.tickerEnabled,
    footerAboutText: settings.footerAboutText || DEFAULT_SITE_SETTINGS.footerAboutText,
    footerDeveloperCredit:
      settings.footerDeveloperCredit || DEFAULT_SITE_SETTINGS.footerDeveloperCredit,
    footerText: settings.footerText || DEFAULT_SITE_SETTINGS.footerText,
    contactEmail: settings.contactEmail || DEFAULT_SITE_SETTINGS.contactEmail,
    contactPhone: settings.contactPhone || DEFAULT_SITE_SETTINGS.contactPhone,
    contactAddress: settings.contactAddress || DEFAULT_SITE_SETTINGS.contactAddress,
  };
}

export async function getSiteSettings(): Promise<SiteContent> {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "default",
          siteName: DEFAULT_SITE_SETTINGS.siteName,
          siteTagline: DEFAULT_SITE_SETTINGS.siteTagline,
          headerOrgName: DEFAULT_SITE_SETTINGS.headerOrgName,
          utilityBarText: DEFAULT_SITE_SETTINGS.utilityBarText,
          tickerText: DEFAULT_SITE_SETTINGS.tickerText,
          tickerEnabled: DEFAULT_SITE_SETTINGS.tickerEnabled,
          heroTitle: DEFAULT_SITE_SETTINGS.heroTitle,
          heroSubtitle: DEFAULT_SITE_SETTINGS.heroSubtitle,
          heroBadge: DEFAULT_SITE_SETTINGS.heroBadge,
          heroStats: DEFAULT_HERO_STATS,
          heroSnapshot: DEFAULT_HERO_SNAPSHOT,
          highlightsTitle: DEFAULT_SITE_SETTINGS.highlightsTitle,
          highlightsSubtitle: DEFAULT_SITE_SETTINGS.highlightsSubtitle,
          highlights: DEFAULT_HIGHLIGHTS,
          journeyTitle: DEFAULT_SITE_SETTINGS.journeyTitle,
          journeySubtitle: DEFAULT_SITE_SETTINGS.journeySubtitle,
          journeySteps: DEFAULT_JOURNEY_STEPS,
          aboutBadge: DEFAULT_SITE_SETTINGS.aboutBadge,
          aboutTitle: DEFAULT_SITE_SETTINGS.aboutTitle,
          aboutContent: DEFAULT_SITE_SETTINGS.aboutContent,
          aboutCtaLabel: DEFAULT_SITE_SETTINGS.aboutCtaLabel,
          aboutCtaHref: DEFAULT_SITE_SETTINGS.aboutCtaHref,
          faqTitle: DEFAULT_SITE_SETTINGS.faqTitle,
          faqSubtitle: DEFAULT_SITE_SETTINGS.faqSubtitle,
          faqItems: DEFAULT_FAQ_ITEMS,
          navLinks: DEFAULT_NAV_LINKS,
          footerQuickLinks: DEFAULT_FOOTER_QUICK_LINKS,
          footerLegalLinks: DEFAULT_FOOTER_LEGAL_LINKS,
          footerAboutText: DEFAULT_SITE_SETTINGS.footerAboutText,
          footerDeveloperCredit: DEFAULT_SITE_SETTINGS.footerDeveloperCredit,
          footerText: DEFAULT_SITE_SETTINGS.footerText,
          contactEmail: DEFAULT_SITE_SETTINGS.contactEmail,
          contactPhone: DEFAULT_SITE_SETTINGS.contactPhone,
          contactAddress: DEFAULT_SITE_SETTINGS.contactAddress,
        },
      });
    }

    return enrichSettings(settings);
  } catch (error) {
    console.error("getSiteSettings fallback:", error);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getCmsPage(slug: CmsPageSlug) {
  return prisma.cmsPage.findUnique({ where: { slug } });
}

export async function getActiveNotices() {
  try {
    const now = new Date();
    return prisma.notice.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
      take: 10,
    });
  } catch (error) {
    console.error("getActiveNotices fallback:", error);
    return [];
  }
}

export async function getActiveFormTemplate(slug = "fellowship-application") {
  return prisma.formTemplate.findFirst({
    where: { slug, isActive: true },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
  });
}
