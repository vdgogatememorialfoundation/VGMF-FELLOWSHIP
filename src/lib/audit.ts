import prisma from "./db";
import { Prisma } from "@prisma/client";

export async function logActivity(userId: string, action: string, details?: Prisma.InputJsonObject) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? details : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
