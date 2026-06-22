import type { FormFieldType } from "@prisma/client";
import {
  FILE_FIELD_DOCUMENT_TYPES,
  validateMandatoryDocuments,
  validateBudgetTotal,
} from "./form-documents";

export type FormFieldDefinition = {
  fieldKey: string;
  label: string;
  fieldType: FormFieldType | string;
  required: boolean;
};

export { FILE_FIELD_DOCUMENT_TYPES };

export function isCheckboxAccepted(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

export function validateFormSubmission(
  fields: FormFieldDefinition[],
  data: Record<string, unknown>
): string | null {
  for (const field of fields) {
    const value = data[field.fieldKey];

    if (field.fieldType === "CHECKBOX") {
      if (field.required && !isCheckboxAccepted(value)) {
        return `Please accept: ${field.label}`;
      }
      continue;
    }

    if (field.fieldType === "FILE") {
      if (field.required && !data[`${field.fieldKey}_uploaded`]) {
        return `Please upload: ${field.label}`;
      }
      continue;
    }

    if (field.fieldKey === "group_member_details" && data.application_type === "Group") {
      if (value == null || String(value).trim() === "") {
        return "Please provide details of all other group members";
      }
      continue;
    }

    if (!field.required) continue;

    if (value == null || String(value).trim() === "") {
      return `${field.label} is required`;
    }

    if (field.fieldKey === "pincode" && !/^\d{6}$/.test(String(value).trim())) {
      return "Please enter a valid 6-digit pincode";
    }
  }

  if (!isCheckboxAccepted(data.terms_accepted)) {
    return "You must accept the Terms & Conditions to submit your application";
  }

  if (!isCheckboxAccepted(data.rulebook_accepted)) {
    return "You must accept the Viddhakarma Research Fellowship Rulebook to submit your application";
  }

  // Digital undertaking is validated separately via applicationId in forms route

  const docError = validateMandatoryDocuments([], data);
  if (docError) return docError;

  const hasBudgetFields = [
    "equipment",
    "consumables",
    "travel",
    "documentation",
    "publication",
    "other",
  ].some((key) => data[key] != null && String(data[key]).trim() !== "");

  if (hasBudgetFields) {
    const budgetError = validateBudgetTotal(data);
    if (budgetError) return budgetError;
  }

  return null;
}
