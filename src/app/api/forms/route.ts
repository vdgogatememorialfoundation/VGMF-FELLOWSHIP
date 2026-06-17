import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getActiveFormTemplate } from "@/lib/cms";
import { syncApplicationFromFormSubmission } from "@/lib/applications";
import { notifyApplicationSubmitted } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "fellowship-application";

  const template = await getActiveFormTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

async function handleSubmission(
  userId: string,
  submission: {
    id: string;
    status: string;
    applicationId: string | null;
    data: unknown;
  },
  status: string,
  data: Record<string, unknown>
) {
  if (status !== "SUBMITTED" || submission.status === "SUBMITTED") {
    return { submission, application: null as { applicationNumber: string } | null };
  }

  const application = await syncApplicationFromFormSubmission(
    userId,
    submission.id,
    data,
    submission.applicationId
  );

  const applicantEmail = String(data.email || "");
  await notifyApplicationSubmitted(userId, application.applicationNumber, applicantEmail || undefined);

  return { submission, application };
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

    if (submissionId) {
      const existing = await prisma.formSubmission.findUnique({
        where: { id: submissionId, userId: user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      const submission = await prisma.formSubmission.update({
        where: { id: submissionId, userId: user.id },
        data: {
          data: formData as Prisma.InputJsonValue,
          status: nextStatus,
          submittedAt: nextStatus === "SUBMITTED" ? new Date() : undefined,
        },
      });

      const { application } = await handleSubmission(
        user.id,
        { ...submission, data: formData },
        nextStatus,
        formData
      );

      return NextResponse.json({
        submission,
        applicationNumber: application?.applicationNumber ?? null,
      });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId,
        userId: user.id,
        data: formData as Prisma.InputJsonValue,
        status: nextStatus,
        submittedAt: nextStatus === "SUBMITTED" ? new Date() : undefined,
      },
    });

    const { application } = await handleSubmission(
      user.id,
      submission,
      nextStatus,
      formData
    );

    return NextResponse.json({
      submission,
      applicationNumber: application?.applicationNumber ?? null,
    });
  } catch (error) {
    console.error("Form submission error:", error);
    return NextResponse.json({ error: "Failed to save form" }, { status: 500 });
  }
}
