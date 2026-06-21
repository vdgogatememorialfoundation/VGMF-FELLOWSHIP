/** Convert a form name into a URL-safe slug (lowercase, hyphen-separated). */
export function slugifyFormName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const PROTECTED_FORM_SLUGS = ["fellowship-application"] as const;

export function isProtectedFormSlug(slug: string): boolean {
  return (PROTECTED_FORM_SLUGS as readonly string[]).includes(slug);
}
