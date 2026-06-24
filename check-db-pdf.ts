import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function run() {
  const u = await prisma.digitalUndertaking.findFirst({
    orderBy: { submittedAt: 'desc' },
    include: { application: true }
  });

  if (!u || !u.pdfData) {
    console.log("No PDF data found");
    return;
  }

  const buffer = Buffer.from(u.pdfData, 'base64');
  console.log("Database PDF size:", buffer.length, "bytes");
  writeFileSync("downloaded-from-db.pdf", buffer);
}

run().catch(console.error).finally(() => prisma.$disconnect());
