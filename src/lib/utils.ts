import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getLifecycleStatusLabel,
  getLifecycleStatusColor,
} from "./lifecycle-workflow";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const BUDGET_MAX = 75000;

export const RESEARCH_AREAS = [
  { value: "MUSCULOSKELETAL_DISORDERS", label: "Musculoskeletal Disorders" },
  { value: "PAIN_MANAGEMENT", label: "Pain Management" },
  { value: "NEUROLOGICAL_DISORDERS", label: "Neurological Disorders" },
  { value: "COMPARATIVE_STUDIES", label: "Comparative Studies" },
  { value: "MECHANISM_BASED_RESEARCH", label: "Mechanism Based Research" },
  { value: "CLASSICAL_DOCUMENTATION", label: "Classical Documentation" },
  { value: "PROTOCOL_DEVELOPMENT", label: "Protocol Development" },
  { value: "OTHER", label: "Other" },
] as const;

export function getStatusLabel(status: string): string {
  return getLifecycleStatusLabel(status);
}

export function getStatusColor(status: string): string {
  return getLifecycleStatusColor(status);
}

export const APPLICATION_STATUSES = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
  color: STATUS_COLORS[value] ?? "bg-gray-100 text-gray-800",
}));

export const SCORING_CRITERIA = [
  { key: "scientificMerit", label: "Scientific Merit", maxMarks: 25 },
  { key: "innovation", label: "Innovation", maxMarks: 20 },
  { key: "feasibility", label: "Feasibility", maxMarks: 20 },
  { key: "budgetJustification", label: "Budget Justification", maxMarks: 15 },
  { key: "viddhakarmaRelevance", label: "Relevance to Viddhakarma", maxMarks: 20 },
] as const;

export const MANDATORY_DOCUMENTS = [
  { type: "CV", label: "CV" },
  { type: "REGISTRATION_CERTIFICATE", label: "Registration Certificate" },
  { type: "NCISM_REGISTRATION", label: "NCISM Registration Certificate" },
  { type: "RESEARCH_PROPOSAL_PDF", label: "Research Proposal PDF" },
  { type: "BUDGET_PROPOSAL_PDF", label: "Budget Proposal PDF" },
  { type: "TIMELINE_PDF", label: "Timeline PDF" },
] as const;

export const OPTIONAL_DOCUMENTS = [
  { type: "ETHICAL_CLEARANCE", label: "Ethical Clearance" },
  { type: "PUBLICATIONS", label: "Publications" },
  { type: "RECOMMENDATION_LETTER", label: "Recommendation Letter" },
] as const;
