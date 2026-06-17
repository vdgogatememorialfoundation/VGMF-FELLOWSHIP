import type { ApplicationStatus, FellowshipStage } from "@prisma/client";
import { getFellowshipStepProgress } from "./fellowship-tracking";

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
    label: "Research Committee Review",
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
  UNDER_REVIEW: "Under Research Committee Review",
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
    return 100;
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
  AGREEMENT_PENDING: ["SUSPENDED", "TERMINATED"],
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
