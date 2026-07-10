export const ADMIN_REPORTS = [
  { id: "applicants", title: "Applicant List" },
  { id: "reviewer-scores", title: "Reviewer Scores" },
  { id: "fellowship-awards", title: "Fellowship Awards" },
  { id: "progress-reports", title: "Progress Reports" },
  { id: "fund-utilization", title: "Fund Utilization" },
  { id: "publications", title: "Publications" },
  { id: "all-submissions", title: "All Submissions (Comprehensive)", description: "Complete applicant data including personal info, documents, and status" },
  { id: "document-status", title: "Document Status Report", description: "All submitted documents with verification status" },
  { id: "interview-history", title: "Interview History", description: "All interviews with scheduling and outcome details" },
  { id: "status-tracker", title: "Application Status Tracker", description: "Track all applications through workflow stages" },
] as const;

export type AdminReportId = (typeof ADMIN_REPORTS)[number]["id"];

export function isAdminReportId(value: string): value is AdminReportId {
  return ADMIN_REPORTS.some((report) => report.id === value);
}

export function reportDownloadFilename(reportId: AdminReportId, format: "csv" | "pdf"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = reportId.replace(/-/g, "_");
  return format === "csv"
    ? `vgmf_${base}_${stamp}.csv`
    : `vgmf_${base}_${stamp}.pdf`;
}

export function reportZipFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `vgmf_all_reports_${stamp}.zip`;
}
