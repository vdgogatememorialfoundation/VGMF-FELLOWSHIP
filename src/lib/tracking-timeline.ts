import type { ApplicationStatus, FellowshipStage } from "@prisma/client";
import {
  APPLICANT_MILESTONES,
  getMilestoneIndex,
  getMilestoneProgress,
  getMilestoneStates,
  getLifecycleStatusLabel,
} from "./lifecycle-workflow";
import {
  APPLICANT_FELLOWSHIP_STEPS,
  getFellowshipStepStates,
} from "./fellowship-tracking";
import {
  buildIdentityVerificationTimelineStep,
  shouldTrackIdentityVerification,
  type IdentityVerificationTrackingInput,
} from "./identity-verification-tracking";

export type TimelineStepState = "complete" | "current" | "pending" | "query" | "failed";

export type TrackingTimelineStep = {
  key: string;
  label: string;
  description: string;
  state: TimelineStepState;
  timestamp: string | null;
  phase: "application" | "fellowship";
};

export type TrackingHeadline = {
  title: string;
  subtitle: string;
  tone: "success" | "progress" | "warning" | "error" | "neutral";
};

type StatusHistoryEntry = {
  toStatus: string;
  createdAt: Date | string;
};

type FellowshipInput = {
  currentStage: FellowshipStage;
  createdAt: Date | string;
  bankSubmittedAt: Date | string | null;
  bankVerifiedAt: Date | string | null;
  agreementGeneratedAt: Date | string | null;
  installments: Array<{
    installmentNo: number;
    status: string;
    releasedAt: Date | string | null;
  }>;
};

const MILESTONE_HISTORY_STATUSES: Record<string, string[]> = {
  submitted: ["SUBMITTED"],
  documents: ["SCRUTINY_APPROVED"],
  eligibility: ["ELIGIBLE", "CONDITIONALLY_ELIGIBLE"],
  committee: ["UNDER_REVIEW", "TECHNICAL_SCORING"],
  shortlist: ["SHORTLISTED", "WAITLISTED"],
  interview: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"],
  selection: ["TRUSTEE_REVIEW", "SELECTED", "AGREEMENT_PENDING"],
};

function findHistoryTimestamp(
  history: StatusHistoryEntry[],
  statuses: string[]
): string | null {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const entry of sorted) {
    if (statuses.includes(entry.toStatus)) {
      return new Date(entry.createdAt).toISOString();
    }
  }
  return null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function fellowshipTimestamp(
  fellowship: FellowshipInput,
  stepKey: string
): string | null {
  switch (stepKey) {
    case "agreement":
      return (
        toIso(fellowship.agreementGeneratedAt) ?? toIso(fellowship.createdAt)
      );
    case "bank":
      return toIso(fellowship.bankSubmittedAt);
    case "sanctioned":
      return toIso(fellowship.bankVerifiedAt);
    case "inst1":
      return toIso(
        fellowship.installments.find((i) => i.installmentNo === 1 && i.releasedAt)?.releasedAt
      );
    case "inst2":
      return toIso(
        fellowship.installments.find((i) => i.installmentNo === 2 && i.releasedAt)?.releasedAt
      );
    case "completed":
      return toIso(
        fellowship.installments.find((i) => i.installmentNo === 3 && i.releasedAt)?.releasedAt
      );
    default:
      return null;
  }
}

function mapMilestoneState(
  state: string,
  status: ApplicationStatus
): TimelineStepState {
  if (state === "complete") return "complete";
  if (state === "current") return "current";
  if (state === "query") return "query";
  if (status === "REJECTED" || status === "NOT_ELIGIBLE" || status === "WITHDRAWN") {
    return "pending";
  }
  return "pending";
}

function mapFellowshipState(state: string): TimelineStepState {
  if (state === "complete") return "complete";
  if (state === "current") return "current";
  return "pending";
}

export function buildTrackingHeadline(
  status: ApplicationStatus,
  fellowshipStage: FellowshipStage | null,
  queryNotes?: string | null,
  identityVerification?: IdentityVerificationTrackingInput | null
): TrackingHeadline {
  if (status === "REJECTED") {
    return {
      title: "Application not proceeding",
      subtitle: "See details below for the reason",
      tone: "error",
    };
  }
  if (status === "NOT_ELIGIBLE") {
    return {
      title: "Not eligible for this cycle",
      subtitle: "You may reapply in a future fellowship cycle if eligible",
      tone: "error",
    };
  }
  if (status === "QUERY_RAISED") {
    return {
      title: "Action required — query raised",
      subtitle: queryNotes || "Please respond to the verification team query",
      tone: "warning",
    };
  }
  if (status === "QUERY_RESPONDED") {
    return {
      title: "Response submitted",
      subtitle: "Verification team is reviewing your updated information",
      tone: "progress",
    };
  }
  if (
    identityVerification &&
    shouldTrackIdentityVerification(identityVerification, status) &&
    identityVerification.status !== "APPROVED" &&
    ["SCRUTINY", "SUBMITTED", "QUERY_RAISED", "QUERY_RESPONDED"].includes(status)
  ) {
    if (identityVerification.status === "IN_REVIEW") {
      return {
        title: "Identity verification under review",
        subtitle: "Digio is reviewing your session — document scrutiny continues in parallel",
        tone: "progress",
      };
    }
    if (identityVerification.status === "DECLINED") {
      return {
        title: "Identity verification declined",
        subtitle: "Start a new verification session from Identity Verification",
        tone: "warning",
      };
    }
    return {
      title: "Complete identity verification",
      subtitle: "Verify your ID online so the Foundation can approve your documents",
      tone: "warning",
    };
  }
  if (fellowshipStage === "COMPLETED") {
    return {
      title: "Fellowship completed successfully",
      subtitle: "All installments released and project formally closed",
      tone: "success",
    };
  }
  if (fellowshipStage) {
    const labels: Partial<Record<FellowshipStage, TrackingHeadline>> = {
      AGREEMENT_PENDING: {
        title: "Complete fellowship onboarding",
        subtitle: "Submit agreement, undertaking, and bank details",
        tone: "warning",
      },
      BANK_VERIFICATION: {
        title: "Bank verification in progress",
        subtitle: "Foundation is verifying your bank account for fund transfer",
        tone: "progress",
      },
      SANCTIONED: {
        title: "Fellowship sanctioned",
        subtitle: "Your award letter and fellowship ID are ready",
        tone: "success",
      },
      INSTALLMENT_1_RELEASED: {
        title: "Installment 1 released",
        subtitle: "40% commencement grant — submit quarterly reports on schedule",
        tone: "success",
      },
      MID_TERM_REVIEW: {
        title: "Mid-term review in progress",
        subtitle: "Submit progress report and utilization for Installment 2",
        tone: "progress",
      },
      INSTALLMENT_2_RELEASED: {
        title: "Installment 2 released",
        subtitle: "40% mid-term grant — continue quarterly reporting",
        tone: "success",
      },
      FINAL_SUBMISSION: {
        title: "Final submission phase",
        subtitle: "Upload final report, manuscript, and utilization certificate",
        tone: "progress",
      },
      INSTALLMENT_3_RELEASED: {
        title: "Final installment released",
        subtitle: "Awaiting formal fellowship closure",
        tone: "success",
      },
    };
    return (
      labels[fellowshipStage] ?? {
        title: "Fellowship in progress",
        subtitle: "Track each funding milestone below",
        tone: "progress",
      }
    );
  }

  const statusHeadlines: Partial<Record<ApplicationStatus, TrackingHeadline>> = {
    DRAFT: {
      title: "Application in draft",
      subtitle: "Complete and submit your application form",
      tone: "neutral",
    },
    INCOMPLETE: {
      title: "Application incomplete",
      subtitle: "Finish all required sections and documents",
      tone: "warning",
    },
    SUBMITTED: {
      title: "Application received",
      subtitle: "Verification team will begin document review shortly",
      tone: "success",
    },
    SCRUTINY: {
      title: "Documents under verification",
      subtitle: "Our team is reviewing your uploaded documents",
      tone: "progress",
    },
    SCRUTINY_APPROVED: {
      title: "Documents verified",
      subtitle: "Eligibility check will begin next",
      tone: "success",
    },
    ELIGIBILITY_CHECK: {
      title: "Eligibility check in progress",
      subtitle: "Confirming BAMS registration and fellowship criteria",
      tone: "progress",
    },
    ELIGIBLE: {
      title: "You are eligible",
      subtitle: "Application moves to research committee review",
      tone: "success",
    },
    UNDER_REVIEW: {
      title: "Under committee review",
      subtitle: "Research committee is evaluating your proposal",
      tone: "progress",
    },
    TECHNICAL_SCORING: {
      title: "Technical scoring underway",
      subtitle: "Committee is scoring methodology and feasibility",
      tone: "progress",
    },
    SHORTLISTED: {
      title: "Congratulations — you're shortlisted",
      subtitle: "Interview or trustee review may follow",
      tone: "success",
    },
    WAITLISTED: {
      title: "On the waitlist",
      subtitle: "You may be called if a slot opens",
      tone: "neutral",
    },
    INTERVIEW_SCHEDULED: {
      title: "Interview scheduled",
      subtitle: "Check interview details below",
      tone: "progress",
    },
    INTERVIEW_COMPLETED: {
      title: "Interview completed",
      subtitle: "Awaiting trustee selection decision",
      tone: "progress",
    },
    TRUSTEE_REVIEW: {
      title: "Trustee review in progress",
      subtitle: "Final selection decision pending",
      tone: "progress",
    },
    SELECTED: {
      title: "Selected for fellowship",
      subtitle: "Complete agreement and bank details to receive funding",
      tone: "success",
    },
    AGREEMENT_PENDING: {
      title: "Agreement pending",
      subtitle: "Sign undertaking and complete fellowship onboarding",
      tone: "warning",
    },
    COMPLETED: {
      title: "Application journey complete",
      subtitle: "All fellowship milestones finished",
      tone: "success",
    },
  };

  return (
    statusHeadlines[status] ?? {
      title: getLifecycleStatusLabel(status),
      subtitle: "Status updates appear here in real time",
      tone: "neutral",
    }
  );
}

export function buildTrackingTimeline(input: {
  status: ApplicationStatus;
  fellowshipStage: FellowshipStage | null;
  statusHistory: StatusHistoryEntry[];
  submittedAt: Date | string | null;
  createdAt: Date | string;
  fellowship: FellowshipInput | null;
  identityVerification?: IdentityVerificationTrackingInput | null;
}): TrackingTimelineStep[] {
  const { status, fellowshipStage, statusHistory, submittedAt, createdAt, fellowship, identityVerification } =
    input;
  const milestoneStates = getMilestoneStates(status, fellowshipStage);
  const steps: TrackingTimelineStep[] = [];

  APPLICANT_MILESTONES.forEach((milestone, index) => {
    if (milestone.key === "fellowship" && fellowship) return;

    let timestamp =
      findHistoryTimestamp(statusHistory, MILESTONE_HISTORY_STATUSES[milestone.key] ?? []) ??
      null;

    if (milestone.key === "submitted") {
      timestamp =
        timestamp ??
        (submittedAt ? new Date(submittedAt).toISOString() : new Date(createdAt).toISOString());
    }

    steps.push({
      key: milestone.key,
      label: milestone.label,
      description: milestone.description,
      state: mapMilestoneState(milestoneStates[index] ?? "pending", status),
      timestamp: milestoneStates[index] === "complete" ? timestamp : null,
      phase: "application",
    });

    if (
      milestone.key === "submitted" &&
      identityVerification &&
      shouldTrackIdentityVerification(identityVerification, status)
    ) {
      steps.push(
        buildIdentityVerificationTimelineStep({
          status: identityVerification.status,
          applicationStatus: status,
          verifiedAt: identityVerification.verifiedAt,
          sessionUpdatedAt: identityVerification.sessionUpdatedAt,
        })
      );
    }
  });

  if (fellowship && fellowshipStage) {
    const fellowshipStates = getFellowshipStepStates(fellowshipStage);
    APPLICANT_FELLOWSHIP_STEPS.forEach((step, index) => {
      const state = mapFellowshipState(fellowshipStates[index] ?? "pending");
      const timestamp =
        state === "complete"
          ? fellowshipTimestamp(fellowship, step.key)
          : null;

      steps.push({
        key: `fellowship-${step.key}`,
        label: step.label,
        description: step.description,
        state,
        timestamp,
        phase: "fellowship",
      });
    });
  }

  return steps;
}

export function getCompactPipelineSteps(
  status: ApplicationStatus,
  fellowshipStage: FellowshipStage | null
) {
  const pipelineIndex = getMilestoneIndex(status, fellowshipStage);
  const isRejected = status === "REJECTED" || status === "NOT_ELIGIBLE";

  return APPLICANT_MILESTONES.map((milestone, index) => ({
    key: milestone.key,
    label: milestone.label,
    state: isRejected
      ? index <= Math.max(0, pipelineIndex)
        ? ("complete" as const)
        : ("pending" as const)
      : index < pipelineIndex
        ? ("complete" as const)
        : index === pipelineIndex
          ? ("current" as const)
          : ("pending" as const),
  }));
}

export function getTrackingProgress(
  status: ApplicationStatus,
  fellowshipStage: FellowshipStage | null
): number {
  return getMilestoneProgress(status, fellowshipStage);
}
