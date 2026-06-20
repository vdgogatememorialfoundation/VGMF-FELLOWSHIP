type DigioRecord = Record<string, unknown>;

function asArray(value: unknown): DigioRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DigioRecord => !!item && typeof item === "object");
}

function readString(record: DigioRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function summarizeDigioDecision(decision: unknown): DigioDecisionSummary {
  const root = (decision && typeof decision === "object" ? decision : {}) as DigioRecord;

  const actions = asArray(root.actions);
  const idActions = actions.filter((item) => {
    const type = readString(item, "type", "action_type", "action");
    return type?.toLowerCase().includes("id") || type?.toLowerCase().includes("document");
  });

  const selfieActions = actions.filter((item) => {
    const type = readString(item, "type", "action_type", "action");
    return (
      type?.toLowerCase().includes("selfie") ||
      type?.toLowerCase().includes("liveness") ||
      type?.toLowerCase().includes("face")
    );
  });

  const bankDetails =
    root.bank_account && typeof root.bank_account === "object"
      ? (root.bank_account as DigioRecord)
      : root;

  return {
    status: readString(root, "status"),
    idVerifications: idActions.map((item) => ({
      status: readString(item, "status", "action_status") ?? "—",
      firstName: readString(item, "first_name", "given_name"),
      lastName: readString(item, "last_name", "family_name"),
      documentType: readString(item, "document_type", "id_type", "type"),
      documentNumber: readString(item, "document_number", "id_number", "pan"),
      dateOfBirth: readString(item, "date_of_birth", "dob"),
      nationality: readString(item, "nationality"),
    })),
    livenessChecks: selfieActions.map((item) => ({
      status: readString(item, "status", "action_status") ?? "—",
      score:
        typeof item.score === "number"
          ? item.score
          : typeof item.match_score === "number"
            ? item.match_score
            : null,
      method: readString(item, "method", "type"),
    })),
    faceMatches: selfieActions.map((item) => ({
      status: readString(item, "status", "action_status") ?? "—",
      score:
        typeof item.match_score === "number"
          ? item.match_score
          : typeof item.score === "number"
            ? item.score
            : null,
    })),
    bankVerification: {
      status:
        readString(bankDetails, "status", "verification_status") ??
        readString(root, "bank_verification_status"),
      beneficiaryName: readString(
        bankDetails,
        "beneficiary_name_with_bank",
        "beneficiary_name",
        "account_holder_name"
      ),
      accountNumber: readString(bankDetails, "beneficiary_account_no", "account_number"),
      ifsc: readString(bankDetails, "beneficiary_ifsc", "ifsc"),
      fuzzyMatchScore:
        typeof bankDetails.fuzzy_match_score === "number"
          ? bankDetails.fuzzy_match_score
          : typeof bankDetails.name_match_score === "number"
            ? bankDetails.name_match_score
            : null,
    },
  };
}

export type DigioDecisionSummary = {
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
  bankVerification: {
    status: string | null;
    beneficiaryName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    fuzzyMatchScore: number | null;
  };
};

export function getVerificationPurposeLabel(purpose: string): string {
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

export function getVerificationStatusLabel(status: string): string {
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
