import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "./db";
import type { SessionUser } from "./auth";
import {
  filePathToR2Key,
  findLatestR2ObjectByPrefix,
  getR2Object,
  isR2Configured,
  putR2Object,
} from "./r2-storage";

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "COADMIN", "TRUSTEE", "COMMITTEE", "FINANCE"]);

export function isObjectStorageConfigured(): boolean {
  return isR2Configured();
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
  const existingPath = input.existingFilePath?.trim();
  if (existingPath && (existingPath.includes("/uploads/") || existingPath.startsWith("uploads/"))) {
    const existing = existingPath.split("/").pop();
    if (existing && existing !== "file") return existing;
  }

  const safeName = input.originalFileName.replace(/[^\w.\-() ]+/g, "_").trim() || "upload";
  return `${input.docType}_${Date.now()}_${safeName}`;
}

/** Normalize DB `filePath` values to `/uploads/...` storage paths. */
export function normalizeStoragePath(filePath: string | null | undefined): string | null {
  const trimmed = filePath?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/uploads/")) return trimmed;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  return null;
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

/** Write bytes to Cloudflare R2 (production) and local disk (dev fallback). */
export async function writeStoredUpload(
  relativePath: string,
  buffer: Buffer,
  mimeType?: string | null
): Promise<void> {
  if (isR2Configured()) {
    await putR2Object(filePathToR2Key(relativePath), buffer, mimeType);
    return;
  }

  await writeUploadToDisk(relativePath, buffer);
}

/** Read bytes from R2, then local disk. */
export async function readStoredUploadBytes(relativePath: string): Promise<Buffer | null> {
  const storagePath = normalizeStoragePath(relativePath) ?? relativePath;

  if (isR2Configured()) {
    const fromR2 = await getR2Object(filePathToR2Key(storagePath));
    if (fromR2) return fromR2;
  }

  return readFileFromDisk(storagePath);
}

const MAX_DB_FILE_BYTES = 10 * 1024 * 1024;

/** Keep a PostgreSQL copy for fallback even when R2 is configured. */


async function backfillR2FromBuffer(
  storagePath: string,
  buffer: Buffer,
  mimeType?: string | null
): Promise<void> {
  if (!isR2Configured()) return;
  const normalized = normalizeStoragePath(storagePath);
  if (!normalized) return;
  try {
    await putR2Object(filePathToR2Key(normalized), buffer, mimeType);
  } catch (error) {
    console.error("R2 backfill failed:", normalized, error);
  }
}

export async function persistUpload(
  relativePath: string,
  buffer: Buffer,
  mimeType?: string | null
): Promise<void> {
  let storageError: unknown;

  try {
    if (isR2Configured()) {
      await putR2Object(filePathToR2Key(relativePath), buffer, mimeType);
    } else {
      await writeUploadToDisk(relativePath, buffer);
    }
  } catch (error) {
    storageError = error;
    console.error("Primary storage write failed:", relativePath, error);
  }

  if (storageError) {
    throw storageError instanceof Error ? storageError : new Error("Failed to store upload");
  }
}

function buildApplicationDocumentStorageCandidates(document: {
  filePath: string;
  applicationId: string;
}): string[] {
  const candidates: string[] = [];
  const add = (value: string | null | undefined) => {
    const normalized = value ? normalizeStoragePath(value) : null;
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(document.filePath);
  const embedded = document.filePath.match(/(\/?uploads\/[^\s?#]+)/i)?.[1];
  add(embedded ?? null);

  return candidates;
}

async function repairApplicationDocumentStorage(
  documentId: string,
  storagePath: string,
  buffer: Buffer,
  mimeType?: string | null
): Promise<void> {
  const normalized = normalizeStoragePath(storagePath) ?? storagePath;
  const fileData = prepareFileDataForStorage(buffer);

  await prisma.applicationDocument
    .update({
      where: { id: documentId },
      data: {
        filePath: normalized,
        ...(fileData ? { fileData } : {}),
      },
    })
    .catch((error) => console.error("Document storage repair failed:", documentId, error));

  void backfillR2FromBuffer(normalized, buffer, mimeType);
}

async function loadApplicationDocumentBytes(document: {
  id: string;
  applicationId: string;
  type: string;
  filePath: string;
  fileData: string | null;
  mimeType: string;
}): Promise<Buffer | null> {
  if (document.fileData?.trim()) {
    return decodeFileData(document.fileData);
  }

  for (const storagePath of buildApplicationDocumentStorageCandidates(document)) {
    const bytes = await readStoredUploadBytes(storagePath);
    if (bytes) {
      void repairApplicationDocumentStorage(
        document.id,
        storagePath,
        bytes,
        document.mimeType
      );
      return bytes;
    }
  }

  if (isR2Configured()) {
    const match = await findLatestR2ObjectByPrefix(
      `uploads/${document.applicationId}/${document.type}_`
    );
    if (match) {
      void repairApplicationDocumentStorage(
        document.id,
        `/${match.key}`,
        match.body,
        document.mimeType
      );
      return match.body;
    }
  }

  return null;
}

function buildFellowshipDocumentStorageCandidates(document: {
  filePath: string;
  fellowshipId: string;
  type: string;
  installmentNo: number;
}): string[] {
  const candidates: string[] = [];
  const add = (value: string | null | undefined) => {
    const normalized = value ? normalizeStoragePath(value) : null;
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(document.filePath);
  const embedded = document.filePath.match(/(\/?uploads\/[^\s?#]+)/i)?.[1];
  add(embedded ?? null);

  return candidates;
}

async function repairFellowshipDocumentStorage(
  documentId: string,
  storagePath: string,
  buffer: Buffer,
  mimeType?: string | null
): Promise<void> {
  const normalized = normalizeStoragePath(storagePath) ?? storagePath;
  const fileData = prepareFileDataForStorage(buffer);

  await prisma.fellowshipDocument
    .update({
      where: { id: documentId },
      data: {
        filePath: normalized,
        ...(fileData ? { fileData } : {}),
      },
    })
    .catch((error) => console.error("Fellowship storage repair failed:", documentId, error));

  void backfillR2FromBuffer(normalized, buffer, mimeType);
}

async function loadFellowshipDocumentBytes(document: {
  id: string;
  fellowshipId: string;
  type: string;
  installmentNo: number;
  filePath: string;
  fileData: string | null;
  mimeType: string;
}): Promise<Buffer | null> {
  if (document.fileData?.trim()) {
    return decodeFileData(document.fileData);
  }

  for (const storagePath of buildFellowshipDocumentStorageCandidates(document)) {
    const bytes = await readStoredUploadBytes(storagePath);
    if (bytes) {
      void repairFellowshipDocumentStorage(document.id, storagePath, bytes, document.mimeType);
      return bytes;
    }
  }

  if (isR2Configured()) {
    const match = await findLatestR2ObjectByPrefix(
      `uploads/fellowships/${document.fellowshipId}/inst${document.installmentNo}/${document.type}_`
    );
    if (match) {
      void repairFellowshipDocumentStorage(
        document.id,
        `/${match.key}`,
        match.body,
        document.mimeType
      );
      return match.body;
    }
  }

  return null;
}

function resolveDocumentStoragePath(filePath: string): string | null {
  return normalizeStoragePath(filePath);
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
      select: { mimeType: true, fileName: true, filePath: true },
    });
    if (applicationDoc) return applicationDoc;

    const fellowshipDoc = await prisma.fellowshipDocument.findFirst({
      where: { filePath: storedPath },
      select: { mimeType: true, fileName: true, filePath: true },
    });
    if (fellowshipDoc) return fellowshipDoc;

    const progressReport = await prisma.progressReport.findFirst({
      where: { reportPath: storedPath },
      select: { reportPath: true },
    });
    if (progressReport) {
      return {
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
      return {
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
        select: { mimeType: true, fileName: true, filePath: true },
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

  const data = await loadApplicationDocumentBytes(document);
  if (!data) {
    console.error("Application document bytes missing", {
      documentId,
      applicationId: document.applicationId,
      type: document.type,
      filePath: document.filePath,
      hasFileData: Boolean(document.fileData?.trim()),
      r2Configured: isR2Configured(),
    });
    return null;
  }

  return {
    data,
    fileName: document.fileName,
    mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
    applicationUserId: document.application.userId,
  };
}

export async function getFellowshipDocumentFile(documentId: string) {
  const document = await prisma.fellowshipDocument.findUnique({
    where: { id: documentId },
    include: { fellowship: { include: { application: { select: { userId: true } } } } },
  });

  if (!document) return null;

  const data = await loadFellowshipDocumentBytes(document);
  if (!data) {
    console.error("Fellowship document bytes missing", {
      documentId,
      fellowshipId: document.fellowshipId,
      type: document.type,
      filePath: document.filePath,
      hasFileData: Boolean(document.fileData?.trim()),
      r2Configured: isR2Configured(),
    });
    return null;
  }

  return {
    data,
    fileName: document.fileName,
    mimeType: document.mimeType || mimeTypeFromFileName(document.fileName),
    applicationUserId: document.fellowship.application.userId,
  };
}

export async function readStoredUpload(segments: string[]) {
  const record = await findStoredUploadByPath(segments);
  const fileName =
    record?.fileName ??
    normalizeUploadSegments(segments)[segments.length - 1] ??
    "file";


  if (record?.filePath) {
    const storagePath = normalizeStoragePath(record.filePath);
    if (storagePath) {
      const storedBytes = await readStoredUploadBytes(storagePath);
      if (storedBytes) {
        return {
          data: storedBytes,
          fileName,
          mimeType: record.mimeType || mimeTypeFromFileName(fileName),
        };
      }
    }
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
