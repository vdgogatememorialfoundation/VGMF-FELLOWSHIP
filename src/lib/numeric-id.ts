import { randomInt } from "crypto";
import prisma from "./db";

const MIN_12_DIGIT = 100_000_000_000;
const MAX_12_DIGIT = 999_999_999_999;

async function generateUnique12DigitId(
  exists: (id: string) => Promise<boolean>,
  maxAttempts = 25
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = String(randomInt(MIN_12_DIGIT, MAX_12_DIGIT + 1));
    if (!(await exists(id))) return id;
  }
  throw new Error("Failed to generate unique 12-digit ID");
}

export async function generateUserId(): Promise<string> {
  return generateUnique12DigitId(async (userId) => {
    const existing = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });
    return Boolean(existing);
  });
}

export async function generateApplicationNumber(): Promise<string> {
  return generateUnique12DigitId(async (applicationNumber) => {
    const existing = await prisma.application.findUnique({
      where: { applicationNumber },
      select: { id: true },
    });
    return Boolean(existing);
  });
}
