import prisma from "./db";

export type DeleteApplicationResult = {
  applicationNumber: string;
  hadFellowship: boolean;
  releasedInstallments: number;
};

/**
 * Permanently delete an application and all related records, including
 * fellowship, installments, and finance data when present.
 */
export async function deleteApplication(applicationId: string): Promise<DeleteApplicationResult> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      fellowship: {
        include: {
          installments: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  const releasedInstallments =
    application.fellowship?.installments.filter((i) => i.status === "RELEASED").length ?? 0;

  await prisma.$transaction(async (tx) => {
    if (application.fellowship) {
      await tx.fellowship.delete({ where: { id: application.fellowship.id } });
    }

    await tx.application.delete({ where: { id: applicationId } });
  });

  return {
    applicationNumber: application.applicationNumber,
    hadFellowship: Boolean(application.fellowship),
    releasedInstallments,
  };
}
