import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { awardFellowship } from "@/lib/fellowship-service";
import { notifyStatusChange } from "@/lib/notifications";
import { BUDGET_MAX } from "@/lib/utils";
import { getAssignedApplicationIds } from "@/lib/review-workflow";

const TRUSTEE_PIPELINE_STATUSES = [
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "TRUSTEE_REVIEW",
  "WAITLISTED",
  "AGREEMENT_PENDING",
  "SELECTED",
  "QUERY_RAISED",
  "QUERY_RESPONDED",
] as const;

export async function GET() {
  const user = await getSession();
  if (!user || !["TRUSTEE", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignedIds = await getAssignedApplicationIds(user.id, "TRUSTEE");

  const applications = await prisma.application.findMany({
    where:
      assignedIds.length > 0
        ? {
            id: { in: assignedIds },
            status: { in: [...TRUSTEE_PIPELINE_STATUSES] },
          }
        : {
            status: { in: [...TRUSTEE_PIPELINE_STATUSES] },
          },
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      budget: true,
      committeeScores: true,
      committeeRemarks: { include: { committeeUser: { include: { profile: true } } } },
      trusteeApproval: true,
      fellowship: true,
      interview: true,
      applicationQueries: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["TRUSTEE", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      applicationId,
      approved,
      remarks,
      sanctionedAmount,
      duration = "12 months",
    } = body;

    if (!applicationId || typeof approved !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { trusteeApproval: true, budget: true, fellowship: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const assignedIds = await getAssignedApplicationIds(user.id, "TRUSTEE");
    if (assignedIds.length > 0 && !assignedIds.includes(applicationId)) {
      return NextResponse.json(
        { error: "This application is not assigned to you for trustee review" },
        { status: 403 }
      );
    }

    if (application.trusteeApproval) {
      return NextResponse.json({ error: "Trustee decision already recorded" }, { status: 400 });
    }

    if (!["SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "TRUSTEE_REVIEW", "WAITLISTED", "QUERY_RESPONDED"].includes(application.status)) {
      return NextResponse.json(
        { error: "Application must be shortlisted or interviewed before trustee approval" },
        { status: 400 }
      );
    }

    await prisma.trusteeApproval.create({
      data: {
        applicationId,
        trusteeUserId: user.id,
        approved,
        remarks: remarks || null,
      },
    });

    if (!approved) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "REJECTED",
          rejectionReason: remarks || "Not approved by Board of Trustees",
          statusHistory: {
            create: {
              fromStatus: application.status,
              toStatus: "REJECTED",
              changedBy: user.id,
              notes: remarks || "Rejected by Board of Trustees",
            },
          },
        },
      });

      await notifyStatusChange(
        application.userId,
        application.applicationNumber,
        "REJECTED",
        { fromStatus: application.status }
      );

      return NextResponse.json({ success: true, approved: false });
    }

    const amount = Number(sanctionedAmount) || application.budget?.total || BUDGET_MAX;
    if (amount <= 0 || amount > BUDGET_MAX) {
      return NextResponse.json(
        { error: `Sanctioned amount must be between ₹1 and ₹${BUDGET_MAX.toLocaleString("en-IN")}` },
        { status: 400 }
      );
    }

    const fellowship = application.fellowship
      ? application.fellowship
      : await awardFellowship({
          applicationId,
          sanctionedAmount: amount,
          duration: String(duration),
        });

    return NextResponse.json({ success: true, approved: true, fellowship });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process approval";
    console.error("Trustee approval error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
