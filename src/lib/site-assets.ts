import prisma from "./db";

export const SITE_LOGO_URL = "/api/site/logo";
export const SITE_FAVICON_URL = "/api/site/favicon";

export function resolveLogoUrl(settings: {
  logoData?: string | null;
  logoUrl?: string | null;
}): string | null {
  if (settings.logoData) return SITE_LOGO_URL;
  if (settings.logoUrl?.startsWith("http")) return settings.logoUrl;
  if (settings.logoUrl?.startsWith("/api/site/")) return settings.logoUrl;
  return null;
}

export function resolveFaviconUrl(settings: {
  faviconData?: string | null;
  faviconUrl?: string | null;
}): string | null {
  if (settings.faviconData) return SITE_FAVICON_URL;
  if (settings.faviconUrl?.startsWith("http")) return settings.faviconUrl;
  if (settings.faviconUrl?.startsWith("/api/site/")) return settings.faviconUrl;
  return null;
}

export async function saveSiteAsset(
  file: File,
  type: "logo" | "favicon"
): Promise<{ url: string; mimeType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/png";
  const url = type === "logo" ? SITE_LOGO_URL : SITE_FAVICON_URL;

  const data =
    type === "logo"
      ? { logoData: base64, logoMimeType: mimeType, logoUrl: url }
      : { faviconData: base64, faviconMimeType: mimeType, faviconUrl: url };

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      siteName: "VGMF Fellowship Portal 2026",
      ...data,
    },
  });

  return { url, mimeType };
}

export async function getSiteAsset(type: "logo" | "favicon") {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    select: {
      logoData: true,
      logoMimeType: true,
      faviconData: true,
      faviconMimeType: true,
    },
  });

  if (!settings) return null;

  if (type === "logo" && settings.logoData) {
    return {
      data: Buffer.from(settings.logoData, "base64"),
      mimeType: settings.logoMimeType || "image/png",
    };
  }

  if (type === "favicon" && settings.faviconData) {
    return {
      data: Buffer.from(settings.faviconData, "base64"),
      mimeType: settings.faviconMimeType || "image/png",
    };
  }

  return null;
}
