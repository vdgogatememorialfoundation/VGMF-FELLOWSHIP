import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { ORGANIZATION_NAME } from "@/lib/constants";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !["ADMIN", "COADMIN", "STAFF"].includes(user.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formTemplateId = searchParams.get("formTemplateId");

  // Build where clause for form submissions if formTemplateId provided
  const formSubmissionWhere = formTemplateId ? { formTemplateId } : {};

  // Get all applicants with their applications
  const applicants = await prisma.user.findMany({
    where: { role: "APPLICANT", isActive: true },
    include: {
      profile: true,
      applications: {
        select: {
          id: true,
          applicationNumber: true,
          email: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // If filtering by form, get users who have form submissions
  let filteredUserIds: string[] | null = null;
  if (formTemplateId) {
    const formSubmissions = await prisma.formSubmission.findMany({
      where: formSubmissionWhere,
      select: { userId: true },
      distinct: ["userId"],
    });
    filteredUserIds = formSubmissions.map((s) => s.userId);
  }

  // Flatten applications to get applicant-level data
  const applicantsWithEmails = applicants
    .filter((a) => {
      // Filter by form if specified
      if (filteredUserIds && !filteredUserIds.includes(a.id)) {
        return false;
      }
      return a.email;
    })
    .map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.profile?.name || a.applications[0]?.name || "Unknown",
      email: a.email,
      phone: a.phone,
      applicationId: a.applications[0]?.id || null,
      applicationNumber: a.applications[0]?.applicationNumber || null,
      applicationStatus: a.applications[0]?.status || null,
      hasSubmittedApplication: a.applications.some((app) => app.status !== "DRAFT"),
    }));

  return NextResponse.json({ applicants: applicantsWithEmails });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { applicantIds, formTemplateId, subject, message, selectAll } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let targetApplicantIds: string[] = [];

    if (selectAll && formTemplateId) {
      // Get all applicants who have submissions for this form
      const submissions = await prisma.formSubmission.findMany({
        where: { formTemplateId },
        select: { userId: true },
        distinct: ["userId"],
      });
      targetApplicantIds = submissions.map((s) => s.userId);
    } else if (selectAll) {
      // Get all applicants
      const applicants = await prisma.user.findMany({
        where: { role: "APPLICANT", isActive: true },
        select: { id: true },
      });
      targetApplicantIds = applicants.map((a) => a.id);
    } else if (applicantIds && applicantIds.length > 0) {
      targetApplicantIds = applicantIds;
    } else {
      return NextResponse.json(
        { error: "Please select at least one applicant or select all" },
        { status: 400 }
      );
    }

    if (targetApplicantIds.length === 0) {
      return NextResponse.json(
        { error: "No applicants found to send emails to" },
        { status: 400 }
      );
    }

    // Fetch all target applicants with their profiles
    const applicants = await prisma.user.findMany({
      where: { id: { in: targetApplicantIds }, isActive: true },
      include: { profile: true },
    });

    const results = {
      success: 0,
      failed: 0,
      failedEmails: [] as string[],
    };

    for (const applicant of applicants) {
      if (!applicant.email) {
        results.failed++;
        results.failedEmails.push(`${applicant.userId} (no email)`);
        continue;
      }

      const applicantName = applicant.profile?.name || "Applicant";

      // Use sendNotificationEmail for consistent styling
      const emailResult = await sendNotificationEmail(
        applicant.email,
        applicantName,
        subject,
        message
      );

      if (emailResult.ok) {
        results.success++;
      } else {
        results.failed++;
        results.failedEmails.push(`${applicant.email} (${emailResult.detail || "send failed"})`);
      }
    }

    // Log the email action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BULK_EMAIL_SENT",
        details: {
          subject,
          recipientCount: targetApplicantIds.length,
          successCount: results.success,
          failedCount: results.failed,
          formTemplateId: formTemplateId || null,
          selectAll,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${results.success} applicant(s). ${results.failed > 0 ? `${results.failed} failed.` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Bulk email error:", error);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
