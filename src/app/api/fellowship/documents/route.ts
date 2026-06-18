import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { FellowshipDocType } from "@prisma/client";
import { getInstallmentRequirementStatus } from "@/lib/installment-gates";
import { canReplaceFellowshipDocument } from "@/lib/document-review";
import { notifyDocumentReviewed } from "@/lib/notifications";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const FELLOW_UPLOAD_TYPES: FellowshipDocType[] = [
  "BANK_VERIFICATION",
  "PROGRESS_REPORT",
  "UTILIZATION_STATEMENT",
  "FINAL_REPORT",
  "PUBLICATION_MANUSCRIPT",
  "UTILIZATION_CERTIFICATE",
];

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fellowshipId = searchParams.get("fellowshipId");
  const installmentNo = Number(searchParams.get("installmentNo") || 0);

  if (!fellowshipId) {
    return NextResponse.json({ error: "fellowshipId required" }, { status: 400 });
  }

  const fellowship = await prisma.fellowship.findFirst({
    where: {
      id: fellowshipId,
      ...(user.role === "APPLICANT" ? { application: { userId: user.id } } : {}),
    },
    include: {
      fellowshipDocuments: true,
      progressReports: true,
      finalSubmission: true,
      application: { include: { digitalUndertaking: true } },
    },
  });

  if (!fellowship) {
    return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
  }

  const requirements =
    installmentNo > 0
      ? await getInstallmentRequirementStatus(fellowship, installmentNo)
      : [];

  return NextResponse.json({
    documents: fellowship.fellowshipDocuments,
    requirements,
    digitalUndertaking: fellowship.application.digitalUndertaking,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const fellowshipId = formData.get("fellowshipId") as string;
    const installmentNo = Number(formData.get("installmentNo"));
    const docType = formData.get("type") as FellowshipDocType;
    const file = formData.get("file") as File;

    if (!fellowshipId || !installmentNo || !docType || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!FELLOW_UPLOAD_TYPES.includes(docType)) {
      return NextResponse.json({ error: "Invalid document type for fellow upload" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be 10 MB or smaller" }, { status: 400 });
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PDF or image files allowed" }, { status: 400 });
    }

    const isStaff = ["ADMIN", "STAFF", "FINANCE"].includes(user.role);

    const fellowship = await prisma.fellowship.findFirst({
      where: {
        id: fellowshipId,
        ...(user.role === "APPLICANT" ? { application: { userId: user.id } } : {}),
      },
      include: { application: { select: { userId: true } } },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    const existingDoc = await prisma.fellowshipDocument.findUnique({
      where: {
        fellowshipId_installmentNo_type: {
          fellowshipId,
          installmentNo,
          type: docType,
        },
      },
    });

    if (
      !isStaff &&
      existingDoc &&
      !canReplaceFellowshipDocument({ existingStatus: existingDoc.status, isStaff: false })
    ) {
      return NextResponse.json(
        {
          error:
            existingDoc.status === "APPROVED"
              ? "Document is approved and cannot be replaced"
              : existingDoc.status === "PENDING"
                ? "Document is awaiting review. You will be notified if resubmission is required."
                : "Document cannot be replaced at this stage",
        },
        { status: 403 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "fellowships",
      fellowshipId,
      `inst${installmentNo}`
    );
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${docType}_${Date.now()}_${file.name}`;
    const fullPath = path.join(uploadDir, fileName);
    await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
    const relativePath = `/uploads/fellowships/${fellowshipId}/inst${installmentNo}/${fileName}`;

    const document = await prisma.fellowshipDocument.upsert({
      where: {
        fellowshipId_installmentNo_type: {
          fellowshipId,
          installmentNo,
          type: docType,
        },
      },
      update: {
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.type,
        status: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      create: {
        fellowshipId,
        installmentNo,
        type: docType,
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Fellowship document upload error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "FINANCE"].includes(user.role)) {
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

    const document = await prisma.fellowshipDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: rejectionReason?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: { fellowship: { include: { application: true } } },
    });

    if (status === "APPROVED" && document.type === "BANK_VERIFICATION") {
      await prisma.fellowship.update({
        where: { id: document.fellowshipId },
        data: {
          bankVerifiedAt: new Date(),
          currentStage:
            document.fellowship.currentStage === "BANK_VERIFICATION"
              ? "SANCTIONED"
              : document.fellowship.currentStage,
        },
      });
    }

    if (
      (status === "REJECTED" || status === "RESUBMIT_REQUIRED") &&
      document.type === "BANK_VERIFICATION"
    ) {
      await prisma.fellowship.update({
        where: { id: document.fellowshipId },
        data: { bankVerifiedAt: null },
      });
    }

    await notifyDocumentReviewed(
      document.fellowship.application.userId,
      document.type,
      status,
      rejectionReason?.trim()
    );

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Fellowship document review error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
