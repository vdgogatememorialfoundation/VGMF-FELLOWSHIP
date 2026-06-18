import type { DiditVerificationPurpose, DiditVerificationStatus, Prisma } from "@prisma/client";
import prisma from "./db";
import { mapDiditStatus, type DiditWebhookPayload } from "./didit";

function isTerminalStatus(status: DiditVerificationStatus): boolean {
  return ["APPROVED", "DECLINED", "ABANDONED", "EXPIRED"].includes(status);
}

export async function applyDiditWebhook(payload: DiditWebhookPayload) {
  const mappedStatus = mapDiditStatus(payload.status);
  const now = new Date();

  const existing = await prisma.diditVerificationSession.findUnique({
    where: { diditSessionId: payload.session_id },
    include: {
      application: true,
      fellowship: true,
    },
  });

  if (!existing) {
    return { ok: false as const, reason: "Unknown session" };
  }

  const decisionJson = (payload.decision ?? null) as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.diditVerificationSession.update({
      where: { id: existing.id },
      data: {
        status: mappedStatus,
        decisionJson,
        webhookPayload: payload as Prisma.InputJsonValue,
        completedAt: isTerminalStatus(mappedStatus) ? now : null,
      },
    });

    if (existing.purpose === "APPLICANT_IDENTITY" && existing.applicationId) {
      await tx.application.update({
        where: { id: existing.applicationId },
        data: {
          identityVerificationStatus: mappedStatus,
          identityVerifiedAt: mappedStatus === "APPROVED" ? now : null,
        },
      });
    }

    if (existing.purpose === "UNDERTAKING_IDENTITY" && existing.applicationId) {
      await tx.application.update({
        where: { id: existing.applicationId },
        data: {
          identityVerificationStatus: mappedStatus,
          identityVerifiedAt: mappedStatus === "APPROVED" ? now : null,
        },
      });
    }

    if (existing.purpose === "BANK_ACCOUNT" && existing.fellowshipId) {
      const fellowship = existing.fellowship;
      const bankUpdate: Prisma.FellowshipUpdateInput = {
        bankVerificationStatus: mappedStatus,
        bankDiditVerifiedAt: mappedStatus === "APPROVED" ? now : null,
      };

      if (mappedStatus === "APPROVED" && fellowship) {
        bankUpdate.bankVerifiedAt = fellowship.bankVerifiedAt ?? now;
        if (fellowship.currentStage === "BANK_VERIFICATION") {
          bankUpdate.currentStage = "SANCTIONED";
        }
      }

      if (mappedStatus === "DECLINED" || mappedStatus === "EXPIRED") {
        bankUpdate.bankVerifiedAt = null;
      }

      await tx.fellowship.update({
        where: { id: existing.fellowshipId },
        data: bankUpdate,
      });
    }
  });

  return {
    ok: true as const,
    purpose: existing.purpose as DiditVerificationPurpose,
    status: mappedStatus,
    applicationId: existing.applicationId,
    fellowshipId: existing.fellowshipId,
  };
}

export async function syncDiditSummaryFromSession(sessionId: string) {
  const session = await prisma.diditVerificationSession.findUnique({
    where: { diditSessionId: sessionId },
  });
  if (!session) return null;

  return applyDiditWebhook({
    session_id: session.diditSessionId,
    status: session.status.replace(/_/g, " "),
    vendor_data: session.vendorData,
    decision: (session.decisionJson as Record<string, unknown> | null) ?? undefined,
  });
}
