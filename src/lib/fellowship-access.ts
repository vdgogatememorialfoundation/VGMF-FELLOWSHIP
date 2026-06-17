import prisma from "./db";
import { awardFellowship } from "./fellowship-service";
import { BUDGET_MAX } from "./utils";

const fellowshipInclude = {
  installments: { orderBy: { installmentNo: "asc" as const } },
  progressReports: { orderBy: [{ year: "desc" as const }, { quarter: "desc" as const }] },
  midTermReviews: { orderBy: { reviewedAt: "desc" as const } },
  finalSubmission: true,
  financeRecords: true,
  fellowshipDocuments: true,
  application: { include: { digitalUndertaking: true } },
};

export async function loadApplicantApplication(userId: string) {
  return prisma.application.findFirst({
    where: {
      userId,
      OR: [
        { fellowship: { isNot: null } },
        { trusteeApproval: { is: { approved: true } } },
        { status: { in: ["SELECTED", "AGREEMENT_PENDING", "COMPLETED"] } },
      ],
    },
    include: {
      fellowship: { include: fellowshipInclude },
      trusteeApproval: true,
      budget: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function ensureApplicantFellowship(userId: string) {
  const application = await loadApplicantApplication(userId);
  if (!application) {
    return { application: null, fellowship: null };
  }

  let fellowship = application.fellowship;
  let status = application.status;

  if (!fellowship && application.trusteeApproval?.approved) {
    try {
      const created = await awardFellowship({
        applicationId: application.id,
        sanctionedAmount: Math.min(application.budget?.total ?? BUDGET_MAX, BUDGET_MAX),
        duration: "12 months",
      });
      fellowship = await prisma.fellowship.findUnique({
        where: { id: created.id },
        include: fellowshipInclude,
      });
      status = "AGREEMENT_PENDING";
    } catch (error) {
      console.error("ensureApplicantFellowship award error:", error);
    }
  }

  if (status === "COMPLETED" && fellowship && !fellowship.isCompleted) {
    try {
      await prisma.application.update({
        where: { id: application.id },
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
    } catch (error) {
      console.error("ensureApplicantFellowship status revert error:", error);
    }
  }

  return {
    application: { ...application, status },
    fellowship,
  };
}

export async function getFellowshipForApplicant(userId: string, fellowshipId?: string) {
  const { fellowship } = await ensureApplicantFellowship(userId);
  if (!fellowship) return null;
  if (fellowshipId && fellowship.id !== fellowshipId) {
    const match = await prisma.fellowship.findFirst({
      where: { id: fellowshipId, application: { userId } },
      include: fellowshipInclude,
    });
    return match;
  }
  return fellowship;
}

export async function repairApplicationIfNeeded(app: {
  id: string;
  status: string;
  fellowship: { id: string; isCompleted: boolean; currentStage: string } | null;
  trusteeApproval: { approved: boolean } | null;
  budget: { total: number } | null;
}) {
  let fellowship = app.fellowship as Awaited<
    ReturnType<typeof ensureApplicantFellowship>
  >["fellowship"];
  let status = app.status;

  if (!fellowship && app.trusteeApproval?.approved) {
    try {
      const created = await awardFellowship({
        applicationId: app.id,
        sanctionedAmount: Math.min(app.budget?.total ?? BUDGET_MAX, BUDGET_MAX),
        duration: "12 months",
      });
      fellowship = await prisma.fellowship.findUnique({
        where: { id: created.id },
        include: fellowshipInclude,
      });
      status = "AGREEMENT_PENDING";
    } catch (error) {
      console.error("repairApplicationIfNeeded award error:", error);
    }
  }

  if (status === "COMPLETED" && fellowship && !fellowship.isCompleted) {
    try {
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
    } catch (error) {
      console.error("repairApplicationIfNeeded revert error:", error);
    }
  }

  return { status, fellowship };
}
