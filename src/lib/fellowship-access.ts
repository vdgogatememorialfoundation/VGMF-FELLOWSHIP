import prisma from "./db";
import { awardFellowship } from "./fellowship-service";
import { generateAndStoreFellowshipAgreement } from "./agreement-service";
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

const POST_SELECTION_STATUSES = new Set(["SELECTED", "AGREEMENT_PENDING", "COMPLETED"]);

function shouldHaveFellowship(app: {
  status: string;
  trusteeApproval: { approved: boolean } | null;
}) {
  return app.trusteeApproval?.approved || POST_SELECTION_STATUSES.has(app.status);
}

async function createFellowshipForApplication(app: {
  id: string;
  status: string;
  budget: { total: number } | null;
}) {
  const created = await awardFellowship({
    applicationId: app.id,
    sanctionedAmount: Math.min(app.budget?.total ?? BUDGET_MAX, BUDGET_MAX),
    duration: "12 months",
  });

  const fellowship = await prisma.fellowship.findUnique({
    where: { id: created.id },
    include: fellowshipInclude,
  });

  return fellowship;
}

async function ensureAgreementPdf(fellowshipId: string, agreementGeneratedAt: Date | null | undefined) {
  if (agreementGeneratedAt) return;
  try {
    await generateAndStoreFellowshipAgreement(fellowshipId);
  } catch (error) {
    console.error("ensureAgreementPdf error:", error);
  }
}

async function revertPrematureCompleted(applicationId: string) {
  await prisma.application.update({
    where: { id: applicationId },
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
  return "AGREEMENT_PENDING" as const;
}

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

  if (!fellowship && shouldHaveFellowship(application)) {
    try {
      fellowship = await createFellowshipForApplication(application);
      status = "AGREEMENT_PENDING";
    } catch (error) {
      console.error("ensureApplicantFellowship award error:", error);
    }
  }

  if (fellowship) {
    await ensureAgreementPdf(fellowship.id, fellowship.agreementGeneratedAt);
    const refreshed = await prisma.fellowship.findUnique({
      where: { id: fellowship.id },
      include: fellowshipInclude,
    });
    if (refreshed) fellowship = refreshed;
  }

  if (status === "COMPLETED" && fellowship && !fellowship.isCompleted) {
    try {
      status = await revertPrematureCompleted(application.id);
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
  fellowship: {
    id: string;
    isCompleted: boolean;
    currentStage: string;
    agreementGeneratedAt?: Date | null;
  } | null;
  trusteeApproval: { approved: boolean } | null;
  budget: { total: number } | null;
}) {
  let fellowship = app.fellowship as Awaited<
    ReturnType<typeof ensureApplicantFellowship>
  >["fellowship"];
  let status = app.status;

  if (!fellowship && shouldHaveFellowship(app)) {
    try {
      fellowship = await createFellowshipForApplication(app);
      status = "AGREEMENT_PENDING";
    } catch (error) {
      console.error("repairApplicationIfNeeded award error:", error);
    }
  }

  if (fellowship) {
    await ensureAgreementPdf(fellowship.id, fellowship.agreementGeneratedAt);
    const refreshed = await prisma.fellowship.findUnique({
      where: { id: fellowship.id },
      include: fellowshipInclude,
    });
    if (refreshed) fellowship = refreshed;
  }

  if (status === "COMPLETED" && fellowship && !fellowship.isCompleted) {
    try {
      status = await revertPrematureCompleted(app.id);
    } catch (error) {
      console.error("repairApplicationIfNeeded revert error:", error);
    }
  }

  return { status, fellowship };
}
