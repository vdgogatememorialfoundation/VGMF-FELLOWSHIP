import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import type { NoticeCategory } from "@prisma/client";
import { getIntegrationSettingsForAdmin, normalizeAppUrl, resolveIntegrationAppUrl, isBlockedIntegrationHost } from "@/lib/integrations";
import { resolveSecret, isMaskedSecret, resolveOptionalSetting } from "@/lib/site-content";
import {
  mergeNotificationTemplates,
  serializeNotificationTemplates,
  resolveOtpWhatsAppTemplateLanguage,
  resolveOtpWhatsAppTemplateName,
  type NotificationEventTemplate,
} from "@/lib/notification-templates";
import { saveSiteAsset, resolveLogoUrl, resolveFaviconUrl } from "@/lib/site-assets";
import { notifySiteNotice } from "@/lib/notifications";
import {
  formatNoticeForAdmin,
  parseNoticeAttachment,
} from "@/lib/notice-assets";

export const dynamic = "force-dynamic";

async function broadcastNoticeToApplicants(title: string, content: string) {
  const applicants = await prisma.user.findMany({
    where: { role: "APPLICANT", isActive: true },
    select: { id: true },
  });

  await Promise.allSettled(
    applicants.map((applicant) => notifySiteNotice(applicant.id, title, content))
  );
}

const SITE_SETTINGS_UPDATE_KEYS = [
  "siteName",
  "siteTagline",
  "logoUrl",
  "faviconUrl",
  "headerOrgName",
  "utilityBarText",
  "tickerText",
  "tickerEnabled",
  "heroTitle",
  "heroSubtitle",
  "heroBadge",
  "heroStats",
  "heroSnapshot",
  "highlightsTitle",
  "highlightsSubtitle",
  "highlights",
  "journeyTitle",
  "journeySubtitle",
  "journeySteps",
  "aboutBadge",
  "aboutTitle",
  "aboutContent",
  "aboutCtaLabel",
  "aboutCtaHref",
  "faqTitle",
  "faqSubtitle",
  "faqItems",
  "navLinks",
  "footerQuickLinks",
  "footerLegalLinks",
  "footerAboutText",
  "footerDeveloperCredit",
  "footerText",
  "contactEmail",
  "contactPhone",
  "contactAddress",
  "signupEnabled",
  "loginEnabled",
  "signupDisabledMessage",
  "loginDisabledMessage",
  "signupOtpEmailEnabled",
  "signupOtpWhatsappEnabled",
  "signupPasswordEnabled",
  "loginPasswordEnabled",
  "loginOtpWhatsappEnabled",
  "loginOtpEmailEnabled",
  "applicationNotifyEmailEnabled",
  "applicationNotifyWhatsappEnabled",
  "welcomeEmailEnabled",
  "welcomeWhatsappEnabled",
  "alertsEmailEnabled",
  "alertsWhatsappEnabled",
  "statusNotifyEmailEnabled",
  "statusNotifyWhatsappEnabled",
  "maintenanceModeEnabled",
  "maintenanceMessage",
  "maintenanceAllowPortals",
  "seoMetaTitle",
  "seoMetaDescription",
  "seoKeywords",
  "googleSiteVerification",
  "googleAnalyticsId",
  "seoIndexingEnabled",
  "seoStructuredDataEnabled",
  "publicSiteUrl",
] as const;

function pickSiteSettingsUpdate(data: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const key of SITE_SETTINGS_UPDATE_KEYS) {
    if (key in data) update[key] = data[key];
  }

  for (const key of ["contactEmail", "contactPhone", "contactAddress"] as const) {
    if (key in update && typeof update[key] === "string") {
      const trimmed = (update[key] as string).trim();
      update[key] = trimmed || null;
    }
  }

  return update;
}

function formatSiteSettingsForAdmin(
  settings: NonNullable<Awaited<ReturnType<typeof prisma.siteSettings.findUnique>>>
) {
  return {
    ...settings,
    logoData: undefined,
    faviconData: undefined,
    logoUrl: resolveLogoUrl(settings),
    faviconUrl: resolveFaviconUrl(settings),
  };
}

function resolveAppUrlSetting(
  incoming: string | undefined,
  existing: string | null
): string | null {
  const trimmed = incoming?.trim();
  if (!trimmed) return existing;
  const normalized = normalizeAppUrl(trimmed);
  if (isBlockedIntegrationHost(normalized)) {
    return resolveIntegrationAppUrl(null, process.env.NEXT_PUBLIC_APP_URL);
  }
  return normalized;
}

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

function revalidatePublicNoticeSurfaces() {
  revalidatePath("/");
  revalidatePath("/api/cms");
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, pages, notices, forms, integrations] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.cmsPage.findMany({ orderBy: { slug: "asc" } }),
    prisma.notice.findMany({ orderBy: { priority: "desc" } }).then((rows) =>
      rows.map((notice) => formatNoticeForAdmin(notice))
    ),
    prisma.formTemplate.findMany({
      include: {
        fields: { orderBy: { order: "asc" } },
        _count: { select: { submissions: true, fields: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getIntegrationSettingsForAdmin(),
  ]);

  return NextResponse.json(
    {
      settings: settings ? formatSiteSettingsForAdmin(settings) : null,
      pages,
      notices,
      forms,
      integrations,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { section, data } = body;

  if (section === "settings") {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: pickSiteSettingsUpdate(data),
      create: { id: "default", ...pickSiteSettingsUpdate(data) },
    });
    revalidatePublicNoticeSurfaces();
    return NextResponse.json(
      { settings: formatSiteSettingsForAdmin(settings) },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (section === "integrations") {
    const existing = await prisma.integrationSettings.findUnique({
      where: { id: "default" },
    });

    const notificationTemplates = mergeNotificationTemplates(
      data.notificationTemplates
    ) as NotificationEventTemplate[];
    const otpTemplate = notificationTemplates.find((item) => item.event === "OTP_VERIFICATION");
    const resolvedOtpTemplateName = resolveOtpWhatsAppTemplateName([
      otpTemplate?.whatsappTemplateName,
      data.whatsappOtpTemplateName,
    ]);
    const resolvedOtpTemplateLanguage = resolveOtpWhatsAppTemplateLanguage([
      otpTemplate?.whatsappTemplateLanguage,
      data.whatsappOtpTemplateLanguage,
    ]);

    await prisma.integrationSettings.upsert({
      where: { id: "default" },
      update: {
        appUrl: resolveAppUrlSetting(data.appUrl, existing?.appUrl ?? null),
        zeptomailToken: resolveSecret(data.zeptomailToken, existing?.zeptomailToken ?? null),
        zeptomailFromEmail: data.zeptomailFromEmail?.trim() || null,
        zeptomailFromName: data.zeptomailFromName?.trim() || null,
        whatsappToken: resolveSecret(data.whatsappToken, existing?.whatsappToken ?? null),
        whatsappPhoneNumberId: data.whatsappPhoneNumberId?.trim() || null,
        whatsappOtpTemplateName: resolvedOtpTemplateName,
        whatsappOtpTemplateLanguage: resolvedOtpTemplateLanguage,
        whatsappApiVersion: data.whatsappApiVersion?.trim() || null,
        whatsappBusinessAccountId: data.whatsappBusinessAccountId?.trim() || null,
        whatsappWebhookVerifyToken: resolveOptionalSetting(
          data.whatsappWebhookVerifyToken,
          existing?.whatsappWebhookVerifyToken ?? null
        ),
        emailOtpSubject: data.emailOtpSubject?.trim() || null,
        notificationTemplatesJson: serializeNotificationTemplates(notificationTemplates),
        setuEnabled: data.setuEnabled === true,
        setuClientId: resolveSecret(data.setuClientId, existing?.setuClientId ?? null),
        setuClientSecret: resolveSecret(data.setuClientSecret, existing?.setuClientSecret ?? null),
        setuProductInstanceId: resolveSecret(data.setuProductInstanceId, existing?.setuProductInstanceId ?? null),
        setuEnvironment: data.setuEnvironment?.trim().toLowerCase() === "sandbox" ? "sandbox" : "production",
        activeVerificationProvider: data.activeVerificationProvider?.trim() || "SETU",
      },
      create: {
        id: "default",
        appUrl: resolveAppUrlSetting(data.appUrl, existing?.appUrl ?? null),
        zeptomailToken: isMaskedSecret(data.zeptomailToken) ? null : data.zeptomailToken?.trim() || null,
        zeptomailFromEmail: data.zeptomailFromEmail?.trim() || null,
        zeptomailFromName: data.zeptomailFromName?.trim() || null,
        whatsappToken: isMaskedSecret(data.whatsappToken) ? null : data.whatsappToken?.trim() || null,
        whatsappPhoneNumberId: data.whatsappPhoneNumberId?.trim() || null,
        whatsappOtpTemplateName: resolvedOtpTemplateName,
        whatsappOtpTemplateLanguage: resolvedOtpTemplateLanguage,
        whatsappApiVersion: data.whatsappApiVersion?.trim() || null,
        whatsappBusinessAccountId: data.whatsappBusinessAccountId?.trim() || null,
        whatsappWebhookVerifyToken: resolveOptionalSetting(
          data.whatsappWebhookVerifyToken,
          existing?.whatsappWebhookVerifyToken ?? null
        ),
        emailOtpSubject: data.emailOtpSubject?.trim() || null,
        notificationTemplatesJson: serializeNotificationTemplates(notificationTemplates),
        setuEnabled: data.setuEnabled === true,
        setuClientId: isMaskedSecret(data.setuClientId) ? null : data.setuClientId?.trim() || null,
        setuClientSecret: isMaskedSecret(data.setuClientSecret) ? null : data.setuClientSecret?.trim() || null,
        setuProductInstanceId: isMaskedSecret(data.setuProductInstanceId) ? null : data.setuProductInstanceId?.trim() || null,
        setuEnvironment: data.setuEnvironment?.trim().toLowerCase() === "sandbox" ? "sandbox" : "production",
        activeVerificationProvider: data.activeVerificationProvider?.trim() || "SETU",
      },
    });

    const masked = await getIntegrationSettingsForAdmin();
    return NextResponse.json({ integrations: masked });
  }

  if (section === "page") {
    const page = await prisma.cmsPage.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        content: data.content,
        isPublished: data.isPublished ?? true,
      },
      create: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        isPublished: data.isPublished ?? true,
      },
    });
    return NextResponse.json({ page });
  }

  if (section === "notice") {
    if (data.id) {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
      if (data.linkLabel !== undefined) updateData.linkLabel = data.linkLabel;
      if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : null;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No notice fields to update" }, { status: 400 });
      }

      const notice = await prisma.notice.update({
        where: { id: data.id },
        data: updateData,
      });

      if (data.notifyApplicants && notice.isActive) {
        void broadcastNoticeToApplicants(notice.title, notice.content);
      }

      revalidatePublicNoticeSurfaces();

      return NextResponse.json({ notice: formatNoticeForAdmin(notice) });
    }

    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category ?? "GENERAL",
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        attachmentFileName: data.attachmentFileName ?? null,
        attachmentMimeType: data.attachmentMimeType ?? null,
        attachmentData: data.attachmentData ?? null,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    if (data.notifyApplicants && notice.isActive) {
      void broadcastNoticeToApplicants(notice.title, notice.content);
    }

    revalidatePublicNoticeSurfaces();

    return NextResponse.json({ notice: formatNoticeForAdmin(notice) });
  }

  if (section === "form-template") {
    const template = await prisma.formTemplate.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        opensAt: data.opensAt ? new Date(data.opensAt) : null,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        closedMessage: data.closedMessage ?? null,
      },
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        isActive: data.isActive ?? true,
        opensAt: data.opensAt ? new Date(data.opensAt) : null,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        closedMessage: data.closedMessage ?? null,
      },
    });
    return NextResponse.json({ template });
  }

  if (section === "form-field") {
    if (data.id) {
      const field = await prisma.formField.update({
        where: { id: data.id },
        data,
      });
      return NextResponse.json({ field });
    }
    const field = await prisma.formField.create({ data });
    return NextResponse.json({ field });
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (type === "notice") {
    await prisma.notice.delete({ where: { id } });
    revalidatePublicNoticeSurfaces();
  } else if (type === "form-field") {
    await prisma.formField.delete({ where: { id } });
  } else if (type === "form-template") {
    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    if (template.slug === "fellowship-application") {
      return NextResponse.json(
        { error: "The main fellowship application form cannot be deleted" },
        { status: 400 }
      );
    }
    if (template._count.submissions > 0) {
      return NextResponse.json(
        { error: "Cannot delete a form that has submissions. Deactivate it instead." },
        { status: 400 }
      );
    }
    await prisma.formTemplate.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

async function uploadSiteAsset(file: File, type: "logo" | "favicon") {
  return saveSiteAsset(file, type);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const section = formData.get("section") as string | null;

  if (section === "notice") {
    try {
      const title = String(formData.get("title") || "").trim();
      const content = String(formData.get("content") || "").trim();

      if (!title) {
        return NextResponse.json({ error: "Notice title is required" }, { status: 400 });
      }

      const attachment = formData.get("attachment");
      let attachmentFields: Record<string, string | null> = {
        attachmentFileName: null,
        attachmentMimeType: null,
        attachmentData: null,
      };

      if (attachment instanceof File && attachment.size > 0) {
        attachmentFields = await parseNoticeAttachment(attachment);
      }

      const expiresAtRaw = String(formData.get("expiresAt") || "").trim();
      const notifyApplicants = formData.get("notifyApplicants") === "true";

      const notice = await prisma.notice.create({
        data: {
          title,
          content,
          category: (String(formData.get("category") || "GENERAL") as NoticeCategory),
          linkUrl: String(formData.get("linkUrl") || "").trim() || null,
          linkLabel: String(formData.get("linkLabel") || "").trim() || null,
          priority: Number(formData.get("priority") || 0),
          expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
          isActive: true,
          ...attachmentFields,
        },
      });

      if (notifyApplicants) {
        void broadcastNoticeToApplicants(notice.title, notice.content);
      }

      revalidatePublicNoticeSurfaces();

      return NextResponse.json({ notice: formatNoticeForAdmin(notice) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to publish notice";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const logo = formData.get("logo");
  const favicon = formData.get("favicon");

  if (
    !(logo instanceof File && logo.size > 0) &&
    !(favicon instanceof File && favicon.size > 0)
  ) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  try {
    const update: { logoUrl?: string; faviconUrl?: string } = {};

    if (logo instanceof File && logo.size > 0) {
      const result = await uploadSiteAsset(logo, "logo");
      update.logoUrl = result.url;
    }

    if (favicon instanceof File && favicon.size > 0) {
      const result = await uploadSiteAsset(favicon, "favicon");
      update.faviconUrl = result.url;
    }

    return NextResponse.json({ success: true, ...update });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Site asset upload error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
