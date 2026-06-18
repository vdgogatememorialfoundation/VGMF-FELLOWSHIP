import prisma from "@/lib/db";
import { AdminFellowshipsClient } from "@/components/admin/AdminFellowshipsClient";

export default async function AdminFellowshipsPage() {
  const fellowships = await prisma.fellowship.findMany({
    include: {
      application: { select: { id: true, applicationNumber: true } },
      installments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminFellowshipsClient
      fellowships={fellowships.map((f) => ({
        id: f.id,
        fellowshipId: f.fellowshipId,
        fellowName: f.fellowName,
        projectTitle: f.projectTitle,
        sanctionedAmount: f.sanctionedAmount,
        currentStage: f.currentStage,
        isActive: f.isActive,
        isCompleted: f.isCompleted,
        awardLetterPath: f.awardLetterPath,
        applicationId: f.application.id,
        installments: f.installments,
      }))}
    />
  );
}
