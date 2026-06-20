import { NextRequest, NextResponse } from "next/server";
import type { FellowshipDocType, FellowshipStage } from "@prisma/client";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { awardFellowship, releaseInstallment } from "@/lib/fellowship-service";
import { generateAndStoreFellowshipAgreement } from "@/lib/agreement-service";
import { getInstallmentRequirementStatus } from "@/lib/installment-gates";
import { notifyDocumentReviewed } from "@/lib/notifications";
import { BUDGET_MAX } from "@/lib/utils";

const ADMIN_UPLOAD_TYPES: FellowshipDocType[] = [
  "ACCEPTANCE_LETTER",
  "FELLOWSHIP_AGREEMENT",
  "BANK_VERIFICATION",
  "PROGRESS_REPORT",
  "UTILIZATION_STATEMENT",
  "FINAL_REPORT",
  "PUBLICATION_MANUSCRIPT",
  "UTILIZATION_CERTIFICATE",
];

const fellowshipDetailInclude = {
  installments: { orderBy: { installmentNo: "asc" as const } },
  fellowshipDocuments: { orderBy: [{ installmentNo: "asc" as const }, { uploadedAt: "desc" as const }] },
  financeRecords: true,
  progressReports: true,
  finalSubmission: true,
  application: {
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      userId: true,
      digitalUndertaking: { select: { id: true } },
    },
  },
};

function normalizeIfsc(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get("applicationId");
  const fellowshipId = request.nextUrl.searchParams.get("fellowshipId");

  if (!applicationId && !fellowshipId) {
    return NextResponse.json({ error: "applicationId or fellowshipId required" }, { status: 400 });
  }

  const fellowship = await prisma.fellowship.findFirst({
    where: applicationId ? { applicationId } : { id: fellowshipId! },
    include: fellowshipDetailInclude,
  });

  if (!fellowship) {
    return NextResponse.json({ fellowship: null });
  }

  const [inst1, inst2, inst3] = await Promise.all([
    getInstallmentRequirementStatus(fellowship, 1),
    getInstallmentRequirementStatus(fellowship, 2),
    getInstallmentRequirementStatus(fellowship, 3),
  ]);

  return NextResponse.json({
    fellowship,
    requirements: { 1: inst1, 2: inst2, 3: inst3 },
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fellowshipId = formData.get("fellowshipId") as string;
      const installmentNo = Number(formData.get("installmentNo") || 1);
      const docType = (formData.get("type") as FellowshipDocType) || "ACCEPTANCE_LETTER";
      const file = formData.get("file") as File;

      if (!fellowshipId || !file) {
        return NextResponse.json({ error: "Fellowship ID and file required" }, { status: 400 });
      }

      if (!ADMIN_UPLOAD_TYPES.includes(docType)) {
        return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
      }

      const fellowship = await prisma.fellowship.findUnique({ where: { id: fellowshipId } });
      if (!fellowship) {
        return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
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
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
        create: {
          fellowshipId,
          installmentNo,
          type: docType,
          fileName: file.name,
          filePath: relativePath,
          fileSize: file.size,
          mimeType: file.type,
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      });

      if (docType === "ACCEPTANCE_LETTER" || docType === "FELLOWSHIP_AGREEMENT") {
        await prisma.fellowship.update({
          where: { id: fellowshipId },
          data: { awardLetterPath: relativePath },
        });
      }

      if (docType === "BANK_VERIFICATION") {
        await prisma.fellowship.update({
          where: { id: fellowshipId },
          data: {
            bankVerifiedAt: fellowship.bankVerifiedAt ?? new Date(),
            currentStage:
              fellowship.currentStage === "BANK_VERIFICATION" ? "SANCTIONED" : fellowship.currentStage,
          },
        });
      }

      return NextResponse.json({ success: true, document });
    }

    return NextResponse.json({ error: "Use multipart form for file upload" }, { status: 400 });
  } catch (error) {
    console.error("Fellowship admin upload error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_fellowship") {
      const { applicationId, sanctionedAmount, duration = "12 months" } = body;
      if (!applicationId) {
        return NextResponse.json({ error: "applicationId required" }, { status: 400 });
      }

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { fellowship: true, budget: true },
      });

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      if (application.fellowship) {
        return NextResponse.json({ success: true, fellowship: application.fellowship });
      }

      const amount = Math.min(Number(sanctionedAmount) || application.budget?.total || BUDGET_MAX, BUDGET_MAX);
      const fellowship = await awardFellowship({
        applicationId,
        sanctionedAmount: amount,
        duration: String(duration),
      });

      return NextResponse.json({ success: true, fellowship });
    }

    if (action === "generate_agreement") {
      const { fellowshipId } = body;
      if (!fellowshipId) {
        return NextResponse.json({ error: "fellowshipId required" }, { status: 400 });
      }

      const result = await generateAndStoreFellowshipAgreement(fellowshipId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "update_bank") {
      const { fellowshipId, accountHolder, bankName, accountNumber, ifsc, branch } = body;
      if (!fellowshipId) {
        return NextResponse.json({ error: "fellowshipId required" }, { status: 400 });
      }

      const normalizedIfsc = normalizeIfsc(String(ifsc || ""));
      const accountDigits = String(accountNumber || "").replace(/\D/g, "");

      if (!accountHolder?.trim() || !bankName?.trim() || !normalizedIfsc) {
        return NextResponse.json({ error: "Account holder, bank name, and IFSC are required" }, { status: 400 });
      }

      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
        return NextResponse.json({ error: "Invalid IFSC code" }, { status: 400 });
      }

      if (accountDigits.length < 9 || accountDigits.length > 18) {
        return NextResponse.json({ error: "Account number must be 9–18 digits" }, { status: 400 });
      }

      const fellowship = await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: {
          bankAccountHolder: String(accountHolder).trim(),
          bankName: String(bankName).trim(),
          bankAccountNumber: accountDigits,
          bankIfsc: normalizedIfsc,
          bankBranch: branch?.trim() || null,
          bankSubmittedAt: new Date(),
          bankVerifiedAt: null,
          currentStage: "BANK_VERIFICATION",
        },
      });

      return NextResponse.json({ success: true, fellowship });
    }

    if (action === "verify_bank") {
      const { fellowshipId } = body;
      if (!fellowshipId) {
        return NextResponse.json({ error: "fellowshipId required" }, { status: 400 });
      }

      const fellowship = await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: {
          bankVerifiedAt: new Date(),
          bankVerificationStatus: "APPROVED",
          currentStage: "SANCTIONED",
        },
      });

      return NextResponse.json({ success: true, fellowship });
    }

    if (action === "update_stage") {
      const { fellowshipId, stage } = body as { fellowshipId: string; stage: FellowshipStage };
      if (!fellowshipId || !stage) {
        return NextResponse.json({ error: "fellowshipId and stage required" }, { status: 400 });
      }

      const fellowship = await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: { currentStage: stage, isCompleted: stage === "COMPLETED" },
      });

      return NextResponse.json({ success: true, fellowship });
    }

    if (action === "approve_document") {
      const { documentId, status = "APPROVED", rejectionReason } = body;

      if (!documentId) {
        return NextResponse.json({ error: "documentId required" }, { status: 400 });
      }

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
    }

    if (action === "release_installment") {
      const { installmentId, transactionId, approvalNotes } = body;
      if (!installmentId) {
        return NextResponse.json({ error: "installmentId required" }, { status: 400 });
      }

      const updated = await releaseInstallment({
        installmentId,
        transactionId,
        approvalNotes,
        reviewerId: user.id,
      });

      return NextResponse.json({ success: true, installment: updated });
    }

    const { fellowshipId, progressScore, remarks } = body;

    if (!fellowshipId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      include: { finalSubmission: true },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    if (action === "mid_term_approve") {
      const review = await prisma.midTermReview.create({
        data: {
          fellowshipId,
          reviewerId: user.id,
          progressScore: Number(progressScore) || 0,
          remarks: remarks || null,
          nextInstallmentApproved: true,
        },
      });

      await prisma.fundInstallment.updateMany({
        where: { fellowshipId, installmentNo: 2, status: "PENDING" },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({ success: true, review });
    }

    if (action === "final_approve") {
      if (!fellowship.finalSubmission) {
        return NextResponse.json({ error: "No final submission on record" }, { status: 400 });
      }

      await prisma.finalSubmission.update({
        where: { fellowshipId },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });

      await prisma.fundInstallment.updateMany({
        where: { fellowshipId, installmentNo: 3, status: "PENDING" },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update fellowship";
    console.error("Fellowship admin error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
