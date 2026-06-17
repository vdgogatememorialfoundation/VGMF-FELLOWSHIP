import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { formatApplicationNumber } from "@/lib/application-number";
import {
  APPLICANT_MILESTONES,
  getMilestoneProgress,
  getMilestoneIndex,
  getMilestoneStates,
  getDocumentLabel,
  getAdminPhase,
} from "@/lib/application-workflow";
import { FELLOWSHIP_STAGE_LABELS } from "@/lib/lifecycle-workflow";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { uploadedAt: "asc" } },
      interview: true,
      fellowship: { include: { installments: true, progressReports: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    pipeline: APPLICANT_MILESTONES,
    milestones: APPLICANT_MILESTONES,
    applications: applications.map((app) => {
      const fellowshipStage = app.fellowship?.currentStage ?? null;
      const milestoneStates = getMilestoneStates(app.status, fellowshipStage);
      return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      formattedNumber: formatApplicationNumber(app.applicationNumber),
      status: app.status,
      adminPhase: getAdminPhase(app.status),
      progress: getMilestoneProgress(app.status, fellowshipStage),
      pipelineIndex: getMilestoneIndex(app.status, fellowshipStage),
      milestoneStates,
      rejectionReason: app.rejectionReason,
      adminNotes: app.adminNotes,
      queryNotes: app.queryNotes,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      documents: app.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        label: getDocumentLabel(doc.type),
        status: doc.status,
        fileName: doc.fileName,
        filePath: doc.filePath,
        rejectionReason: doc.rejectionReason,
        reviewedAt: doc.reviewedAt,
        canResubmit: doc.status === "RESUBMIT_REQUIRED",
      })),
      statusHistory: app.statusHistory.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        notes: entry.notes,
        createdAt: entry.createdAt,
      })),
      interview: app.interview
        ? {
            scheduledDate: app.interview.scheduledDate,
            scheduledTime: app.interview.scheduledTime,
            meetingLink: app.interview.meetingLink,
            panelMembers: app.interview.panelMembers,
          }
        : null,
      fellowship: app.fellowship
        ? {
            fellowshipId: app.fellowship.fellowshipId,
            currentStage: app.fellowship.currentStage,
            stageLabel: FELLOWSHIP_STAGE_LABELS[app.fellowship.currentStage] ?? app.fellowship.currentStage,
            mentor: app.fellowship.mentor,
            institution: app.fellowship.institution,
            sanctionedAmount: app.fellowship.sanctionedAmount,
            isActive: app.fellowship.isActive,
            isCompleted: app.fellowship.isCompleted,
            installmentsReleased: app.fellowship.installments.filter((i) => i.status === "RELEASED").length,
          }
        : null,
    };
    }),
  });
}
