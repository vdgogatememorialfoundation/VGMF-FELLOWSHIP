export const SITE_NAME =
  "Vaidya Gogate Memorial Foundation Fellowship Portal 2026";

export const CMS_PAGE_SLUGS = {
  ABOUT: "about",
  TERMS: "terms",
  UNDERTAKING: "undertaking",
  RULEBOOK: "rulebook",
  PRIVACY: "privacy",
  REFUND: "refund",
} as const;

export const CMS_PAGE_ROUTES: Record<string, string> = {
  ABOUT: "/about",
  TERMS: "/terms",
  UNDERTAKING: "/undertaking",
  RULEBOOK: "/rulebook",
  PRIVACY: "/privacy",
  REFUND: "/refund-policy",
};

export const FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "TEXTAREA", label: "Textarea" },
  { value: "SELECT", label: "Dropdown" },
  { value: "RADIO", label: "Radio" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "FILE", label: "File Upload" },
] as const;
