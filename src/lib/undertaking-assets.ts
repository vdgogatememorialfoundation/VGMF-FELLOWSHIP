import prisma from "./db";
import { readStoredUploadBytes } from "./upload-files";

export function getUndertakingPdfUrl(applicationId: string): string {
  return `/api/undertaking/${applicationId}/pdf?t=${Date.now()}`;
}

export async function getUndertakingPdfFile(applicationId: string) {
  const undertaking = await prisma.digitalUndertaking.findUnique({
    where: { applicationId },
    select: {
      applicationId: true,
      pdfPath: true,
      fullName: true,
      application: { select: { applicationNumber: true } },
    },
  });

  if (!undertaking) return null;

  const data = await readStoredUploadBytes(undertaking.pdfPath);
  if (!data) return null;

  return {
    data,
    fileName: `undertaking_${undertaking.application.applicationNumber}.pdf`,
  };
}

/** Remove undertaking records whose PDF was lost (e.g. after Render redeploy). */
export async function repairOrphanUndertaking(applicationId: string) {
  const undertaking = await prisma.digitalUndertaking.findUnique({
    where: { applicationId },
  });

  if (!undertaking) {
    return undertaking;
  }

  const data = await readStoredUploadBytes(undertaking.pdfPath);
  if (data) {
    return undertaking;
  }

  await prisma.$transaction([
    prisma.digitalUndertaking.delete({ where: { applicationId } }),
    prisma.application.update({
      where: { id: applicationId },
      data: { undertakingAcceptedAt: null },
    }),
  ]);

  return null;
}

export function formatUndertakingForClient<
  T extends {
    applicationId: string;
    pdfPath: string;
  },
>(undertaking: T) {
  return {
    ...undertaking,
    pdfUrl: getUndertakingPdfUrl(undertaking.applicationId),
  };
}
