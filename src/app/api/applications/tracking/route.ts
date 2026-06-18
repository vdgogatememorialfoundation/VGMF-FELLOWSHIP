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
import { repairApplicationIfNeeded } from "@/lib/fellowship-access";

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
      trusteeApproval: true,
      budget: true,
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
      try {
      const repaired = await repairApplicationIfNeeded(app);
      const effectiveStatus = repaired.status as typeof app.status;
      const fellowship = repaired.fellowship ?? app.fellowship;
      const fellowshipStage = fellowship?.currentStage ?? null;
      const milestoneStates = getMilestoneStates(effectiveStatus, fellowshipStage);
      const fellowshipStepStates = fellowshipStage
        ? getFellowshipStepStates(fellowshipStage)
        : null;

      let pendingActions: ReturnType<typeof getFellowshipPendingActions> = [];
      let installment1Requirements: Awaited<ReturnType<typeof getInstallmentRequirementStatus>> = [];

      if (fellowship) {
        installment1Requirements = await getInstallmentRequirementStatus(fellowship, 1);
        const fellowRequirements = installment1Requirements.filter((r) => r.source === "fellow");
        pendingActions = getFellowshipPendingActions({
          currentStage: fellowship.currentStage,
          bankSubmitted: Boolean(fellowship.bankSubmittedAt),
          bankVerified: Boolean(fellowship.bankVerifiedAt),
          installment1DocsComplete: fellowRequirements.every((r) => r.satisfied),
          hasPendingQuarterly: fellowship.progressReports?.some(
            (r) => r.status === "REVISION_REQUIRED"
          ) ?? false,
        });
      } else if (["AGREEMENT_PENDING", "SELECTED"].includes(effectiveStatus)) {
        pendingActions = [
          {
            key: "fellowship_setup",
            label: "Open My Fellowship",
            detail:
              "Complete agreement, bank details, and Installment 1 documents to receive your grant.",
            href: "/applicant/fellowship",
            urgent: true,
          },
        ];
      }

      const displayStatus = fellowshipStage
        ? fellowshipStage === "COMPLETED"
          ? "Fellowship Completed"
          : getFellowshipStageLabel(fellowshipStage)
        : getLifecycleStatusLabel(effectiveStatus);

      const showInterview =
        Boolean(app.interview) &&
        !fellowship &&
        getMilestoneIndex(effectiveStatus, fellowshipStage) < 6;

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        formattedNumber: formatApplicationNumber(app.applicationNumber),
        status: effectiveStatus,
        displayStatus,
        adminPhase: getAdminPhase(effectiveStatus),
        progress: getMilestoneProgress(effectiveStatus, fellowshipStage),
        pipelineIndex: getMilestoneIndex(effectiveStatus, fellowshipStage),
        milestoneStates,
        fellowshipSteps: fellowship ? APPLICANT_FELLOWSHIP_STEPS : null,
        fellowshipStepStates,
        pendingActions,
        showInterview,
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
        fellowship: fellowship
          ? {
              fellowshipId: fellowship.fellowshipId,
              currentStage: fellowship.currentStage,
              stageLabel:
                FELLOWSHIP_STAGE_LABELS[fellowship.currentStage] ?? fellowship.currentStage,
              mentor: fellowship.mentor,
              institution: fellowship.institution,
              sanctionedAmount: fellowship.sanctionedAmount,
              awardLetterPath: fellowship.awardLetterPath,
              bankSubmitted: Boolean(fellowship.bankSubmittedAt),
              bankVerified: Boolean(fellowship.bankVerifiedAt),
              isActive: fellowship.isActive,
              isCompleted: fellowship.isCompleted,
              installmentsReleased: fellowship.installments.filter(
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
        fellowshipPendingSetup:
          !fellowship && ["AGREEMENT_PENDING", "SELECTED"].includes(effectiveStatus),
      };
      } catch (error) {
        console.error("Tracking payload error for application", app.id, error);
        return {
          id: app.id,
          applicationNumber: app.applicationNumber,
          formattedNumber: formatApplicationNumber(app.applicationNumber),
          status: app.status,
          displayStatus: getLifecycleStatusLabel(app.status),
          progress: 0,
          pipelineIndex: 0,
          milestoneStates: getMilestoneStates(app.status, null),
          documents: [],
          statusHistory: [],
          interview: null,
          fellowship: null,
          pendingActions: [],
          showInterview: false,
          trackingError: "Unable to load full tracking data",
        };
      }
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
