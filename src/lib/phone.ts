/** Canonical 10-digit Indian mobile for DB storage and OTP lookup. */
export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length >= 12) return digits.slice(-10);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/** Meta WhatsApp API recipient format (91 + 10 digits). */
export function normalizePhoneE164(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) return `91${digits}`;
  return phone.replace(/\D/g, "");
}

export function phoneLookupVariants(identifier: string): string[] {
  const trimmed = identifier.trim();
  const digits = normalizePhoneDigits(trimmed);
  const variants = new Set<string>();
  if (trimmed) variants.add(trimmed);
  if (digits) {
    variants.add(digits);
    variants.add(`91${digits}`);
    variants.add(`+91${digits}`);
  }
  return [...variants];
}
