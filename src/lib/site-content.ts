import type { Prisma } from "@prisma/client";

export type NavLink = { href: string; label: string };
export type HeroStat = { label: string; value: string };
export type SnapshotItem = { title: string; desc: string; icon: string };
export type HighlightTile = {
  title: string;
  desc: string;
  icon?: string;
  variant?: "large" | "default" | "dashed";
  accent?: string;
};
export type JourneyStep = { step: string; title: string; desc: string; icon: string };
export type FaqItem = { q: string; a: string };

export const DEFAULT_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/#highlights", label: "Highlights" },
  { href: "/#notices", label: "Notices" },
  { href: "/#apply", label: "Apply" },
  { href: "/#faq", label: "FAQ" },
  { href: "/about", label: "Foundation" },
];

export const DEFAULT_FOOTER_QUICK_LINKS: NavLink[] = [
  { href: "/#highlights", label: "Programme highlights" },
  { href: "/#notices", label: "Official notices" },
  { href: "/register", label: "Start application" },
  { href: "/about", label: "About foundation" },
  { href: "/applicant/status", label: "Track application" },
];

export const DEFAULT_FOOTER_LEGAL_LINKS: NavLink[] = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/undertaking", label: "Applicant Undertaking" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];

export const DEFAULT_HERO_STATS: HeroStat[] = [
  { label: "Grant up to", value: "₹75,000" },
  { label: "Tracking", value: "12-digit ID" },
  { label: "Focus", value: "Viddhakarma" },
];

export const DEFAULT_HERO_SNAPSHOT: SnapshotItem[] = [
  { icon: "Microscope", title: "Research-first", desc: "Clinical & evidence-based proposals" },
  { icon: "BadgeCheck", title: "Transparent review", desc: "Scoring, shortlist & final award" },
  { icon: "Bell", title: "Live updates", desc: "Notices, email & dashboard alerts" },
];

export const DEFAULT_HIGHLIGHTS: HighlightTile[] = [
  {
    title: "Research grants",
    desc: "Up to ₹75,000 for approved fellowship proposals with milestone-based fund release.",
    icon: "IndianRupee",
    variant: "large",
    accent: "₹75K",
  },
  {
    title: "Expert review panel",
    desc: "Reviewer scoring, committee remarks, and structured shortlisting.",
    icon: "Users",
  },
  {
    title: "Viddhakarma focus",
    desc: "Evidence-based Ayurvedic research with real clinical relevance.",
    icon: "BookOpen",
  },
  {
    title: "Smart tracking",
    desc: "12-digit application number + live status.",
    icon: "FileText",
  },
  {
    title: "Installment payouts",
    desc: "40/40/20 disbursement after milestones.",
    icon: "Award",
  },
  {
    title: "Built for practitioners",
    desc: "Register, apply, and track — all in one place.",
    icon: "GraduationCap",
    variant: "dashed",
  },
];

export const DEFAULT_JOURNEY_STEPS: JourneyStep[] = [
  {
    step: "01",
    title: "Register & verify",
    desc: "Create your account with email and WhatsApp OTP verification and get your User ID.",
    icon: "GraduationCap",
  },
  {
    step: "02",
    title: "Submit proposal",
    desc: "Complete the fellowship form, upload documents, and receive your 12-digit tracking number.",
    icon: "FileText",
  },
  {
    step: "03",
    title: "Review & award",
    desc: "Reviewers score your work, interviews may follow, and selected fellows receive grants.",
    icon: "Award",
  },
];

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    q: "Who can apply for the VGMF Fellowship 2026?",
    a: "Practitioners with BAMS and relevant clinical or research background can register, complete the fellowship application, and submit proposals in Viddhakarma and allied Ayurvedic research areas.",
  },
  {
    q: "What is the grant amount?",
    a: "Selected fellows can receive research grants up to ₹75,000, disbursed in structured installments after approval and milestone reviews.",
  },
  {
    q: "How do I track my application?",
    a: "After submission you receive a 12-digit application number by email. Use it on your applicant dashboard to track status, notices, and reviewer updates.",
  },
  {
    q: "What documents are required?",
    a: "Applicants typically submit proposal details, professional credentials, and supporting documents as listed in the application form. Admin may request resubmission if needed.",
  },
  {
    q: "How does the review process work?",
    a: "Applications move through review, shortlisting, interview (if applicable), and final selection. Reviewers score proposals and trustees approve fellowship awards.",
  },
];

export function parseJsonArray<T>(value: Prisma.JsonValue | null | undefined, fallback: T[]): T[] {
  if (!value || !Array.isArray(value)) return fallback;
  return value as T[];
}

export const SECRET_MASK = "••••••••••••";

export function maskSecret(value: string | null | undefined): string {
  return value ? SECRET_MASK : "";
}

export function isMaskedSecret(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === SECRET_MASK) return true;
  if (/^[•*.\s]+$/.test(trimmed)) return true;
  return false;
}

export function resolveSecret(incoming: string | undefined, existing: string | null): string | null {
  if (incoming === undefined || isMaskedSecret(incoming)) {
    return existing;
  }
  return incoming.trim();
}
