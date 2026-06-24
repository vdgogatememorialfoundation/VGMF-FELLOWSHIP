import { generateUndertakingPdf } from "./src/lib/undertaking-pdf";
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

async function run() {
  const prisma = new PrismaClient();
  const u = await prisma.digitalUndertaking.findFirst({
    where: { application: { applicationNumber: "202612525121" } },
    include: { application: { include: { researchProposal: true } } }
  });

  if (!u || !u.signatureData) throw new Error("No sig");

  const signatureBuffer = Buffer.from(u.signatureData, "base64");
  
  const result = await generateUndertakingPdf({
    applicationId: "test",
    applicationNumber: u.application.applicationNumber,
    projectTitle: u.application.researchProposal?.projectTitle || "N/A",
    fullName: u.fullName,
    signatureBuffer,
    ipAddress: u.ipAddress,
    submittedAt: u.submittedAt,
    city: "Pune",
  });

  writeFileSync("test-undertaking.pdf", result.pdfBuffer);
  console.log("Wrote test-undertaking.pdf. Size:", result.pdfBuffer.length);
  await prisma.$disconnect();
}

run().catch(console.error);
