import type { DocumentStatus } from "@prisma/client";

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESUBMIT_REQUIRED: "Resubmit Required",
};

export function getDocumentStatusLabel(status: string): string {
  return DOCUMENT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function canApplicantReuploadDocument(status?: string | null): boolean {
  return status === "REJECTED" || status === "RESUBMIT_REQUIRED";
}

export function canReplaceApplicationDocument(params: {
  existingStatus?: string | null;
  applicationStatus: string;
  isStaff: boolean;
}): boolean {
  if (params.isStaff) return true;
  if (canApplicantReuploadDocument(params.existingStatus)) return true;
  if (!params.existingStatus || params.existingStatus === "PENDING") {
    return ["DRAFT", "SCRUTINY", "SUBMITTED", "QUERY_RAISED", "QUERY_RESPONDED"].includes(
      params.applicationStatus
    );
  }
  return false;
}

export function canReplaceFellowshipDocument(params: {
  existingStatus?: string | null;
  isStaff: boolean;
}): boolean {
  if (params.isStaff) return true;
  if (!params.existingStatus) return true;
  if (canApplicantReuploadDocument(params.existingStatus)) return true;
  return false;
}

export function documentNeedsAction(status?: string | null): boolean {
  return status === "REJECTED" || status === "RESUBMIT_REQUIRED" || status === "PENDING";
}

export function documentBorderClass(status: string): string {
  if (status === "RESUBMIT_REQUIRED") return "border-orange-200 bg-orange-50";
  if (status === "REJECTED") return "border-red-200 bg-red-50";
  if (status === "APPROVED") return "border-green-200 bg-green-50/40";
  return "";
}

export type ReviewDocumentPayload = {
  documentId: string;
  status: DocumentStatus;
  rejectionReason?: string;
};
