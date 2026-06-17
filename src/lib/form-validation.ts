import type { FormFieldType } from "@prisma/client";

export type FormFieldDefinition = {
  fieldKey: string;
  label: string;
  fieldType: FormFieldType | string;
  required: boolean;
};

export const FILE_FIELD_DOCUMENT_TYPES: Record<string, string> = {
  ncism_registration_certificate: "NCISM_REGISTRATION",
};

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

  if (!isCheckboxAccepted(data.undertaking_accepted)) {
    return "You must accept the Undertaking to submit your application";
  }

  return null;
}
