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
  getLifecycleStatusLabel,
} from "@/lib/application-workflow";
import { FELLOWSHIP_STAGE_LABELS } from "@/lib/lifecycle-workflow";
import {
  APPLICANT_FELLOWSHIP_STEPS,
  getFellowshipStepStates,
  getFellowshipStageLabel,
  getFellowshipPendingActions,
} from "@/lib/fellowship-tracking";
import { getInstallmentRequirementStatus } from "@/lib/installment-gates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      fellowship: {
        include: {
          installments: true,
          progressReports: true,
          fellowshipDocuments: true,
          finalSubmission: true,
          application: { include: { digitalUndertaking: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const payload = await Promise.all(
    applications.map(async (app) => {
      const fellowshipStage = app.fellowship?.currentStage ?? null;
      const milestoneStates = getMilestoneStates(app.status, fellowshipStage);
      const fellowshipStepStates = fellowshipStage
        ? getFellowshipStepStates(fellowshipStage)
        : null;

      let pendingActions: ReturnType<typeof getFellowshipPendingActions> = [];
      let installment1Requirements: Awaited<ReturnType<typeof getInstallmentRequirementStatus>> = [];

      if (app.fellowship) {
        installment1Requirements = await getInstallmentRequirementStatus(
          app.fellowship,
          1
        );
        const fellowRequirements = installment1Requirements.filter((r) => r.source === "fellow");
        pendingActions = getFellowshipPendingActions({
          currentStage: app.fellowship.currentStage,
          bankSubmitted: Boolean(app.fellowship.bankSubmittedAt),
          bankVerified: Boolean(app.fellowship.bankVerifiedAt),
          installment1DocsComplete: fellowRequirements.every((r) => r.satisfied),
          hasPendingQuarterly: app.fellowship.progressReports.some(
            (r) => r.status === "REVISION_REQUIRED"
          ),
        });
      }

      const displayStatus =
        fellowshipStage && fellowshipStage !== "COMPLETED"
          ? getFellowshipStageLabel(fellowshipStage)
          : app.status === "COMPLETED" && fellowshipStage === "COMPLETED"
            ? "Fellowship Completed"
            : getLifecycleStatusLabel(app.status);

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        formattedNumber: formatApplicationNumber(app.applicationNumber),
        status: app.status,
        displayStatus,
        adminPhase: getAdminPhase(app.status),
        progress: getMilestoneProgress(app.status, fellowshipStage),
        pipelineIndex: getMilestoneIndex(app.status, fellowshipStage),
        milestoneStates,
        fellowshipSteps: fellowshipStage ? APPLICANT_FELLOWSHIP_STEPS : null,
        fellowshipStepStates,
        pendingActions,
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
              stageLabel:
                FELLOWSHIP_STAGE_LABELS[app.fellowship.currentStage] ??
                app.fellowship.currentStage,
              mentor: app.fellowship.mentor,
              institution: app.fellowship.institution,
              sanctionedAmount: app.fellowship.sanctionedAmount,
              bankSubmitted: Boolean(app.fellowship.bankSubmittedAt),
              bankVerified: Boolean(app.fellowship.bankVerifiedAt),
              isActive: app.fellowship.isActive,
              isCompleted: app.fellowship.isCompleted,
              installmentsReleased: app.fellowship.installments.filter(
                (i) => i.status === "RELEASED"
              ).length,
              installment1Requirements: installment1Requirements.map((r) => ({
                key: r.key,
                label: r.label,
                satisfied: r.satisfied,
                status: r.status,
              })),
            }
          : null,
      };
    })
  );

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      pipeline: APPLICANT_MILESTONES,
      milestones: APPLICANT_MILESTONES,
      applications: payload,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
