import prisma from "./db";
import type { FellowshipDocType } from "@prisma/client";
import {
  getInstallmentRequirements,
  type RequirementStatus,
} from "./installment-requirements";
import { getUndertakingPdfUrl } from "./undertaking-assets";

type FellowshipWithDocs = {
  id: string;
  applicationId: string;
  fellowshipDocuments: Array<{
    id: string;
    installmentNo: number;
    type: FellowshipDocType;
    status: string;
    filePath: string;
  }>;
  progressReports: Array<{ status: string; reportPath: string | null }>;
  finalSubmission: {
    status: string;
    finalReportPath: string | null;
    manuscriptPath: string | null;
    utilizationCertPath: string | null;
  } | null;
  application: {
    digitalUndertaking: { id: string } | null;
  };
};

export async function getInstallmentRequirementStatus(
  fellowship: FellowshipWithDocs,
  installmentNo: number
): Promise<RequirementStatus[]> {
  const requirements = getInstallmentRequirements(installmentNo);
  const docs = fellowship.fellowshipDocuments.filter((d) => d.installmentNo === installmentNo);

  return requirements.map((req) => {
    if (req.type === "DIGITAL_UNDERTAKING") {
      const undertaking = fellowship.application.digitalUndertaking;
      return {
        key: req.key,
        label: req.label,
        type: req.type,
        source: req.source,
        satisfied: Boolean(undertaking),
        status: undertaking ? "SUBMITTED" : "MISSING",
        filePath: undertaking ? getUndertakingPdfUrl(fellowship.applicationId) : null,
        detail: undertaking ? "Digital undertaking on file" : "Applicant must complete digital undertaking",
      };
    }

    const doc = docs.find((d) => d.type === req.type);

    if (installmentNo === 2 && req.type === "PROGRESS_REPORT") {
      const approvedReport = fellowship.progressReports.find(
        (r) => r.status === "APPROVED" && r.reportPath
      );
      const fellowshipDoc = doc?.status === "APPROVED";
      const satisfied = Boolean(approvedReport || fellowshipDoc);
      return {
        key: req.key,
        label: req.label,
        type: req.type,
        source: req.source,
        satisfied,
        status: satisfied ? "APPROVED" : doc?.status ?? (approvedReport ? "APPROVED" : "MISSING"),
      filePath: doc?.filePath ?? approvedReport?.reportPath ?? null,
      documentId: doc?.id ?? null,
      detail: satisfied
          ? undefined
          : "Submit and get progress report approved",
      };
    }

    if (installmentNo === 3) {
      const final = fellowship.finalSubmission;
      const fieldMap: Record<string, keyof NonNullable<typeof final>> = {
        FINAL_REPORT: "finalReportPath",
        PUBLICATION_MANUSCRIPT: "manuscriptPath",
        UTILIZATION_CERTIFICATE: "utilizationCertPath",
      };
      const field = fieldMap[req.type];
      const hasFile = field && final?.[field];
      const docApproved = doc?.status === "APPROVED";
      const finalApproved = final?.status === "APPROVED";
      const satisfied = Boolean((hasFile && finalApproved) || docApproved);

      return {
        key: req.key,
        label: req.label,
        type: req.type,
        source: req.source,
        satisfied,
        status: satisfied ? "APPROVED" : doc?.status ?? (hasFile ? final?.status : "MISSING"),
        filePath: doc?.filePath ?? (hasFile ? String(final?.[field]) : null),
        detail: satisfied ? undefined : "Submit final deliverables and await admin approval",
      };
    }

    const satisfied = doc?.status === "APPROVED";
    return {
      key: req.key,
      label: req.label,
      type: req.type,
      source: req.source,
      satisfied,
      status: doc?.status ?? "MISSING",
      filePath: doc?.filePath ?? null,
      documentId: doc?.id ?? null,
      detail: satisfied ? undefined : `Upload ${req.label} and await staff approval`,
    };
  });
}

export async function validateInstallmentRelease(
  fellowshipId: string,
  installmentNo: number
): Promise<{ ok: boolean; missing: string[]; requirements: RequirementStatus[] }> {
  const fellowship = await prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    include: {
      fellowshipDocuments: true,
      progressReports: true,
      finalSubmission: true,
      application: { include: { digitalUndertaking: true } },
    },
  });

  if (!fellowship) {
    return { ok: false, missing: ["Fellowship not found"], requirements: [] };
  }

  const requirements = await getInstallmentRequirementStatus(fellowship, installmentNo);
  const missing = requirements.filter((r) => !r.satisfied).map((r) => r.label);

  if (installmentNo === 2) {
    const midTerm = await prisma.midTermReview.findFirst({
      where: { fellowshipId, nextInstallmentApproved: true },
    });
    if (!midTerm) {
      missing.push("Mid-term review approval");
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    requirements,
  };
}
