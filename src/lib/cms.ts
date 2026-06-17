import prisma from "./db";
import type { CmsPageSlug } from "@prisma/client";

export async function getSiteSettings() {
  let settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: {
        id: "default",
        siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
        siteTagline: "Advancing Ayurvedic Research & Viddhakarma Studies",
        tickerText:
          "Applications open for VGMF Fellowship 2026 | Last date to apply: Check notices section",
        tickerEnabled: true,
        heroTitle: "Vaidya Gogate Memorial Foundation Research Fellowship 2026",
        heroSubtitle:
          "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000.",
        footerText:
          "© 2026 Vaidya Gogate Memorial Foundation. All rights reserved.",
        contactEmail: "info@vaidyagogate.org",
        contactPhone: "+91-XXXX-XXXXXX",
      },
    });
  }

  return settings;
}

export async function getCmsPage(slug: CmsPageSlug) {
  return prisma.cmsPage.findUnique({ where: { slug } });
}

export async function getActiveNotices() {
  const now = new Date();
  return prisma.notice.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
    take: 10,
  });
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
