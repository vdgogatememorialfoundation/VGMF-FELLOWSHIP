import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getFormTemplateForApplicant } from "@/lib/cms";
import {
  ensureDraftApplication,
  syncApplicationFromFormSubmission,
} from "@/lib/applications";
import { notifyApplicationSubmitted } from "@/lib/notifications";
import {
  validateFormSubmission,
  FILE_FIELD_DOCUMENT_TYPES,
} from "@/lib/form-validation";
import { getFormScheduleStatus } from "@/lib/form-schedule";
import {
  formatUndertakingForClient,
  repairOrphanUndertaking,
} from "@/lib/undertaking-assets";

async function requireDigitalUndertaking(applicationId: string | null): Promise<string | null> {
  if (!applicationId) {
    return "Please save a draft and complete the Digital Undertaking before submitting";
  }
  const undertaking = await prisma.digitalUndertaking.findUnique({
    where: { applicationId },
  });
  if (!undertaking) {
    return "Please complete the Digital Undertaking (sign & submit) before final application submission";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "fellowship-application";
  const user = await getSession();

  const result = await getFormTemplateForApplicant(slug);
  if (!result) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const { template, schedule } = result;

  let submission = null;
  let applicationId: string | null = null;
  let digitalUndertaking = null;
  const uploadedFiles: Record<string, boolean> = {};

  if (user) {
    submission = await prisma.formSubmission.findFirst({
      where: { userId: user.id, formTemplateId: template.id },
      orderBy: { updatedAt: "desc" },
    });

    if (submission?.applicationId) {
      applicationId = submission.applicationId;
      const [docs, undertaking] = await Promise.all([
        prisma.applicationDocument.findMany({
          where: { applicationId: submission.applicationId },
          select: { type: true },
        }),
        prisma.digitalUndertaking.findUnique({
          where: { applicationId: submission.applicationId },
          select: {
            id: true,
            applicationId: true,
            pdfPath: true,
            pdfData: true,
            submittedAt: true,
          },
        }),
      ]);
      if (undertaking) {
        const repaired = await repairOrphanUndertaking(submission.applicationId);
        digitalUndertaking = repaired ? formatUndertakingForClient(repaired) : null;
      }

      for (const field of template.fields) {
        if (field.fieldType !== "FILE") continue;
        const docType = FILE_FIELD_DOCUMENT_TYPES[field.fieldKey];
        if (docType) {
          uploadedFiles[field.fieldKey] = docs.some((doc) => doc.type === docType);
        }
      }
    }
  }

  return NextResponse.json({
    template,
    schedule,
    submission,
    applicationId,
    uploadedFiles,
    digitalUndertaking,
  });
}

async function mergeUploadedFileFlags(
  data: Record<string, unknown>,
  applicationId: string | null
) {
  if (!applicationId) return data;

  const docs = await prisma.applicationDocument.findMany({
    where: { applicationId },
    select: { type: true },
  });

  const merged = { ...data };
  for (const [fieldKey, docType] of Object.entries(FILE_FIELD_DOCUMENT_TYPES)) {
    if (docs.some((doc) => doc.type === docType)) {
      merged[`${fieldKey}_uploaded`] = true;
    }
  }
  return merged;
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { formTemplateId, data, status, submissionId } = body;
    const formData = (data || {}) as Record<string, unknown>;
    const nextStatus = status || "DRAFT";

    const template = await prisma.formTemplate.findUnique({
      where: { id: formTemplateId },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const schedule = getFormScheduleStatus(template);

    if (!schedule.open && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: schedule.message || "Applications are currently closed" },
        { status: 403 }
      );
    }

    if (submissionId) {
      const existing = await prisma.formSubmission.findUnique({
        where: { id: submissionId, userId: user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      if (existing.status === "SUBMITTED") {
        return NextResponse.json(
          { error: "This application has already been submitted" },
          { status: 400 }
        );
      }

      const mergedData = await mergeUploadedFileFlags(
        formData,
        existing.applicationId
      );

      if (nextStatus === "SUBMITTED") {
        const validationError = validateFormSubmission(template.fields, mergedData);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }

        let checkAppId = existing.applicationId;
        if (!checkAppId) {
          const draftApp = await ensureDraftApplication(
            user.id,
            submissionId,
            mergedData,
            null
          );
          checkAppId = draftApp.id;
        }

        const undertakingError = await requireDigitalUndertaking(checkAppId);
        if (undertakingError) {
          return NextResponse.json({ error: undertakingError }, { status: 400 });
        }
      }

      const submission = await prisma.formSubmission.update({
        where: { id: submissionId, userId: user.id },
        data: {
          data: mergedData as Prisma.InputJsonValue,
          status: nextStatus,
          submittedAt: nextStatus === "SUBMITTED" ? new Date() : undefined,
        },
      });

      let applicationId = submission.applicationId;
      let applicationNumber: string | null = null;

      if (nextStatus === "DRAFT") {
        const application = await ensureDraftApplication(
          user.id,
          submission.id,
          mergedData,
          submission.applicationId
        );
        applicationId = application.id;
      } else if (nextStatus === "SUBMITTED") {
        const application = await syncApplicationFromFormSubmission(
          user.id,
          submission.id,
          mergedData,
          submission.applicationId
        );
        applicationId = application.id;
        applicationNumber = application.applicationNumber;

        const applicantEmail = String(mergedData.email || "");
        await notifyApplicationSubmitted(
          user.id,
          application.applicationNumber,
          applicantEmail || undefined
        );

        await prisma.formSubmission.update({
          where: { id: submission.id },
          data: {
            data: {
              ...mergedData,
              application_number: application.applicationNumber,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return NextResponse.json({
        submission: { ...submission, status: nextStatus },
        applicationId,
        applicationNumber,
      });
    }

    const mergedData = await mergeUploadedFileFlags(formData, null);

    if (nextStatus === "SUBMITTED") {
      const validationError = validateFormSubmission(template.fields, mergedData);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    if (nextStatus === "SUBMITTED") {
      const validationError = validateFormSubmission(template.fields, mergedData);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId,
        userId: user.id,
        data: mergedData as Prisma.InputJsonValue,
        status: nextStatus,
        submittedAt: nextStatus === "SUBMITTED" ? new Date() : undefined,
      },
    });

    let applicationId: string | null = null;
    let applicationNumber: string | null = null;

    if (nextStatus === "DRAFT") {
      const application = await ensureDraftApplication(user.id, submission.id, mergedData);
      applicationId = application.id;
    } else if (nextStatus === "SUBMITTED") {
      const draftApp = await ensureDraftApplication(user.id, submission.id, mergedData);
      const undertakingError = await requireDigitalUndertaking(draftApp.id);
      if (undertakingError) {
        return NextResponse.json({ error: undertakingError }, { status: 400 });
      }

      const application = await syncApplicationFromFormSubmission(
        user.id,
        submission.id,
        mergedData,
        draftApp.id
      );
      applicationId = application.id;
      applicationNumber = application.applicationNumber;

      const applicantEmail = String(mergedData.email || "");
      await notifyApplicationSubmitted(
        user.id,
        application.applicationNumber,
        applicantEmail || undefined
      );

      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          data: {
            ...mergedData,
            application_number: application.applicationNumber,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({
      submission,
      applicationId,
      applicationNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save form";
    console.error("Form submission error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
