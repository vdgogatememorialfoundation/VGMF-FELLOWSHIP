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
    const formId = searchParams.get("formId");

    // If formId is provided, return applicants for that form
    if (formId) {
      // Get form submissions for this form
      const formSubmissions = await prisma.formSubmission.findMany({
        where: { formId },
        select: {
          id: true,
          userId: true,
          formId: true,
          data: true,
          submittedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get unique userIds
      const userIds = [...new Set(formSubmissions.map(s => s.userId))];

      // Get user and application info
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          applications: {
            select: {
              id: true,
              applicationNumber: true,
              name: true,
              email: true,
              mobile: true,
              status: true,
              submittedAt: true,
              userId: true,
            },
          },
        },
      });

      // Map submissions to applicants
      const applicants = formSubmissions.map(submission => {
        const user = users.find(u => u.id === submission.userId);
        const app = user?.applications[0];
        return {
          submissionId: submission.id,
          submittedAt: submission.submittedAt,
          userId: submission.userId,
          name: user?.name || "Unknown",
          email: user?.email || "",
          phone: user?.phone,
          applicationId: app?.id,
          applicationNumber: app?.applicationNumber,
          applicationStatus: app?.status,
        };
      });

      const submitted = applicants.filter(a => a.submittedAt !== null).length;
      const notSubmitted = applicants.filter(a => a.submittedAt === null).length;

      return NextResponse.json({
        applicants,
        summary: {
          total: applicants.length,
          submitted,
          notSubmitted,
        },
      });
    }

    // Otherwise, return list of fellowship forms
    const fellowshipForms = await prisma.formTemplate.findMany({
      where: { slug: { contains: "fellowship" } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        opensAt: true,
        closesAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get count of submissions per form
    const formCounts = await prisma.formSubmission.groupBy({
      by: ["formId"],
      _count: true,
    });

    const formsWithCounts = fellowshipForms.map(form => ({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      isActive: form.isActive,
      opensAt: form.opensAt,
      closesAt: form.closesAt,
      applicantCount: formCounts.find(c => c.formId === form.id)?._count || 0,
    }));

    return NextResponse.json({
      fellowshipForms: formsWithCounts,
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
