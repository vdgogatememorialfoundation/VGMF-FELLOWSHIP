type DiditRecord = Record<string, unknown>;

function asArray(value: unknown): DiditRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DiditRecord => !!item && typeof item === "object");
}

export function summarizeDiditDecision(decision: unknown): DiditDecisionSummary {
  const root = (decision && typeof decision === "object" ? decision : {}) as DiditRecord;

  return {
    status: typeof root.status === "string" ? root.status : null,
    idVerifications: asArray(root.id_verifications).map((item) => ({
      status: String(item.status ?? "—"),
      firstName: item.first_name ? String(item.first_name) : null,
      lastName: item.last_name ? String(item.last_name) : null,
      documentType: item.document_type ? String(item.document_type) : null,
      documentNumber: item.document_number ? String(item.document_number) : null,
      dateOfBirth: item.date_of_birth ? String(item.date_of_birth) : null,
      nationality: item.nationality ? String(item.nationality) : null,
    })),
    livenessChecks: asArray(root.liveness_checks).map((item) => ({
      status: String(item.status ?? "—"),
      score: typeof item.score === "number" ? item.score : null,
      method: item.method ? String(item.method) : null,
    })),
    faceMatches: asArray(root.face_matches).map((item) => ({
      status: String(item.status ?? "—"),
      score: typeof item.score === "number" ? item.score : null,
    })),
    amlScreenings: asArray(root.aml_screenings).map((item) => ({
      status: String(item.status ?? "—"),
      totalHits: typeof item.total_hits === "number" ? item.total_hits : null,
    })),
    phoneVerifications: asArray(root.phone_verifications).map((item) => ({
      status: String(item.status ?? "—"),
      fullNumber: item.full_number ? String(item.full_number) : null,
    })),
    emailVerifications: asArray(root.email_verifications).map((item) => ({
      status: String(item.status ?? "—"),
      email: item.email ? String(item.email) : null,
    })),
  };
}

export type DiditDecisionSummary = {
  status: string | null;
  idVerifications: Array<{
    status: string;
    firstName: string | null;
    lastName: string | null;
    documentType: string | null;
    documentNumber: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
  }>;
  livenessChecks: Array<{ status: string; score: number | null; method: string | null }>;
  faceMatches: Array<{ status: string; score: number | null }>;
  amlScreenings: Array<{ status: string; totalHits: number | null }>;
  phoneVerifications: Array<{ status: string; fullNumber: string | null }>;
  emailVerifications: Array<{ status: string; email: string | null }>;
};

export function getDiditPurposeLabel(purpose: string): string {
  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return "Applicant identity verification";
    case "BANK_ACCOUNT":
      return "Bank account verification";
    case "UNDERTAKING_IDENTITY":
      return "Undertaking identity verification";
    default:
      return "Identity verification";
  }
}

export function getDiditStatusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Verified";
    case "DECLINED":
      return "Declined";
    case "IN_REVIEW":
      return "Under review";
    case "IN_PROGRESS":
      return "In progress";
    case "ABANDONED":
      return "Abandoned";
    case "EXPIRED":
      return "Expired";
    case "NOT_STARTED":
    default:
      return "Not started";
  }
}
