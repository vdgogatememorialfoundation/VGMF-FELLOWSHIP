import prisma from "./db";
import type { CmsPageSlug } from "@prisma/client";

const DEFAULT_SITE_SETTINGS = {
  id: "default",
  siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
  siteTagline: "Advancing Ayurvedic Research & Viddhakarma Studies",
  logoUrl: null as string | null,
  tickerText:
    "Applications open for VGMF Fellowship 2026 | Visit Notices for important updates",
  tickerEnabled: true,
  heroTitle: "Vaidya Gogate Memorial Foundation Research Fellowship 2026",
  heroSubtitle:
    "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000.",
  footerText: "© 2026 Vaidya Gogate Memorial Foundation. All rights reserved.",
  contactEmail: "info@vaidyagogate.org",
  contactPhone: "+91-9876543210",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export async function getSiteSettings() {
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
          tickerText: DEFAULT_SITE_SETTINGS.tickerText,
          tickerEnabled: DEFAULT_SITE_SETTINGS.tickerEnabled,
          heroTitle: DEFAULT_SITE_SETTINGS.heroTitle,
          heroSubtitle: DEFAULT_SITE_SETTINGS.heroSubtitle,
          footerText: DEFAULT_SITE_SETTINGS.footerText,
          contactEmail: DEFAULT_SITE_SETTINGS.contactEmail,
          contactPhone: DEFAULT_SITE_SETTINGS.contactPhone,
        },
      });
    }

    return settings;
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
