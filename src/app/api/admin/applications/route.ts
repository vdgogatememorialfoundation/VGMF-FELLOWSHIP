import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyStatusChange } from "@/lib/notifications";
import { validateStatusTransition } from "@/lib/application-workflow";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COMMITTEE", "TRUSTEE"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const id = searchParams.get("id");

  if (id) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        researchProposal: true,
        budget: true,
        documents: true,
        committeeScores: { include: { committeeUser: { include: { profile: true } } } },
        committeeRemarks: { include: { committeeUser: { include: { profile: true } } } },
        interview: true,
        trusteeApproval: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        fellowship: { include: { installments: true } },
      },
    });
    return NextResponse.json({ application });
  }

  const where = status ? { status: status as never } : {};
  const applications = await prisma.application.findMany({
    where,
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      budget: true,
      documents: true,
      committeeScores: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { applicationId, status, rejectionReason, adminNotes, queryNotes, eligibilityNotes, verificationNotes } = await request.json();

    const existing = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const validationError = validateStatusTransition(
      existing.status,
      status,
      existing.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        fileName: doc.fileName,
        filePath: doc.filePath,
        rejectionReason: doc.rejectionReason,
      }))
    );

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        rejectionReason,
        adminNotes,
        queryNotes: queryNotes ?? undefined,
        eligibilityNotes: eligibilityNotes ?? undefined,
        verificationNotes: verificationNotes ?? undefined,
        statusHistory: {
          create: {
            fromStatus: existing.status,
            toStatus: status,
            changedBy: user.id,
            notes: adminNotes || rejectionReason,
          },
        },
      },
    });

    await notifyStatusChange(
      existing.userId,
      existing.applicationNumber,
      status,
      { fromStatus: existing.status }
    );

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, ...appData } = body;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { generateApplicationNumber } = await import("@/lib/auth");
    const appNumber = await generateApplicationNumber();

    const application = await prisma.application.create({
      data: {
        applicationNumber: appNumber,
        userId,
        ...appData,
        dob: new Date(appData.dob),
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Admin create application error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
