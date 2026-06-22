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

export const dynamic = "force-dynamic";

async function requireStaff() {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) return null;
  return user;
}

function mergeUploadedFileFlags(
  data: Record<string, unknown>,
  docs: { type: string }[]
) {
  const merged = { ...data };
  for (const [fieldKey, docType] of Object.entries(FILE_FIELD_DOCUMENT_TYPES)) {
    if (docs.some((doc) => doc.type === docType)) {
      merged[`${fieldKey}_uploaded`] = true;
    }
  }
  return merged;
}

export async function GET(request: NextRequest) {
  const admin = await requireStaff();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, profile: { select: { name: true } } },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await getFormTemplateForApplicant("fellowship-application");
  if (!result) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const { template } = result;

  let submission = null;
  let applicationId: string | null = null;
  const uploadedFiles: Record<string, boolean> = {};

  const existingSubmission = await prisma.formSubmission.findFirst({
    where: { userId, formTemplateId: template.id },
    orderBy: { updatedAt: "desc" },
  });

  if (existingSubmission) {
    submission = existingSubmission;
    applicationId = existingSubmission.applicationId;

    if (applicationId) {
      const docs = await prisma.applicationDocument.findMany({
        where: { applicationId },
        select: { type: true },
      });

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
    submission,
    applicationId,
    uploadedFiles,
    targetUser: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.profile?.name || "—",
    },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireStaff();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, formTemplateId, data, status, submissionId } = body;
    const formData = (data || {}) as Record<string, unknown>;
    const nextStatus = status || "DRAFT";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Admin bypasses schedule restrictions

    if (submissionId) {
      const existing = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      const docs = existing.applicationId
        ? await prisma.applicationDocument.findMany({
            where: { applicationId: existing.applicationId },
            select: { type: true },
          })
        : [];

      const mergedData = mergeUploadedFileFlags(formData, docs);

      if (nextStatus === "SUBMITTED") {
        const validationError = validateFormSubmission(template.fields, mergedData);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
        // Admin bypasses Digital Undertaking requirement
      }

      const submission = await prisma.formSubmission.update({
        where: { id: submissionId },
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
          userId,
          submission.id,
          mergedData,
          submission.applicationId
        );
        applicationId = application.id;
      } else if (nextStatus === "SUBMITTED") {
        const application = await syncApplicationFromFormSubmission(
          userId,
          submission.id,
          mergedData,
          submission.applicationId
        );
        applicationId = application.id;
        applicationNumber = application.applicationNumber;

        const applicantEmail = String(mergedData.email || "");
        await notifyApplicationSubmitted(
          userId,
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

    // New submission
    const mergedData = mergeUploadedFileFlags(formData, []);

    if (nextStatus === "SUBMITTED") {
      const validationError = validateFormSubmission(template.fields, mergedData);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId,
        userId,
        data: mergedData as Prisma.InputJsonValue,
        status: nextStatus,
        submittedAt: nextStatus === "SUBMITTED" ? new Date() : undefined,
      },
    });

    let applicationId: string | null = null;
    let applicationNumber: string | null = null;

    if (nextStatus === "DRAFT") {
      const application = await ensureDraftApplication(userId, submission.id, mergedData);
      applicationId = application.id;
    } else if (nextStatus === "SUBMITTED") {
      const draftApp = await ensureDraftApplication(userId, submission.id, mergedData);
      const application = await syncApplicationFromFormSubmission(
        userId,
        submission.id,
        mergedData,
        draftApp.id
      );
      applicationId = application.id;
      applicationNumber = application.applicationNumber;

      const applicantEmail = String(mergedData.email || "");
      await notifyApplicationSubmitted(
        userId,
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
    const message = error instanceof Error ? error.message : "Failed to save form";
    console.error("Admin proxy form error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
