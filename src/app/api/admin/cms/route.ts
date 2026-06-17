import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getIntegrationSettingsForAdmin } from "@/lib/integrations";
import { resolveSecret, isMaskedSecret } from "@/lib/site-content";
import { saveSiteAsset, resolveLogoUrl, resolveFaviconUrl } from "@/lib/site-assets";
import { notifySiteNotice } from "@/lib/notifications";

async function broadcastNoticeToApplicants(title: string, content: string) {
  const applicants = await prisma.user.findMany({
    where: { role: "APPLICANT", isActive: true },
    select: { id: true },
  });

  await Promise.all(
    applicants.map((applicant) => notifySiteNotice(applicant.id, title, content))
  );
}

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, pages, notices, forms, integrations] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.cmsPage.findMany({ orderBy: { slug: "asc" } }),
    prisma.notice.findMany({ orderBy: { priority: "desc" } }),
    prisma.formTemplate.findMany({
      include: { fields: { orderBy: { order: "asc" } } },
    }),
    getIntegrationSettingsForAdmin(),
  ]);

  return NextResponse.json({
    settings: settings
      ? {
          ...settings,
          logoData: undefined,
          faviconData: undefined,
          logoUrl: resolveLogoUrl(settings),
          faviconUrl: resolveFaviconUrl(settings),
        }
      : null,
    pages,
    notices,
    forms,
    integrations,
  });
}

export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { section, data } = body;

  if (section === "settings") {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    return NextResponse.json({ settings });
  }

  if (section === "integrations") {
    const existing = await prisma.integrationSettings.findUnique({
      where: { id: "default" },
    });

    await prisma.integrationSettings.upsert({
      where: { id: "default" },
      update: {
        appUrl: data.appUrl?.trim() || null,
        zeptomailToken: resolveSecret(data.zeptomailToken, existing?.zeptomailToken ?? null),
        zeptomailFromEmail: data.zeptomailFromEmail?.trim() || null,
        zeptomailFromName: data.zeptomailFromName?.trim() || null,
        whatsappToken: resolveSecret(data.whatsappToken, existing?.whatsappToken ?? null),
        whatsappPhoneNumberId: data.whatsappPhoneNumberId?.trim() || null,
        whatsappOtpTemplateName: data.whatsappOtpTemplateName?.trim() || null,
        whatsappOtpTemplateLanguage: data.whatsappOtpTemplateLanguage?.trim() || null,
        whatsappApiVersion: data.whatsappApiVersion?.trim() || null,
      },
      create: {
        id: "default",
        appUrl: data.appUrl?.trim() || null,
        zeptomailToken: isMaskedSecret(data.zeptomailToken) ? null : data.zeptomailToken?.trim() || null,
        zeptomailFromEmail: data.zeptomailFromEmail?.trim() || null,
        zeptomailFromName: data.zeptomailFromName?.trim() || null,
        whatsappToken: isMaskedSecret(data.whatsappToken) ? null : data.whatsappToken?.trim() || null,
        whatsappPhoneNumberId: data.whatsappPhoneNumberId?.trim() || null,
        whatsappOtpTemplateName: data.whatsappOtpTemplateName?.trim() || null,
        whatsappOtpTemplateLanguage: data.whatsappOtpTemplateLanguage?.trim() || null,
        whatsappApiVersion: data.whatsappApiVersion?.trim() || null,
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
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      }

      const notice = await prisma.notice.update({
        where: { id: data.id },
        data: updateData,
      });

      if (data.notifyApplicants && notice.isActive) {
        void broadcastNoticeToApplicants(notice.title, notice.content);
      }

      return NextResponse.json({ notice });
    }

    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category ?? "GENERAL",
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    if (data.notifyApplicants && notice.isActive) {
      void broadcastNoticeToApplicants(notice.title, notice.content);
    }

    return NextResponse.json({ notice });
  }

  if (section === "form-template") {
    const template = await prisma.formTemplate.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      },
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        isActive: data.isActive ?? true,
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
  } else if (type === "form-field") {
    await prisma.formField.delete({ where: { id } });
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
  const logo = formData.get("logo") as File | null;
  const favicon = formData.get("favicon") as File | null;

  if (!logo && !favicon) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const update: { logoUrl?: string; faviconUrl?: string } = {};

  if (logo) {
    const result = await uploadSiteAsset(logo, "logo");
    update.logoUrl = result.url;
  }

  if (favicon) {
    const result = await uploadSiteAsset(favicon, "favicon");
    update.faviconUrl = result.url;
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });

  return NextResponse.json({ settings, ...update });
}
