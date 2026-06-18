import type { ReviewPhase, UserRole } from "@prisma/client";
import prisma from "./db";
import { notifyStatusChange } from "./notifications";

const PHASE_ROLES: Record<ReviewPhase, UserRole[]> = {
  COMMITTEE: ["COMMITTEE"],
  TRUSTEE: ["TRUSTEE"],
  VERIFICATION: ["STAFF", "ADMIN"],
};

export function canRaiseQuery(role: UserRole, phase: ReviewPhase): boolean {
  return PHASE_ROLES[phase].includes(role) || role === "ADMIN";
}

export async function assignReviewer(params: {
  applicationId: string;
  reviewerId: string;
  phase: ReviewPhase;
  assignedBy: string;
  notes?: string;
}) {
  const reviewer = await prisma.user.findUnique({ where: { id: params.reviewerId } });
  if (!reviewer || !PHASE_ROLES[params.phase].includes(reviewer.role)) {
    throw new Error(`Selected user cannot be assigned as ${params.phase} reviewer`);
  }

  const assignment = await prisma.applicationReviewAssignment.upsert({
    where: {
      applicationId_reviewerId_phase: {
        applicationId: params.applicationId,
        reviewerId: params.reviewerId,
        phase: params.phase,
      },
    },
    update: {
      isActive: true,
      notes: params.notes,
      assignedBy: params.assignedBy,
      assignedAt: new Date(),
    },
    create: {
      applicationId: params.applicationId,
      reviewerId: params.reviewerId,
      phase: params.phase,
      assignedBy: params.assignedBy,
      notes: params.notes,
    },
  });

  const app = await prisma.application.findUnique({ where: { id: params.applicationId } });
  if (app && params.phase === "COMMITTEE" && !["UNDER_REVIEW", "TECHNICAL_SCORING", "SHORTLISTED"].includes(app.status)) {
    await prisma.application.update({
      where: { id: params.applicationId },
      data: {
        status: "UNDER_REVIEW",
        statusHistory: {
          create: {
            fromStatus: app.status,
            toStatus: "UNDER_REVIEW",
            changedBy: params.assignedBy,
            notes: "Assigned to Research Committee for review",
          },
        },
      },
    });
  }

  if (app && params.phase === "TRUSTEE" && !["TRUSTEE_REVIEW", "SHORTLISTED", "INTERVIEW_COMPLETED", "AGREEMENT_PENDING", "SELECTED"].includes(app.status)) {
    await prisma.application.update({
      where: { id: params.applicationId },
      data: {
        status: "TRUSTEE_REVIEW",
        statusHistory: {
          create: {
            fromStatus: app.status,
            toStatus: "TRUSTEE_REVIEW",
            changedBy: params.assignedBy,
            notes: "Assigned to Board of Trustees for review",
          },
        },
      },
    });
  }

  return assignment;
}

export async function raiseApplicationQuery(params: {
  applicationId: string;
  raisedBy: string;
  phase: ReviewPhase;
  message: string;
  requiresFullResubmit?: boolean;
}) {
  const app = await prisma.application.findUnique({ where: { id: params.applicationId } });
  if (!app) throw new Error("Application not found");

  const query = await prisma.applicationQuery.create({
    data: {
      applicationId: params.applicationId,
      raisedBy: params.raisedBy,
      phase: params.phase,
      message: params.message,
      requiresFullResubmit: Boolean(params.requiresFullResubmit),
      previousStatus: app.status,
    },
  });

  await prisma.application.update({
    where: { id: params.applicationId },
    data: {
      status: "QUERY_RAISED",
      queryNotes: params.message,
      queryPhase: params.phase,
      requiresResubmit: Boolean(params.requiresFullResubmit),
      statusHistory: {
        create: {
          fromStatus: app.status,
          toStatus: "QUERY_RAISED",
          changedBy: params.raisedBy,
          notes: `[${params.phase}] ${params.message}`,
        },
      },
    },
  });

  await notifyStatusChange(app.userId, app.applicationNumber, "QUERY_RAISED", {
    fromStatus: app.status,
  });

  return query;
}

export async function respondToApplicationQuery(params: {
  queryId: string;
  userId: string;
  response: string;
}) {
  const query = await prisma.applicationQuery.findUnique({
    where: { id: params.queryId },
    include: { application: true },
  });

  if (!query || query.application.userId !== params.userId) {
    throw new Error("Query not found");
  }

  if (query.status !== "OPEN") {
    throw new Error("This query has already been responded to");
  }

  const updated = await prisma.applicationQuery.update({
    where: { id: params.queryId },
    data: {
      status: "RESPONDED",
      applicantResponse: params.response,
      respondedAt: new Date(),
    },
  });

  await prisma.application.update({
    where: { id: query.applicationId },
    data: {
      status: "QUERY_RESPONDED",
      statusHistory: {
        create: {
          fromStatus: "QUERY_RAISED",
          toStatus: "QUERY_RESPONDED",
          notes: params.response,
        },
      },
    },
  });

  return updated;
}

export async function resolveApplicationQuery(params: {
  queryId: string;
  resolvedBy: string;
  resumeStatus?: string;
}) {
  const query = await prisma.applicationQuery.findUnique({
    where: { id: params.queryId },
    include: { application: true },
  });

  if (!query) throw new Error("Query not found");

  const targetStatus = (params.resumeStatus || query.previousStatus || "SCRUTINY") as never;

  await prisma.applicationQuery.update({
    where: { id: params.queryId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await prisma.application.update({
    where: { id: query.applicationId },
    data: {
      status: targetStatus,
      requiresResubmit: false,
      queryNotes: null,
      queryPhase: null,
      statusHistory: {
        create: {
          fromStatus: query.application.status,
          toStatus: targetStatus,
          changedBy: params.resolvedBy,
          notes: "Query resolved — review resumed",
        },
      },
    },
  });
}

export async function completeQueryResubmit(applicationId: string, userId: string) {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app || app.userId !== userId) {
    throw new Error("Application not found");
  }
  if (app.status !== "QUERY_RAISED" || !app.requiresResubmit) {
    throw new Error("No full resubmission is required for this application");
  }

  const openQuery = await prisma.applicationQuery.findFirst({
    where: { applicationId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  if (openQuery) {
    await prisma.applicationQuery.update({
      where: { id: openQuery.id },
      data: {
        status: "RESPONDED",
        applicantResponse: "Applicant resubmitted the full application form",
        respondedAt: new Date(),
      },
    });
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "QUERY_RESPONDED",
      requiresResubmit: false,
      statusHistory: {
        create: {
          fromStatus: "QUERY_RAISED",
          toStatus: "QUERY_RESPONDED",
          notes: "Applicant resubmitted full application details",
        },
      },
    },
  });
}

export async function getAssignedApplicationIds(reviewerId: string, phase: ReviewPhase) {
  const rows = await prisma.applicationReviewAssignment.findMany({
    where: { reviewerId, phase, isActive: true },
    select: { applicationId: true },
  });
  return rows.map((r) => r.applicationId);
}
