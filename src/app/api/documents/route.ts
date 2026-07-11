import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyDocumentReviewed } from "@/lib/notifications";
import { canReplaceApplicationDocument } from "@/lib/document-review";
import {
  isIdentityOnlineAvailable,
  isManualIdentityDocumentType,
  syncManualIdentityVerification,
} from "@/lib/manual-verification";
import {
  persistUpload,
  resolveApplicationStoredFileName,
  mapApplicationDocumentForClient,
  getApplicationDocumentFile,
} from "@/lib/upload-files";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const applicationId = formData.get("applicationId") as string;
    const docType = formData.get("type") as string;
    const file = formData.get("file") as File;

    if (!applicationId || !docType || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: "File must be 5 MB or smaller" }, { status: 400 });
    }

    if (file.type && !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF or image files are allowed" },
        { status: 400 }
      );
    }

    const isStaff = ["ADMIN", "STAFF", "COADMIN"].includes(user.role);

    const app = isStaff
      ? await prisma.application.findUnique({ where: { id: applicationId } })
      : await prisma.application.findFirst({
          where: { id: applicationId, userId: user.id },
        });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const existingDoc = await prisma.applicationDocument.findFirst({
      where: { applicationId, type: docType as never },
    });

    if (
      existingDoc &&
      !canReplaceApplicationDocument({
        existingStatus: existingDoc.status,
        applicationStatus: app.status,
        isStaff,
      })
    ) {
      return NextResponse.json(
        {
          error:
            existingDoc.status === "APPROVED"
              ? "Document is approved. Mark as Rejected or Resubmit Required before replacing."
              : "Document cannot be replaced at this stage",
        },
        { status: 403 }
      );
    }

    const fileName = resolveApplicationStoredFileName({
      docType,
      originalFileName: file.name,
      existingFilePath: existingDoc?.filePath,
    });
    const relativePath = `/uploads/${applicationId}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await persistUpload(relativePath, buffer, file.type);

    const document = existingDoc
      ? await prisma.applicationDocument.update({
          where: { id: existingDoc.id },
          data: {
            fileName: file.name,
            filePath: relativePath,
            fileSize: file.size,
            mimeType: file.type,
            status: "PENDING",
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        })
      : await prisma.applicationDocument.create({
          data: {
            applicationId,
            type: docType as never,
            fileName: file.name,
            filePath: relativePath,
            fileSize: file.size,
            mimeType: file.type,
          },
        });

    if (
      isManualIdentityDocumentType(docType) &&
      !(await isIdentityOnlineAvailable())
    ) {
      await syncManualIdentityVerification(applicationId);
    }

    const verified = await getApplicationDocumentFile(document.id);
    if (!verified) {
      console.error("Upload verification failed", {
        documentId: document.id,
        applicationId,
        docType,
        relativePath,
      });
      return NextResponse.json(
        {
          error:
            "Upload could not be verified. Please try again with a PDF or image under 5 MB.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: mapApplicationDocumentForClient(document),
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json(
      {
        error: "Failed to upload document",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId, status, rejectionReason } = await request.json();

    if (!["APPROVED", "REJECTED", "RESUBMIT_REQUIRED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid document status" }, { status: 400 });
    }

    if (
      (status === "REJECTED" || status === "RESUBMIT_REQUIRED") &&
      !rejectionReason?.trim()
    ) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting or requesting resubmission" },
        { status: 400 }
      );
    }

    const document = await prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: rejectionReason?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: { application: true },
    });

    await notifyDocumentReviewed(
      document.application.userId,
      document.type,
      status,
      rejectionReason
    );

    if (
      isManualIdentityDocumentType(document.type) &&
      !(await isIdentityOnlineAvailable())
    ) {
      await syncManualIdentityVerification(document.applicationId);
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document review error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
