import { MANDATORY_DOCUMENTS, OPTIONAL_DOCUMENTS, BUDGET_MAX } from "./utils";

export const FILE_FIELD_DOCUMENT_TYPES: Record<string, string> = {
  ncism_registration_certificate: "NCISM_REGISTRATION",
  cv_upload: "CV",
  registration_certificate_upload: "REGISTRATION_CERTIFICATE",
  research_proposal_pdf: "RESEARCH_PROPOSAL_PDF",
  budget_proposal_pdf: "BUDGET_PROPOSAL_PDF",
  timeline_pdf: "TIMELINE_PDF",
  ethical_clearance: "ETHICAL_CLEARANCE",
};

export const MANDATORY_DOC_TYPES = MANDATORY_DOCUMENTS.map((d) => d.type) as string[];

export const OPTIONAL_DOC_TYPES = OPTIONAL_DOCUMENTS.map((d) => d.type);

export function getMandatoryDocLabels(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const doc of MANDATORY_DOCUMENTS) {
    map[doc.type] = doc.label;
  }
  return map;
}

export function validateMandatoryDocuments(
  uploadedTypes: string[],
  formFlags: Record<string, unknown>
): string | null {
  for (const [fieldKey, docType] of Object.entries(FILE_FIELD_DOCUMENT_TYPES)) {
    if (!MANDATORY_DOC_TYPES.includes(docType)) continue;
    const uploaded =
      uploadedTypes.includes(docType) || formFlags[`${fieldKey}_uploaded`] === true;
    if (!uploaded) {
      const label =
        MANDATORY_DOCUMENTS.find((d) => d.type === docType)?.label ?? fieldKey;
      return `Please upload: ${label}`;
    }
  }
  return null;
}

export function validateBudgetTotal(data: Record<string, unknown>): string | null {
  const keys = ["equipment", "consumables", "travel", "documentation", "publication", "other"];
  const total = keys.reduce((sum, key) => sum + (Number(data[key]) || 0), 0);
  if (total > BUDGET_MAX) {
    return `Total budget cannot exceed ₹${BUDGET_MAX.toLocaleString("en-IN")}`;
  }
  if (total <= 0) {
    return "Please enter your budget breakdown (total must be greater than zero)";
  }
  return null;
}
