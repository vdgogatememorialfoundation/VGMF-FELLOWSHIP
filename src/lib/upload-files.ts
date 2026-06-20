import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "./db";
import type { SessionUser } from "./auth";

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "TRUSTEE", "COMMITTEE", "FINANCE"]);

/** Public URL for a file stored under public/uploads (works on Render; not static /uploads). */
export function toUploadApiUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath?.trim()) return null;
  const trimmed = storedPath.trim();
  if (trimmed.startsWith("/api/")) return trimmed;
  if (trimmed.startsWith("/uploads/")) {
    return `/api/uploads/${trimmed.slice("/uploads/".length)}`;
  }
  if (trimmed.startsWith("uploads/")) {
    return `/api/uploads/${trimmed.slice("uploads/".length)}`;
  }
  return trimmed;
}

function uploadsRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

export function resolveUploadDiskPath(segments: string[]): string | null {
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("\\")) {
      return null;
    }
  }

  const absolutePath = path.join(uploadsRoot(), ...segments);
  const root = path.resolve(uploadsRoot());
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }

  return resolved;
}

export function mimeTypeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function canAccessUploadPath(
  user: SessionUser,
  segments: string[]
): Promise<boolean> {
  if (STAFF_ROLES.has(user.role)) return true;

  if (segments[0] === "fellowships") {
    const fellowshipId = segments[1];
    if (!fellowshipId) return false;

    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      select: { application: { select: { userId: true } } },
    });

    return fellowship?.application.userId === user.id;
  }

  const applicationId = segments[0];
  if (!applicationId) return false;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });

  if (!application) return false;
  return application.userId === user.id;
}

export async function readStoredUpload(segments: string[]) {
  const diskPath = resolveUploadDiskPath(segments);
  if (!diskPath || !existsSync(diskPath)) return null;

  const fileName = segments[segments.length - 1] ?? "file";
  const data = await readFile(diskPath);

  const storedPath = `/uploads/${segments.join("/")}`;
  const [applicationDoc, fellowshipDoc] = await Promise.all([
    prisma.applicationDocument.findFirst({
      where: { filePath: storedPath },
      select: { mimeType: true, fileName: true },
    }),
    prisma.fellowshipDocument.findFirst({
      where: { filePath: storedPath },
      select: { mimeType: true, fileName: true },
    }),
  ]);

  const mimeType =
    applicationDoc?.mimeType ||
    fellowshipDoc?.mimeType ||
    mimeTypeFromFileName(fileName);

  return {
    data,
    fileName: applicationDoc?.fileName || fellowshipDoc?.fileName || fileName,
    mimeType,
  };
}
