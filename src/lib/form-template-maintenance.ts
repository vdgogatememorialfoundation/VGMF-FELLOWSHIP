import prisma from "./db";

const DEPRECATED_FORM_FIELD_KEYS = ["registration_certificate_upload"] as const;

/** Hide legacy duplicate upload fields without requiring a manual DB edit. */
export async function deactivateDeprecatedFormFields(): Promise<void> {
  await prisma.formField.updateMany({
    where: { fieldKey: { in: [...DEPRECATED_FORM_FIELD_KEYS] } },
    data: { isActive: false, required: false },
  });
}
