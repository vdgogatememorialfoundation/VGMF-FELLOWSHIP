export const ADMIN_REPORTS = [
  { id: "applicants", title: "Applicant List" },
  { id: "reviewer-scores", title: "Reviewer Scores" },
  { id: "fellowship-awards", title: "Fellowship Awards" },
  { id: "progress-reports", title: "Progress Reports" },
  { id: "fund-utilization", title: "Fund Utilization" },
  { id: "publications", title: "Publications" },
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
