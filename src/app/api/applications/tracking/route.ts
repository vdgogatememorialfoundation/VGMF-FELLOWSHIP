import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { formatApplicationNumber } from "@/lib/application-number";
import {
  APPLICANT_MILESTONES,
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
import { getIntegrationConfig } from "@/lib/integrations";
import { isDigioIdentityConfigured } from "@/lib/digio";
import { shouldTrackIdentityVerification } from "@/lib/identity-verification-tracking";
import {
  buildTrackingHeadline,
  buildTrackingTimeline,
  getCompactPipelineSteps,
  getTrackingProgress,
} from "@/lib/tracking-timeline";

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
      verificationSessions: {
        where: { purpose: "APPLICANT_IDENTITY" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
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

  const integrationConfig = await getIntegrationConfig();
  const digioIdentityEnabled = await isDigioIdentityConfigured();
  const manualIdentityEnabled = !digioIdentityEnabled;

  const payload = await Promise.all(
    applications.map(async (app) => {
      try {
      const repaired = await repairApplicationIfNeeded(app);
      const effectiveStatus = repaired.status as typeof app.status;
      const fellowship = repaired.fellowship ?? app.fellowship;
      const fellowshipStage = fellowship?.currentStage ?? null;
      const identitySession = app.verificationSessions[0] ?? null;
      const identityVerification =
        digioIdentityEnabled || manualIdentityEnabled
          ? {
              enabled: true,
              required: integrationConfig.digio.requireIdentityForScrutiny,
              status: app.identityVerificationStatus,
              verifiedAt: app.identityVerifiedAt,
              sessionUpdatedAt: identitySession?.updatedAt ?? null,
              sessionStartedAt: identitySession?.createdAt ?? null,
              manual: manualIdentityEnabled,
            }
          : null;
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

      if (
        identityVerification &&
        shouldTrackIdentityVerification(identityVerification, effectiveStatus) &&
        identityVerification.status !== "APPROVED"
      ) {
        pendingActions = [
          {
            key: "identity_verification",
            label: "Complete identity verification",
            detail:
              identityVerification.status === "DECLINED"
                ? manualIdentityEnabled
                  ? "Your identity documents need to be resubmitted. Open Identity Verification."
                  : "Your previous session was declined. Start a new verification from Identity Verification."
                : manualIdentityEnabled
                  ? "Upload your government ID and photo for manual verification."
                  : "Verify your government ID online so the Foundation can approve your documents.",
            href: "/applicant/verification",
            urgent: true,
          },
          ...pendingActions,
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

      const headline = buildTrackingHeadline(
        effectiveStatus,
        fellowshipStage,
        app.queryNotes,
        identityVerification
      );
      const timeline = buildTrackingTimeline({
        status: effectiveStatus,
        fellowshipStage,
        statusHistory: app.statusHistory,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        fellowship: fellowship
          ? {
              currentStage: fellowship.currentStage,
              createdAt: fellowship.createdAt,
              bankSubmittedAt: fellowship.bankSubmittedAt,
              bankVerifiedAt: fellowship.bankVerifiedAt,
              agreementGeneratedAt: fellowship.agreementGeneratedAt,
              installments: fellowship.installments.map((i) => ({
                installmentNo: i.installmentNo,
                status: i.status,
                releasedAt: i.releasedAt,
              })),
            }
          : null,
        identityVerification,
      });
      const compactSteps = getCompactPipelineSteps(effectiveStatus, fellowshipStage);

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        formattedNumber: formatApplicationNumber(app.applicationNumber),
        status: effectiveStatus,
        displayStatus,
        headline,
        timeline,
        compactSteps,
        adminPhase: getAdminPhase(effectiveStatus),
        progress: getTrackingProgress(effectiveStatus, fellowshipStage),
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
          canResubmit:
            doc.status === "RESUBMIT_REQUIRED" || doc.status === "REJECTED",
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
        identityVerification: identityVerification
          ? {
              status: identityVerification.status,
              verifiedAt: identityVerification.verifiedAt,
              required: identityVerification.required,
              sessionUpdatedAt: identityVerification.sessionUpdatedAt,
              sessionStartedAt: identityVerification.sessionStartedAt,
            }
          : null,
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
