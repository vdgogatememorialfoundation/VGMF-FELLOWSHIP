import prisma from "./db";
import { generateFellowshipAgreementPdf, getFellowshipAgreementUrl } from "./agreement-pdf";

export async function generateAndStoreFellowshipAgreement(fellowshipId: string) {
  const fellowship = await prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    include: {
      application: { select: { applicationNumber: true, institutionName: true } },
    },
  });

  if (!fellowship) throw new Error("Fellowship not found");

  const pdfBuffer = await generateFellowshipAgreementPdf({
    fellowshipId: fellowship.fellowshipId,
    applicationNumber: fellowship.application.applicationNumber,
    fellowName: fellowship.fellowName,
    projectTitle: fellowship.projectTitle,
    institution: fellowship.institution || fellowship.application.institutionName,
    sanctionedAmount: fellowship.sanctionedAmount,
    duration: fellowship.duration,
    startDate: fellowship.startDate ?? new Date(),
    endDate: fellowship.endDate ?? new Date(),
  });

  const agreementUrl = getFellowshipAgreementUrl(fellowship.id);
  const generatedAt = new Date();

  await prisma.fellowship.update({
    where: { id: fellowshipId },
    data: {
      agreementPdfData: pdfBuffer.toString("base64"),
      agreementGeneratedAt: generatedAt,
      awardLetterPath: agreementUrl,
    },
  });

  await prisma.fellowshipDocument.upsert({
    where: {
      fellowshipId_installmentNo_type: {
        fellowshipId,
        installmentNo: 1,
        type: "FELLOWSHIP_AGREEMENT",
      },
    },
    update: {
      fileName: `Agreement_${fellowship.fellowshipId}.pdf`,
      filePath: agreementUrl,
      fileSize: pdfBuffer.length,
      mimeType: "application/pdf",
      status: "APPROVED",
      reviewedAt: generatedAt,
    },
    create: {
      fellowshipId,
      installmentNo: 1,
      type: "FELLOWSHIP_AGREEMENT",
      fileName: `Agreement_${fellowship.fellowshipId}.pdf`,
      filePath: agreementUrl,
      fileSize: pdfBuffer.length,
      mimeType: "application/pdf",
      status: "APPROVED",
      reviewedAt: generatedAt,
    },
  });

  await prisma.fellowshipDocument.upsert({
    where: {
      fellowshipId_installmentNo_type: {
        fellowshipId,
        installmentNo: 1,
        type: "ACCEPTANCE_LETTER",
      },
    },
    update: {
      fileName: `Acceptance_${fellowship.fellowshipId}.pdf`,
      filePath: agreementUrl,
      fileSize: pdfBuffer.length,
      mimeType: "application/pdf",
      status: "APPROVED",
      reviewedAt: generatedAt,
    },
    create: {
      fellowshipId,
      installmentNo: 1,
      type: "ACCEPTANCE_LETTER",
      fileName: `Acceptance_${fellowship.fellowshipId}.pdf`,
      filePath: agreementUrl,
      fileSize: pdfBuffer.length,
      mimeType: "application/pdf",
      status: "APPROVED",
      reviewedAt: generatedAt,
    },
  });

  return { agreementUrl, generatedAt };
}

export async function getFellowshipAgreementFile(fellowshipId: string) {
  const fellowship = await prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    select: {
      fellowshipId: true,
      agreementPdfData: true,
    },
  });

  if (!fellowship?.agreementPdfData) return null;

  return {
    data: Buffer.from(fellowship.agreementPdfData, "base64"),
    fileName: `Fellowship_Agreement_${fellowship.fellowshipId}.pdf`,
  };
}
