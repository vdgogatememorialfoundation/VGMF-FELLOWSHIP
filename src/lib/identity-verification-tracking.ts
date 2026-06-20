import type { ApplicationStatus, VerificationStatus } from "@prisma/client";
import type { TrackingTimelineStep } from "./tracking-timeline";

export type IdentityVerificationTrackingInput = {
  enabled: boolean;
  required: boolean;
  status: VerificationStatus;
  verifiedAt: Date | string | null;
  sessionUpdatedAt?: Date | string | null;
  sessionStartedAt?: Date | string | null;
};

const SCRUTINY_PHASE_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "SCRUTINY",
  "QUERY_RAISED",
  "QUERY_RESPONDED",
];

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function shouldTrackIdentityVerification(
  input: Pick<IdentityVerificationTrackingInput, "enabled" | "status" | "required">,
  applicationStatus: ApplicationStatus
): boolean {
  if (!input.enabled) return false;
  if (input.status !== "NOT_STARTED") return true;
  if (!input.required) return false;
  return SCRUTINY_PHASE_STATUSES.includes(applicationStatus);
}

export function mapIdentityVerificationTimelineState(
  status: VerificationStatus,
  applicationStatus: ApplicationStatus
): TrackingTimelineStep["state"] {
  if (status === "APPROVED") return "complete";
  if (status === "DECLINED") return "failed";
  if (status === "IN_REVIEW" || status === "IN_PROGRESS") return "current";
  if (status === "ABANDONED" || status === "EXPIRED") {
    return SCRUTINY_PHASE_STATUSES.includes(applicationStatus) ? "current" : "pending";
  }
  if (SCRUTINY_PHASE_STATUSES.includes(applicationStatus)) return "current";
  return "pending";
}

export function buildIdentityVerificationTimelineStep(input: {
  status: VerificationStatus;
  applicationStatus: ApplicationStatus;
  verifiedAt: Date | string | null;
  sessionUpdatedAt?: Date | string | null;
}): TrackingTimelineStep {
  const state = mapIdentityVerificationTimelineState(input.status, input.applicationStatus);

  let description = "Verify your identity online with a government ID and camera check.";
  if (input.status === "APPROVED") {
    description = "Your online identity verification is complete.";
  } else if (input.status === "IN_REVIEW") {
    description = "Digio is reviewing your verification. No action needed right now.";
  } else if (input.status === "IN_PROGRESS") {
    description = "Finish the Digio session if you closed it before completing all checks.";
  } else if (input.status === "DECLINED") {
    description = "Verification was declined. Start a new session from Identity Verification.";
  } else if (input.status === "ABANDONED" || input.status === "EXPIRED") {
    description = "Your previous session expired. Start verification again when ready.";
  } else if (SCRUTINY_PHASE_STATUSES.includes(input.applicationStatus)) {
    description = "Required during document scrutiny before the Foundation can approve your files.";
  }

  return {
    key: "identity-verification",
    label: "Online Identity Verification",
    description,
    state,
    timestamp:
      state === "complete"
        ? toIso(input.verifiedAt) ?? toIso(input.sessionUpdatedAt)
        : state === "current" && input.status !== "NOT_STARTED"
          ? toIso(input.sessionUpdatedAt)
          : null,
    phase: "application",
  };
}

const DETAIL_STEPS = [
  {
    key: "identity-start",
    label: "Start verification",
    description: "Open the secure Digio session from this page.",
  },
  {
    key: "identity-id",
    label: "Government ID check",
    description: "Your ID document is scanned and validated.",
  },
  {
    key: "identity-liveness",
    label: "Selfie & liveness check",
    description: "Your photo is matched against your ID in real time.",
  },
  {
    key: "identity-approved",
    label: "Verification approved",
    description: "Identity confirmed — no further action for this step.",
  },
] as const;

function detailStepStates(
  status: VerificationStatus
): TrackingTimelineStep["state"][] {
  switch (status) {
    case "APPROVED":
      return ["complete", "complete", "complete", "complete"];
    case "IN_REVIEW":
      return ["complete", "complete", "complete", "current"];
    case "IN_PROGRESS":
      return ["complete", "current", "pending", "pending"];
    case "DECLINED":
      return ["complete", "complete", "failed", "pending"];
    case "ABANDONED":
    case "EXPIRED":
      return ["complete", "current", "pending", "pending"];
    case "NOT_STARTED":
    default:
      return ["current", "pending", "pending", "pending"];
  }
}

export function buildIdentityVerificationDetailSteps(input: {
  status: VerificationStatus;
  verifiedAt: Date | string | null;
  sessionUpdatedAt?: Date | string | null;
  sessionStartedAt?: Date | string | null;
}): TrackingTimelineStep[] {
  const states = detailStepStates(input.status);

  return DETAIL_STEPS.map((step, index) => {
    const state = states[index] ?? "pending";
    let timestamp: string | null = null;

    if (state === "complete") {
      if (step.key === "identity-approved") {
        timestamp = toIso(input.verifiedAt) ?? toIso(input.sessionUpdatedAt);
      } else if (step.key === "identity-start") {
        timestamp = toIso(input.sessionStartedAt) ?? toIso(input.sessionUpdatedAt);
      } else {
        timestamp = toIso(input.sessionUpdatedAt);
      }
    } else if (state === "current" && input.status !== "NOT_STARTED") {
      timestamp = toIso(input.sessionUpdatedAt);
    }

    return {
      key: step.key,
      label: step.label,
      description: step.description,
      state,
      timestamp,
      phase: "application",
    };
  });
}

export function getIdentityVerificationStatusLabel(status: VerificationStatus): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
