import prisma from "./db";

export function formatApplicationNumber(applicationNumber: string): string {
  if (/^\d{12}$/.test(applicationNumber)) {
    return `${applicationNumber.slice(0, 4)} ${applicationNumber.slice(4, 8)} ${applicationNumber.slice(8)}`;
  }
  return applicationNumber;
}

export async function generateApplicationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = String(year);

  const existing = await prisma.application.findMany({
    where: { applicationNumber: { startsWith: prefix } },
    select: { applicationNumber: true },
  });

  const sequences = existing
    .map((entry) => entry.applicationNumber)
    .filter((number) => /^\d{12}$/.test(number))
    .map((number) => parseInt(number.slice(4), 10));

  const sequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  const applicationNumber = `${prefix}${String(sequence).padStart(8, "0")}`;

  const exists = await prisma.application.findUnique({
    where: { applicationNumber },
    select: { id: true },
  });

  if (exists) {
    return generateApplicationNumber();
  }

  return applicationNumber;
}
