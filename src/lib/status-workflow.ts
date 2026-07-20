/**
 * Status Workflow Service
 * 
 * Manages internal admin status transitions, workflow phases,
 * and action labels for the three-layer workflow system.
 */

import type { InternalAdminStatus, ApplicationStatus } from "@prisma/client";
import { INTERNAL_WORKFLOW_PHASES, INTERNAL_STATUS_LABELS, INTERNAL_STATUS_COLORS } from "./lifecycle-workflow";

// ============================================
// INTERNAL STATUS TRANSITIONS
// ============================================

// Define valid status transitions for internal workflow
export const INTERNAL_ALLOWED_TRANSITIONS: Partial<Record<InternalAdminStatus, InternalAdminStatus[]>> = {
  // Registration
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ADMINISTRATIVE_SCRUTINY", "CLARIFICATION_REQUESTED"],
  
  // Administrative
  ADMINISTRATIVE_SCRUTINY: ["DOCUMENTS_VERIFIED", "DOCUMENTS_REJECTED", "CLARIFICATION_REQUESTED"],
  DOCUMENTS_VERIFIED: ["ELIGIBILITY_PENDING", "CLARIFICATION_REQUESTED"],
  DOCUMENTS_REJECTED: ["ADMINISTRATIVE_SCRUTINY", "REJECTED"],
  CLARIFICATION_REQUESTED: ["DOCUMENTS_VERIFIED", "ADMINISTRATIVE_SCRUTINY"],
  PAYMENT_VERIFIED: ["ADMINISTRATIVE_SCRUTINY"],
  
  // Eligibility
  ELIGIBILITY_PENDING: ["ELIGIBLE", "NOT_ELIGIBLE", "CLARIFICATION_REQUESTED"],
  ELIGIBLE: ["REVIEWER_ASSIGNED"],
  NOT_ELIGIBLE: ["REJECTED"],
  
  // Reviewer Assignment
  REVIEWER_ASSIGNED: ["REVIEWER_ACCEPTED", "REVIEWER_DECLINED"],
  REVIEWER_ACCEPTED: ["SCIENTIFIC_REVIEW_STARTED", "METHODOLOGY_REVIEW", "LITERATURE_REVIEW", "BUDGET_REVIEW"],
  REVIEWER_DECLINED: ["REVIEWER_ASSIGNED", "SECOND_REVIEWER_ASSIGNED"],
  SECOND_REVIEWER_ASSIGNED: ["REVIEWER_ACCEPTED", "REVIEWER_DECLINED", "STATISTICIAN_ASSIGNED"],
  STATISTICIAN_ASSIGNED: ["STATISTICAL_REVIEW"],
  SUBJECT_EXPERT_ASSIGNED: ["SCIENTIFIC_REVIEW_STARTED"],
  ETHICS_EXPERT_ASSIGNED: ["ETHICS_REVIEW"],
  
  // Proposal Review
  SCIENTIFIC_REVIEW_STARTED: ["METHODOLOGY_REVIEW", "REVIEWER_SUBMITTED"],
  METHODOLOGY_REVIEW: ["LITERATURE_REVIEW", "BUDGET_REVIEW", "REVIEWER_SUBMITTED"],
  LITERATURE_REVIEW: ["BUDGET_REVIEW", "STATISTICAL_REVIEW", "ETHICS_REVIEW", "REVIEWER_SUBMITTED"],
  BUDGET_REVIEW: ["STATISTICAL_REVIEW", "ETHICS_REVIEW", "REVIEWER_SUBMITTED"],
  STATISTICAL_REVIEW: ["ETHICS_REVIEW", "REVIEWER_SUBMITTED"],
  ETHICS_REVIEW: ["REVIEWER_SUBMITTED"],
  REVIEWER_SUBMITTED: ["AWAITING_SECOND_REVIEWER", "REVIEWS_CONSOLIDATED"],
  AWAITING_SECOND_REVIEWER: ["REVIEWS_CONSOLIDATED", "SECOND_REVIEWER_ASSIGNED"],
  
  // After all reviews
  REVIEWS_CONSOLIDATED: ["COMMITTEE_DISCUSSION"],
  
  // Committee
  COMMITTEE_DISCUSSION: ["INTERVIEW_REQUIRED", "INTERVIEW_WAIVED", "AWAITING_COMMITTEE_DECISION"],
  INTERVIEW_REQUIRED: ["AWAITING_COMMITTEE_DECISION"],
  INTERVIEW_WAIVED: ["AWAITING_COMMITTEE_DECISION"],
  AWAITING_COMMITTEE_DECISION: ["TRUSTEE_APPROVAL_PENDING", "APPROVED", "WAITLISTED", "REJECTED"],
  TRUSTEE_APPROVAL_PENDING: ["APPROVED", "WAITLISTED", "REJECTED"],
  
  // Final decisions
  APPROVED: ["AGREEMENT_PENDING"],
  WAITLISTED: ["APPROVED", "REJECTED"],
  REJECTED: [], // Terminal state
  
  // Fellowship
  AGREEMENT_PENDING: ["AGREEMENT_SIGNED", "REJECTED"],
  AGREEMENT_SIGNED: ["MILESTONE_1_APPROVED"],
  MILESTONE_1_APPROVED: ["INSTALLMENT_1_RELEASED"],
  INSTALLMENT_1_RELEASED: ["PROGRESS_REPORT_PENDING"],
  PROGRESS_REPORT_PENDING: ["PROGRESS_REPORT_APPROVED"],
  PROGRESS_REPORT_APPROVED: ["MILESTONE_2_APPROVED"],
  MILESTONE_2_APPROVED: ["INSTALLMENT_2_RELEASED"],
  INSTALLMENT_2_RELEASED: ["FINAL_REPORT_PENDING"],
  FINAL_REPORT_PENDING: ["FINAL_EVALUATION"],
  FINAL_EVALUATION: ["FELLOWSHIP_CLOSED", "REJECTED"],
  FELLOWSHIP_CLOSED: [], // Terminal state
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a status transition is allowed
 */
export function canTransitionInternal(
  fromStatus: InternalAdminStatus,
  toStatus: InternalAdminStatus
): boolean {
  const allowed = INTERNAL_ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Get allowed next statuses from current status
 */
export function getNextInternalStatuses(currentStatus: InternalAdminStatus): InternalAdminStatus[] {
  return INTERNAL_ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Get the workflow phase for a given status
 */
export function getInternalWorkflowPhase(status: InternalAdminStatus): string {
  for (const phase of INTERNAL_WORKFLOW_PHASES) {
    if (phase.statuses.includes(status as any)) {
      return phase.phase;
    }
  }
  return "Other";
}

/**
 * Calculate progress percentage based on workflow phase
 */
export function getWorkflowProgress(status: InternalAdminStatus): number {
  const phaseOrder = [
    "Registration",
    "Administrative",
    "Eligibility",
    "Reviewer Assignment",
    "Proposal Review",
    "Committee",
    "Fellowship",
  ];

  const currentPhase = getInternalWorkflowPhase(status);
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
  
  if (currentPhaseIndex === -1) return 0;
  
  return Math.round(((currentPhaseIndex + 1) / phaseOrder.length) * 100);
}

/**
 * Check if status is a terminal state
 */
export function isTerminalStatus(status: InternalAdminStatus): boolean {
  const allowed = INTERNAL_ALLOWED_TRANSITIONS[status];
  return !allowed || allowed.length === 0;
}

/**
 * Get status label
 */
export function getStatusLabel(status: InternalAdminStatus): string {
  return INTERNAL_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

/**
 * Get status color class
 */
export function getStatusColor(status: InternalAdminStatus): string {
  return INTERNAL_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
}

// ============================================
// ACTION LABELS
// ============================================

export const INTERNAL_ACTION_LABELS: Record<string, string> = {
  // Registration
  DRAFT: "Save as Draft",
  SUBMITTED: "Submit Application",
  
  // Administrative
  ADMINISTRATIVE_SCRUTINY: "Start Administrative Review",
  DOCUMENTS_VERIFIED: "Approve Documents",
  DOCUMENTS_REJECTED: "Reject Documents",
  CLARIFICATION_REQUESTED: "Request Clarification",
  PAYMENT_VERIFIED: "Verify Payment",
  
  // Eligibility
  ELIGIBILITY_PENDING: "Start Eligibility Check",
  ELIGIBLE: "Mark Eligible",
  NOT_ELIGIBLE: "Mark Not Eligible",
  
  // Reviewer Assignment
  REVIEWER_ASSIGNED: "Assign Reviewer",
  REVIEWER_ACCEPTED: "Accept Assignment",
  REVIEWER_DECLINED: "Decline Assignment",
  SECOND_REVIEWER_ASSIGNED: "Assign Second Reviewer",
  STATISTICIAN_ASSIGNED: "Assign Statistician",
  SUBJECT_EXPERT_ASSIGNED: "Assign Subject Expert",
  ETHICS_EXPERT_ASSIGNED: "Assign Ethics Expert",
  
  // Proposal Review
  SCIENTIFIC_REVIEW_STARTED: "Start Scientific Review",
  METHODOLOGY_REVIEW: "Review Methodology",
  LITERATURE_REVIEW: "Review Literature",
  BUDGET_REVIEW: "Review Budget",
  STATISTICAL_REVIEW: "Review Statistics",
  ETHICS_REVIEW: "Review Ethics",
  REVIEWER_SUBMITTED: "Submit Review",
  AWAITING_SECOND_REVIEWER: "Await Second Reviewer",
  REVIEWS_CONSOLIDATED: "Consolidate Reviews",
  
  // Committee
  COMMITTEE_DISCUSSION: "Start Committee Discussion",
  INTERVIEW_REQUIRED: "Mark Interview Required",
  INTERVIEW_WAIVED: "Waive Interview",
  AWAITING_COMMITTEE_DECISION: "Await Decision",
  TRUSTEE_APPROVAL_PENDING: "Send to Trustee",
  
  // Decisions
  APPROVED: "Approve",
  WAITLISTED: "Waitlist",
  REJECTED: "Reject",
  
  // Fellowship
  AGREEMENT_PENDING: "Send Agreement",
  AGREEMENT_SIGNED: "Sign Agreement",
  MILESTONE_1_APPROVED: "Approve Milestone 1",
  INSTALLMENT_1_RELEASED: "Release Installment 1",
  PROGRESS_REPORT_PENDING: "Request Progress Report",
  PROGRESS_REPORT_APPROVED: "Approve Progress Report",
  MILESTONE_2_APPROVED: "Approve Milestone 2",
  INSTALLMENT_2_RELEASED: "Release Installment 2",
  FINAL_REPORT_PENDING: "Request Final Report",
  FINAL_EVALUATION: "Final Evaluation",
  FELLOWSHIP_CLOSED: "Close Fellowship",
};

// ============================================
// MAP INTERNAL STATUS TO APPLICATION STATUS
// ============================================

/**
 * Map internal admin status to legacy application status
 * Used for backward compatibility
 */
export function mapInternalToApplicationStatus(
  internalStatus: InternalAdminStatus
): ApplicationStatus | null {
  const mapping: Partial<Record<InternalAdminStatus, ApplicationStatus>> = {
    DRAFT: "DRAFT",
    SUBMITTED: "SUBMITTED",
    ADMINISTRATIVE_SCRUTINY: "SCRUTINY",
    DOCUMENTS_VERIFIED: "SCRUTINY_APPROVED",
    DOCUMENTS_REJECTED: "REJECTED",
    CLARIFICATION_REQUESTED: "QUERY_RAISED",
    ELIGIBILITY_PENDING: "ELIGIBILITY_CHECK",
    ELIGIBLE: "ELIGIBLE",
    NOT_ELIGIBLE: "NOT_ELIGIBLE",
    REVIEWER_ASSIGNED: "UNDER_REVIEW",
    REVIEWER_ACCEPTED: "UNDER_REVIEW",
    SCIENTIFIC_REVIEW_STARTED: "UNDER_REVIEW",
    METHODOLOGY_REVIEW: "UNDER_REVIEW",
    LITERATURE_REVIEW: "UNDER_REVIEW",
    BUDGET_REVIEW: "UNDER_REVIEW",
    STATISTICAL_REVIEW: "TECHNICAL_SCORING",
    ETHICS_REVIEW: "TECHNICAL_SCORING",
    REVIEWER_SUBMITTED: "TECHNICAL_SCORING",
    REVIEWS_CONSOLIDATED: "TECHNICAL_SCORING",
    COMMITTEE_DISCUSSION: "TECHNICAL_SCORING",
    INTERVIEW_REQUIRED: "SHORTLISTED",
    INTERVIEW_WAIVED: "SHORTLISTED",
    AWAITING_COMMITTEE_DECISION: "TECHNICAL_SCORING",
    TRUSTEE_APPROVAL_PENDING: "TRUSTEE_REVIEW",
    APPROVED: "SELECTED",
    WAITLISTED: "WAITLISTED",
    REJECTED: "REJECTED",
    AGREEMENT_PENDING: "AGREEMENT_PENDING",
    AGREEMENT_SIGNED: "AGREEMENT_PENDING",
    MILESTONE_1_APPROVED: "COMPLETED",
    INSTALLMENT_1_RELEASED: "COMPLETED",
    PROGRESS_REPORT_PENDING: "COMPLETED",
    PROGRESS_REPORT_APPROVED: "COMPLETED",
    MILESTONE_2_APPROVED: "COMPLETED",
    INSTALLMENT_2_RELEASED: "COMPLETED",
    FINAL_REPORT_PENDING: "COMPLETED",
    FINAL_EVALUATION: "COMPLETED",
    FELLOWSHIP_CLOSED: "COMPLETED",
  };

  return mapping[internalStatus] || null;
}

/**
 * Map legacy application status to internal admin status
 */
export function mapApplicationToInternalStatus(
  applicationStatus: ApplicationStatus
): InternalAdminStatus {
  const mapping: Partial<Record<ApplicationStatus, InternalAdminStatus>> = {
    DRAFT: "DRAFT",
    INCOMPLETE: "DRAFT",
    SUBMITTED: "SUBMITTED",
    WITHDRAWN: "REJECTED",
    QUERY_RAISED: "CLARIFICATION_REQUESTED",
    QUERY_RESPONDED: "ADMINISTRATIVE_SCRUTINY",
    SCRUTINY: "ADMINISTRATIVE_SCRUTINY",
    SCRUTINY_APPROVED: "DOCUMENTS_VERIFIED",
    ELIGIBILITY_CHECK: "ELIGIBILITY_PENDING",
    ELIGIBLE: "ELIGIBLE",
    CONDITIONALLY_ELIGIBLE: "ELIGIBLE",
    NOT_ELIGIBLE: "NOT_ELIGIBLE",
    UNDER_REVIEW: "REVIEWER_ASSIGNED",
    TECHNICAL_SCORING: "REVIEWS_CONSOLIDATED",
    SHORTLISTED: "COMMITTEE_DISCUSSION",
    WAITLISTED: "WAITLISTED",
    INTERVIEW_SCHEDULED: "INTERVIEW_REQUIRED",
    INTERVIEW_COMPLETED: "INTERVIEW_WAIVED",
    TRUSTEE_REVIEW: "TRUSTEE_APPROVAL_PENDING",
    SELECTED: "APPROVED",
    AGREEMENT_PENDING: "AGREEMENT_PENDING",
    REJECTED: "REJECTED",
    SUSPENDED: "REJECTED",
    TERMINATED: "REJECTED",
    COMPLETED: "FELLOWSHIP_CLOSED",
  };

  return mapping[applicationStatus] || "DRAFT";
}

// ============================================
// REVIEWER SPECIFIC HELPERS
// ============================================

export type ReviewerPhase = 
  | "scientific"
  | "methodology"
  | "literature"
  | "budget"
  | "statistics"
  | "ethics"
  | "final";

export const REVIEWER_PHASE_MAPPING: Record<ReviewerPhase, InternalAdminStatus[]> = {
  scientific: ["SCIENTIFIC_REVIEW_STARTED"],
  methodology: ["METHODOLOGY_REVIEW"],
  literature: ["LITERATURE_REVIEW"],
  budget: ["BUDGET_REVIEW"],
  statistics: ["STATISTICAL_REVIEW"],
  ethics: ["ETHICS_REVIEW"],
  final: ["REVIEWER_SUBMITTED"],
};

export function getReviewerPhaseFromStatus(status: InternalAdminStatus): ReviewerPhase | null {
  for (const [phase, statuses] of Object.entries(REVIEWER_PHASE_MAPPING)) {
    if (statuses.includes(status)) {
      return phase as ReviewerPhase;
    }
  }
  return null;
}

// ============================================
// WORKFLOW SUMMARY
// ============================================

export interface WorkflowSummary {
  currentPhase: string;
  progress: number;
  nextActions: InternalAdminStatus[];
  isComplete: boolean;
  isRejected: boolean;
  estimatedTimeRemaining?: string;
}

export function getWorkflowSummary(
  status: InternalAdminStatus
): WorkflowSummary {
  const currentPhase = getInternalWorkflowPhase(status);
  const progress = getWorkflowProgress(status);
  const nextActions = getNextInternalStatuses(status);
  const isComplete = isTerminalStatus(status);
  const isRejected = status === "REJECTED";

  // Estimate time based on phase
  const phaseTimeEstimates: Record<string, string> = {
    "Registration": "1-2 days",
    "Administrative": "3-7 days",
    "Eligibility": "2-5 days",
    "Reviewer Assignment": "1-3 days",
    "Proposal Review": "14-30 days",
    "Committee": "7-14 days",
    "Fellowship": "Ongoing",
  };

  return {
    currentPhase,
    progress,
    nextActions,
    isComplete,
    isRejected,
    estimatedTimeRemaining: isComplete ? undefined : phaseTimeEstimates[currentPhase],
  };
}
