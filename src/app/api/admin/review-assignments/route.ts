import { NextRequest, NextResponse } from "next/server";
import type { ReviewPhase } from "@prisma/client";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assignReviewer } from "@/lib/review-workflow";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const assignments = await prisma.applicationReviewAssignment.findMany({
    where: { applicationId, isActive: true },
    include: {
      reviewer: { include: { profile: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, reviewerId, phase, notes } = body as {
      applicationId: string;
      reviewerId: string;
      phase: ReviewPhase;
      notes?: string;
    };

    if (!applicationId || !reviewerId || !phase) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assignment = await assignReviewer({
      applicationId,
      reviewerId,
      phase,
      assignedBy: user.id,
      notes,
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign reviewer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await request.json();
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
  }

  await prisma.applicationReviewAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
