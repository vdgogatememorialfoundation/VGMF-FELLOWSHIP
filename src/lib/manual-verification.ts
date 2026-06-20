import type { DocumentStatus, VerificationStatus } from "@prisma/client";
import prisma from "./db";
import { isDigioBankConfigured, isDigioIdentityConfigured } from "./digio";

export const MANUAL_IDENTITY_DOCUMENT_TYPES = ["GOVERNMENT_ID", "IDENTITY_SELFIE"] as const;

export type ManualIdentityDocumentType = (typeof MANUAL_IDENTITY_DOCUMENT_TYPES)[number];

export function isManualIdentityDocumentType(type: string): type is ManualIdentityDocumentType {
  return (MANUAL_IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(type);
}

export async function isDigioIdentityAvailable(): Promise<boolean> {
  return isDigioIdentityConfigured();
}

export async function isDigioBankAvailable(): Promise<boolean> {
  return isDigioBankConfigured();
}

export function getManualIdentityDocumentLabel(type: string): string {
  switch (type) {
    case "GOVERNMENT_ID":
      return "Government ID (Aadhaar / PAN / Passport)";
    case "IDENTITY_SELFIE":
      return "Recent photo / selfie with ID";
    default:
      return type.replace(/_/g, " ");
  }
}

export function deriveManualIdentityStatus(input: {
  currentStatus: VerificationStatus;
  documents: Array<{ type: string; status: DocumentStatus }>;
  submittedForReview: boolean;
}): VerificationStatus {
  const identityDocs = input.documents.filter((doc) =>
    isManualIdentityDocumentType(doc.type)
  );

  if (identityDocs.length === 0) {
    return input.currentStatus === "APPROVED" ? "APPROVED" : "NOT_STARTED";
  }

  if (identityDocs.some((doc) => doc.status === "REJECTED")) {
    return "DECLINED";
  }

  if (identityDocs.some((doc) => doc.status === "RESUBMIT_REQUIRED")) {
    return "DECLINED";
  }

  if (
    identityDocs.length >= MANUAL_IDENTITY_DOCUMENT_TYPES.length &&
    identityDocs.every((doc) => doc.status === "APPROVED")
  ) {
    return "APPROVED";
  }

  if (input.submittedForReview || input.currentStatus === "IN_REVIEW") {
    return "IN_REVIEW";
  }

  if (identityDocs.some((doc) => doc.status === "PENDING")) {
    return "IN_PROGRESS";
  }

  return input.currentStatus;
}

export async function syncManualIdentityVerification(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { documents: true },
  });

  if (!application) return null;

  const identityDocs = application.documents.filter((doc) =>
    isManualIdentityDocumentType(doc.type)
  );

  const submittedForReview = ["IN_REVIEW", "APPROVED", "DECLINED"].includes(
    application.identityVerificationStatus
  );

  const nextStatus = deriveManualIdentityStatus({
    currentStatus: application.identityVerificationStatus,
    documents: identityDocs,
    submittedForReview,
  });

  const now = new Date();

  return prisma.application.update({
    where: { id: applicationId },
    data: {
      identityVerificationStatus: nextStatus,
      identityVerifiedAt:
        nextStatus === "APPROVED" ? application.identityVerifiedAt ?? now : null,
    },
  });
}

export async function syncManualBankVerification(fellowshipId: string) {
  const fellowship = await prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    include: {
      fellowshipDocuments: {
        where: { type: "BANK_VERIFICATION" },
        orderBy: { uploadedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!fellowship) return null;

  const bankDoc = fellowship.fellowshipDocuments[0];
  const now = new Date();
  let bankVerificationStatus: VerificationStatus = fellowship.bankVerificationStatus;
  let bankVerifiedAt = fellowship.bankVerifiedAt;
  let currentStage = fellowship.currentStage;

  if (bankDoc?.status === "APPROVED") {
    bankVerificationStatus = "APPROVED";
    bankVerifiedAt = bankVerifiedAt ?? now;
    if (currentStage === "BANK_VERIFICATION") {
      currentStage = "SANCTIONED";
    }
  } else if (
    bankDoc &&
    (bankDoc.status === "REJECTED" || bankDoc.status === "RESUBMIT_REQUIRED")
  ) {
    bankVerificationStatus = "DECLINED";
    bankVerifiedAt = null;
  } else if (fellowship.bankSubmittedAt && bankDoc?.status === "PENDING") {
    bankVerificationStatus = "IN_REVIEW";
    bankVerifiedAt = null;
  } else if (fellowship.bankSubmittedAt) {
    bankVerificationStatus = "IN_PROGRESS";
    bankVerifiedAt = null;
  }

  return prisma.fellowship.update({
    where: { id: fellowshipId },
    data: {
      bankVerificationStatus,
      bankVerifiedAt,
      currentStage,
    },
  });
}
