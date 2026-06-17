import type { ApplicationStatus, DocumentStatus } from "@prisma/client";

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

export const TRACKING_PIPELINE: TrackingStage[] = [
  {
    key: "submitted",
    label: "Submitted",
    description: "Application received by the foundation",
    statuses: ["SUBMITTED"],
  },
  {
    key: "scrutiny",
    label: "Administrative Scrutiny",
    description: "Details and documents are being verified",
    statuses: ["SCRUTINY"],
  },
  {
    key: "scrutiny_approved",
    label: "Scrutiny Cleared",
    description: "All details and documents approved",
    statuses: ["SCRUTINY_APPROVED"],
  },
  {
    key: "committee",
    label: "Committee Review",
    description: "Review committee is evaluating your proposal",
    statuses: ["UNDER_REVIEW"],
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    description: "Your application is on the shortlist",
    statuses: ["SHORTLISTED", "WAITLISTED"],
  },
  {
    key: "interview",
    label: "Interview",
    description: "Interview round scheduled or completed",
    statuses: ["INTERVIEW_SCHEDULED"],
  },
  {
    key: "selected",
    label: "Final Selection",
    description: "Fellowship award decision",
    statuses: ["SELECTED"],
  },
];

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
  if (status === "REJECTED") return -1;
  if (status === "DRAFT") return -2;

  for (let i = TRACKING_PIPELINE.length - 1; i >= 0; i--) {
    if (TRACKING_PIPELINE[i].statuses.includes(status)) return i;
  }
  return 0;
}

export function getPipelineProgress(status: ApplicationStatus): number {
  if (status === "REJECTED" || status === "DRAFT") return 0;
  const index = getPipelineIndex(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / TRACKING_PIPELINE.length) * 100);
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
    return { ok: false, reason: "Application must be in Scrutiny stage" };
  }
  if (documents.length === 0) {
    return { ok: false, reason: "No documents uploaded yet" };
  }
  if (!allDocumentsApproved(documents)) {
    return {
      ok: false,
      reason: "Approve or request resubmission for every document before final scrutiny approval",
    };
  }
  return { ok: true };
}

const ALLOWED_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ["SCRUTINY", "REJECTED"],
  SCRUTINY: ["SCRUTINY_APPROVED", "REJECTED"],
  SCRUTINY_APPROVED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED", "WAITLISTED"],
  SHORTLISTED: ["INTERVIEW_SCHEDULED", "SELECTED", "REJECTED", "WAITLISTED"],
  WAITLISTED: ["SHORTLISTED", "SELECTED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["SELECTED", "REJECTED", "WAITLISTED"],
};

export function validateStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  documents: TrackingDocument[]
): string | null {
  if (from === to) return "Application is already in this status";

  if (to === "SCRUTINY_APPROVED") {
    const check = canApproveScrutiny(from, documents);
    if (!check.ok) return check.reason ?? "Cannot approve scrutiny";
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    return `Cannot move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`;
  }

  if (to === "UNDER_REVIEW" && from !== "SCRUTINY_APPROVED") {
    return "Scrutiny must be approved before committee review";
  }

  return null;
}

export function getNextActions(status: ApplicationStatus): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
