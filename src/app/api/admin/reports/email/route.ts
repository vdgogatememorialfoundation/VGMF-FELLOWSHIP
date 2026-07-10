import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ADMIN_REPORTS, buildReportForEmail, type AdminReportId } from "@/lib/admin-reports";
import { isAdminReportId } from "@/lib/admin-report-types";
import { sendEmailWithAttachment } from "@/lib/email";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

export const maxDuration = 120; // 2 minutes timeout for report generation

// POST - Send report via email
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reportIds, recipientEmail, recipientName, format, subject, message } = body;

    // Validate input
    if (!recipientEmail) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json({ error: "At least one report must be selected" }, { status: 400 });
    }

    // Validate report IDs
    const validReportIds = reportIds.filter((id: string) => isAdminReportId(id));
    if (validReportIds.length === 0) {
      return NextResponse.json({ error: "No valid report IDs provided" }, { status: 400 });
    }

    const reportFormat = format === "pdf" ? "pdf" : "csv";

    // Build attachments
    const attachments = await Promise.all(
      validReportIds.map(async (reportId: AdminReportId) => {
        const report = ADMIN_REPORTS.find((r) => r.id === reportId);
        return buildReportForEmail(reportId, reportFormat);
      })
    );

    // Prepare email content
    const emailSubject = subject || `VGMF Fellowship Reports - ${new Date().toLocaleDateString("en-IN")}`;
    const reportList = validReportIds
      .map((id: AdminReportId) => {
        const report = ADMIN_REPORTS.find((r) => r.id === id);
        return `• ${report?.title || id} (${reportFormat.toUpperCase()})`;
      })
      .join("\n");

    const emailBody = message || `
Please find attached the requested reports from VGMF Fellowship Portal.

Reports included:
${reportList}

This email was sent on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.

---
VGMF Fellowship Portal
Automated Report Generation
`;

    // Send email with attachments
    const result = await sendEmailWithAttachment(
      {
        to: recipientEmail,
        toName: recipientName || recipientEmail,
        subject: emailSubject,
        html: `<p>${emailBody.replace(/\n/g, "<br>").replace(/---/g, "<hr>")}</p>`,
        text: emailBody,
      },
      attachments.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        content: att.buffer,
      }))
    );

    if (!result.ok) {
      // Log the failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "REPORT_EMAIL_FAILED",
          details: {
            recipientEmail,
            reportIds: validReportIds,
            format: reportFormat,
            error: result,
          },
        },
      });

      return NextResponse.json(
        { error: `Failed to send email: ${(result as { detail?: string }).detail || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Log successful email
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPORT_EMAIL_SENT",
        details: {
          recipientEmail,
          recipientName,
          reportIds: validReportIds,
          format: reportFormat,
          reportCount: validReportIds.length,
          sentAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Report(s) sent to ${recipientEmail}`,
      reportCount: validReportIds.length,
    });
  } catch (error) {
    console.error("Report email error:", error);
    return NextResponse.json({ error: "Failed to send report email" }, { status: 500 });
  }
}

// GET - Get available reports for email
export async function GET() {
  return NextResponse.json({
    reports: ADMIN_REPORTS.map((report) => ({
      id: report.id,
      title: report.title,
      description: (report as { description?: string }).description,
    })),
  });
}
