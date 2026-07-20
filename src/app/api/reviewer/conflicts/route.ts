import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/reviewer/conflicts - Get conflict declarations for reviewer
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "COMMITTEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    const where: any = { reviewerId: user.id };
    if (applicationId) {
      where.applicationId = applicationId;
    }

    const conflicts = await prisma.conflictOfInterest.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(conflicts);
  } catch (error) {
    console.error("Error fetching conflicts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reviewer/conflicts - Declare conflict of interest
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "COMMITTEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, hasConflict, conflictType, conflictDetails } = body;

    const conflict = await prisma.conflictOfInterest.upsert({
      where: {
        applicationId_reviewerId: {
          applicationId,
          reviewerId: user.id,
        },
      },
      create: {
        applicationId,
        reviewerId: user.id,
        status: hasConflict ? "DECLARED" : "NO_CONFLICT",
        conflictType: hasConflict ? conflictType : null,
        conflictDetails: hasConflict ? conflictDetails : null,
        declaresNoConflict: !hasConflict,
        declarationTimestamp: new Date(),
      },
      update: {
        status: hasConflict ? "DECLARED" : "NO_CONFLICT",
        conflictType: hasConflict ? conflictType : null,
        conflictDetails: hasConflict ? conflictDetails : null,
        declaresNoConflict: !hasConflict,
        declarationTimestamp: new Date(),
      },
    });

    return NextResponse.json(conflict);
  } catch (error) {
    console.error("Error declaring conflict:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
