import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmailWithAttachment } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email";
import { ORGANIZATION_NAME } from "@/lib/constants";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - Get application forms and applicants
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const fellowshipProgramId = searchParams.get("fellowshipProgramId");

    // If fellowshipProgramId is provided, return applicants for that form
    if (fellowshipProgramId) {
      const applications = await prisma.application.findMany({
        where: { fellowshipProgramId },
        select: {
          id: true,
          applicationNumber: true,
          name: true,
          email: true,
          mobile: true,
          status: true,
          submittedAt: true,
          userId: true,
          fellowship: {
            select: {
              id: true,
              fellowshipId: true,
              fellowName: true,
            },
          },
        },
        orderBy: { applicationNumber: "asc" },
      });

      // Count by status
      const submitted = applications.filter(a => a.submittedAt !== null).length;
      const notSubmitted = applications.filter(a => a.submittedAt === null).length;

      return NextResponse.json({
        applicants: applications,
        summary: {
          total: applications.length,
          submitted,
          notSubmitted,
        },
      });
    }

    // Otherwise, return list of fellowship programs (application forms)
    const fellowshipPrograms = await prisma.fellowshipProgram.findMany({
      select: {
        id: true,
        name: true,
        year: true,
        applicationCount: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also get applications without fellowship program (legacy)
    const legacyCount = await prisma.application.count({
      where: { fellowshipProgramId: null },
    });

    return NextResponse.json({
      fellowshipPrograms: fellowshipPrograms.map(fp => ({
        id: fp.id,
        name: fp.name,
        year: fp.year,
        applicantCount: fp._count.applications,
      })),
      legacyApplications: legacyCount > 0 ? {
        id: "legacy",
        name: "Legacy Applications",
        year: null,
        applicantCount: legacyCount,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST - Send individual or bulk email
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recipientIds, subject, message, template } = body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    // Fetch recipients
    const recipients = await prisma.application.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        applicationNumber: true,
        name: true,
        email: true,
        userId: true,
        fellowship: {
          select: { fellowshipId: true },
        },
      },
    });

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No valid recipients found" }, { status: 404 });
    }

    const results: Array<{ id: string; name: string; email: string; ok: boolean; error?: string }> = [];

    // Process based on template or custom message
    for (const recipient of recipients) {
      try {
        let emailSubject = subject;
        let emailMessage = message;

        // Apply template replacements
        if (template) {
          emailSubject = applyTemplateReplacements(subject, {
            name: recipient.name,
            applicationNumber: recipient.applicationNumber,
            fellowshipId: recipient.fellowship?.fellowshipId || "",
          });
          emailMessage = applyTemplateReplacements(message, {
            name: recipient.name,
            applicationNumber: recipient.applicationNumber,
            fellowshipId: recipient.fellowship?.fellowshipId || "",
          });
        }

        const bodyContent = `
          <p>Dear <strong>${recipient.name}</strong>,</p>
          <div style="white-space: pre-wrap; line-height: 1.8;">${emailMessage}</div>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px;">This is an official communication from ${ORGANIZATION_NAME}. Please do not reply directly to this email. For any queries, please use the support portal.</p>
        `;

        const result = await sendEmailWithAttachment(
          {
            to: recipient.email,
            toName: recipient.name,
            subject: `[${ORGANIZATION_NAME}] ${emailSubject}`,
            html: renderEmailHtml(emailSubject, bodyContent),
            text: `Dear ${recipient.name},\n\n${emailMessage}\n\nThis is an official communication from ${ORGANIZATION_NAME}. Please do not reply directly to this email. For any queries, please use the support portal.`,
          }
        );

        results.push({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          ok: result.ok,
          error: result.ok ? undefined : (result as { detail?: string }).detail,
        });

        // Create in-app notification
        if (result.ok) {
          await prisma.notification.create({
            data: {
              userId: recipient.userId,
              title: `Message: ${emailSubject}`,
              message: emailMessage,
              channel: "EMAIL",
            },
          });
        }
      } catch (error) {
        results.push({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    // Log the message activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BULK_EMAIL_SENT",
        details: {
          recipientCount: recipients.length,
          successCount,
          failedCount,
          subject,
          template,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} emails successfully, ${failedCount} failed`,
      results,
      summary: { successCount, failedCount, total: recipients.length },
    });
  } catch (error) {
    console.error("Error sending messages:", error);
    return NextResponse.json({ error: "Failed to send messages" }, { status: 500 });
  }
}

function applyTemplateReplacements(
  text: string,
  replacements: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, "gi"), value);
    result = result.replace(new RegExp(`{${key}}`, "gi"), value);
  }
  return result;
}
