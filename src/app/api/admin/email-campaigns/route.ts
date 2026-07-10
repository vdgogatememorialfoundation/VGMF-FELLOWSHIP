import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendBulkEmail } from "@/lib/email";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get filter options
    const applicationStatuses = await prisma.application.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { user: { role: "APPLICANT" } },
      orderBy: { _count: { id: "desc" } },
    });

    // Get fellowship year distribution
    const fellowshipsByYear = await prisma.fellowship.findMany({
      select: {
        startDate: true,
      },
      where: { isActive: true },
    });

    const years = [...new Set(
      fellowshipsByYear
        .map(f => f.startDate ? new Date(f.startDate).getFullYear() : null)
        .filter(Boolean) as number[]
    )].sort((a, b) => b - a);

    // Get total counts
    const [totalApplicants, totalWithFellowship, totalWithApplications] = await Promise.all([
      prisma.user.count({ where: { role: "APPLICANT" } }),
      prisma.fellowship.count({ where: { isActive: true } }),
      prisma.application.count({
        where: { user: { role: "APPLICANT" } },
      }),
    ]);

    return NextResponse.json({
      filters: {
        applicationStatuses: applicationStatuses.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        fellowshipYears: years,
        counts: {
          totalApplicants,
          totalWithFellowship,
          totalWithApplications,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching email campaign filters:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      recipientType, // "all" | "by_status" | "by_fellowship" | "by_year" | "specific"
      applicationStatuses,
      fellowshipYear,
      fellowshipOnly,
      applicantIds,
      subject,
      body: emailBody,
    } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    if (!recipientType) {
      return NextResponse.json(
        { error: "Recipient type is required" },
        { status: 400 }
      );
    }

    // Build the user filter based on recipient type
    let userFilter: Record<string, unknown> = {
      role: "APPLICANT",
      isActive: true,
    };

    if (recipientType === "by_status" && applicationStatuses?.length) {
      // Get users who have applications with the specified statuses
      const usersWithMatchingApplications = await prisma.user.findMany({
        where: {
          ...userFilter,
          applications: {
            some: {
              status: { in: applicationStatuses },
            },
          },
        },
        select: { id: true, email: true, profile: { select: { name: true } } },
      });

      if (usersWithMatchingApplications.length === 0) {
        return NextResponse.json(
          { error: "No applicants found matching the selected criteria" },
          { status: 400 }
        );
      }

      const results = await sendBulkEmail(
        usersWithMatchingApplications.map(u => ({
          email: u.email,
          name: u.profile?.name || u.email,
        })),
        subject,
        emailBody
      );

      return NextResponse.json({
        success: true,
        sent: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        total: results.length,
      });
    }

    if (recipientType === "by_fellowship") {
      const usersWithFellowship = await prisma.user.findMany({
        where: {
          ...userFilter,
          applications: {
            some: {
              fellowship: fellowshipOnly ? { isNot: null } : undefined,
            },
          },
        },
        select: { id: true, email: true, profile: { select: { name: true } } },
      });

      if (usersWithFellowship.length === 0) {
        return NextResponse.json(
          { error: "No applicants with fellowships found" },
          { status: 400 }
        );
      }

      const results = await sendBulkEmail(
        usersWithFellowship.map(u => ({
          email: u.email,
          name: u.profile?.name || u.email,
        })),
        subject,
        emailBody
      );

      return NextResponse.json({
        success: true,
        sent: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        total: results.length,
      });
    }

    if (recipientType === "by_year" && fellowshipYear) {
      const startOfYear = new Date(`${fellowshipYear}-01-01`);
      const endOfYear = new Date(`${fellowshipYear}-12-31T23:59:59.999Z`);

      const usersByYear = await prisma.user.findMany({
        where: {
          ...userFilter,
          applications: {
            some: {
              fellowship: {
                startDate: {
                  gte: startOfYear,
                  lte: endOfYear,
                },
              },
            },
          },
        },
        select: { id: true, email: true, profile: { select: { name: true } } },
      });

      if (usersByYear.length === 0) {
        return NextResponse.json(
          { error: `No applicants found for fellowship year ${fellowshipYear}` },
          { status: 400 }
        );
      }

      const results = await sendBulkEmail(
        usersByYear.map(u => ({
          email: u.email,
          name: u.profile?.name || u.email,
        })),
        subject,
        emailBody
      );

      return NextResponse.json({
        success: true,
        sent: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        total: results.length,
      });
    }

    if (recipientType === "specific" && applicantIds?.length) {
      const specificUsers = await prisma.user.findMany({
        where: {
          id: { in: applicantIds },
          role: "APPLICANT",
        },
        select: { id: true, email: true, profile: { select: { name: true } } },
      });

      if (specificUsers.length === 0) {
        return NextResponse.json(
          { error: "No valid applicants selected" },
          { status: 400 }
        );
      }

      const results = await sendBulkEmail(
        specificUsers.map(u => ({
          email: u.email,
          name: u.profile?.name || u.email,
        })),
        subject,
        emailBody
      );

      return NextResponse.json({
        success: true,
        sent: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        total: results.length,
      });
    }

    // Default: all applicants
    const allApplicants = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, email: true, profile: { select: { name: true } } },
    });

    if (allApplicants.length === 0) {
      return NextResponse.json(
        { error: "No applicants found" },
        { status: 400 }
      );
    }

    const results = await sendBulkEmail(
      allApplicants.map(u => ({
        email: u.email,
        name: u.profile?.name || u.email,
      })),
      subject,
      emailBody
    );

    // Log the campaign
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_CAMPAIGN_SENT",
        details: {
          recipientType,
          subject,
          totalRecipients: results.length,
          successful: results.filter(r => r.ok).length,
          failed: results.filter(r => !r.ok).length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      sent: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      total: results.length,
    });
  } catch (error) {
    console.error("Error sending email campaign:", error);
    return NextResponse.json({ error: "Failed to send email campaign" }, { status: 500 });
  }
}
