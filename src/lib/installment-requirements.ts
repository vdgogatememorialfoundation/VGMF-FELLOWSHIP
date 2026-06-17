import type { FellowshipDocType } from "@prisma/client";

export type InstallmentRequirement = {
  key: string;
  label: string;
  type: FellowshipDocType | "DIGITAL_UNDERTAKING";
  source: "fellow" | "admin" | "system";
};

export const INSTALLMENT_REQUIREMENTS: Record<number, InstallmentRequirement[]> = {
  1: [
    {
      key: "acceptance_letter",
      label: "Acceptance Letter",
      type: "ACCEPTANCE_LETTER",
      source: "admin",
    },
    {
      key: "undertaking",
      label: "Digital Undertaking (signed PDF)",
      type: "DIGITAL_UNDERTAKING",
      source: "system",
    },
    {
      key: "bank_verification",
      label: "Bank Verification",
      type: "BANK_VERIFICATION",
      source: "fellow",
    },
  ],
  2: [
    {
      key: "progress_report",
      label: "Progress Report",
      type: "PROGRESS_REPORT",
      source: "fellow",
    },
    {
      key: "utilization_statement",
      label: "Utilization Statement",
      type: "UTILIZATION_STATEMENT",
      source: "fellow",
    },
  ],
  3: [
    {
      key: "final_report",
      label: "Final Report",
      type: "FINAL_REPORT",
      source: "fellow",
    },
    {
      key: "publication_manuscript",
      label: "Publication Manuscript",
      type: "PUBLICATION_MANUSCRIPT",
      source: "fellow",
    },
    {
      key: "utilization_certificate",
      label: "Utilization Certificate",
      type: "UTILIZATION_CERTIFICATE",
      source: "fellow",
    },
  ],
};

export type RequirementStatus = {
  key: string;
  label: string;
  type: string;
  source: string;
  satisfied: boolean;
  status?: string;
  filePath?: string | null;
  documentId?: string | null;
  detail?: string;
};

export function getInstallmentRequirements(installmentNo: number): InstallmentRequirement[] {
  return INSTALLMENT_REQUIREMENTS[installmentNo] ?? [];
}
