import type { FellowshipStage } from "@prisma/client";
import { FELLOWSHIP_STAGE_LABELS } from "./lifecycle-workflow";

/** Applicant-facing fellowship sub-steps (after selection) */
export const APPLICANT_FELLOWSHIP_STEPS = [
  {
    key: "agreement",
    label: "Agreement & Documents",
    description: "Acceptance letter, undertaking, and bank details",
    stages: ["AGREEMENT_PENDING"] as FellowshipStage[],
    action: { label: "Complete requirements", href: "/applicant/fellowship" },
  },
  {
    key: "bank",
    label: "Bank Verification",
    description: "Foundation verifies your bank account for fund transfer",
    stages: ["BANK_VERIFICATION"] as FellowshipStage[],
    action: { label: "View bank status", href: "/applicant/fellowship" },
  },
  {
    key: "sanctioned",
    label: "Fellowship Sanctioned",
    description: "Official sanction and fellowship ID issued",
    stages: ["SANCTIONED"] as FellowshipStage[],
  },
  {
    key: "inst1",
    label: "Installment 1 Released",
    description: "40% commencement grant (after document approval)",
    stages: ["INSTALLMENT_1_RELEASED", "QUARTERLY_REVIEW_1"] as FellowshipStage[],
    action: { label: "Upload documents", href: "/applicant/fellowship" },
  },
  {
    key: "midterm",
    label: "Mid-Term Review",
    description: "Progress report, case records, and utilization",
    stages: ["QUARTERLY_REVIEW_2", "MID_TERM_REVIEW"] as FellowshipStage[],
    action: { label: "Submit mid-term report", href: "/applicant/fellowship" },
  },
  {
    key: "inst2",
    label: "Installment 2 Released",
    description: "40% after mid-term approval",
    stages: ["INSTALLMENT_2_RELEASED", "QUARTERLY_REVIEW_3"] as FellowshipStage[],
    action: { label: "View installment status", href: "/applicant/fellowship" },
  },
  {
    key: "final",
    label: "Final Submission",
    description: "Final report, manuscript, and utilization certificate",
    stages: [
      "QUARTERLY_REVIEW_4",
      "FINAL_SUBMISSION",
      "FINANCIAL_VERIFICATION",
      "FINAL_PRESENTATION",
    ] as FellowshipStage[],
    action: { label: "Submit final documents", href: "/applicant/fellowship" },
  },
  {
    key: "completed",
    label: "Fellowship Completed",
    description: "All installments released and project formally closed",
    stages: ["INSTALLMENT_3_RELEASED", "COMPLETED"] as FellowshipStage[],
  },
] as const;

export type FellowshipStepState = "complete" | "current" | "pending";

export function getFellowshipStepIndex(stage: FellowshipStage): number {
  for (let i = APPLICANT_FELLOWSHIP_STEPS.length - 1; i >= 0; i--) {
    if (APPLICANT_FELLOWSHIP_STEPS[i].stages.includes(stage)) return i;
  }
  return 0;
}

export function getFellowshipStepStates(stage: FellowshipStage): FellowshipStepState[] {
  const currentIdx = getFellowshipStepIndex(stage);
  if (stage === "COMPLETED") {
    return APPLICANT_FELLOWSHIP_STEPS.map(() => "complete");
  }
  return APPLICANT_FELLOWSHIP_STEPS.map((_, i) => {
    if (i < currentIdx) return "complete";
    if (i === currentIdx) return "current";
    return "pending";
  });
}

export function getFellowshipStepProgress(stage: FellowshipStage): number {
  if (stage === "COMPLETED") return 100;
  const idx = getFellowshipStepIndex(stage);
  return Math.round(((idx + 1) / APPLICANT_FELLOWSHIP_STEPS.length) * 100);
}

export function getFellowshipStageLabel(stage: FellowshipStage): string {
  return FELLOWSHIP_STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

export type FellowshipPendingAction = {
  key: string;
  label: string;
  detail: string;
  href: string;
  urgent?: boolean;
};

export function getFellowshipPendingActions(input: {
  currentStage: FellowshipStage;
  bankSubmitted: boolean;
  bankVerified: boolean;
  installment1DocsComplete: boolean;
  hasPendingQuarterly: boolean;
}): FellowshipPendingAction[] {
  const actions: FellowshipPendingAction[] = [];

  if (input.currentStage === "AGREEMENT_PENDING") {
    if (!input.bankSubmitted) {
      actions.push({
        key: "bank_details",
        label: "Submit bank details",
        detail: "Required before Installment 1 can be released",
        href: "/applicant/fellowship#bank-details",
        urgent: true,
      });
    }
    if (!input.installment1DocsComplete) {
      actions.push({
        key: "inst1_docs",
        label: "Upload Installment 1 documents",
        detail: "Bank verification proof and any pending fellowship documents",
        href: "/applicant/fellowship#installment-1",
        urgent: true,
      });
    }
  }

  if (input.currentStage === "BANK_VERIFICATION" && !input.bankVerified) {
    actions.push({
      key: "bank_pending",
      label: "Bank verification in progress",
      detail: "Foundation is verifying your submitted bank details",
      href: "/applicant/fellowship#bank-details",
    });
  }

  if (input.hasPendingQuarterly) {
    actions.push({
      key: "quarterly",
      label: "Submit quarterly progress report",
      detail: "Due per fellowship rulebook schedule",
      href: "/applicant/fellowship#quarterly-reports",
      urgent: true,
    });
  }

  if (
    ["MID_TERM_REVIEW", "QUARTERLY_REVIEW_2", "INSTALLMENT_2_RELEASED"].includes(
      input.currentStage
    )
  ) {
    actions.push({
      key: "midterm",
      label: "Mid-term progress & utilization",
      detail: "Required for Installment 2 release",
      href: "/applicant/fellowship#installment-2",
    });
  }

  if (
    ["FINAL_SUBMISSION", "QUARTERLY_REVIEW_4", "FINAL_PRESENTATION"].includes(
      input.currentStage
    )
  ) {
    actions.push({
      key: "final",
      label: "Submit final report & manuscript",
      detail: "Required for final installment and fellowship closure",
      href: "/applicant/fellowship#final-submission",
      urgent: true,
    });
  }

  return actions;
}
