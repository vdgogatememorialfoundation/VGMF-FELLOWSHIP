import type { ApplicationStatus, DocumentStatus } from "@prisma/client";
import {
  APPLICANT_MILESTONES,
  ALLOWED_TRANSITIONS,
  ADMIN_ACTION_LABELS,
  getMilestoneIndex,
  getMilestoneProgress,
  getMilestoneStates,
  getLifecycleStatusLabel,
  getLifecycleStatusColor,
  getAdminPhase,
} from "./lifecycle-workflow";

export type TrackingDocument = {
  id: string;
  type: string;
  status: DocumentStatus | string;
  fileName: string;
  filePath: string;
  rejectionReason?: string | null;
};

export type TrackingStage = {
  key: string;
  label: string;
  description: string;
  statuses: ApplicationStatus[];
};

/** @deprecated Use APPLICANT_MILESTONES — kept for backward compatibility */
export const TRACKING_PIPELINE: TrackingStage[] = APPLICANT_MILESTONES.map((m) => ({
  key: m.key,
  label: m.label,
  description: m.description,
  statuses: m.statuses,
}));

export {
  APPLICANT_MILESTONES,
  ADMIN_ACTION_LABELS,
  getMilestoneStates,
  getMilestoneIndex,
  getMilestoneProgress,
  getLifecycleStatusLabel,
  getLifecycleStatusColor,
  getAdminPhase,
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NCISM_REGISTRATION: "NCISM Registration Certificate",
  CV: "Curriculum Vitae",
  REGISTRATION_CERTIFICATE: "Registration Certificate",
  RESEARCH_PROPOSAL_PDF: "Research Proposal",
  BUDGET_PROPOSAL_PDF: "Budget Proposal",
  TIMELINE_PDF: "Timeline",
  ETHICAL_CLEARANCE: "Ethical Clearance",
  PUBLICATIONS: "Publications",
  RECOMMENDATION_LETTER: "Recommendation Letter",
};

export function getDocumentLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function getPipelineIndex(status: ApplicationStatus): number {
  return getMilestoneIndex(status);
}

export function getPipelineProgress(status: ApplicationStatus): number {
  return getMilestoneProgress(status);
}

export function allDocumentsApproved(documents: TrackingDocument[]): boolean {
  if (documents.length === 0) return false;
  return documents.every((doc) => doc.status === "APPROVED");
}

export function hasDocumentsPendingAction(documents: TrackingDocument[]): boolean {
  return documents.some(
    (doc) => doc.status === "PENDING" || doc.status === "RESUBMIT_REQUIRED"
  );
}

export function canApproveScrutiny(
  status: ApplicationStatus,
  documents: TrackingDocument[]
): { ok: boolean; reason?: string } {
  if (status !== "SCRUTINY") {
    return { ok: false, reason: "Application must be in Document Verification stage" };
  }
  if (documents.length === 0) {
    return { ok: false, reason: "No documents uploaded yet" };
  }
  if (!allDocumentsApproved(documents)) {
    return {
      ok: false,
      reason: "Approve or request resubmission for every document before marking verified",
    };
  }
  return { ok: true };
}

export function validateStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  documents: TrackingDocument[]
): string | null {
  if (from === to) return "Application is already in this status";

  if (to === "SCRUTINY_APPROVED") {
    const check = canApproveScrutiny(from, documents);
    if (!check.ok) return check.reason ?? "Cannot verify documents";
  }

  if (to === "QUERY_RESPONDED" && from !== "QUERY_RAISED") {
    return "Can only mark responded when a query is raised";
  }

  if (to === "COMPLETED") {
    return "Application is marked completed only when the fellowship reaches final closure (Installment 3 released)";
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    return `Cannot move from ${getLifecycleStatusLabel(from)} to ${getLifecycleStatusLabel(to)}`;
  }

  return null;
}

export function getNextActions(status: ApplicationStatus): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
