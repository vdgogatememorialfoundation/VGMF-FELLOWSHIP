import prisma from "./db";

export async function logActivity(userId: string, action: string, details?: Record<string, unknown>) {
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
