import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/committee/matrix/[id] - Save committee decision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user || !["COMMITTEE", "ADMIN", "COADMIN", "TRUSTEE"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { finalDecision, finalScore, finalBudget, interviewRequired, committeeRemarks } = body;

    // Upsert committee matrix
    const matrix = await prisma.committeeMatrix.upsert({
      where: { applicationId: id },
      create: {
        applicationId: id,
        finalDecision,
        finalScore,
        finalBudget,
        interviewRequired: interviewRequired || false,
        committeeRemarks,
      },
      update: {
        finalDecision,
        finalScore,
        finalBudget,
        interviewRequired: interviewRequired || false,
        committeeRemarks,
      },
    });

    // If approved, update application status
    if (finalDecision === "APPROVED") {
      await prisma.application.update({
        where: { id },
        data: { status: "SELECTED" },
      });
    } else if (finalDecision === "REJECTED") {
      await prisma.application.update({
        where: { id },
        data: { status: "REJECTED" },
      });
    } else if (finalDecision === "WAITLISTED") {
      await prisma.application.update({
        where: { id },
        data: { status: "WAITLISTED" },
      });
    }

    return NextResponse.json(matrix);
  } catch (error) {
    console.error("Error saving decision:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/committee/matrix/[id] - Get matrix for specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user || !["COMMITTEE", "ADMIN", "COADMIN", "TRUSTEE"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = await prisma.committeeMatrix.findUnique({
      where: { applicationId: id },
      include: {
        items: true,
      },
    });

    return NextResponse.json(matrix);
  } catch (error) {
    console.error("Error fetching matrix:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
