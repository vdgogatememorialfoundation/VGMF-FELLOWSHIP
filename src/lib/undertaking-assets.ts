import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "./db";

export function getUndertakingPdfUrl(applicationId: string): string {
  return `/api/undertaking/${applicationId}/pdf`;
}

export async function getUndertakingPdfFile(applicationId: string) {
  const undertaking = await prisma.digitalUndertaking.findUnique({
    where: { applicationId },
    select: {
      applicationId: true,
      pdfData: true,
      pdfPath: true,
      fullName: true,
      application: { select: { applicationNumber: true } },
    },
  });

  if (!undertaking) return null;

  if (undertaking.pdfData) {
    return {
      data: Buffer.from(undertaking.pdfData, "base64"),
      fileName: `undertaking_${undertaking.application.applicationNumber}.pdf`,
    };
  }

  const diskPath = path.join(process.cwd(), "public", undertaking.pdfPath.replace(/^\//, ""));
  if (existsSync(diskPath)) {
    return {
      data: await readFile(diskPath),
      fileName: path.basename(undertaking.pdfPath),
    };
  }

  return null;
}

/** Remove undertaking records whose PDF was lost (e.g. after Render redeploy). */
export async function repairOrphanUndertaking(applicationId: string) {
  const undertaking = await prisma.digitalUndertaking.findUnique({
    where: { applicationId },
  });

  if (!undertaking || undertaking.pdfData) {
    return undertaking;
  }

  const diskPath = path.join(process.cwd(), "public", undertaking.pdfPath.replace(/^\//, ""));
  if (existsSync(diskPath)) {
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
    pdfData?: string | null;
    signatureData?: string | null;
  },
>(undertaking: T) {
  const { pdfData: _pdf, signatureData: _sig, ...rest } = undertaking;
  return {
    ...rest,
    pdfUrl: getUndertakingPdfUrl(undertaking.applicationId),
  };
}
