import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { notifyDocumentReviewed } from "@/lib/notifications";

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

    const app = await prisma.application.findFirst({
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
      existingDoc.status !== "RESUBMIT_REQUIRED" &&
      app.status !== "DRAFT" &&
      app.status !== "SCRUTINY" &&
      app.status !== "SUBMITTED"
    ) {
      return NextResponse.json(
        { error: "Document cannot be replaced at this stage" },
        { status: 403 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", applicationId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${docType}_${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/${applicationId}/${fileName}`;

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

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId, status, rejectionReason } = await request.json();

    const document = await prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason,
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

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document review error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
