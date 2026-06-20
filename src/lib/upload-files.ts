import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "./db";
import type { SessionUser } from "./auth";

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "TRUSTEE", "COMMITTEE", "FINANCE"]);

export function encodeFileData(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function decodeFileData(data: string): Buffer {
  return Buffer.from(data, "base64");
}

export function applicationDocumentFileUrl(documentId: string): string {
  return `/api/documents/${documentId}/file`;
}

export function fellowshipDocumentFileUrl(documentId: string): string {
  return `/api/fellowship/documents/${documentId}/file`;
}

export function mapApplicationDocumentForClient<
  T extends { id: string; filePath: string },
>(doc: T): T {
  return {
    ...doc,
    filePath: applicationDocumentFileUrl(doc.id),
  };
}

export function mapFellowshipDocumentForClient<
  T extends { id: string; filePath: string },
>(doc: T): T {
  return {
    ...doc,
    filePath: fellowshipDocumentFileUrl(doc.id),
  };
}

export function resolveApplicationStoredFileName(input: {
  docType: string;
  originalFileName: string;
  existingFilePath?: string | null;
}): string {
  if (input.existingFilePath) {
    const existing = input.existingFilePath.split("/").pop();
    if (existing) return existing;
  }

  const safeName = input.originalFileName.replace(/[^\w.\-() ]+/g, "_").trim() || "upload";
  return `${input.docType}_${Date.now()}_${safeName}`;
}

function docTypeFromStoredFileName(fileName: string): string | null {
  const knownPrefixes = [
    "GOVERNMENT_ID",
    "IDENTITY_SELFIE",
    "AADHAAR",
    "PAN",
    "REGISTRATION_CERTIFICATE",
    "BAMS_DEGREE",
    "RESEARCH_PROPOSAL",
    "BANK_VERIFICATION",
  ];
  for (const prefix of knownPrefixes) {
    if (fileName.startsWith(`${prefix}_`)) return prefix;
  }
  return fileName.split("_")[0] ?? null;
}

/** Resolve a client-facing download URL for stored upload paths. */
export function toUploadApiUrl(
  storedPath: string | null | undefined,
  options?: { documentId?: string | null; fellowshipDocumentId?: string | null }
): string | null {
  if (options?.documentId) return applicationDocumentFileUrl(options.documentId);
  if (options?.fellowshipDocumentId) {
    return fellowshipDocumentFileUrl(options.fellowshipDocumentId);
  }
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

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function normalizeUploadSegments(segments: string[]): string[] {
  return segments.map(decodeSegment);
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

export async function writeUploadToDisk(relativePath: string, buffer: Buffer): Promise<void> {
  const normalized = relativePath.replace(/^\//, "");
  if (!normalized.startsWith("uploads/")) return;

  const segments = normalized.slice("uploads/".length).split("/").filter(Boolean);
  const diskPath = resolveUploadDiskPath(segments);
  if (!diskPath) return;

  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, buffer);
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

function storedPathsForSegments(segments: string[]): string[] {
  const decoded = normalizeUploadSegments(segments);
  return [
    `/uploads/${decoded.join("/")}`,
    `/uploads/${segments.join("/")}`,
  ];
}

export async function canAccessUploadPath(
  user: SessionUser,
  segments: string[]
): Promise<boolean> {
  if (STAFF_ROLES.has(user.role)) return true;

  const decoded = normalizeUploadSegments(segments);

  if (decoded[0] === "fellowships") {
    const fellowshipId = decoded[1];
    if (!fellowshipId) return false;

    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      select: { application: { select: { userId: true } } },
    });

    return fellowship?.application.userId === user.id;
  }

  const applicationId = decoded[0];
  if (!applicationId) return false;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });

  if (!application) return false;
  return application.userId === user.id;
}

export async function canAccessApplicationDocument(
  user: SessionUser,
  applicationUserId: string
): Promise<boolean> {
  if (STAFF_ROLES.has(user.role)) return true;
  return applicationUserId === user.id;
}

async function readFileFromDisk(relativePath: string) {
  const normalized = relativePath.replace(/^\//, "");
  if (!normalized.startsWith("uploads/")) return null;

  const segments = normalized.slice("uploads/".length).split("/").filter(Boolean);
  const diskPath = resolveUploadDiskPath(segments);
  if (!diskPath || !existsSync(diskPath)) return null;

  return readFile(diskPath);
}

async function findStoredUploadByPath(segments: string[]) {
  const paths = storedPathsForSegments(segments);
  const decoded = normalizeUploadSegments(segments);

  for (const storedPath of paths) {
    const applicationDoc = await prisma.applicationDocument.findFirst({
      where: { filePath: storedPath },
      select: { fileData: true, mimeType: true, fileName: true, filePath: true },
    });
    if (applicationDoc) return applicationDoc;

    const fellowshipDoc = await prisma.fellowshipDocument.findFirst({
      where: { filePath: storedPath },
      select: { fileData: true, mimeType: true, fileName: true, filePath: true },
    });
    if (fellowshipDoc) return fellowshipDoc;

    const progressReport = await prisma.progressReport.findFirst({
      where: { reportPath: storedPath },
      select: { reportData: true, reportPath: true },
    });
    if (progressReport) {
      return {
        fileData: progressReport.reportData,
        mimeType: mimeTypeFromFileName(path.basename(storedPath)),
        fileName: path.basename(storedPath),
        filePath: storedPath,
      };
    }

    const finalSubmission = await prisma.finalSubmission.findFirst({
      where: {
        OR: [
          { finalReportPath: storedPath },
          { manuscriptPath: storedPath },
          { utilizationCertPath: storedPath },
        ],
      },
    });
    if (finalSubmission) {
      let fileData: string | null | undefined = null;
      if (finalSubmission.finalReportPath === storedPath) {
        fileData = finalSubmission.finalReportData;
      } else if (finalSubmission.manuscriptPath === storedPath) {
        fileData = finalSubmission.manuscriptData;
      } else if (finalSubmission.utilizationCertPath === storedPath) {
        fileData = finalSubmission.utilizationCertData;
      }
      return {
        fileData,
        mimeType: mimeTypeFromFileName(path.basename(storedPath)),
        fileName: path.basename(storedPath),
        filePath: storedPath,
      };
    }
  }

  if (decoded[0] && decoded[0] !== "fellowships") {
    const fileName = decoded[decoded.length - 1];
    const docType = fileName ? docTypeFromStoredFileName(fileName) : null;
    if (docType) {
      const applicationDoc = await prisma.applicationDocument.findFirst({
        where: {
          applicationId: decoded[0],
          type: docType as never,
        },
        orderBy: { uploadedAt: "desc" },
        select: { fileData: true, mimeType: true, fileName: true, filePath: true },
      });
      if (applicationDoc) return applicationDoc;
    }
  }

  return null;
}

export async function getApplicationDocumentFile(documentId: string) {
  const document = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
    include: { application: { select: { userId: true } } },
  });

  if (!document) return null;

  if (document.fileData?.trim()) {
    return {
      data: decodeFileData(document.fileData),
      fileName: document.fileName,
      mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
      applicationUserId: document.application.userId,
    };
  }

  const diskData = await readFileFromDisk(document.filePath);
  if (diskData) {
    const fileData = encodeFileData(diskData);
    await prisma.applicationDocument.update({
      where: { id: document.id },
      data: { fileData },
    }).catch(() => undefined);

    return {
      data: diskData,
      fileName: document.fileName,
      mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
      applicationUserId: document.application.userId,
    };
  }

  return null;
}

export async function getFellowshipDocumentFile(documentId: string) {
  const document = await prisma.fellowshipDocument.findUnique({
    where: { id: documentId },
    include: { fellowship: { include: { application: { select: { userId: true } } } } },
  });

  if (!document) return null;

  if (document.fileData?.trim()) {
    return {
      data: decodeFileData(document.fileData),
      fileName: document.fileName,
      mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
      applicationUserId: document.fellowship.application.userId,
    };
  }

  const diskData = await readFileFromDisk(document.filePath);
  if (diskData) {
    const fileData = encodeFileData(diskData);
    await prisma.fellowshipDocument.update({
      where: { id: document.id },
      data: { fileData },
    }).catch(() => undefined);

    return {
      data: diskData,
      fileName: document.fileName,
      mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
      applicationUserId: document.fellowship.application.userId,
    };
  }

  return null;
}

export async function readStoredUpload(segments: string[]) {
  const record = await findStoredUploadByPath(segments);
  const fileName =
    record?.fileName ??
    normalizeUploadSegments(segments)[segments.length - 1] ??
    "file";

  if (record?.fileData?.trim()) {
    return {
      data: decodeFileData(record.fileData),
      fileName,
      mimeType: record.mimeType || mimeTypeFromFileName(fileName),
    };
  }

  const diskPath = resolveUploadDiskPath(normalizeUploadSegments(segments));
  if (!diskPath || !existsSync(diskPath)) return null;

  const data = await readFile(diskPath);
  return {
    data,
    fileName,
    mimeType: record?.mimeType || mimeTypeFromFileName(fileName),
  };
}
