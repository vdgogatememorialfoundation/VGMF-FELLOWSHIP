import { randomInt } from "crypto";
import prisma from "./db";

const APPLICATION_SUFFIX_MIN = 10_000_000;
const APPLICATION_SUFFIX_MAX = 99_999_999;

async function generateUniqueApplicationNumber(maxAttempts = 30): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = String(randomInt(APPLICATION_SUFFIX_MIN, APPLICATION_SUFFIX_MAX + 1));
    const applicationNumber = `${year}${suffix}`;

    const existing = await prisma.application.findUnique({
      where: { applicationNumber },
      select: { id: true },
    });

    if (!existing) return applicationNumber;
  }

  throw new Error("Failed to generate unique application number");
}

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

/** YYYY + 8 random digits — unique, non-sequential (e.g. 202684729153) */
export async function generateApplicationNumber(): Promise<string> {
  return generateUniqueApplicationNumber();
}
