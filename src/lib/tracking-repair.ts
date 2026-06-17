import prisma from "./db";
import { awardFellowship } from "./fellowship-service";
import { BUDGET_MAX } from "./utils";
import type { Application, ApplicationStatus } from "@prisma/client";

const fellowshipInclude = {
  installments: true,
  progressReports: true,
  fellowshipDocuments: true,
  finalSubmission: true,
  application: { include: { digitalUndertaking: true } },
} as const;

type ApplicationWithRelations = Application & {
  fellowship: Awaited<ReturnType<typeof loadFellowship>> | null;
  trusteeApproval: { approved: boolean } | null;
  budget: { total: number } | null;
};

async function loadFellowship(fellowshipId: string) {
  return prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    include: fellowshipInclude,
  });
}

export async function ensureTrackingApplicationState(app: ApplicationWithRelations) {
  let fellowship = app.fellowship;
  let status = app.status;

  if (!fellowship && app.trusteeApproval?.approved) {
    try {
      const created = await awardFellowship({
        applicationId: app.id,
        sanctionedAmount: Math.min(app.budget?.total ?? BUDGET_MAX, BUDGET_MAX),
        duration: "12 months",
      });
      fellowship = await loadFellowship(created.id);
      status = "AGREEMENT_PENDING";
    } catch (error) {
      console.error("Failed to auto-create fellowship for tracking:", error);
    }
  }

  const fellowshipActive = fellowship && !fellowship.isCompleted;

  if (status === "COMPLETED" && fellowshipActive) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        status: "AGREEMENT_PENDING",
        statusHistory: {
          create: {
            fromStatus: "COMPLETED",
            toStatus: "AGREEMENT_PENDING",
            notes: "Status corrected — fellowship is still in progress",
          },
        },
      },
    });
    status = "AGREEMENT_PENDING";
  }

  if (status === "COMPLETED" && !fellowship && app.trusteeApproval?.approved) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        status: "AGREEMENT_PENDING",
        statusHistory: {
          create: {
            fromStatus: "COMPLETED",
            toStatus: "AGREEMENT_PENDING",
            notes: "Status corrected — awaiting fellowship onboarding",
          },
        },
      },
    });
    status = "AGREEMENT_PENDING";
  }

  if (fellowship && !fellowship.progressReports) {
    fellowship = await loadFellowship(fellowship.id);
  }

  return { status, fellowship };
}
