import prisma from "./db";
import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";
import { formatDate, formatCurrency, getStatusLabel } from "./utils";
import type { AdminReportId } from "./admin-report-types";
import { ADMIN_REPORTS } from "./admin-report-types";

export { ADMIN_REPORTS, type AdminReportId, isAdminReportId, reportDownloadFilename } from "./admin-report-types";

function ensurePdfkitFonts() {
  const fontDir = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  if (existsSync(fontDir)) {
    process.env.PDFKIT_FONT_PATH = fontDir;
  }
}

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsvBuffer(rows: string[][]): Buffer {
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  return Buffer.from(`\uFEFF${body}`, "utf-8");
}

async function loadApplicantRows(): Promise<string[][]> {
  const applications = await prisma.application.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      researchProposal: true,
      fellowship: { select: { fellowshipId: true, sanctionedAmount: true } },
    },
  });

  return [
    [
      "Application Number",
      "Name",
      "Email",
      "Mobile",
      "City",
      "State",
      "Status",
      "Submitted At",
      "Project Title",
      "Research Area",
      "Fellowship ID",
      "Sanctioned Amount",
    ],
    ...applications.map((app) => [
      app.applicationNumber,
      app.name,
      app.email,
      app.mobile,
      app.city,
      app.state,
      getStatusLabel(app.status),
      app.submittedAt ? formatDate(app.submittedAt) : "",
      app.researchProposal?.projectTitle ?? "",
      app.researchProposal?.researchArea ?? "",
      app.fellowship?.fellowshipId ?? "",
      app.fellowship ? formatCurrency(app.fellowship.sanctionedAmount) : "",
    ]),
  ];
}

async function loadReviewerScoreRows(): Promise<string[][]> {
  const scores = await prisma.committeeScore.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      application: { select: { applicationNumber: true, name: true } },
      committeeUser: { include: { profile: true } },
    },
  });

  return [
    [
      "Application Number",
      "Applicant Name",
      "Reviewer",
      "Scientific Merit",
      "Innovation",
      "Feasibility",
      "Budget Justification",
      "Viddhakarma Relevance",
      "Total Score",
      "Shortlisted",
      "Remarks",
      "Updated At",
    ],
    ...scores.map((score) => [
      score.application.applicationNumber,
      score.application.name,
      score.committeeUser.profile?.name || score.committeeUser.email,
      String(score.scientificMerit),
      String(score.innovation),
      String(score.feasibility),
      String(score.budgetJustification),
      String(score.viddhakarmaRelevance),
      String(score.totalScore),
      score.isShortlisted ? "Yes" : "No",
      score.remarks ?? "",
      formatDate(score.updatedAt),
    ]),
  ];
}

async function loadFellowshipAwardRows(): Promise<string[][]> {
  const fellowships = await prisma.fellowship.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      application: { select: { applicationNumber: true } },
    },
  });

  return [
    [
      "Fellowship ID",
      "Application Number",
      "Fellow Name",
      "Project Title",
      "Institution",
      "Sanctioned Amount",
      "Duration",
      "Stage",
      "Start Date",
      "End Date",
      "Active",
      "Completed",
    ],
    ...fellowships.map((fellowship) => [
      fellowship.fellowshipId,
      fellowship.application.applicationNumber,
      fellowship.fellowName,
      fellowship.projectTitle,
      fellowship.institution ?? "",
      formatCurrency(fellowship.sanctionedAmount),
      fellowship.duration,
      fellowship.currentStage,
      fellowship.startDate ? formatDate(fellowship.startDate) : "",
      fellowship.endDate ? formatDate(fellowship.endDate) : "",
      fellowship.isActive ? "Yes" : "No",
      fellowship.isCompleted ? "Yes" : "No",
    ]),
  ];
}

async function loadProgressReportRows(): Promise<string[][]> {
  const reports = await prisma.progressReport.findMany({
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    include: {
      fellowship: {
        select: { fellowshipId: true, fellowName: true, projectTitle: true },
      },
    },
  });

  return [
    [
      "Fellowship ID",
      "Fellow Name",
      "Project Title",
      "Quarter",
      "Year",
      "Status",
      "Expenditure",
      "Cases Enrolled",
      "Submitted At",
      "Progress Update",
      "Review Notes",
    ],
    ...reports.map((report) => [
      report.fellowship.fellowshipId,
      report.fellowship.fellowName,
      report.fellowship.projectTitle,
      `Q${report.quarter}`,
      String(report.year),
      report.status,
      report.expenditure != null ? formatCurrency(report.expenditure) : "",
      report.casesEnrolled != null ? String(report.casesEnrolled) : "",
      formatDate(report.submittedAt),
      report.progressUpdate ?? "",
      report.reviewNotes ?? "",
    ]),
  ];
}

async function loadFundUtilizationRows(): Promise<string[][]> {
  const fellowships = await prisma.fellowship.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      financeRecords: true,
      installments: { orderBy: { installmentNo: "asc" } },
    },
  });

  return [
    [
      "Fellowship ID",
      "Fellow Name",
      "Sanctioned Amount",
      "Released Amount",
      "Balance Amount",
      "Installment 1",
      "Installment 2",
      "Installment 3",
      "Pending Documents",
    ],
    ...fellowships.map((fellowship) => {
      const finance = fellowship.financeRecords;
      const installmentSummary = [1, 2, 3].map((no) => {
        const item = fellowship.installments.find((i) => i.installmentNo === no);
        if (!item) return "";
        return `${formatCurrency(item.amount)} (${item.status})`;
      });

      return [
        fellowship.fellowshipId,
        fellowship.fellowName,
        formatCurrency(finance?.sanctionedAmount ?? fellowship.sanctionedAmount),
        finance ? formatCurrency(finance.releasedAmount) : "",
        finance ? formatCurrency(finance.balanceAmount) : "",
        installmentSummary[0],
        installmentSummary[1],
        installmentSummary[2],
        finance?.pendingDocuments ?? "",
      ];
    }),
  ];
}

async function loadPublicationRows(): Promise<string[][]> {
  const [applications, progressReports, finalSubmissions] = await Promise.all([
    prisma.application.findMany({
      where: { publicationsSummary: { not: null } },
      select: {
        applicationNumber: true,
        name: true,
        publicationsSummary: true,
        fellowship: { select: { fellowshipId: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.progressReport.findMany({
      where: {
        OR: [{ publicationsPath: { not: null } }, { progressUpdate: { not: null } }],
      },
      include: {
        fellowship: { select: { fellowshipId: true, fellowName: true, projectTitle: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.finalSubmission.findMany({
      include: {
        fellowship: { select: { fellowshipId: true, fellowName: true, projectTitle: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const rows: string[][] = [
    ["Source", "Reference", "Fellow Name", "Project Title", "Publication Details", "Document"],
  ];

  for (const app of applications) {
    if (!app.publicationsSummary?.trim()) continue;
    rows.push([
      "Application",
      app.applicationNumber,
      app.name,
      "",
      app.publicationsSummary,
      "",
    ]);
  }

  for (const report of progressReports) {
    rows.push([
      "Progress Report",
      `${report.fellowship.fellowshipId} Q${report.quarter} ${report.year}`,
      report.fellowship.fellowName,
      report.fellowship.projectTitle,
      report.progressUpdate ?? "",
      report.publicationsPath ? "Uploaded" : "",
    ]);
  }

  for (const submission of finalSubmissions) {
    rows.push([
      "Final Submission",
      submission.fellowship.fellowshipId,
      submission.fellowship.fellowName,
      submission.fellowship.projectTitle,
      "Final manuscript / publication deliverable",
      submission.manuscriptPath ? "Manuscript uploaded" : submission.finalReportPath ? "Final report uploaded" : "",
    ]);
  }

  return rows;
}

async function loadReportRows(reportId: AdminReportId): Promise<string[][]> {
  switch (reportId) {
    case "applicants":
      return loadApplicantRows();
    case "reviewer-scores":
      return loadReviewerScoreRows();
    case "fellowship-awards":
      return loadFellowshipAwardRows();
    case "progress-reports":
      return loadProgressReportRows();
    case "fund-utilization":
      return loadFundUtilizationRows();
    case "publications":
      return loadPublicationRows();
  }
}

function drawPdfTable(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  rows: string[][]
) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica").fillColor("#666666").text(`Generated: ${generatedAt}`, {
    align: "center",
  });
  doc.fillColor("#111111");
  doc.moveDown(1);

  if (rows.length <= 1) {
    doc.fontSize(11).font("Helvetica").text("No records found for this report.");
    return;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const columnWidth = pageWidth / headers.length;

  doc.fontSize(8).font("Helvetica-Bold");
  headers.forEach((header, index) => {
    doc.text(header, doc.page.margins.left + index * columnWidth, doc.y, {
      width: columnWidth - 4,
      lineBreak: false,
    });
  });
  doc.moveDown(0.8);

  doc.font("Helvetica").fontSize(7);
  for (const row of dataRows) {
    const rowTop = doc.y;
    let maxHeight = 12;

    row.forEach((cell, index) => {
      const height = doc.heightOfString(cell || "—", {
        width: columnWidth - 4,
      });
      maxHeight = Math.max(maxHeight, height);
      doc.text(cell || "—", doc.page.margins.left + index * columnWidth, rowTop, {
        width: columnWidth - 4,
      });
    });

    doc.y = rowTop + maxHeight + 6;

    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      doc.fontSize(8).font("Helvetica-Bold");
      headers.forEach((header, index) => {
        doc.text(header, doc.page.margins.left + index * columnWidth, doc.y, {
          width: columnWidth - 4,
          lineBreak: false,
        });
      });
      doc.moveDown(0.8);
      doc.font("Helvetica").fontSize(7);
    }
  }
}

export async function buildAdminReportCsv(reportId: AdminReportId): Promise<Buffer> {
  const rows = await loadReportRows(reportId);
  return rowsToCsvBuffer(rows);
}

export async function buildAdminReportPdf(reportId: AdminReportId): Promise<Buffer> {
  ensurePdfkitFonts();
  const rows = await loadReportRows(reportId);
  const title = ADMIN_REPORTS.find((report) => report.id === reportId)?.title ?? "Report";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawPdfTable(doc, title, rows);
    doc.end();
  });
}
