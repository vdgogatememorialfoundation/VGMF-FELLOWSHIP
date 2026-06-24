import { PrismaClient } from '@prisma/client';
import { generateUndertakingPdf } from '../src/lib/undertaking-pdf';

const prisma = new PrismaClient();

async function run() {
  const undertakings = await prisma.digitalUndertaking.findMany({
    include: {
      application: {
        include: {
          researchProposal: true,
          user: { include: { profile: true } }
        }
      }
    }
  });

  console.log(`Found ${undertakings.length} undertakings to update.`);

  for (const u of undertakings) {
    if (!u.signatureData) continue;
    const signatureBuffer = Buffer.from(u.signatureData, "base64");
    
    const { pdfBuffer } = await generateUndertakingPdf({
      applicationId: u.applicationId,
      applicationNumber: u.application.applicationNumber,
      projectTitle: u.application.researchProposal?.projectTitle || "________________________________________________",
      fullName: u.fullName,
      signatureBuffer,
      ipAddress: u.ipAddress,
      submittedAt: u.submittedAt,
      city: u.application.city || "_________________",
    });

    await prisma.digitalUndertaking.update({
      where: { id: u.id },
      data: { pdfData: pdfBuffer.toString("base64") }
    });
    console.log(`Updated PDF for ${u.application.applicationNumber}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
