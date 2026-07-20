import type { ApplicationStatus, FellowshipStage } from "@prisma/client";
import { getFellowshipStepProgress } from "./fellowship-tracking";

// ============================================
// APPLICANT PUBLIC STATUS SYSTEM
// ============================================

export type ApplicantPublicStatus = 
  | "APPLICATION_SUBMITTED"
  | "DOCUMENTS_UNDER_VERIFICATION"
  | "ELIGIBILITY_ASSESSMENT"
  | "PROPOSAL_UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_COMPLETED"
  | "FINAL_DECISION_PENDING"
  | "SELECTED"
  | "WAITLISTED"
  | "NOT_SELECTED"
  | "FELLOWSHIP_ACCEPTED"
  | "AGREEMENT_SUBMITTED"
  | "ETHICS_APPROVAL_PENDING"
  | "FIRST_INSTALLMENT_RELEASED"
  | "PROGRESS_REPORT_DUE"
  | "MID_TERM_REVIEW"
  | "SECOND_INSTALLMENT_RELEASED"
  | "FINAL_REPORT_SUBMITTED"
  | "FELLOWSHIP_COMPLETED";

export const PUBLIC_STATUS_LABELS: Record<ApplicantPublicStatus, string> = {
  APPLICATION_SUBMITTED: "Application Submitted",
  DOCUMENTS_UNDER_VERIFICATION: "Documents Under Verification",
  ELIGIBILITY_ASSESSMENT: "Eligibility Assessment",
  PROPOSAL_UNDER_REVIEW: "Research Proposal Under Expert Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  FINAL_DECISION_PENDING: "Final Decision Pending",
  SELECTED: "Selected",
  WAITLISTED: "Waitlisted",
  NOT_SELECTED: "Not Selected",
  FELLOWSHIP_ACCEPTED: "Fellowship Accepted",
  AGREEMENT_SUBMITTED: "Agreement Submitted",
  ETHICS_APPROVAL_PENDING: "Ethics Approval Pending",
  FIRST_INSTALLMENT_RELEASED: "First Installment Released",
  PROGRESS_REPORT_DUE: "Progress Report Due",
  MID_TERM_REVIEW: "Mid-Term Review",
  SECOND_INSTALLMENT_RELEASED: "Second Installment Released",
  FINAL_REPORT_SUBMITTED: "Final Report Submitted",
  FELLOWSHIP_COMPLETED: "Fellowship Completed",
};

export const PUBLIC_STATUS_COLORS: Record<ApplicantPublicStatus, string> = {
  APPLICATION_SUBMITTED: "bg-blue-100 text-blue-800",
  DOCUMENTS_UNDER_VERIFICATION: "bg-amber-100 text-amber-800",
  ELIGIBILITY_ASSESSMENT: "bg-cyan-100 text-cyan-800",
  PROPOSAL_UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  SHORTLISTED: "bg-purple-100 text-purple-800",
  INTERVIEW_SCHEDULED: "bg-indigo-100 text-indigo-800",
  INTERVIEW_COMPLETED: "bg-violet-100 text-violet-800",
  FINAL_DECISION_PENDING: "bg-fuchsia-100 text-fuchsia-800",
  SELECTED: "bg-green-100 text-green-800",
  WAITLISTED: "bg-orange-100 text-orange-800",
  NOT_SELECTED: "bg-red-100 text-red-800",
  FELLOWSHIP_ACCEPTED: "bg-emerald-100 text-emerald-800",
  AGREEMENT_SUBMITTED: "bg-teal-100 text-teal-800",
  ETHICS_APPROVAL_PENDING: "bg-lime-100 text-lime-800",
  FIRST_INSTALLMENT_RELEASED: "bg-green-100 text-green-800",
  PROGRESS_REPORT_DUE: "bg-amber-100 text-amber-800",
  MID_TERM_REVIEW: "bg-yellow-100 text-yellow-800",
  SECOND_INSTALLMENT_RELEASED: "bg-green-100 text-green-800",
  FINAL_REPORT_SUBMITTED: "bg-teal-100 text-teal-800",
  FELLOWSHIP_COMPLETED: "bg-emerald-100 text-emerald-800",
};

// Map internal statuses to public-facing statuses
export const INTERNAL_TO_PUBLIC_STATUS: Partial<Record<ApplicationStatus, ApplicantPublicStatus>> = {
  SUBMITTED: "APPLICATION_SUBMITTED",
  SCRUTINY: "DOCUMENTS_UNDER_VERIFICATION",
  QUERY_RAISED: "DOCUMENTS_UNDER_VERIFICATION",
  QUERY_RESPONDED: "DOCUMENTS_UNDER_VERIFICATION",
  SCRUTINY_APPROVED: "ELIGIBILITY_ASSESSMENT",
  ELIGIBILITY_CHECK: "ELIGIBILITY_ASSESSMENT",
  ELIGIBLE: "ELIGIBILITY_ASSESSMENT",
  CONDITIONALLY_ELIGIBLE: "ELIGIBILITY_ASSESSMENT",
  UNDER_REVIEW: "PROPOSAL_UNDER_REVIEW",
  TECHNICAL_SCORING: "PROPOSAL_UNDER_REVIEW",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  INTERVIEW_COMPLETED: "INTERVIEW_COMPLETED",
  TRUSTEE_REVIEW: "FINAL_DECISION_PENDING",
  SELECTED: "SELECTED",
  WAITLISTED: "WAITLISTED",
  REJECTED: "NOT_SELECTED",
  NOT_ELIGIBLE: "NOT_SELECTED",
  AGREEMENT_PENDING: "AGREEMENT_SUBMITTED",
  COMPLETED: "FELLOWSHIP_COMPLETED",
};

// Legacy status mapping for backward compatibility
export const LEGACY_STATUS_TO_PUBLIC: Partial<Record<ApplicationStatus, ApplicantPublicStatus>> = {
  DRAFT: "APPLICATION_SUBMITTED",
  INCOMPLETE: "APPLICATION_SUBMITTED",
  WITHDRAWN: "NOT_SELECTED",
  SUSPENDED: "NOT_SELECTED",
  TERMINATED: "NOT_SELECTED",
};

export function getPublicStatus(
  status: ApplicationStatus,
  fellowshipStage?: FellowshipStage | null
): ApplicantPublicStatus {
  // Check fellowship stages first
  if (fellowshipStage) {
    if (fellowshipStage === "COMPLETED") return "FELLOWSHIP_COMPLETED";
    if (fellowshipStage === "AGREEMENT_PENDING") return "AGREEMENT_SUBMITTED";
    if (fellowshipStage === "INSTALLMENT_1_RELEASED") return "FIRST_INSTALLMENT_RELEASED";
    if (fellowshipStage === "MID_TERM_REVIEW") return "MID_TERM_REVIEW";
    if (fellowshipStage === "INSTALLMENT_2_RELEASED") return "SECOND_INSTALLMENT_RELEASED";
    if (fellowshipStage === "FINAL_SUBMISSION") return "FINAL_REPORT_SUBMITTED";
    if (["QUARTERLY_REVIEW_1", "QUARTERLY_REVIEW_2", "QUARTERLY_REVIEW_3", "QUARTERLY_REVIEW_4"].includes(fellowshipStage)) {
      return "PROGRESS_REPORT_DUE";
    }
  }

  // Map internal status to public
  return INTERNAL_TO_PUBLIC_STATUS[status] ?? 
    LEGACY_STATUS_TO_PUBLIC[status] ?? 
    "APPLICATION_SUBMITTED";
}

export function getPublicStatusLabel(status: ApplicantPublicStatus): string {
  return PUBLIC_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function getPublicStatusColor(status: ApplicantPublicStatus): string {
  return PUBLIC_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// ============================================
// INTERNAL ADMIN STATUS SYSTEM
// ============================================

export type InternalAdminStatus = 
  | "DRAFT"
  | "SUBMITTED"
  | "PAYMENT_VERIFIED"
  | "ADMINISTRATIVE_SCRUTINY"
  | "DOCUMENTS_VERIFIED"
  | "DOCUMENTS_REJECTED"
  | "CLARIFICATION_REQUESTED"
  | "ELIGIBILITY_PENDING"
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "REVIEWER_ASSIGNED"
  | "REVIEWER_ACCEPTED"
  | "REVIEWER_DECLINED"
  | "SECOND_REVIEWER_ASSIGNED"
  | "STATISTICIAN_ASSIGNED"
  | "SUBJECT_EXPERT_ASSIGNED"
  | "ETHICS_EXPERT_ASSIGNED"
  | "SCIENTIFIC_REVIEW_STARTED"
  | "METHODOLOGY_REVIEW"
  | "LITERATURE_REVIEW"
  | "BUDGET_REVIEW"
  | "STATISTICAL_REVIEW"
  | "ETHICS_REVIEW"
  | "REVIEWER_SUBMITTED"
  | "AWAITING_SECOND_REVIEWER"
  | "REVIEWS_CONSOLIDATED"
  | "COMMITTEE_DISCUSSION"
  | "INTERVIEW_REQUIRED"
  | "INTERVIEW_WAIVED"
  | "AWAITING_COMMITTEE_DECISION"
  | "TRUSTEE_APPROVAL_PENDING"
  | "APPROVED"
  | "WAITLISTED"
  | "REJECTED"
  | "AGREEMENT_PENDING"
  | "AGREEMENT_SIGNED"
  | "MILESTONE_1_APPROVED"
  | "INSTALLMENT_1_RELEASED"
  | "PROGRESS_REPORT_PENDING"
  | "PROGRESS_REPORT_APPROVED"
  | "MILESTONE_2_APPROVED"
  | "INSTALLMENT_2_RELEASED"
  | "FINAL_REPORT_PENDING"
  | "FINAL_EVALUATION"
  | "FELLOWSHIP_CLOSED";

export const INTERNAL_STATUS_LABELS: Record<InternalAdminStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PAYMENT_VERIFIED: "Payment Verified",
  ADMINISTRATIVE_SCRUTINY: "Administrative Scrutiny",
  DOCUMENTS_VERIFIED: "Documents Verified",
  DOCUMENTS_REJECTED: "Documents Rejected",
  CLARIFICATION_REQUESTED: "Clarification Requested",
  ELIGIBILITY_PENDING: "Eligibility Pending",
  ELIGIBLE: "Eligible",
  NOT_ELIGIBLE: "Not Eligible",
  REVIEWER_ASSIGNED: "Reviewer Assigned",
  REVIEWER_ACCEPTED: "Reviewer Accepted",
  REVIEWER_DECLINED: "Reviewer Declined",
  SECOND_REVIEWER_ASSIGNED: "Second Reviewer Assigned",
  STATISTICIAN_ASSIGNED: "Statistician Assigned",
  SUBJECT_EXPERT_ASSIGNED: "Subject Expert Assigned",
  ETHICS_EXPERT_ASSIGNED: "Ethics Expert Assigned",
  SCIENTIFIC_REVIEW_STARTED: "Scientific Review Started",
  METHODOLOGY_REVIEW: "Methodology Review",
  LITERATURE_REVIEW: "Literature Review",
  BUDGET_REVIEW: "Budget Review",
  STATISTICAL_REVIEW: "Statistical Review",
  ETHICS_REVIEW: "Ethics Review",
  REVIEWER_SUBMITTED: "Reviewer Submitted",
  AWAITING_SECOND_REVIEWER: "Awaiting Second Reviewer",
  REVIEWS_CONSOLIDATED: "Reviews Consolidated",
  COMMITTEE_DISCUSSION: "Committee Discussion",
  INTERVIEW_REQUIRED: "Interview Required",
  INTERVIEW_WAIVED: "Interview Waived",
  AWAITING_COMMITTEE_DECISION: "Awaiting Committee Decision",
  TRUSTEE_APPROVAL_PENDING: "Trustee Approval Pending",
  APPROVED: "Approved",
  WAITLISTED: "Waitlisted",
  REJECTED: "Rejected",
  AGREEMENT_PENDING: "Agreement Pending",
  AGREEMENT_SIGNED: "Agreement Signed",
  MILESTONE_1_APPROVED: "Milestone 1 Approved",
  INSTALLMENT_1_RELEASED: "Installment 1 Released",
  PROGRESS_REPORT_PENDING: "Progress Report Pending",
  PROGRESS_REPORT_APPROVED: "Progress Report Approved",
  MILESTONE_2_APPROVED: "Milestone 2 Approved",
  INSTALLMENT_2_RELEASED: "Installment 2 Released",
  FINAL_REPORT_PENDING: "Final Report Pending",
  FINAL_EVALUATION: "Final Evaluation",
  FELLOWSHIP_CLOSED: "Fellowship Closed",
};

export const INTERNAL_STATUS_COLORS: Record<InternalAdminStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  PAYMENT_VERIFIED: "bg-teal-100 text-teal-800",
  ADMINISTRATIVE_SCRUTINY: "bg-amber-100 text-amber-800",
  DOCUMENTS_VERIFIED: "bg-green-100 text-green-800",
  DOCUMENTS_REJECTED: "bg-red-100 text-red-800",
  CLARIFICATION_REQUESTED: "bg-orange-100 text-orange-800",
  ELIGIBILITY_PENDING: "bg-cyan-100 text-cyan-800",
  ELIGIBLE: "bg-green-100 text-green-800",
  NOT_ELIGIBLE: "bg-red-100 text-red-800",
  REVIEWER_ASSIGNED: "bg-purple-100 text-purple-800",
  REVIEWER_ACCEPTED: "bg-indigo-100 text-indigo-800",
  REVIEWER_DECLINED: "bg-red-100 text-red-800",
  SECOND_REVIEWER_ASSIGNED: "bg-violet-100 text-violet-800",
  STATISTICIAN_ASSIGNED: "bg-blue-100 text-blue-800",
  SUBJECT_EXPERT_ASSIGNED: "bg-teal-100 text-teal-800",
  ETHICS_EXPERT_ASSIGNED: "bg-emerald-100 text-emerald-800",
  SCIENTIFIC_REVIEW_STARTED: "bg-yellow-100 text-yellow-800",
  METHODOLOGY_REVIEW: "bg-amber-100 text-amber-800",
  LITERATURE_REVIEW: "bg-orange-100 text-orange-800",
  BUDGET_REVIEW: "bg-lime-100 text-lime-800",
  STATISTICAL_REVIEW: "bg-cyan-100 text-cyan-800",
  ETHICS_REVIEW: "bg-emerald-100 text-emerald-800",
  REVIEWER_SUBMITTED: "bg-green-100 text-green-800",
  AWAITING_SECOND_REVIEWER: "bg-yellow-100 text-yellow-800",
  REVIEWS_CONSOLIDATED: "bg-teal-100 text-teal-800",
  COMMITTEE_DISCUSSION: "bg-purple-100 text-purple-800",
  INTERVIEW_REQUIRED: "bg-indigo-100 text-indigo-800",
  INTERVIEW_WAIVED: "bg-green-100 text-green-800",
  AWAITING_COMMITTEE_DECISION: "bg-fuchsia-100 text-fuchsia-800",
  TRUSTEE_APPROVAL_PENDING: "bg-violet-100 text-violet-800",
  APPROVED: "bg-green-100 text-green-800",
  WAITLISTED: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
  AGREEMENT_PENDING: "bg-blue-100 text-blue-800",
  AGREEMENT_SIGNED: "bg-emerald-100 text-emerald-800",
  MILESTONE_1_APPROVED: "bg-teal-100 text-teal-800",
  INSTALLMENT_1_RELEASED: "bg-green-100 text-green-800",
  PROGRESS_REPORT_PENDING: "bg-amber-100 text-amber-800",
  PROGRESS_REPORT_APPROVED: "bg-lime-100 text-lime-800",
  MILESTONE_2_APPROVED: "bg-teal-100 text-teal-800",
  INSTALLMENT_2_RELEASED: "bg-green-100 text-green-800",
  FINAL_REPORT_PENDING: "bg-orange-100 text-orange-800",
  FINAL_EVALUATION: "bg-yellow-100 text-yellow-800",
  FELLOWSHIP_CLOSED: "bg-emerald-100 text-emerald-800",
};

export const INTERNAL_WORKFLOW_PHASES = [
  { phase: "Registration", statuses: ["DRAFT", "SUBMITTED"] },
  { phase: "Administrative", statuses: ["PAYMENT_VERIFIED", "ADMINISTRATIVE_SCRUTINY", "DOCUMENTS_VERIFIED", "DOCUMENTS_REJECTED", "CLARIFICATION_REQUESTED"] },
  { phase: "Eligibility", statuses: ["ELIGIBILITY_PENDING", "ELIGIBLE", "NOT_ELIGIBLE"] },
  { phase: "Reviewer Assignment", statuses: ["REVIEWER_ASSIGNED", "REVIEWER_ACCEPTED", "REVIEWER_DECLINED", "SECOND_REVIEWER_ASSIGNED", "STATISTICIAN_ASSIGNED", "SUBJECT_EXPERT_ASSIGNED", "ETHICS_EXPERT_ASSIGNED"] },
  { phase: "Proposal Review", statuses: ["SCIENTIFIC_REVIEW_STARTED", "METHODOLOGY_REVIEW", "LITERATURE_REVIEW", "BUDGET_REVIEW", "STATISTICAL_REVIEW", "ETHICS_REVIEW", "REVIEWER_SUBMITTED", "AWAITING_SECOND_REVIEWER", "REVIEWS_CONSOLIDATED"] },
  { phase: "Committee", statuses: ["COMMITTEE_DISCUSSION", "INTERVIEW_REQUIRED", "INTERVIEW_WAIVED", "AWAITING_COMMITTEE_DECISION", "TRUSTEE_APPROVAL_PENDING", "APPROVED", "WAITLISTED", "REJECTED"] },
  { phase: "Fellowship", statuses: ["AGREEMENT_PENDING", "AGREEMENT_SIGNED", "MILESTONE_1_APPROVED", "INSTALLMENT_1_RELEASED", "PROGRESS_REPORT_PENDING", "PROGRESS_REPORT_APPROVED", "MILESTONE_2_APPROVED", "INSTALLMENT_2_RELEASED", "FINAL_REPORT_PENDING", "FINAL_EVALUATION", "FELLOWSHIP_CLOSED"] },
] as const;

export function getInternalStatusLabel(status: InternalAdminStatus): string {
  return INTERNAL_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function getInternalStatusColor(status: InternalAdminStatus): string {
  return INTERNAL_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

// ============================================
// LEGACY STATUS SYSTEM (for backward compatibility)
// ============================================

/** Applicant-facing milestones (Amazon-style order tracking) */
export type ApplicantMilestone = {
  key: string;
  label: string;
  description: string;
  statuses: ApplicationStatus[];
  fellowshipStages?: FellowshipStage[];
};

export const APPLICANT_MILESTONES: ApplicantMilestone[] = [
  {
    key: "submitted",
    label: "Application Submitted",
    description: "Your application has been received",
    statuses: ["SUBMITTED"],
  },
  {
    key: "documents",
    label: "Documents Verified",
    description: "Verification team has approved your documents",
    statuses: ["SCRUTINY_APPROVED", "ELIGIBILITY_CHECK", "ELIGIBLE", "CONDITIONALLY_ELIGIBLE"],
  },
  {
    key: "eligibility",
    label: "Eligibility Approved",
    description: "You meet fellowship eligibility criteria",
    statuses: ["ELIGIBLE", "CONDITIONALLY_ELIGIBLE", "UNDER_REVIEW", "TECHNICAL_SCORING"],
  },
  {
    key: "committee",
    label: "Research Proposal Under Expert Review",
    description: "Committee is evaluating your proposal, budget, and methodology",
    statuses: ["UNDER_REVIEW", "TECHNICAL_SCORING"],
  },
  {
    key: "shortlist",
    label: "Shortlisted",
    description: "Your application is on the shortlist",
    statuses: ["SHORTLISTED", "WAITLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"],
  },
  {
    key: "interview",
    label: "Interview",
    description: "Interview scheduled or completed",
    statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "TRUSTEE_REVIEW"],
  },
  {
    key: "selection",
    label: "Selection",
    description: "Trustee approval and final selection decision",
    statuses: ["TRUSTEE_REVIEW", "SELECTED", "AGREEMENT_PENDING"],
  },
  {
    key: "fellowship",
    label: "Fellowship Award",
    description: "Fellowship sanctioned and funding in progress",
    statuses: ["SELECTED", "AGREEMENT_PENDING", "COMPLETED"],
    fellowshipStages: [
      "AGREEMENT_PENDING",
      "BANK_VERIFICATION",
      "SANCTIONED",
      "INSTALLMENT_1_RELEASED",
      "QUARTERLY_REVIEW_1",
      "QUARTERLY_REVIEW_2",
      "MID_TERM_REVIEW",
      "INSTALLMENT_2_RELEASED",
      "QUARTERLY_REVIEW_3",
      "QUARTERLY_REVIEW_4",
      "FINAL_SUBMISSION",
      "FINANCIAL_VERIFICATION",
      "FINAL_PRESENTATION",
      "INSTALLMENT_3_RELEASED",
      "COMPLETED",
    ],
  },
];

/** Admin workflow stages grouped by phase */
export const ADMIN_WORKFLOW_PHASES = [
  {
    phase: "Registration",
    statuses: ["DRAFT", "INCOMPLETE", "SUBMITTED", "WITHDRAWN"] as ApplicationStatus[],
  },
  {
    phase: "Verification",
    statuses: ["SCRUTINY", "QUERY_RAISED", "QUERY_RESPONDED", "SCRUTINY_APPROVED"] as ApplicationStatus[],
    checks: ["Aadhaar", "PAN", "Registration Certificate", "BAMS Degree", "Research Proposal"],
  },
  {
    phase: "Eligibility",
    statuses: ["ELIGIBILITY_CHECK", "ELIGIBLE", "CONDITIONALLY_ELIGIBLE", "NOT_ELIGIBLE"] as ApplicationStatus[],
    checks: ["BAMS Mandatory", "Registration Valid", "Topic Relevant"],
  },
  {
    phase: "Committee Review",
    statuses: ["UNDER_REVIEW", "TECHNICAL_SCORING"] as ApplicationStatus[],
  },
  {
    phase: "Shortlisting",
    statuses: ["SHORTLISTED", "WAITLISTED", "REJECTED"] as ApplicationStatus[],
  },
  {
    phase: "Interview",
    statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] as ApplicationStatus[],
  },
  {
    phase: "Trustee Approval",
    statuses: ["TRUSTEE_REVIEW", "SELECTED", "AGREEMENT_PENDING"] as ApplicationStatus[],
  },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  INCOMPLETE: "Incomplete",
  SUBMITTED: "Submitted",
  WITHDRAWN: "Withdrawn",
  QUERY_RAISED: "Query Raised",
  QUERY_RESPONDED: "Applicant Responded",
  SCRUTINY: "Document Verification",
  SCRUTINY_APPROVED: "Documents Verified",
  ELIGIBILITY_CHECK: "Eligibility Check",
  ELIGIBLE: "Eligible",
  CONDITIONALLY_ELIGIBLE: "Conditionally Eligible",
  NOT_ELIGIBLE: "Not Eligible",
  UNDER_REVIEW: "Research Proposal Under Expert Review",
  TECHNICAL_SCORING: "Technical Scoring",
  SHORTLISTED: "Shortlisted",
  WAITLISTED: "Waitlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  TRUSTEE_REVIEW: "Trustee Approval",
  SELECTED: "Selected",
  AGREEMENT_PENDING: "Agreement Pending",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  COMPLETED: "Completed Successfully",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  INCOMPLETE: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-800",
  WITHDRAWN: "bg-gray-100 text-gray-500",
  QUERY_RAISED: "bg-orange-100 text-orange-900",
  QUERY_RESPONDED: "bg-amber-100 text-amber-900",
  SCRUTINY: "bg-amber-100 text-amber-900",
  SCRUTINY_APPROVED: "bg-teal-100 text-teal-800",
  ELIGIBILITY_CHECK: "bg-cyan-100 text-cyan-900",
  ELIGIBLE: "bg-green-100 text-green-800",
  CONDITIONALLY_ELIGIBLE: "bg-lime-100 text-lime-900",
  NOT_ELIGIBLE: "bg-red-100 text-red-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  TECHNICAL_SCORING: "bg-indigo-100 text-indigo-800",
  SHORTLISTED: "bg-purple-100 text-purple-800",
  WAITLISTED: "bg-orange-100 text-orange-800",
  INTERVIEW_SCHEDULED: "bg-indigo-100 text-indigo-800",
  INTERVIEW_COMPLETED: "bg-violet-100 text-violet-800",
  TRUSTEE_REVIEW: "bg-fuchsia-100 text-fuchsia-900",
  SELECTED: "bg-green-100 text-green-800",
  AGREEMENT_PENDING: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-900",
  TERMINATED: "bg-red-200 text-red-900",
  COMPLETED: "bg-emerald-100 text-emerald-900",
};

export const FELLOWSHIP_STAGE_LABELS: Record<string, string> = {
  AGREEMENT_PENDING: "Agreement Pending",
  BANK_VERIFICATION: "Bank Verification",
  SANCTIONED: "Fellowship Sanctioned",
  INSTALLMENT_1_RELEASED: "Installment 1 Released",
  QUARTERLY_REVIEW_1: "Quarterly Review 1",
  QUARTERLY_REVIEW_2: "Quarterly Review 2",
  MID_TERM_REVIEW: "Mid-Term Review",
  INSTALLMENT_2_RELEASED: "Installment 2 Released",
  QUARTERLY_REVIEW_3: "Quarterly Review 3",
  QUARTERLY_REVIEW_4: "Quarterly Review 4",
  FINAL_SUBMISSION: "Final Submission",
  FINANCIAL_VERIFICATION: "Financial Verification",
  FINAL_PRESENTATION: "Final Presentation",
  INSTALLMENT_3_RELEASED: "Installment 3 Released",
  COMPLETED: "Completed Successfully",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const TERMINAL_STATUSES: ApplicationStatus[] = [
  "REJECTED",
  "NOT_ELIGIBLE",
  "WITHDRAWN",
  "TERMINATED",
  "SUSPENDED",
];

export function getLifecycleStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function getLifecycleStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

export function getMilestoneIndex(
  status: ApplicationStatus,
  fellowshipStage?: FellowshipStage | null
): number {
  if (TERMINAL_STATUSES.includes(status) && status !== "SUSPENDED") return -1;

  if (fellowshipStage) {
    if (fellowshipStage === "COMPLETED") {
      return APPLICANT_MILESTONES.length - 1;
    }
    for (let i = APPLICANT_MILESTONES.length - 1; i >= 0; i--) {
      if (APPLICANT_MILESTONES[i].fellowshipStages?.includes(fellowshipStage)) {
        return i;
      }
    }
    return APPLICANT_MILESTONES.length - 1;
  }

  if (status === "COMPLETED") {
    return APPLICANT_MILESTONES.length - 1;
  }

  for (let i = APPLICANT_MILESTONES.length - 1; i >= 0; i--) {
    const m = APPLICANT_MILESTONES[i];
    if (m.fellowshipStages && !fellowshipStage) continue;
    if (m.statuses.includes(status)) return i;
  }

  if (status === "SCRUTINY" || status === "QUERY_RAISED" || status === "QUERY_RESPONDED") return 1;
  if (status === "DRAFT" || status === "INCOMPLETE") return -2;
  return 0;
}

export function getMilestoneProgress(
  status: ApplicationStatus,
  fellowshipStage?: FellowshipStage | null
): number {
  const idx = getMilestoneIndex(status, fellowshipStage);
  if (idx < 0) return status === "REJECTED" ? 0 : 0;

  if (fellowshipStage === "COMPLETED") return 100;

  const base = idx / APPLICANT_MILESTONES.length;
  const slice = 1 / APPLICANT_MILESTONES.length;

  if (idx === APPLICANT_MILESTONES.length - 1 && fellowshipStage) {
    const fellowshipPart = getFellowshipStepProgress(fellowshipStage) / 100;
    return Math.min(99, Math.round((base + slice * fellowshipPart) * 100));
  }

  if (status === "COMPLETED" && !fellowshipStage) {
    return Math.min(99, Math.round(((APPLICANT_MILESTONES.length - 1) / APPLICANT_MILESTONES.length) * 100));
  }

  return Math.round(((idx + 1) / APPLICANT_MILESTONES.length) * 100);
}

export type MilestoneState = "complete" | "current" | "pending" | "query";

export function getMilestoneStates(
  status: ApplicationStatus,
  fellowshipStage?: FellowshipStage | null
): MilestoneState[] {
  if (fellowshipStage === "COMPLETED") {
    return APPLICANT_MILESTONES.map(() => "complete");
  }

  const currentIdx = getMilestoneIndex(status, fellowshipStage);
  const isQuery = status === "QUERY_RAISED" || status === "QUERY_RESPONDED";
  const isRejected = TERMINAL_STATUSES.includes(status);

  return APPLICANT_MILESTONES.map((_, i) => {
    if (isRejected) return i <= Math.max(0, currentIdx) ? "complete" : "pending";
    if (isQuery && i === 1) return status === "QUERY_RAISED" ? "query" : "current";
    if (currentIdx < 0) return "pending";
    if (i < currentIdx) return "complete";
    if (i === currentIdx) {
      if (i === APPLICANT_MILESTONES.length - 1 && fellowshipStage) {
        return "current";
      }
      if (status === "COMPLETED" && !fellowshipStage) return "complete";
      return "current";
    }
    return "pending";
  });
}

export const ALLOWED_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  DRAFT: ["SUBMITTED", "INCOMPLETE", "WITHDRAWN"],
  INCOMPLETE: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["SCRUTINY", "QUERY_RAISED", "REJECTED", "WITHDRAWN"],
  QUERY_RAISED: ["QUERY_RESPONDED", "REJECTED"],
  QUERY_RESPONDED: ["SCRUTINY"],
  SCRUTINY: ["SCRUTINY_APPROVED", "QUERY_RAISED", "REJECTED"],
  SCRUTINY_APPROVED: ["ELIGIBILITY_CHECK", "REJECTED"],
  ELIGIBILITY_CHECK: ["ELIGIBLE", "CONDITIONALLY_ELIGIBLE", "NOT_ELIGIBLE", "REJECTED"],
  ELIGIBLE: ["UNDER_REVIEW", "REJECTED"],
  CONDITIONALLY_ELIGIBLE: ["UNDER_REVIEW", "REJECTED"],
  NOT_ELIGIBLE: ["REJECTED"],
  UNDER_REVIEW: ["TECHNICAL_SCORING", "REJECTED", "WAITLISTED"],
  TECHNICAL_SCORING: ["SHORTLISTED", "WAITLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW_SCHEDULED", "TRUSTEE_REVIEW", "REJECTED", "WAITLISTED"],
  WAITLISTED: ["SHORTLISTED", "INTERVIEW_SCHEDULED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["INTERVIEW_COMPLETED", "REJECTED"],
  INTERVIEW_COMPLETED: ["TRUSTEE_REVIEW", "REJECTED", "SHORTLISTED"],
  TRUSTEE_REVIEW: ["SELECTED", "AGREEMENT_PENDING", "REJECTED"],
  SELECTED: ["AGREEMENT_PENDING", "SUSPENDED"],
  AGREEMENT_PENDING: ["SUSPENDED", "TERMINATED", "WITHDRAWN"],
  COMPLETED: ["AGREEMENT_PENDING", "SUSPENDED", "TERMINATED"],
  SUSPENDED: ["UNDER_REVIEW", "TERMINATED", "REJECTED"],
};

export const ADMIN_ACTION_LABELS: Record<string, string> = {
  SCRUTINY: "Start Document Verification",
  QUERY_RAISED: "Raise Query",
  QUERY_RESPONDED: "Mark Query Responded",
  SCRUTINY_APPROVED: "Mark Documents Verified",
  ELIGIBILITY_CHECK: "Start Eligibility Check",
  ELIGIBLE: "Mark Eligible",
  CONDITIONALLY_ELIGIBLE: "Mark Conditionally Eligible",
  NOT_ELIGIBLE: "Mark Not Eligible",
  UNDER_REVIEW: "Send to Committee Review",
  TECHNICAL_SCORING: "Begin Technical Scoring",
  SHORTLISTED: "Shortlist",
  WAITLISTED: "Waitlist",
  INTERVIEW_SCHEDULED: "Schedule Interview",
  INTERVIEW_COMPLETED: "Mark Interview Completed",
  TRUSTEE_REVIEW: "Send to Trustee Review",
  SELECTED: "Mark Selected",
  AGREEMENT_PENDING: "Agreement Pending",
  REJECTED: "Reject",
  SUSPENDED: "Suspend",
  TERMINATED: "Terminate",
  WITHDRAWN: "Mark Withdrawn",
  INCOMPLETE: "Mark Incomplete",
};

export function getAdminPhase(status: ApplicationStatus): string {
  for (const phase of ADMIN_WORKFLOW_PHASES) {
    if ((phase.statuses as ApplicationStatus[]).includes(status)) return phase.phase;
  }
  if (["SELECTED", "AGREEMENT_PENDING", "COMPLETED", "SUSPENDED", "TERMINATED"].includes(status)) {
    return "Fellowship";
  }
  return "Other";
}
