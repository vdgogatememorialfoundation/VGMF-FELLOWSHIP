import type { Prisma } from "@prisma/client";
import prisma from "./db";

function stripApplicationNumber(data: unknown): Prisma.InputJsonValue {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return (data ?? {}) as Prisma.InputJsonValue;
  }

  const next = { ...(data as Record<string, unknown>) };
  delete next.application_number;
  return next as Prisma.InputJsonValue;
}

export async function resetFormSubmissionToDraft(submissionId: string) {
  const submission = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return null;

  return prisma.formSubmission.update({
    where: { id: submissionId },
    data: {
      applicationId: null,
      status: "DRAFT",
      submittedAt: null,
      data: stripApplicationNumber(submission.data),
    },
  });
}

export async function resetFormSubmissionsForDeletedApplication(
  tx: Prisma.TransactionClient,
  applicationId: string
) {
  const submissions = await tx.formSubmission.findMany({ where: { applicationId } });

  for (const submission of submissions) {
    await tx.formSubmission.update({
      where: { id: submission.id },
      data: {
        applicationId: null,
        status: "DRAFT",
        submittedAt: null,
        data: stripApplicationNumber(submission.data),
      },
    });
  }

  return submissions.length;
}

export async function repairOrphanFormSubmission<
  T extends { id: string; applicationId: string | null; status: string },
>(submission: T | null): Promise<T | null> {
  if (!submission?.applicationId) return submission;

  const application = await prisma.application.findUnique({
    where: { id: submission.applicationId },
    select: { id: true },
  });

  if (application) return submission;

  const reset = await resetFormSubmissionToDraft(submission.id);
  if (!reset) return submission;

  return { ...submission, ...reset } as T;
}
