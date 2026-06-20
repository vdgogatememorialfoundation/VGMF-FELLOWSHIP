import type { Prisma, VerificationPurpose, VerificationStatus } from "@prisma/client";
import prisma from "./db";
import {
  extractKycRequestFromWebhook,
  mapDigioEventToStatus,
  mapDigioKycStatus,
  type DigioWebhookPayload,
} from "./digio";

function isTerminalStatus(status: VerificationStatus): boolean {
  return ["APPROVED", "DECLINED", "ABANDONED", "EXPIRED"].includes(status);
}

function resolveWebhookStatus(
  payload: DigioWebhookPayload & Record<string, unknown>
): VerificationStatus {
  if (typeof payload.event === "string" && payload.event.trim()) {
    return mapDigioEventToStatus(payload.event);
  }

  const kycRequest = extractKycRequestFromWebhook(payload);
  if (typeof kycRequest.status === "string") {
    return mapDigioKycStatus(kycRequest.status);
  }

  return "IN_PROGRESS";
}

export async function applyDigioWebhook(payload: DigioWebhookPayload & Record<string, unknown>) {
  const mappedStatus = resolveWebhookStatus(payload);
  const now = new Date();
  const kycRequest = extractKycRequestFromWebhook(payload);

  const requestId =
    (typeof kycRequest.id === "string" && kycRequest.id) ||
    (typeof payload.id === "string" && payload.id) ||
    "";

  if (!requestId) {
    return { ok: false as const, reason: "Missing request ID" };
  }

  const existing = await prisma.verificationSession.findUnique({
    where: { providerRequestId: requestId },
    include: {
      application: true,
      fellowship: true,
    },
  });

  if (!existing) {
    return { ok: false as const, reason: "Unknown session" };
  }

  const decisionJson = (kycRequest ?? payload) as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.verificationSession.update({
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
        bankDigioVerifiedAt: mappedStatus === "APPROVED" ? now : null,
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
    purpose: existing.purpose as VerificationPurpose,
    status: mappedStatus,
    applicationId: existing.applicationId,
    fellowshipId: existing.fellowshipId,
  };
}
