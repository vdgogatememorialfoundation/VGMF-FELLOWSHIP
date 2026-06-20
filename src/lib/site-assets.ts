import prisma from "./db";

export const SITE_LOGO_URL = "/api/site/logo";
export const SITE_FAVICON_URL = "/api/site/favicon";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_FAVICON_BYTES = 512 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

function assetVersion(updatedAt?: Date | null): string {
  return updatedAt ? String(new Date(updatedAt).getTime()) : "1";
}

export function resolveLogoUrl(settings: {
  logoData?: string | null;
  logoUrl?: string | null;
  updatedAt?: Date | null;
}): string | null {
  if (settings.logoData) {
    return `${SITE_LOGO_URL}?v=${assetVersion(settings.updatedAt)}`;
  }
  if (settings.logoUrl?.startsWith("http")) return settings.logoUrl;
  return null;
}

export function resolveFaviconUrl(settings: {
  faviconData?: string | null;
  faviconUrl?: string | null;
  updatedAt?: Date | null;
}): string | null {
  if (settings.faviconData) {
    return `${SITE_FAVICON_URL}?v=${assetVersion(settings.updatedAt)}`;
  }
  if (settings.faviconUrl?.startsWith("http")) return settings.faviconUrl;
  return null;
}

function validateImageFile(file: File, type: "logo" | "favicon") {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error(`Please choose a valid ${type} image file.`);
  }

  const maxBytes = type === "logo" ? MAX_LOGO_BYTES : MAX_FAVICON_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      `${type === "logo" ? "Logo" : "Favicon"} must be under ${type === "logo" ? "2MB" : "512KB"}.`
    );
  }

  const mimeType = file.type || "image/png";
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Use PNG, JPG, WebP, SVG, or GIF.");
  }

  return mimeType;
}

export async function saveSiteAsset(
  file: File,
  type: "logo" | "favicon"
): Promise<{ url: string; mimeType: string }> {
  const mimeType = validateImageFile(file, type);
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const url = type === "logo" ? SITE_LOGO_URL : SITE_FAVICON_URL;

  const data =
    type === "logo"
      ? { logoData: base64, logoMimeType: mimeType, logoUrl: url }
      : { faviconData: base64, faviconMimeType: mimeType, faviconUrl: url };

  const saved = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
      ...data,
    },
    select: { updatedAt: true },
  });

  const versionedUrl = `${url}?v=${assetVersion(saved.updatedAt)}`;
  return { url: versionedUrl, mimeType };
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
