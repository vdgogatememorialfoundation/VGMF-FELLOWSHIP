import type { FellowshipStage } from "@prisma/client";

const STAGE_ORDER: FellowshipStage[] = [
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
];

export function getNextFellowshipStage(current: FellowshipStage): FellowshipStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function stageForInstallmentRelease(installmentNo: number): FellowshipStage {
  if (installmentNo === 1) return "INSTALLMENT_1_RELEASED";
  if (installmentNo === 2) return "INSTALLMENT_2_RELEASED";
  return "INSTALLMENT_3_RELEASED";
}

export function stageForQuarterlyReport(quarter: number): FellowshipStage {
  const map: Record<number, FellowshipStage> = {
    1: "QUARTERLY_REVIEW_1",
    2: "QUARTERLY_REVIEW_2",
    3: "QUARTERLY_REVIEW_3",
    4: "QUARTERLY_REVIEW_4",
  };
  return map[quarter] ?? "QUARTERLY_REVIEW_1";
}
