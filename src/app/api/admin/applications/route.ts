import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyStatusChange } from "@/lib/notifications";
import { validateStatusTransition } from "@/lib/application-workflow";
import { awardFellowship } from "@/lib/fellowship-service";
import {
  getDigioConfig,
  refreshVerificationSessionDecision,
  isDigioIdentityConfigured,
} from "@/lib/digio";
import { BUDGET_MAX } from "@/lib/utils";
import { deleteApplication } from "@/lib/application-delete";
import { updateApplicationByAdmin } from "@/lib/admin-application-update";
import { toUploadApiUrl } from "@/lib/upload-files";

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
        reviewAssignments: { where: { isActive: true }, include: { reviewer: { include: { profile: true } } } },
        applicationQueries: { orderBy: { createdAt: "desc" }, take: 10 },
        digitalUndertaking: { select: { id: true, submittedAt: true, fullName: true } },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let verificationSessions = await prisma.verificationSession.findMany({
      where: {
        OR: [{ applicationId: id }, ...(application.fellowship ? [{ fellowshipId: application.fellowship.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
    });

    await Promise.all(
      verificationSessions
        .filter(
          (session) =>
            !session.decisionJson &&
            ["APPROVED", "IN_REVIEW", "DECLINED"].includes(session.status)
        )
        .map((session) => refreshVerificationSessionDecision(session.providerRequestId))
    );

    verificationSessions = await prisma.verificationSession.findMany({
      where: {
        OR: [{ applicationId: id }, ...(application.fellowship ? [{ fellowshipId: application.fellowship.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
    });

    const digioConfig = await getDigioConfig();
    return NextResponse.json({
      application,
      verificationSessions,
      digio: {
        identityConfigured: await isDigioIdentityConfigured(),
        requireIdentityForScrutiny: digioConfig.requireIdentityForScrutiny,
        webhookUrl: `${digioConfig.appUrl}/api/digio/webhook`,
      },
    });
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
      include: { documents: true, fellowship: true, budget: true, trusteeApproval: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (status === "SCRUTINY_APPROVED") {
      const digioConfig = await getDigioConfig();
      if (
        digioConfig.requireIdentityForScrutiny &&
        existing.identityVerificationStatus !== "APPROVED"
      ) {
        return NextResponse.json(
          {
            error:
              "Applicant must complete Digio identity verification before document verification can be approved",
          },
          { status: 400 }
        );
      }
    }

    const validationError = validateStatusTransition(
      existing.status,
      status,
      existing.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        fileName: doc.fileName,
        filePath: toUploadApiUrl(doc.filePath, { documentId: doc.id }) ?? doc.filePath,
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

    if (
      (status === "AGREEMENT_PENDING" || status === "SELECTED") &&
      !existing.fellowship
    ) {
      try {
        await awardFellowship({
          applicationId,
          sanctionedAmount: Math.min(existing.budget?.total ?? BUDGET_MAX, BUDGET_MAX),
          duration: "12 months",
        });
      } catch (error) {
        console.error("Admin status awardFellowship error:", error);
      }
    }

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

export async function PUT(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, personal, notes, researchProposal, budget } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const application = await updateApplicationByAdmin(
      applicationId,
      { personal, notes, researchProposal, budget },
      user.id
    );

    return NextResponse.json({ success: true, application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update application";
    console.error("Admin application update error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
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

export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applicationId =
      request.nextUrl.searchParams.get("applicationId") ??
      request.nextUrl.searchParams.get("id");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const result = await deleteApplication(applicationId);

    return NextResponse.json({
      success: true,
      ...result,
      message: result.hadFellowship
        ? `Application ${result.applicationNumber} deleted (fellowship and fund records removed).`
        : `Application ${result.applicationNumber} deleted.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete application";
    console.error("Delete application error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
