import prisma from "./db";
import { generateFellowshipId } from "./auth";
import { notifyInstallmentReleased, notifyStatusChange } from "./notifications";
import { stageForInstallmentRelease } from "./fellowship-stage";
import { validateInstallmentRelease } from "./installment-gates";

const INSTALLMENT_SPLITS = [
  { no: 1, percentage: 40, label: "Commencement (40%)" },
  { no: 2, percentage: 40, label: "After mid-term review (40%)" },
  { no: 3, percentage: 20, label: "Final report & presentation (20%)" },
];

export async function awardFellowship(params: {
  applicationId: string;
  sanctionedAmount: number;
  duration: string;
  startDate?: Date;
}) {
  const { applicationId, sanctionedAmount, duration, startDate } = params;

  const existing = await prisma.fellowship.findUnique({ where: { applicationId } });
  if (existing) return existing;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      researchProposal: true,
      user: { include: { profile: true } },
    },
  });

  if (!application) throw new Error("Application not found");

  const fellowshipId = await generateFellowshipId();
  const start = startDate ?? new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + (duration.includes("12") ? 12 : 6));

  const fellowship = await prisma.fellowship.create({
    data: {
      fellowshipId,
      applicationId,
      fellowName: application.user.profile?.name ?? application.name,
      projectTitle: application.researchProposal?.projectTitle ?? "Research Project",
      sanctionedAmount,
      duration,
      institution: application.institutionName,
      startDate: start,
      endDate: end,
      currentStage: "AGREEMENT_PENDING",
      installments: {
        create: INSTALLMENT_SPLITS.map((split) => ({
          installmentNo: split.no,
          percentage: split.percentage,
          amount: Math.round((sanctionedAmount * split.percentage) / 100),
          status: split.no === 1 ? "APPROVED" : "PENDING",
        })),
      },
      financeRecords: {
        create: {
          sanctionedAmount,
          releasedAmount: 0,
          balanceAmount: sanctionedAmount,
        },
      },
    },
    include: { installments: true },
  });

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "AGREEMENT_PENDING",
      statusHistory: {
        create: {
          fromStatus: application.status,
          toStatus: "AGREEMENT_PENDING",
          notes: `Fellowship awarded — ${fellowshipId}, sanctioned ₹${sanctionedAmount.toLocaleString("en-IN")}`,
        },
      },
    },
  });

  await notifyStatusChange(
    application.userId,
    application.applicationNumber,
    "AGREEMENT_PENDING"
  );

  return fellowship;
}

export async function releaseInstallment(params: {
  installmentId: string;
  transactionId?: string;
  approvalNotes?: string;
  reviewerId: string;
}) {
  const installment = await prisma.fundInstallment.findUnique({
    where: { id: params.installmentId },
    include: {
      fellowship: {
        include: {
          application: true,
          financeRecords: true,
        },
      },
    },
  });

  if (!installment) throw new Error("Installment not found");
  if (installment.status === "RELEASED") throw new Error("Installment already released");

  const gate = await validateInstallmentRelease(
    installment.fellowshipId,
    installment.installmentNo
  );
  if (!gate.ok) {
    throw new Error(
      `Cannot release installment — missing: ${gate.missing.join(", ")}`
    );
  }

  const updated = await prisma.fundInstallment.update({
    where: { id: params.installmentId },
    data: {
      status: "RELEASED",
      transactionId: params.transactionId,
      approvalNotes: params.approvalNotes,
      releasedAt: new Date(),
      paymentDate: new Date(),
    },
  });

  const finance = installment.fellowship.financeRecords;
  if (finance) {
    const released = finance.releasedAmount + installment.amount;
    await prisma.financeRecord.update({
      where: { id: finance.id },
      data: {
        releasedAmount: released,
        balanceAmount: finance.sanctionedAmount - released,
      },
    });
  }

  const newStage = stageForInstallmentRelease(installment.installmentNo);
  await prisma.fellowship.update({
    where: { id: installment.fellowshipId },
    data: {
      currentStage: newStage,
      isCompleted: installment.installmentNo === 3,
    },
  });

  if (installment.installmentNo === 3) {
    await prisma.application.update({
      where: { id: installment.fellowship.applicationId },
      data: { status: "COMPLETED" },
    });
  }

  await notifyInstallmentReleased(
    installment.fellowship.application.userId,
    installment.installmentNo,
    installment.amount
  );

  return updated;
}
