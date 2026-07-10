import prisma from "./db";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import { formatDate, formatCurrency, getStatusLabel } from "./utils";
import type { AdminReportId } from "./admin-report-types";
import { ADMIN_REPORTS } from "./admin-report-types";

export { ADMIN_REPORTS, type AdminReportId, isAdminReportId, reportDownloadFilename } from "./admin-report-types";

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

async function loadAllSubmissionsRows(): Promise<string[][]> {
  const applications = await prisma.application.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      budget: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      fellowship: { select: { fellowshipId: true, sanctionedAmount: true, currentStage: true } },
      interview: { select: { scheduledDate: true, scheduledTime: true, status: true, interviewType: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 5 },
      committeeScores: { include: { committeeUser: { include: { profile: true } } } },
    },
  });

  return [
    [
      "App Number",
      "Name",
      "Email",
      "Mobile",
      "City",
      "State",
      "Gender",
      "DOB",
      "Status",
      "Submitted At",
      "Project Title",
      "Research Area",
      "BAMS College",
      "Year of Passing",
      "Designation",
      "Institution",
      "Years of Practice",
      "Budget Total",
      "Documents Count",
      "Documents Verified",
      "Interview Date",
      "Interview Status",
      "Fellowship ID",
      "Fellowship Amount",
      "Committee Scores",
      "Last Status Change",
    ],
    ...applications.map((app) => {
      const docsVerified = app.documents.filter(d => d.status === "APPROVED").length;
      const lastStatusChange = app.statusHistory[0]?.createdAt 
        ? formatDate(app.statusHistory[0].createdAt) 
        : "";
      const committeeScore = app.committeeScores.length > 0 
        ? app.committeeScores.map(s => `${s.committeeUser.profile?.name || 'N/A'}: ${s.totalScore}`).join("; ")
        : "";
      
      return [
        app.applicationNumber,
        app.name,
        app.email,
        app.mobile,
        app.city,
        app.state,
        app.gender,
        app.dob ? formatDate(app.dob) : "",
        getStatusLabel(app.status),
        app.submittedAt ? formatDate(app.submittedAt) : "",
        app.researchProposal?.projectTitle ?? "",
        app.researchProposal?.researchArea ?? "",
        app.bamsCollege,
        String(app.yearOfPassing),
        app.currentDesignation,
        app.institutionName,
        String(app.yearsOfPractice),
        app.budget?.total ? formatCurrency(app.budget.total) : "",
        String(app.documents.length),
        `${docsVerified}/${app.documents.length}`,
        app.interview?.scheduledDate ? formatDate(app.interview.scheduledDate) : "",
        app.interview?.status ?? "",
        app.fellowship?.fellowshipId ?? "",
        app.fellowship?.sanctionedAmount ? formatCurrency(app.fellowship.sanctionedAmount) : "",
        committeeScore,
        lastStatusChange,
      ];
    }),
  ];
}

async function loadDocumentStatusRows(): Promise<string[][]> {
  const documents = await prisma.applicationDocument.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      application: {
        select: {
          applicationNumber: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return [
    [
      "App Number",
      "Applicant Name",
      "Email",
      "Document Type",
      "File Name",
      "File Size (KB)",
      "Uploaded At",
      "Status",
      "Reviewed At",
      "Rejection Reason",
    ],
    ...documents.map((doc) => [
      doc.application.applicationNumber,
      doc.application.name,
      doc.application.email,
      doc.documentType.replace(/_/g, " "),
      doc.fileName,
      doc.fileSize ? String(Math.round(doc.fileSize / 1024)) : "",
      formatDate(doc.uploadedAt),
      doc.status,
      doc.reviewedAt ? formatDate(doc.reviewedAt) : "",
      doc.rejectionReason ?? "",
    ]),
  ];
}

async function loadInterviewHistoryRows(): Promise<string[][]> {
  const interviews = await prisma.interview.findMany({
    orderBy: { scheduledDate: "desc" },
    include: {
      application: {
        select: {
          applicationNumber: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
    },
  });

  return [
    [
      "App Number",
      "Applicant Name",
      "Email",
      "Mobile",
      "Interview Type",
      "Scheduled Date",
      "Scheduled Time",
      "Duration (min)",
      "Location",
      "Meeting Link",
      "Panel Members",
      "Status",
      "Feedback",
      "Notes",
      "Created At",
      "Cancelled Reason",
    ],
    ...interviews.map((int) => [
      int.application.applicationNumber,
      int.application.name,
      int.application.email,
      int.application.mobile,
      int.interviewType,
      formatDate(int.scheduledDate),
      int.scheduledTime,
      String(int.durationMinutes),
      int.location ?? "",
      int.meetingLink ?? "",
      int.panelMembers,
      int.status,
      int.feedback ?? "",
      int.notes ?? "",
      formatDate(int.createdAt),
      int.cancellationReason ?? "",
    ]),
  ];
}

async function loadStatusTrackerRows(): Promise<string[][]> {
  const applications = await prisma.application.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  return [
    [
      "App Number",
      "Name",
      "Email",
      "Current Status",
      "Submitted At",
      "Stage 1: Scrutiny",
      "Stage 2: Eligibility",
      "Stage 3: Committee Review",
      "Stage 4: Interview",
      "Stage 5: Trustee Review",
      "Stage 6: Final",
      "Time in Current Stage",
    ],
    ...applications.map((app) => {
      const history = app.statusHistory;
      const getStageDate = (statuses: string[]) => {
        const entry = history.find(h => statuses.includes(h.toStatus));
        return entry ? formatDate(entry.createdAt) : "";
      };
      const currentStageStart = history.length > 0 ? formatDate(history[history.length - 1].createdAt) : "";
      
      return [
        app.applicationNumber,
        app.name,
        app.email,
        getStatusLabel(app.status),
        app.submittedAt ? formatDate(app.submittedAt) : "",
        getStageDate(["SCRUTINY", "SCRUTINY_APPROVED"]),
        getStageDate(["ELIGIBILITY_CHECK", "ELIGIBLE", "NOT_ELIGIBLE"]),
        getStageDate(["UNDER_REVIEW", "SHORTLISTED", "WAITLISTED"]),
        getStageDate(["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"]),
        getStageDate(["TRUSTEE_REVIEW"]),
        getStageDate(["SELECTED", "REJECTED", "COMPLETED"]),
        currentStageStart,
      ];
    }),
  ];
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
    case "all-submissions":
      return loadAllSubmissionsRows();
    case "document-status":
      return loadDocumentStatusRows();
    case "interview-history":
      return loadInterviewHistoryRows();
    case "status-tracker":
      return loadStatusTrackerRows();
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

export async function buildAllReportsZip(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // Add all reports as CSV files
    const reportPromises = ADMIN_REPORTS.map(async (report) => {
      try {
        const csvBuffer = await buildAdminReportCsv(report.id);
        const filename = `csv/${report.id}.csv`;
        archive.append(csvBuffer, { name: filename });
      } catch (error) {
        console.error(`Failed to add CSV for ${report.id}:`, error);
      }
    });

    // Add all reports as PDF files
    const pdfPromises = ADMIN_REPORTS.map(async (report) => {
      try {
        const pdfBuffer = await buildAdminReportPdf(report.id);
        const filename = `pdf/${report.id}.pdf`;
        archive.append(pdfBuffer, { name: filename });
      } catch (error) {
        console.error(`Failed to add PDF for ${report.id}:`, error);
      }
    });

    // Wait for all files to be added
    Promise.all([...reportPromises, ...pdfPromises])
      .then(() => archive.finalize())
      .catch((error) => {
        reject(error);
      });
  });
}

export interface ReportEmailData {
  reportId: AdminReportId;
  format: "csv" | "pdf";
}

export async function buildReportForEmail(
  reportId: AdminReportId,
  format: "csv" | "pdf"
): Promise<{ filename: string; buffer: Buffer; contentType: string }> {
  if (format === "pdf") {
    const buffer = await buildAdminReportPdf(reportId);
    return {
      filename: reportDownloadFilename(reportId, "pdf"),
      buffer,
      contentType: "application/pdf",
    };
  }
  
  const buffer = await buildAdminReportCsv(reportId);
  return {
    filename: reportDownloadFilename(reportId, "csv"),
    buffer,
    contentType: "text/csv",
  };
}
